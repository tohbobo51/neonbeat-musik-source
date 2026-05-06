import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, Plus, Trash2, Play, Disc3, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { Link } from 'react-router-dom';

export default function PlaylistsPage() {
  const { user, isGuest } = useAuth();
  const { playSong } = usePlayer();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchPlaylists = async () => {
    if (!user) return;
    const res = await fetch(`/api/playlists?user_id=${user.id}`);
    const data = await res.json();
    setPlaylists(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchPlaylistDetail = async (id: string) => {
    const res = await fetch(`/api/playlists?id=${id}`);
    const data = await res.json();
    setSelectedPlaylist(data);
  };

  useEffect(() => { fetchPlaylists(); }, [user]);

  const createPlaylist = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    await fetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, name: newName }) });
    setNewName('');
    setCreating(false);
    fetchPlaylists();
  };

  const deletePlaylist = async (id: string) => {
    await fetch('/api/playlists', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchPlaylists();
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
  };

  const removeSong = async (playlistId: string, songId: string) => {
    await fetch('/api/playlists', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playlist_id: playlistId, song_id: songId }) });
    fetchPlaylistDetail(playlistId);
  };

  if (isGuest || !user) {
    return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex items-center justify-center">
        <div className="text-center">
          <ListMusic size={64} className="text-purple-500/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Playlist</h2>
          <p className="text-purple-300/50 mb-6">Masuk untuk membuat playlist</p>
          <Link to="/auth" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold">Masuk Sekarang</Link>
        </div>
      </div>
    );
  }

  const playlistSongs = selectedPlaylist?.playlist_songs?.map((ps: any) => ps.songs).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <h1 className="text-2xl font-black text-white mb-4">Playlist</h1>
          <div className="flex gap-2 mb-4">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama playlist..."
              className="flex-1 bg-[#12001f] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-sm placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
              onKeyDown={e => e.key === 'Enter' && createPlaylist()} />
            <button onClick={createPlaylist} disabled={creating || !newName.trim()}
              className="p-2 bg-purple-600 rounded-xl text-white hover:bg-purple-500 transition-colors disabled:opacity-50">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-12 bg-[#12001f]/60 rounded-xl animate-pulse" />) :
              playlists.map(pl => (
                <div key={pl.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${
                    selectedPlaylist?.id === pl.id ? 'bg-purple-500/20 border border-purple-500/40' : 'bg-[#12001f]/60 border border-transparent hover:border-purple-500/20'
                  }`}
                  onClick={() => fetchPlaylistDetail(pl.id)}>
                  <ListMusic size={16} className="text-purple-400 flex-shrink-0" />
                  <span className="text-white text-sm flex-1 truncate">{pl.name}</span>
                  <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {!selectedPlaylist ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <ListMusic size={48} className="text-purple-500/30 mx-auto mb-4" />
                <p className="text-purple-300/40">Pilih playlist untuk melihat lagu</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedPlaylist.name}</h2>
                  <p className="text-purple-300/50 text-sm">{playlistSongs.length} lagu</p>
                </div>
                {playlistSongs.length > 0 && (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => playSong(playlistSongs[0], playlistSongs)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                    <Play size={16} /> Putar Semua
                  </motion.button>
                )}
              </div>
              <div className="space-y-2">
                {playlistSongs.map((song: any, i: number) => (
                  <motion.div key={song.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer group"
                    onClick={() => playSong(song, playlistSongs)}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={16} className="text-purple-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{song.title}</p>
                      <p className="text-purple-300/50 text-sm truncate">{song.artist_name}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeSong(selectedPlaylist.id, song.id); }}
                      className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all">
                      <X size={16} />
                    </button>
                  </motion.div>
                ))}
                {playlistSongs.length === 0 && (
                  <div className="text-center py-20">
                    <Disc3 size={48} className="text-purple-500/30 mx-auto mb-4" />
                    <p className="text-purple-300/40">Playlist masih kosong</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
