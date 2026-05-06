import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Disc3 } from 'lucide-react';
import SongCard from '../components/SongCard';
import { Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { Link } from 'react-router-dom';

export default function LikedPage() {
  const { user, isGuest } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);

  const fetchLiked = async () => {
    if (!user) return;
    const res = await fetch(`/api/likes?user_id=${user.id}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      setSongs(data.map((l: any) => l.songs).filter(Boolean));
      setLikes(data.map((l: any) => l.song_id));
    }
    setLoading(false);
  };

  useEffect(() => { fetchLiked(); }, [user]);

  const handleLike = async (songId: string) => {
    if (!user || isGuest) return;
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, song_id: songId }) });
    fetchLiked();
  };

  if (isGuest || !user) {
    return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex items-center justify-center">
        <div className="text-center">
          <Heart size={64} className="text-purple-500/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Lagu Disukai</h2>
          <p className="text-purple-300/50 mb-6">Masuk untuk melihat lagu yang kamu sukai</p>
          <Link to="/auth" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold">Masuk Sekarang</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart size={28} className="text-pink-400" fill="currentColor" />
          <h1 className="text-3xl font-black text-white">Lagu Disukai</h1>
          <span className="text-purple-300/40 text-sm">{songs.length} lagu</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <div key={i} className="bg-[#12001f]/60 rounded-xl p-3 animate-pulse"><div className="aspect-square bg-purple-900/30 rounded-lg mb-3" /><div className="h-4 bg-purple-900/30 rounded mb-2" /><div className="h-3 bg-purple-900/20 rounded w-2/3" /></div>)}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={48} className="text-purple-500/30 mx-auto mb-4" />
            <p className="text-purple-300/40">Belum ada lagu yang disukai</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {songs.map((song, i) => (
              <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <SongCard song={song} queue={songs} isLiked={likes.includes(song.id)} onLike={handleLike} onAddToPlaylist={setAddToPlaylistSong} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
      {addToPlaylistSong && <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />}
    </div>
  );
}
