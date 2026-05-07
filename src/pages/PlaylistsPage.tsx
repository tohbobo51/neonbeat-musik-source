import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ListMusic, Plus, Trash2, Disc3, ChevronRight, Music } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function PlaylistsPage() {
  const { user, isGuest } = useAuth();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists?user_id=${user.id}`);
      const data = await res.json();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPlaylists(); }, [user]);

  const createPlaylist = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    try {
      await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, name: newName.trim() }),
      });
      setNewName('');
      fetchPlaylists();
    } catch {}
    setCreating(false);
  };

  const deletePlaylist = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch('/api/playlists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchPlaylists();
    } catch {}
    setDeletingId(null);
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

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <h1 className="text-3xl font-black text-white mb-6">Playlist Saya</h1>

        {/* Create new playlist */}
        <div className="flex gap-2 mb-8">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createPlaylist()}
            placeholder="Nama playlist baru..."
            className="flex-1 bg-[#12001f] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
          />
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={createPlaylist}
            disabled={creating || !newName.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold disabled:opacity-50 shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all"
          >
            {creating
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Plus size={18} />}
            Buat
          </motion.button>
        </div>

        {/* Playlist list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-[#12001f]/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-20">
            <ListMusic size={64} className="text-purple-500/20 mx-auto mb-4" />
            <p className="text-purple-300/40 text-lg font-semibold">Belum ada playlist</p>
            <p className="text-purple-300/30 text-sm mt-1">Buat playlist pertamamu di atas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playlists.map((pl, i) => (
              <motion.div
                key={pl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/playlists/${pl.id}`}
                  className="flex items-center gap-4 p-4 bg-[#12001f]/60 border border-purple-500/10 rounded-2xl hover:border-purple-500/40 hover:bg-[#12001f]/90 transition-all group"
                >
                  {/* Cover */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                    {pl.cover_url
                      ? <img src={pl.cover_url} alt="" className="w-full h-full object-cover" />
                      : <Music size={22} className="text-purple-400" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-base truncate">{pl.name}</p>
                    <p className="text-purple-300/50 text-sm mt-0.5">{pl.song_count || 0} lagu</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={e => deletePlaylist(e, pl.id)}
                      disabled={deletingId === pl.id}
                      className="p-2 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40"
                    >
                      {deletingId === pl.id
                        ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 size={16} />}
                    </motion.button>
                    <ChevronRight size={18} className="text-purple-300/30 group-hover:text-purple-300/60 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
