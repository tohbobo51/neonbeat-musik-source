import supabase from './_supabase.js';

  async function enrichPlaylistSongs(playlistSongs) {
    if (!playlistSongs || playlistSongs.length === 0) return [];
    const songIds = playlistSongs.map(ps => ps.song_id).filter(Boolean);
    if (songIds.length === 0) return playlistSongs;
    const { data: songs } = await supabase.from('songs').select('*').in('id', songIds);
    const genreIds = [...new Set((songs || []).map(s => s.genre_id).filter(Boolean))];
    let genreMap = {};
    if (genreIds.length > 0) { const { data: genres } = await supabase.from('genres').select('id, name, color').in('id', genreIds); if (genres) genres.forEach(g => { genreMap[g.id] = g; }); }
    const songMap = {};
    if (songs) songs.forEach(s => { songMap[s.id] = { ...s, genres: genreMap[s.genre_id] || null }; });
    return playlistSongs.map(ps => ({ ...ps, songs: songMap[ps.song_id] || null }));
  }

  export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    try {
      if (req.method === 'GET') {
        const { user_id, id } = req.query;
        if (id) {
          const { data: playlist, error } = await supabase.from('playlists').select('*').eq('id', id).single();
          if (error) throw error;
          const { data: psRows } = await supabase.from('playlist_songs').select('*').eq('playlist_id', id).order('position', { ascending: true });
          const enrichedPs = await enrichPlaylistSongs(psRows || []);
          return res.status(200).json({ ...playlist, playlist_songs: enrichedPs });
        }
        const { data, error } = await supabase.from('playlists').select('*').eq('user_id', user_id).order('created_at', { ascending: false });
        if (error) throw error;
        const withCount = await Promise.all((data || []).map(async pl => {
          const { count } = await supabase.from('playlist_songs').select('*', { count: 'exact', head: true }).eq('playlist_id', pl.id);
          return { ...pl, song_count: count || 0 };
        }));
        return res.status(200).json(withCount);
      }
      if (req.method === 'POST') {
        const { action, user_id, name, cover_url, playlist_id, song_id } = req.body;
        if (action === 'add_song') {
          const { data: existing } = await supabase.from('playlist_songs').select('id').eq('playlist_id', playlist_id).eq('song_id', song_id).single();
          if (existing) return res.status(200).json({ ok: true, already: true });
          const { data: maxPos } = await supabase.from('playlist_songs').select('position').eq('playlist_id', playlist_id).order('position', { ascending: false }).limit(1).single();
          const position = (maxPos?.position || 0) + 1;
          const { data, error } = await supabase.from('playlist_songs').insert({ playlist_id, song_id, position }).select().single();
          if (error) throw error;
          return res.status(201).json(data);
        }
        const { data, error } = await supabase.from('playlists').insert({ user_id, name, cover_url }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
      if (req.method === 'PUT') {
        const { id, ...updates } = req.body;
        const { data, error } = await supabase.from('playlists').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (req.method === 'DELETE') {
        const { id, playlist_id, song_id } = req.body;
        if (playlist_id && song_id) {
          const { error } = await supabase.from('playlist_songs').delete().eq('playlist_id', playlist_id).eq('song_id', song_id);
          if (error) throw error;
          return res.status(200).json({ ok: true });
        }
        await supabase.from('playlist_songs').delete().eq('playlist_id', id);
        const { error } = await supabase.from('playlists').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('Playlists API error:', err);
      res.status(500).json({ error: err.message });
    }
  }
  