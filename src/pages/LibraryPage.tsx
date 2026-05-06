import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Library, Disc3 } from 'lucide-react';
import SongCard from '../components/SongCard';
import { Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import AddToPlaylistModal from '../components/AddToPlaylistModal';

export default function LibraryPage() {
  const { user, isGuest } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/songs').then(r => r.json()),
      fetch('/api/genres').then(r => r.json()),
      user && !isGuest ? fetch(`/api/likes?user_id=${user.id}`).then(r => r.json()) : Promise.resolve([]),
    ]).then(([s, g, l]) => {
      setSongs(Array.isArray(s) ? s : []);
      setGenres(Array.isArray(g) ? g : []);
      if (Array.isArray(l)) setLikes(l.map((x: any) => x.song_id));
      setLoading(false);
    });
  }, [user]);

  const handleLike = async (songId: string) => {
    if (!user || isGuest) return;
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, song_id: songId }) });
    const res = await fetch(`/api/likes?user_id=${user.id}`);
    const data = await res.json();
    if (Array.isArray(data)) setLikes(data.map((l: any) => l.song_id));
  };

  const byGenre = genres.map(g => ({
    ...g,
    songs: songs.filter(s => s.genre_id === g.id),
  })).filter(g => g.songs.length > 0);

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Library size={28} className="text-purple-400" />
          <h1 className="text-3xl font-black text-white">Perpustakaan Musik</h1>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-6 bg-purple-900/30 rounded w-32 mb-4 animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, j) => <div key={j} className="bg-[#12001f]/60 rounded-xl p-3 animate-pulse"><div className="aspect-square bg-purple-900/30 rounded-lg mb-3" /><div className="h-4 bg-purple-900/30 rounded mb-2" /><div className="h-3 bg-purple-900/20 rounded w-2/3" /></div>)}
                </div>
              </div>
            ))}
          </div>
        ) : byGenre.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 size={48} className="text-purple-500/30 mx-auto mb-4" />
            <p className="text-purple-300/40">Belum ada musik</p>
          </div>
        ) : (
          <div className="space-y-10">
            {byGenre.map(g => (
              <section key={g.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ background: g.color, boxShadow: `0 0 8px ${g.color}` }} />
                  <h2 className="text-xl font-bold text-white">{g.name}</h2>
                  <span className="text-purple-300/30 text-sm">{g.songs.length} lagu</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {g.songs.map((song: Song, i: number) => (
                    <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <SongCard song={song} queue={g.songs} isLiked={likes.includes(song.id)} onLike={handleLike} onAddToPlaylist={user && !isGuest ? setAddToPlaylistSong : undefined} />
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      {addToPlaylistSong && <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />}
    </div>
  );
}
