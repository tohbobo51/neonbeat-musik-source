import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Disc3 } from 'lucide-react';
import SongCard from '../components/SongCard';
import { Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import AddToPlaylistModal from '../components/AddToPlaylistModal';

export default function SearchPage() {
  const { user, isGuest } = useAuth();
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);

  useEffect(() => {
    if (!query.trim()) { setSongs([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/songs?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSongs(Array.isArray(data) ? data : []);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (user && !isGuest) {
      fetch(`/api/likes?user_id=${user.id}`).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setLikes(data.map((l: any) => l.song_id));
      });
    }
  }, [user]);

  const handleLike = async (songId: string) => {
    if (!user || isGuest) return;
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, song_id: songId }) });
    const res = await fetch(`/api/likes?user_id=${user.id}`);
    const data = await res.json();
    if (Array.isArray(data)) setLikes(data.map((l: any) => l.song_id));
  };

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-6">Cari Musik</h1>
        <div className="relative mb-8">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Cari judul lagu, artis..."
            className="w-full bg-[#12001f] border border-purple-500/30 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:shadow-[0_0_20px_rgba(147,51,234,0.2)] transition-all text-lg"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300/60 hover:text-purple-300">
              <X size={20} />
            </button>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-[#12001f]/60 rounded-xl p-3 animate-pulse"><div className="aspect-square bg-purple-900/30 rounded-lg mb-3" /><div className="h-4 bg-purple-900/30 rounded mb-2" /><div className="h-3 bg-purple-900/20 rounded w-2/3" /></div>)}
          </div>
        )}

        {!loading && query && songs.length === 0 && (
          <div className="text-center py-20">
            <Search size={48} className="text-purple-500/30 mx-auto mb-4" />
            <p className="text-purple-300/40">Tidak ada hasil untuk "{query}"</p>
          </div>
        )}

        {!loading && songs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {songs.map((song, i) => (
              <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <SongCard song={song} queue={songs} isLiked={likes.includes(song.id)} onLike={handleLike} onAddToPlaylist={user && !isGuest ? setAddToPlaylistSong : undefined} />
              </motion.div>
            ))}
          </div>
        )}

        {!query && (
          <div className="text-center py-20">
            <Disc3 size={64} className="text-purple-500/20 mx-auto mb-4" />
            <p className="text-purple-300/30 text-lg">Ketik untuk mencari musik</p>
          </div>
        )}
      </div>
      {addToPlaylistSong && <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />}
    </div>
  );
}
