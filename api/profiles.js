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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { user_id, username, check_username, get_email, search, is_artist } = req.query;

      if (get_email && user_id) {
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(user_id);
        if (userErr || !userData?.user) return res.status(404).json({ email: null });
        return res.status(200).json({ email: userData.user.email });
      }

      if (check_username) {
        const clean = sanitizeUsername(check_username);
        const taken = await isUsernameTaken(clean, user_id || null);
        return res.status(200).json({ available: !taken, suggestion: clean });
      }

      // Search profiles by username or full_name
      if (search) {
        let query = supabase.from('profiles').select('user_id, username, full_name, avatar_url, is_artist, role, follower_count, following_count, bio');
        if (is_artist === 'true') query = query.eq('is_artist', true);
        query = query.ilike('username', `%${search}%`);
        const { data, error } = await query.limit(30);
        if (error) {
          // Fallback without full_name if column doesn't exist
          let q2 = supabase.from('profiles').select('user_id, username, avatar_url, is_artist, role, follower_count, following_count, bio');
          if (is_artist === 'true') q2 = q2.eq('is_artist', true);
          q2 = q2.ilike('username', `%${search}%`);
          const { data: d2 } = await q2.limit(30);
          return res.status(200).json(d2 || []);
        }
        return res.status(200).json(data || []);
      }

      // Get single profile
      let query = supabase.from('profiles').select('*');
      if (user_id) query = query.eq('user_id', user_id);
      if (username) query = query.eq('username', username);
      const { data, error } = await query.single();
      if (error && error.code !== 'PGRST116') throw error;
      return res.status(200).json(data || null);
    }

    if (req.method === 'POST') {
      const { user_id, username, bio, avatar_url, is_artist, role, full_name } = req.body;
      const cleanUsername = await makeUniqueUsername(username || 'user', null);
      const insertData = {
        user_id, username: cleanUsername, bio: bio || '',
        avatar_url: avatar_url || '', is_artist: is_artist || false, role: role || 'user'
      };
      if (full_name !== undefined) insertData.full_name = full_name;

      // Try with full_name, fallback without
      let result = await supabase.from('profiles').upsert(insertData).select().single();
      if (result.error?.code === '42703') {
        delete insertData.full_name;
        result = await supabase.from('profiles').upsert(insertData).select().single();
      }
      if (result.error) throw result.error;
      return res.status(201).json(result.data);
    }

    if (req.method === 'PUT') {
      const { user_id, username, full_name, ...rest } = req.body;
      // Username is PERMANENT — cannot be changed via PUT
      let updates = { ...rest };
      if (full_name !== undefined) updates.full_name = full_name;

      // Try update with all fields (including full_name if provided)
      let result = await supabase.from('profiles').update(updates).eq('user_id', user_id).select().single();

      // If column doesn't exist (42703), retry without full_name
      if (result.error?.code === '42703') {
        delete updates.full_name;
        result = await supabase.from('profiles').update(updates).eq('user_id', user_id).select().single();
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
