import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Disc3 } from 'lucide-react';
import SongCard from '../components/SongCard';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';

export default function RecommendationsPage() {
  const { user, isGuest } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);

  useEffect(() => {
    const uid = user?.id || '';
    fetch(`/api/extras?route=recommendations&user_id=${uid}&limit=20`)
      .then(r => r.json())
      .then(d => { setSongs(Array.isArray(d) ? d : []); setLoading(false); });
    if (user && !isGuest) {
      fetch(`/api/likes?user_id=${user.id}`).then(r => r.json()).then(d => {
        if (Array.isArray(d)) setLikes(d.map((l: any) => l.song_id));
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
    <PageTransition>
      <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={28} className="text-purple-400" />
            <h1 className="text-3xl font-black text-white">Rekomendasi</h1>
          </div>
          <p className="text-purple-300/50 text-sm mb-8">
            {user && !isGuest ? 'Berdasarkan genre yang sering kamu dengarkan' : 'Lagu-lagu populer untuk kamu'}
          </p>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => <div key={i} className="bg-[#12001f]/60 rounded-xl p-3 animate-pulse"><div className="aspect-square bg-purple-900/30 rounded-lg mb-3" /><div className="h-4 bg-purple-900/30 rounded mb-2" /><div className="h-3 bg-purple-900/20 rounded w-2/3" /></div>)}
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-20">
              <Disc3 size={48} className="text-purple-500/30 mx-auto mb-4" />
              <p className="text-purple-300/40">Belum ada rekomendasi</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {songs.map((song, i) => (
                <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <SongCard song={song} queue={songs} isLiked={likes.includes(song.id)} onLike={handleLike}
                    onAddToPlaylist={user && !isGuest ? setAddToPlaylistSong : undefined} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
        {addToPlaylistSong && <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />}
      </div>
    </PageTransition>
  );
}
