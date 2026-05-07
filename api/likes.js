import supabase from './_supabase.js';

async function enrichWithSong(items) {
  if (!items || items.length === 0) return [];
  const songIds = [...new Set(items.map(i => i.song_id).filter(Boolean))];
  if (songIds.length === 0) return items;

  const { data: songs } = await supabase.from('songs').select('*').in('id', songIds);
  const genreIds = [...new Set((songs || []).map(s => s.genre_id).filter(Boolean))];
  let genreMap = {};
  if (genreIds.length > 0) {
    const { data: genres } = await supabase.from('genres').select('id, name, color').in('id', genreIds);
    if (genres) genres.forEach(g => { genreMap[g.id] = g; });
  }
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
      const { data, error } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const enriched = await enrichWithSong(data || []);
      return res.status(200).json(enriched);
    }

    if (req.method === 'POST') {
      const { user_id, song_id } = req.body;
      const { data: existing } = await supabase.from('likes').select('id').eq('user_id', user_id).eq('song_id', song_id).single();
      if (existing) {
        await supabase.from('likes').delete().eq('user_id', user_id).eq('song_id', song_id);
        return res.status(200).json({ liked: false });
      }
      const { data, error } = await supabase.from('likes').insert({ user_id, song_id }).select().single();
      if (error) throw error;
      return res.status(201).json({ liked: true, data });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Likes API error:', err);
    res.status(500).json({ error: err.message });
  }
}
