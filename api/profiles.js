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

// Minimal guaranteed columns — always works even on a bare-bones schema
const MIN_SELECT = 'user_id, username, avatar_url, is_artist';
const SAFE_SELECT = 'user_id, username, avatar_url, is_artist, role, follower_count, following_count, bio, is_verified';
const FULL_SELECT = `${SAFE_SELECT}, full_name`;

// Try running a query, return data or null on any error
async function tryQuery(queryFn) {
  try {
    const { data, error } = await queryFn();
    if (!error && data) return data;
    return null;
  } catch {
    return null;
  }
}

async function searchProfiles(term, isArtistFilter) {
  const escaped = term.replace(/[%_\\]/g, '\\$&');

  // Attempt 1: full columns + OR username/full_name
  const a1 = await tryQuery(() => {
    let q = supabase.from('profiles')
      .select(FULL_SELECT)
      .or(`username.ilike.%${escaped}%,full_name.ilike.%${escaped}%`);
    if (isArtistFilter) q = q.eq('is_artist', true);
    return q.limit(30);
  });
  if (a1 !== null) return a1;

  // Attempt 2: safe columns + OR username/full_name
  const a2 = await tryQuery(() => {
    let q = supabase.from('profiles')
      .select(SAFE_SELECT)
      .or(`username.ilike.%${escaped}%,full_name.ilike.%${escaped}%`);
    if (isArtistFilter) q = q.eq('is_artist', true);
    return q.limit(30);
  });
  if (a2 !== null) return a2;

  // Attempt 3: safe columns + username only
  const a3 = await tryQuery(() => {
    let q = supabase.from('profiles')
      .select(SAFE_SELECT)
      .ilike('username', `%${escaped}%`);
    if (isArtistFilter) q = q.eq('is_artist', true);
    return q.limit(30);
  });
  if (a3 !== null) return a3;

  // Attempt 4: minimal columns + username only (last resort)
  const a4 = await tryQuery(() => {
    let q = supabase.from('profiles')
      .select(MIN_SELECT)
      .ilike('username', `%${escaped}%`);
    if (isArtistFilter) q = q.eq('is_artist', true);
    return q.limit(30);
  });
  return a4 || [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { user_id, username, check_username, search, is_artist, get_email } = req.query;

      // Ambil email dari auth.users pakai service role — dipakai oleh login flow
      if (get_email && user_id) {
        try {
          const { data, error } = await supabase.auth.admin.getUserById(user_id);
          if (error || !data?.user) return res.status(200).json({ email: null });
          return res.status(200).json({ email: data.user.email });
        } catch {
          return res.status(200).json({ email: null });
        }
      }

      if (check_username) {
        const clean = sanitizeUsername(check_username);
        const taken = await isUsernameTaken(clean, user_id || null);
        return res.status(200).json({ available: !taken, suggestion: clean });
      }

      if (search) {
        const results = await searchProfiles(search, is_artist === 'true');
        return res.status(200).json(results);
      }

      // Get single profile — try with all columns, fallback to fewer
      if (user_id || username) {
        // Attempt full select
        let result = await tryQuery(() => {
          let q = supabase.from('profiles').select('*');
          if (user_id) q = q.eq('user_id', user_id);
          if (username) q = q.eq('username', username);
          return q.single();
        });

        // Fallback safe select
        if (result === null) {
          result = await tryQuery(() => {
            let q = supabase.from('profiles').select(SAFE_SELECT);
            if (user_id) q = q.eq('user_id', user_id);
            if (username) q = q.eq('username', username);
            return q.single();
          });
        }

        // Fallback minimal select
        if (result === null) {
          const { data } = await (user_id
            ? supabase.from('profiles').select(MIN_SELECT).eq('user_id', user_id).single()
            : supabase.from('profiles').select(MIN_SELECT).eq('username', username).single());
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
      let updates = { ...rest };
      if (full_name !== undefined) updates.full_name = full_name;
      if (is_verified !== undefined) updates.is_verified = is_verified;

      let result = await supabase.from('profiles').update(updates).eq('user_id', user_id).select().single();
      if (result.error?.code === '42703') {
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
