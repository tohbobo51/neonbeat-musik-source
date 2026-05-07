import supabase from './_supabase.js';

// Ambil data genre & profile lalu gabungkan ke songs
async function enrichSongs(songs) {
  if (!songs || songs.length === 0) return [];

  // Kumpulkan unique genre_id dan artist_id
  const genreIds = [...new Set(songs.map(s => s.genre_id).filter(Boolean))];
  const artistIds = [...new Set(songs.map(s => s.artist_id).filter(Boolean))];

  // Fetch genres
  let genreMap = {};
  if (genreIds.length > 0) {
    const { data: genres } = await supabase.from('genres').select('id, name, color').in('id', genreIds);
    if (genres) genres.forEach(g => { genreMap[g.id] = g; });
  }

  // Fetch profiles
  let profileMap = {};
  if (artistIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', artistIds);
    if (profiles) profiles.forEach(p => { profileMap[p.user_id] = p; });
  }

  return songs.map(s => ({
    ...s,
    genres: s.genre_id ? (genreMap[s.genre_id] || null) : null,
    profiles: s.artist_id ? (profileMap[s.artist_id] || null) : null,
  }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { genre_id, artist_id, search, limit = 100, offset = 0 } = req.query;

      let query = supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      // Kalau fetch by artist_id (Musik Saya), tampilkan semua termasuk inactive
      if (artist_id) {
        query = query.eq('artist_id', artist_id);
      } else {
        query = query.eq('is_active', true);
      }
      if (genre_id) query = query.eq('genre_id', genre_id);
      if (search) query = query.ilike('title', `%${search}%`);

      const { data, error } = await query;
      if (error) throw error;

      const enriched = await enrichSongs(data || []);
      return res.status(200).json(enriched);
    }

    if (req.method === 'POST') {
      const { title, artist_name, audio_url, cover_url, genre_id, artist_id, duration, lyrics } = req.body;
      const { data, error } = await supabase
        .from('songs')
        .insert({ title, artist_name, audio_url, cover_url, genre_id: genre_id || null, artist_id, duration, lyrics, is_active: true })
        .select('*')
        .single();
      if (error) throw error;
      const [enriched] = await enrichSongs([data]);
      return res.status(201).json(enriched);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      // Jangan update field relasi
      delete updates.genres;
      delete updates.profiles;
      const { data, error } = await supabase
        .from('songs')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      const [enriched] = await enrichSongs([data]);
      return res.status(200).json(enriched);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Songs API error:', err);
    res.status(500).json({ error: err.message });
  }
}
