import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { action } = req.query;

      if (action === 'stats') {
        const [songs, users, genres, plays] = await Promise.all([
          supabase.from('songs').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('genres').select('*', { count: 'exact', head: true }),
          supabase.from('listen_history').select('*', { count: 'exact', head: true }),
        ]);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentPlays } = await supabase.from('listen_history').select('played_at').gte('played_at', sevenDaysAgo);
        const dayMap = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
          dayMap[key] = { date: key, label, plays: 0 };
        }
        (recentPlays || []).forEach(p => {
          const key = (p.played_at || '').split('T')[0];
          if (dayMap[key]) dayMap[key].plays++;
        });
        const playsByDay = Object.values(dayMap);
        const { data: topSongs } = await supabase.from('songs').select('id, title, artist_name, play_count, cover_url').order('play_count', { ascending: false }).limit(5);
        const { data: recentUsers } = await supabase.from('profiles').select('created_at').gte('created_at', sevenDaysAgo);
        const userDayMap = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
          userDayMap[key] = { date: key, label, users: 0 };
        }
        (recentUsers || []).forEach(u => {
          const key = (u.created_at || '').split('T')[0];
          if (userDayMap[key]) userDayMap[key].users++;
        });
        const usersByDay = Object.values(userDayMap);
        return res.status(200).json({
          totalSongs: songs.count || 0,
          totalUsers: users.count || 0,
          totalGenres: genres.count || 0,
          totalPlays: plays.count || 0,
          playsByDay,
          usersByDay,
          topSongs: topSongs || [],
        });
      }

      if (action === 'users') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        try {
          const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const emailMap = {};
          (authUsers || []).forEach(u => { emailMap[u.id] = u.email || ''; });
          const enriched = (data || []).map(p => ({ ...p, email: emailMap[p.user_id] || '' }));
          return res.status(200).json(enriched);
        } catch {
          return res.status(200).json(data || []);
        }
      }

      if (action === 'plays_chart') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const { data, error } = await supabase.from('listen_history').select('played_at').gte('played_at', sevenDaysAgo.toISOString());
        if (error) throw error;
        return res.status(200).json(data || []);
      }

      if (action === 'songs') {
        const { data: songs, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const genreIds = [...new Set((songs || []).map(s => s.genre_id).filter(Boolean))];
        let genreMap = {};
        if (genreIds.length > 0) {
          const { data: genres } = await supabase.from('genres').select('id, name, color').in('id', genreIds);
          if (genres) genres.forEach(g => { genreMap[g.id] = g; });
        }
        const enriched = (songs || []).map(s => ({ ...s, genres: genreMap[s.genre_id] || null }));
        return res.status(200).json(enriched);
      }
    }

    if (req.method === 'PUT') {
      const { action, id, ...updates } = req.body;

      if (action === 'toggle_song') {
        const { data, error } = await supabase
          .from('songs')
          .update({ is_active: updates.is_active })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'set_role') {
        const { data, error } = await supabase
          .from('profiles')
          .update({ role: updates.role, is_artist: updates.is_artist })
          .eq('user_id', id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'verify_user') {
        const { data, error } = await supabase
          .from('profiles')
          .update({ is_verified: updates.is_verified })
          .eq('user_id', id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'set_follower_count') {
        const upd = {};
        if (updates.follower_count !== undefined) upd.follower_count = Number(updates.follower_count);
        if (updates.following_count !== undefined) upd.following_count = Number(updates.following_count);
        const { data, error } = await supabase
          .from('profiles')
          .update(upd)
          .eq('user_id', id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'delete_user') {
        await supabase.from('profiles').delete().eq('user_id', id);
        return res.status(200).json({ ok: true });
      }

      if (action === 'set_password') {
        const { error } = await supabase.auth.admin.updateUserById(id, { password: updates.password });
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin API error:', err);
    res.status(500).json({ error: err.message });
  }
}
