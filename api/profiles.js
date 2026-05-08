import supabase from './_supabase.js';

function sanitizeUsername(raw) {
  return (raw || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/^_+|_+$/g, '').slice(0, 30);
}

async function isUsernameTaken(username, excludeUserId = null) {
  let query = supabase.from('profiles').select('user_id').eq('username', username);
  if (excludeUserId) query = query.neq('user_id', excludeUserId);
  const { data } = await query.limit(1);
  return data && data.length > 0;
}

async function makeUniqueUsername(base, excludeUserId = null) {
  const clean = sanitizeUsername(base) || 'user';
  if (!await isUsernameTaken(clean, excludeUserId)) return clean;
  for (let i = 2; i <= 999; i++) {
    const candidate = `${clean}${i}`;
    if (!await isUsernameTaken(candidate, excludeUserId)) return candidate;
  }
  return `${clean}_${Math.floor(Math.random() * 9000 + 1000)}`;
}

const SAFE_SELECT = 'user_id, username, avatar_url, is_artist, role, follower_count, following_count, bio, is_verified';
const FULL_SELECT = `${SAFE_SELECT}, full_name`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { user_id, username, check_username, search, is_artist } = req.query;

      if (check_username) {
        const clean = sanitizeUsername(check_username);
        const taken = await isUsernameTaken(clean, user_id || null);
        return res.status(200).json({ available: !taken, suggestion: clean });
      }

      // Search profiles — safe fallback if full_name column doesn't exist
      if (search) {
        const term = search.replace(/[%_]/g, '\\$&'); // escape special chars

        // Try searching username OR full_name
        let found = null;
        try {
          let q = supabase.from('profiles').select(FULL_SELECT)
            .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`);
          if (is_artist === 'true') q = q.eq('is_artist', true);
          const { data, error } = await q.limit(30);
          if (!error) found = data;
        } catch {}

        // Fallback: username only (no full_name column)
        if (found === null) {
          try {
            let q = supabase.from('profiles').select(SAFE_SELECT)
              .ilike('username', `%${term}%`);
            if (is_artist === 'true') q = q.eq('is_artist', true);
            const { data } = await q.limit(30);
            found = data;
          } catch {}
        }

        return res.status(200).json(found || []);
      }

      // Get single profile — try with full_name, fallback without
      if (user_id || username) {
        let result = null;
        try {
          let q = supabase.from('profiles').select('*');
          if (user_id) q = q.eq('user_id', user_id);
          if (username) q = q.eq('username', username);
          const { data, error } = await q.single();
          if (!error) result = data;
        } catch {}

        if (result === null) {
          let q = supabase.from('profiles').select(SAFE_SELECT);
          if (user_id) q = q.eq('user_id', user_id);
          if (username) q = q.eq('username', username);
          const { data } = await q.single();
          result = data;
        }
        return res.status(200).json(result || null);
      }

      return res.status(400).json({ error: 'user_id, username, atau search diperlukan' });
    }

    if (req.method === 'POST') {
      const { user_id, username, bio, avatar_url, is_artist, role, full_name } = req.body;
      const cleanUsername = await makeUniqueUsername(username || 'user', null);
      const insertData = {
        user_id, username: cleanUsername, bio: bio || '',
        avatar_url: avatar_url || '', is_artist: is_artist || false, role: role || 'user'
      };
      if (full_name !== undefined) insertData.full_name = full_name;

      let result = await supabase.from('profiles').upsert(insertData).select().single();
      if (result.error?.code === '42703') {
        delete insertData.full_name;
        result = await supabase.from('profiles').upsert(insertData).select().single();
      }
      if (result.error) throw result.error;
      return res.status(201).json(result.data);
    }

    if (req.method === 'PUT') {
      const { user_id, username, full_name, is_verified, ...rest } = req.body;
      // username PERMANENT — tidak bisa diubah via PUT
      let updates = { ...rest };
      if (full_name !== undefined) updates.full_name = full_name;
      if (is_verified !== undefined) updates.is_verified = is_verified;

      let result = await supabase.from('profiles').update(updates).eq('user_id', user_id).select().single();
      if (result.error?.code === '42703') {
        // Remove unknown columns and retry
        const safeUpdates = {};
        const knownCols = ['bio', 'avatar_url', 'is_artist', 'role', 'follower_count', 'following_count'];
        knownCols.forEach(k => { if (updates[k] !== undefined) safeUpdates[k] = updates[k]; });
        result = await supabase.from('profiles').update(safeUpdates).eq('user_id', user_id).select().single();
      }
      if (result.error) throw result.error;
      return res.status(200).json(result.data);
    }

    if (req.method === 'DELETE') {
      const { user_id } = req.body;
      const { error } = await supabase.from('profiles').delete().eq('user_id', user_id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Profiles API error:', err);
    res.status(500).json({ error: err.message });
  }
}
