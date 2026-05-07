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
        const { user_id, username, check_username, get_email } = req.query;

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

        let query = supabase.from('profiles').select('*');
        if (user_id) query = query.eq('user_id', user_id);
        if (username) query = query.eq('username', username);
        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        return res.status(200).json(data || null);
      }

      if (req.method === 'POST') {
        const { user_id, username, bio, avatar_url, is_artist, role } = req.body;
        const cleanUsername = await makeUniqueUsername(username || 'user', null);
        const { data, error } = await supabase.from('profiles').upsert({
          user_id, username: cleanUsername, bio: bio || '', avatar_url: avatar_url || '',
          is_artist: is_artist || false, role: role || 'user'
        }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }

      if (req.method === 'PUT') {
        const { user_id, username, ...rest } = req.body;
        let updates = { ...rest };
        if (username !== undefined) {
          const clean = sanitizeUsername(username);
          if (!clean || clean.length < 3) return res.status(400).json({ error: 'Username minimal 3 karakter' });
          const taken = await isUsernameTaken(clean, user_id);
          if (taken) return res.status(400).json({ error: 'Username sudah dipakai' });
          updates.username = clean;
        }
        const { data, error } = await supabase.from('profiles').update(updates).eq('user_id', user_id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
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
  