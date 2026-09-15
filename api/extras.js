import supabase from './_supabase.js';

async function enrichSongs(songs) {
  if (!songs || songs.length === 0) return [];
  const genreIds = [...new Set(songs.map(s => s.genre_id).filter(Boolean))];
  const artistIds = [...new Set(songs.map(s => s.artist_id).filter(Boolean))];
  let genreMap = {}, profileMap = {};
  if (genreIds.length > 0) {
    const { data: genres } = await supabase.from('genres').select('id, name, color').in('id', genreIds);
    if (genres) genres.forEach(g => { genreMap[g.id] = g; });
  }
  if (artistIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, username, avatar_url, is_verified').in('user_id', artistIds);
    if (profiles) profiles.forEach(p => { profileMap[p.user_id] = p; });
  }
  return songs.map(s => ({
    ...s,
    genres: s.genre_id ? genreMap[s.genre_id] || null : null,
    profiles: s.artist_id ? profileMap[s.artist_id] || null : null
  }));
}

async function handleArtistStats(req, res) {
  const { artist_id } = req.query;
  if (!artist_id) return res.status(400).json({ error: 'artist_id wajib' });
  const { data: songs } = await supabase.from('songs').select('id,title,play_count,cover_url').eq('artist_id', artist_id);
  const songIds = (songs || []).map(s => s.id);
  const totalPlays = (songs || []).reduce((sum, s) => sum + (s.play_count || 0), 0);
  let totalLikes = 0;
  if (songIds.length > 0) {
    const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).in('song_id', songIds);
    totalLikes = count || 0;
  }
  const { data: profile } = await supabase.from('profiles').select('follower_count,following_count,username,avatar_url').eq('user_id', artist_id).single();
  const playsPerDay = [];
  if (songIds.length > 0) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: history } = await supabase.from('listen_history').select('played_at').in('song_id', songIds).gte('played_at', sevenDaysAgo.toISOString());
    const dayMap = {};
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dayMap[d.toISOString().slice(0, 10)] = 0; }
    (history || []).forEach(h => { const k = h.played_at.slice(0, 10); if (dayMap[k] !== undefined) dayMap[k]++; });
    Object.entries(dayMap).forEach(([date, plays]) => playsPerDay.push({ date, plays }));
  } else {
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); playsPerDay.push({ date: d.toISOString().slice(0, 10), plays: 0 }); }
  }
  const topSongs = [...(songs || [])].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5);
  return res.status(200).json({ totalPlays, totalLikes, totalSongs: (songs || []).length, followerCount: profile?.follower_count || 0, followingCount: profile?.following_count || 0, playsPerDay, topSongs, profile });
}

