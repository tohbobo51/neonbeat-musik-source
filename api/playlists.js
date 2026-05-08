import supabase from './_supabase.js';

async function enrichPlaylistSongs(playlistSongs) {
  if (!playlistSongs || playlistSongs.length === 0) return [];
  const songIds = playlistSongs.map(ps => ps.song_id).filter(Boolean);
  if (songIds.length === 0) return playlistSongs;
  const { data: songs } = await supabase.from('songs').select('*').in('id', songIds);
  const genreIds = [...new Set((songs || []).map(s => s.genre_id).filter(Boolean))];
  let genreMap = {};
  if (genreIds.length > 0) {
    const { data: genres } = await supabase.from('genres').select('id, name, color').in('id', genreIds);
    if (genres) genres.forEach(g => { genreMap[g.id] = g; });
  }
  const songMap = {};
  if (songs) songs.forEach(s => { songMap[s.id] = { ...s, genres: genreMap[s.genre_id] || null }; });
  return playlistSongs.map(ps => ({ ...ps, songs: songMap[ps.song_id] || null }));
}

async function getCollaborators(playlistId) {
  try {
    const { data, error } = await supabase
      .from('playlist_collaborators')
      .select('id, user_id, role, status, invited_by, created_at')
      .eq('playlist_id', playlistId)
      .order('created_at', { ascending: true });
    if (error) return [];

    if (!data || data.length === 0) return [];

    // Enrich with profile info
    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, full_name')
      .in('user_id', userIds);
    const profileMap = {};
    if (profiles) profiles.forEach(p => { profileMap[p.user_id] = p; });

    return data.map(c => ({ ...c, profile: profileMap[c.user_id] || null }));
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { user_id, id, public_only, shared_with, collaborators } = req.query;

      // Get collaborator list for a playlist
      if (collaborators) {
        const list = await getCollaborators(collaborators);
        return res.status(200).json(list);
      }

      // Get playlists shared with a user (collaboration)
      if (shared_with) {
        try {
          const { data: collabs, error: collabErr } = await supabase
            .from('playlist_collaborators')
            .select('playlist_id, role, status')
            .eq('user_id', shared_with)
            .eq('status', 'accepted');

          if (collabErr) return res.status(200).json([]);

          if (!collabs || collabs.length === 0) return res.status(200).json([]);

          const playlistIds = collabs.map(c => c.playlist_id);
          const { data: playlists, error: plErr } = await supabase
            .from('playlists')
            .select('*')
            .in('id', playlistIds)
            .order('created_at', { ascending: false });

          if (plErr) return res.status(200).json([]);

          const withCount = await Promise.all((playlists || []).map(async pl => {
            const { count } = await supabase
              .from('playlist_songs')
              .select('*', { count: 'exact', head: true })
              .eq('playlist_id', pl.id);
            const myCollab = collabs.find(c => c.playlist_id === pl.id);
            return { ...pl, song_count: count || 0, collab_role: myCollab?.role || 'viewer' };
          }));

          return res.status(200).json(withCount);
        } catch {
          return res.status(200).json([]);
        }
      }

      if (id) {
        const { data: playlist, error } = await supabase.from('playlists').select('*').eq('id', id).single();
        if (error) throw error;
        const { data: psRows } = await supabase.from('playlist_songs').select('*').eq('playlist_id', id).order('position', { ascending: true });
        const enrichedPs = await enrichPlaylistSongs(psRows || []);
        const collaboratorsList = await getCollaborators(id);
        return res.status(200).json({ ...playlist, playlist_songs: enrichedPs, collaborators: collaboratorsList });
      }

      let query = supabase.from('playlists').select('*').eq('user_id', user_id).order('created_at', { ascending: false });

      if (public_only === 'true') {
        try {
          const { data: d, error: e } = await supabase.from('playlists').select('*').eq('user_id', user_id).neq('visibility', 'private').order('created_at', { ascending: false });
          if (!e) {
            const withCount = await Promise.all((d || []).map(async pl => {
              const { count } = await supabase.from('playlist_songs').select('*', { count: 'exact', head: true }).eq('playlist_id', pl.id);
              return { ...pl, song_count: count || 0 };
            }));
            return res.status(200).json(withCount);
          }
        } catch {}
      }

      const { data, error } = await query;
      if (error) throw error;
      const withCount = await Promise.all((data || []).map(async pl => {
        const { count } = await supabase.from('playlist_songs').select('*', { count: 'exact', head: true }).eq('playlist_id', pl.id);
        return { ...pl, song_count: count || 0 };
      }));
      return res.status(200).json(withCount);
    }

    if (req.method === 'POST') {
      const { action, user_id, name, cover_url, playlist_id, song_id, visibility,
              invited_user_id, role, invited_by } = req.body;

      // Add song to playlist
      if (action === 'add_song') {
        const { data: existing } = await supabase.from('playlist_songs').select('id').eq('playlist_id', playlist_id).eq('song_id', song_id).single();
        if (existing) return res.status(200).json({ ok: true, already: true });
        const { data: maxPos } = await supabase.from('playlist_songs').select('position').eq('playlist_id', playlist_id).order('position', { ascending: false }).limit(1).single();
        const position = (maxPos?.position || 0) + 1;
        const { data, error } = await supabase.from('playlist_songs').insert({ playlist_id, song_id, position }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }

      // Invite collaborator
      if (action === 'invite_collaborator') {
        // Check not already invited
        const { data: existing } = await supabase
          .from('playlist_collaborators')
          .select('id, status')
          .eq('playlist_id', playlist_id)
          .eq('user_id', invited_user_id)
          .single();

        if (existing) {
          // If previously rejected, re-invite (reset to pending)
          if (existing.status === 'rejected') {
            const { data, error } = await supabase
              .from('playlist_collaborators')
              .update({ status: 'pending', role: role || 'editor', invited_by })
              .eq('id', existing.id)
              .select()
              .single();
            if (error) throw error;
            return res.status(200).json(data);
          }
          return res.status(200).json({ ok: true, already: true, status: existing.status });
        }

        const { data, error } = await supabase
          .from('playlist_collaborators')
          .insert({ playlist_id, user_id: invited_user_id, role: role || 'editor', invited_by, status: 'pending' })
          .select()
          .single();
        if (error) throw error;

        // Kirim notifikasi real-time ke user yang diundang
        try {
          const [{ data: inviterP }, { data: pl }] = await Promise.all([
            supabase.from('profiles').select('username').eq('user_id', invited_by).single(),
            supabase.from('playlists').select('name').eq('id', playlist_id).single(),
          ]);
          await supabase.from('notifications').insert({
            user_id: invited_user_id,
            type: 'collaboration',
            title: 'Undangan Kolaborasi Playlist',
            message: `${inviterP?.username || 'Seseorang'} mengundang kamu ke playlist "${pl?.name || ''}"`,
            is_read: false,
          });
        } catch {}

        return res.status(201).json(data);
      }

      // Create playlist
      const insertData = { user_id, name, cover_url };
      if (visibility) insertData.visibility = visibility;

      let result = await supabase.from('playlists').insert(insertData).select().single();
      if (result.error?.code === '42703') {
        delete insertData.visibility;
        result = await supabase.from('playlists').insert(insertData).select().single();
      }
      if (result.error) throw result.error;
      return res.status(201).json(result.data);
    }

    if (req.method === 'PUT') {
      const { id, action, collab_id, status, role, ...updates } = req.body;

      // Respond to collaboration invite (accept/reject)
      if (action === 'respond_invite') {
        const { data, error } = await supabase
          .from('playlist_collaborators')
          .update({ status })
          .eq('id', collab_id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      // Update collaborator role
      if (action === 'update_collab_role') {
        const { data, error } = await supabase
          .from('playlist_collaborators')
          .update({ role })
          .eq('id', collab_id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      // Update playlist
      let result = await supabase.from('playlists').update(updates).eq('id', id).select().single();
      if (result.error?.code === '42703') {
        const safeUpdates = { name: updates.name, cover_url: updates.cover_url };
        result = await supabase.from('playlists').update(safeUpdates).eq('id', id).select().single();
      }
      if (result.error) throw result.error;
      return res.status(200).json(result.data);
    }

    if (req.method === 'DELETE') {
      const { id, playlist_id, song_id, collab_id } = req.body;

      // Remove collaborator
      if (collab_id) {
        const { error } = await supabase.from('playlist_collaborators').delete().eq('id', collab_id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      // Remove song from playlist
      if (playlist_id && song_id) {
        const { error } = await supabase.from('playlist_songs').delete().eq('playlist_id', playlist_id).eq('song_id', song_id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      // Delete entire playlist (also delete collaborators)
      await supabase.from('playlist_collaborators').delete().eq('playlist_id', id);
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
