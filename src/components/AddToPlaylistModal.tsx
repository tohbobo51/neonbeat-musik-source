import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, ListMusic, Check } from 'lucide-react';
import { Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  song: Song;
  onClose: () => void;
}

export default function AddToPlaylistModal({ song, onClose }: Props) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    if (user) fetch(`/api/playlists?user_id=${user.id}`).then(r => r.json()).then(setPlaylists);
  }, [user]);

  const createPlaylist = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, name: newName }),
    });
    const pl = await res.json();
    setPlaylists(prev => [pl, ...prev]);
    setNewName('');
    setCreating(false);
    addToPlaylist(pl.id);
  };

  const addToPlaylist = async (playlistId: string) => {
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_song', playlist_id: playlistId, song_id: song.id }),
    });
    setAdded(prev => [...prev, playlistId]);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#12001f] border border-purple-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(147,51,234,0.3)]"
      >
        <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
          <h3 className="text-white font-bold">Tambah ke Playlist</h3>
          <button onClick={onClose} className="text-purple-300/60 hover:text-purple-300"><X size={20} /></button>
        </div>
        <div className="p-4">
          <p className="text-purple-300/60 text-sm mb-4 truncate">Lagu: <span className="text-purple-300">{song.title}</span></p>
          <div className="flex gap-2 mb-4">
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Nama playlist baru..."
              className="flex-1 bg-[#1a0030] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-sm placeholder-purple-300/40 focus:outline-none focus:border-purple-400"
              onKeyDown={e => e.key === 'Enter' && createPlaylist()}
            />
            <button onClick={createPlaylist} disabled={creating || !newName.trim()}
              className="px-3 py-2 bg-purple-600 rounded-xl text-white text-sm hover:bg-purple-500 transition-colors disabled:opacity-50">
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {playlists.map(pl => (
              <button key={pl.id} onClick={() => addToPlaylist(pl.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  added.includes(pl.id) ? 'bg-purple-500/20 border border-purple-500/40' : 'bg-[#1a0030] hover:bg-purple-500/10 border border-transparent'
                }`}>
                <ListMusic size={16} className="text-purple-400" />
                <span className="text-white text-sm flex-1 text-left">{pl.name}</span>
                {added.includes(pl.id) && <Check size={14} className="text-purple-400" />}
              </button>
            ))}
            {playlists.length === 0 && (
              <p className="text-purple-300/40 text-sm text-center py-4">Belum ada playlist</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
