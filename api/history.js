import supabase from './_supabase.js';

  async function enrichWithSong(items) {
    if (!items || items.length === 0) return [];
    const songIds = [...new Set(items.map(i => i.song_id).filter(Boolean))];
    if (songIds.length === 0) return items;
    const { data: songs } = await supabase.from('songs').select('*').in('id', songIds);
    const genreIds = [...new Set((songs || []).map(s => s.genre_id).filter(Boolean))];
    let genreMap = {};
    if (genreIds.length > 0) { const { data: genres } = await supabase.from('genres').select('id, name, color').in('id', genreIds); if (genres) genres.forEach(g => { genreMap[g.id] = g; }); }
    const songMap = {};
    if (songs) songs.forEach(s => { songMap[s.id] = { ...s, genres: genreMap[s.genre_id] || null }; });
    return items.map(i => ({ ...i, songs: songMap[i.song_id] || null }));
  }

  export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    try {
      if (req.method === 'GET') {
        const { user_id } = req.query;
        const { data, error } = await supabase.from('listen_history').select('*').eq('user_id', user_id).order('played_at', { ascending: false }).limit(50);
        if (error) throw error;
        const enriched = await enrichWithSong(data || []);
        return res.status(200).json(enriched);
      }
      if (req.method === 'POST') {
        const { user_id, song_id } = req.body;
        await supabase.from('listen_history').delete().eq('user_id', user_id).eq('song_id', song_id);
        const { data, error } = await supabase.from('listen_history').insert({ user_id, song_id, played_at: new Date().toISOString() }).select().single();
        if (error) throw error;
        const { data: song } = await supabase.from('songs').select('play_count').eq('id', song_id).single();
        if (song) await supabase.from('songs').update({ play_count: (song.play_count || 0) + 1 }).eq('id', song_id);
        return res.status(201).json(data);
      }
      if (req.method === 'DELETE') {
        const { user_id } = req.body;
        const { error } = await supabase.from('listen_history').delete().eq('user_id', user_id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('History API error:', err);
      res.status(500).json({ error: err.message });
    }
  }
  