import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ListMusic, Plus, Trash2, ChevronRight, Music, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function PlaylistsPage() {
  const { user, isGuest } = useAuth();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [sharedPlaylists, setSharedPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [myRes, sharedRes] = await Promise.all([
        fetch(`/api/playlists?user_id=${user.id}`).then(r => r.json()).catch(() => []),
        fetch(`/api/playlists?shared_with=${user.id}`).then(r => r.json()).catch(() => []),
      ]);
      setPlaylists(Array.isArray(myRes) ? myRes : []);
      setSharedPlaylists(Array.isArray(sharedRes) ? sharedRes : []);
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

  const PlaylistCard = ({ pl, isShared = false }: { pl: any; isShared?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
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
          {isShared && pl.collab_role && (
            <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-purple-400/70">
              <Users size={10} /> {pl.collab_role === 'editor' ? 'Editor' : 'Viewer'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!isShared && (
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={e => deletePlaylist(e, pl.id)}
              disabled={deletingId === pl.id}
              className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
              title="Hapus playlist"
            >
              {deletingId === pl.id
                ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                : <Trash2 size={16} />}
            </motion.button>
          )}
          <ChevronRight size={18} className="text-purple-300/30 group-hover:text-purple-300/60 transition-colors" />
        </div>
      </Link>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <h1 className="text-3xl font-black text-white mb-6">Playlist Saya</h1>

        {/* Create new playlist */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createPlaylist()}
            placeholder="Nama playlist baru..."
            className="flex-1 bg-[#12001f] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
          />
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={createPlaylist}
            disabled={creating || !newName.trim()}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold disabled:opacity-50 shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all sm:w-auto w-full"
          >
            {creating
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Plus size={18} />}
            Buat Playlist
          </motion.button>
        </div>

        {/* My playlists */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-[#12001f]/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12">
            <ListMusic size={64} className="text-purple-500/20 mx-auto mb-4" />
            <p className="text-purple-300/40 text-lg font-semibold">Belum ada playlist</p>
            <p className="text-purple-300/30 text-sm mt-1">Buat playlist pertamamu di atas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playlists.map((pl, i) => (
              <motion.div key={pl.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <PlaylistCard pl={pl} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Shared playlists section */}
        {!loading && sharedPlaylists.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={20} className="text-purple-400" />
              Dibagikan ke Saya
            </h2>
            <div className="space-y-3">
              {sharedPlaylists.map((pl, i) => (
                <motion.div key={pl.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <PlaylistCard pl={pl} isShared />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