async function handleFollows(req, res) {
  if (req.method === 'GET') {
    const { follower_id, artist_id, type } = req.query;
    if (type === 'followers') {
      const { data } = await supabase.from('follows').select('follower_id').eq('artist_id', artist_id);
      const ids = (data || []).map(f => f.follower_id);
      let profiles = [];
      if (ids.length > 0) {
        const { data: p } = await supabase.from('profiles').select('user_id,username,avatar_url').in('user_id', ids);
        profiles = p || [];
      }
      return res.status(200).json({ count: ids.length, profiles });
    }
    if (follower_id && artist_id) {
      const { data } = await supabase.from('follows').select('id').eq('follower_id', follower_id).eq('artist_id', artist_id).single();
      return res.status(200).json({ following: !!data });
    }
    return res.status(400).json({ error: 'Parameter tidak lengkap' });
  }

  if (req.method === 'POST') {
    const { follower_id, artist_id } = req.body;
    const { data: existing } = await supabase.from('follows').select('id').eq('follower_id', follower_id).eq('artist_id', artist_id).single();

    if (existing) {
      // UNFOLLOW
      await supabase.from('follows').delete().eq('follower_id', follower_id).eq('artist_id', artist_id);
    } else {
      // FOLLOW
      await supabase.from('follows').insert({ follower_id, artist_id });
    }

    // Always recalculate accurate counts from actual follows table
    const { count: actualFollowerCount } = await supabase
      .from('follows').select('*', { count: 'exact', head: true }).eq('artist_id', artist_id);
    const { count: actualFollowingCount } = await supabase
      .from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', follower_id);

    await Promise.all([
      supabase.from('profiles').update({ follower_count: actualFollowerCount || 0 }).eq('user_id', artist_id),
      supabase.from('profiles').update({ following_count: actualFollowingCount || 0 }).eq('user_id', follower_id),
    ]);

    if (existing) {
      return res.status(200).json({ following: false, follower_count: actualFollowerCount || 0 });
    }

    // Send notification for new follow
    const { data: fp } = await supabase.from('profiles').select('username').eq('user_id', follower_id).single();
    try {
      await supabase.from('notifications').insert({
        user_id: artist_id,
        type: 'follow',
        title: 'Pengikut Baru',
        message: `${fp?.username || 'Seseorang'} mulai mengikuti kamu!`,
        is_read: false
      });
    } catch (e) {}

    return res.status(201).json({ following: true, follower_count: actualFollowerCount || 0 });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleNotifications(req, res) {
  if (req.method === 'GET') {
    const { user_id } = req.query;
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(30);
    if (error) return res.status(200).json({ notifications: [], unread: 0 });
    const unread = (data || []).filter(n => !n.is_read).length;
    return res.status(200).json({ notifications: data || [], unread });
  }
  if (req.method === 'PUT') {
    const { user_id, id } = req.body;
    if (id) await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    else await supabase.from('notifications').update({ is_read: true }).eq('user_id', user_id);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const { user_id } = req.body;
    await supabase.from('notifications').delete().eq('user_id', user_id);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSettings(req, res) {
  if (req.method === 'GET') {
    const { user_id } = req.query;
    const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', user_id).single();
    if (error) return res.status(200).json({ user_id, theme: 'dark' });
    return res.status(200).json(data || { user_id, theme: 'dark' });
  }
  if (req.method === 'POST') {
    const { user_id, theme } = req.body;
    const { data, error } = await supabase.from('user_settings').upsert({ user_id, theme, updated_at: new Date().toISOString() }).select().single();
    if (error) return res.status(200).json({ user_id, theme });
    return res.status(200).json(data);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleQueue(req, res) {
  if (req.method === 'GET') {
    const { user_id } = req.query;
    const { data, error } = await supabase.from('queue_songs').select('*').eq('user_id', user_id).order('position');
    if (error) return res.status(200).json([]);
    const songIds = (data || []).map(q => q.song_id);
    if (songIds.length === 0) return res.status(200).json([]);
    const { data: songs } = await supabase.from('songs').select('*').in('id', songIds);
    const genreIds = [...new Set((songs || []).map(s => s.genre_id).filter(Boolean))];
    let genreMap = {};
    if (genreIds.length > 0) {
      const { data: genres } = await supabase.from('genres').select('id,name,color').in('id', genreIds);
      if (genres) genres.forEach(g => { genreMap[g.id] = g; });
    }
    const songMap = {};
    (songs || []).forEach(s => { songMap[s.id] = { ...s, genres: genreMap[s.genre_id] || null }; });
    return res.status(200).json((data || []).map(q => ({ ...q, song: songMap[q.song_id] || null })).filter(q => q.song));
  }
  if (req.method === 'POST') {
    const { user_id, song_id, action } = req.body;
    if (action === 'clear') {
      await supabase.from('queue_songs').delete().eq('user_id', user_id);
      return res.status(200).json({ ok: true });
    }
    const { data: maxPos } = await supabase.from('queue_songs').select('position').eq('user_id', user_id).order('position', { ascending: false }).limit(1).single();
    const position = (maxPos?.position || 0) + 1;
    const { data, error } = await supabase.from('queue_songs').insert({ user_id, song_id, position }).select().single();
    if (error) return res.status(200).json({ ok: true, note: 'queue not ready' });
    return res.status(201).json(data);
  }
  if (req.method === 'DELETE') {
    const { id, user_id } = req.body;
    if (id) await supabase.from('queue_songs').delete().eq('id', id);
    else await supabase.from('queue_songs').delete().eq('user_id', user_id);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleRecommendations(req, res) {
  const { user_id, limit = 10, genre_id } = req.query;
  let recommendedSongs = [];
  if (user_id) {
    const { data: history } = await supabase.from('listen_history').select('song_id').eq('user_id', user_id).order('played_at', { ascending: false }).limit(50);
    if (history && history.length > 0) {
      const songIds = history.map(h => h.song_id);
      const { data: listenedSongs } = await supabase.from('songs').select('genre_id').in('id', songIds);
      const genreCount = {};
      (listenedSongs || []).forEach(s => { if (s.genre_id) genreCount[s.genre_id] = (genreCount[s.genre_id] || 0) + 1; });
      const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
      if (topGenres.length > 0) {
        let q = supabase.from('songs').select('*').in('genre_id', topGenres).eq('is_active', true).order('play_count', { ascending: false }).limit(Number(limit));
        if (songIds.length > 0) q = q.not('id', 'in', `(${songIds.slice(0, 50).join(',')})`);
        const { data: songs } = await q;
        recommendedSongs = songs || [];
      }
    }
  }
  if (genre_id && recommendedSongs.length === 0) {
    const { data: genreSongs } = await supabase.from('songs').select('*').eq('genre_id', genre_id).eq('is_active', true).order('play_count', { ascending: false }).limit(Number(limit));
    recommendedSongs = genreSongs || [];
  }
  if (recommendedSongs.length < Number(limit)) {
    const existingIds = recommendedSongs.map(s => s.id);
    let q = supabase.from('songs').select('*').eq('is_active', true).order('play_count', { ascending: false }).limit(Number(limit));
    if (existingIds.length > 0) q = q.not('id', 'in', `(${existingIds.join(',')})`);
    const { data: popular } = await q;
    recommendedSongs = [...recommendedSongs, ...(popular || [])].slice(0, Number(limit));
  }
  const enriched = await enrichSongs(recommendedSongs);
  return res.status(200).json(enriched);
}

async function handleTrending(req, res) {
  const { genre_id, limit = 20 } = req.query;
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: history } = await supabase.from('listen_history').select('song_id').gte('played_at', sevenDaysAgo.toISOString());
    if (history && history.length > 0) {
      const songCount = {};
      history.forEach(h => { songCount[h.song_id] = (songCount[h.song_id] || 0) + 1; });
      const sortedIds = Object.entries(songCount).sort((a, b) => b[1] - a[1]).slice(0, Number(limit) * 2).map(([id]) => id);
      let q = supabase.from('songs').select('*').in('id', sortedIds).eq('is_active', true);
      if (genre_id) q = q.eq('genre_id', genre_id);
      const { data: songs } = await q;
      if (songs && songs.length > 0) {
        const sorted = songs.sort((a, b) => (songCount[b.id] || 0) - (songCount[a.id] || 0)).slice(0, Number(limit));
        const enriched = await enrichSongs(sorted);
        return res.status(200).json(enriched.map((s, i) => ({ ...s, trend_rank: i + 1, weekly_plays: songCount[s.id] || 0 })));
      }
    }
  } catch {}
  let q = supabase.from('songs').select('*').eq('is_active', true).order('play_count', { ascending: false }).limit(Number(limit));
  if (genre_id) q = q.eq('genre_id', genre_id);
  const { data, error } = await q;
  if (error) throw error;
  const enriched = await enrichSongs(data || []);
  return res.status(200).json(enriched.map((s, i) => ({ ...s, trend_rank: i + 1, weekly_plays: s.play_count || 0 })));
}

async function handleGenres(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    try {
      if (req.method === 'GET') {
        const { data: genres, error } = await supabase.from('genres').select('*').order('name', { ascending: true });
        if (error) throw error;
        return res.status(200).json(genres || []);
      }
      if (req.method === 'POST') {
        const { name, color, description } = req.body;
        const { data, error } = await supabase.from('genres').insert({ name, color: color || '#9333ea', description }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
      if (req.method === 'PUT') {
        const { id, name, color, description } = req.body;
        const { data, error } = await supabase.from('genres').update({ name, color, description }).eq('id', id).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (req.method === 'DELETE') {
        const { id } = req.body;
        const { error } = await supabase.from('genres').delete().eq('id', id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('Genres API error:', err);
      res.status(500).json({ error: err.message });
    }
  
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const route = req.query.route;
  try {
    if (route === 'genres') return await handleGenres(req, res);
    if (route === 'artist-stats') return await handleArtistStats(req, res);
    if (route === 'follows') return await handleFollows(req, res);
    if (route === 'notifications') return await handleNotifications(req, res);
    if (route === 'settings') return await handleSettings(req, res);
    if (route === 'queue') return await handleQueue(req, res);
    if (route === 'recommendations') return await handleRecommendations(req, res);
    if (route === 'trending') return await handleTrending(req, res);
    return res.status(400).json({ error: 'route tidak dikenali' });
  } catch (err) {
    console.error('Extras API error:', err);
    res.status(500).json({ error: err.message });
  }
}
