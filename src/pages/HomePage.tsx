import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Disc3, Sparkles, LogIn, X } from 'lucide-react';
import SongCard from '../components/SongCard';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { user, isGuest } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [likes, setLikes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);
  const [guestBanner, setGuestBanner] = useState(true);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const url = selectedGenre ? `/api/songs?genre_id=${selectedGenre}` : '/api/songs';
      const res = await fetch(url);
      const data = await res.json();
      setSongs(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  const fetchGenres = async () => {
    const res = await fetch('/api/genres');
    const data = await res.json();
    setGenres(Array.isArray(data) ? data : []);
  };

  const fetchLikes = async () => {
    if (!user || isGuest) return;
    const res = await fetch(`/api/likes?user_id=${user.id}`);
    const data = await res.json();
    if (Array.isArray(data)) setLikes(data.map((l: any) => l.song_id));
  };

  useEffect(() => { fetchSongs(); fetchGenres(); fetchLikes(); }, [selectedGenre, user]);

  const handleLike = async (songId: string) => {
    if (!user || isGuest) return;
    await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, song_id: songId }),
    });
    fetchLikes();
  };

  const trending = [...songs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5);
  const newest = songs.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      {/* Hero */}
      <div className="relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-pink-900/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-pink-600/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 py-12 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={20} className="text-purple-400" />
              <span className="text-purple-300/70 text-sm font-medium">Selamat Datang di</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 mb-4" style={{ fontFamily: 'Orbitron, monospace' }}>NeonBeat</h1>
            <p className="text-purple-300/60 text-lg">Temukan musik terbaik dari artis Indonesia</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Guest Banner */}
        {isGuest && guestBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-purple-900/40 to-pink-900/30 border border-purple-500/30 rounded-2xl flex items-center gap-4"
          >
            <LogIn size={20} className="text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Kamu sedang sebagai Tamu</p>
              <p className="text-purple-300/60 text-xs">Masuk untuk menyukai lagu, buat playlist, lihat riwayat, dan lebih banyak fitur!</p>
            </div>
            <Link to="/auth" className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-xs font-semibold shadow-[0_0_10px_rgba(147,51,234,0.4)]">
              Masuk
            </Link>
            <button onClick={() => setGuestBanner(false)} className="text-purple-300/40 hover:text-purple-300 flex-shrink-0">
              <X size={16} />
            </button>
          </motion.div>
        )}

        {/* Genre Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              !selectedGenre ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-purple-500/10 text-purple-300/70 hover:text-purple-300 border border-purple-500/20'
            }`}>
            Semua
          </button>
          {genres.map(g => (
            <button key={g.id} onClick={() => setSelectedGenre(g.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                selectedGenre === g.id ? 'text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'text-purple-300/70 hover:text-purple-300 border border-purple-500/20'
              }`}
              style={selectedGenre === g.id ? { background: g.color, boxShadow: `0 0 15px ${g.color}60` } : { background: `${g.color}15`, borderColor: `${g.color}40` }}>
              {g.name}
            </button>
          ))}
        </div>

        {/* Trending */}
        {trending.length > 0 && !selectedGenre && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-pink-400" />
              <h2 className="text-xl font-bold text-white">Trending</h2>
            </div>
            <div className="space-y-2">
              {trending.map((song, i) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl hover:border-purple-500/30 hover:bg-[#12001f] transition-all cursor-pointer group"
                  onClick={() => {}}
                >
                  <span className="text-2xl font-black text-purple-500/30 w-8 text-center">{i + 1}</span>
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={20} className="text-purple-400" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{song.title}</p>
                    <p className="text-purple-300/50 text-sm truncate">{song.artist_name}</p>
                  </div>
                  <span className="text-purple-300/30 text-xs">{song.play_count || 0} plays</span>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Songs Grid */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Disc3 size={20} className="text-purple-400" />
            <h2 className="text-xl font-bold text-white">{selectedGenre ? genres.find(g => g.id === selectedGenre)?.name : 'Terbaru'}</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-[#12001f]/60 rounded-xl p-3 animate-pulse">
                  <div className="aspect-square bg-purple-900/30 rounded-lg mb-3" />
                  <div className="h-4 bg-purple-900/30 rounded mb-2" />
                  <div className="h-3 bg-purple-900/20 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-20">
              <Disc3 size={48} className="text-purple-500/30 mx-auto mb-4" />
              <p className="text-purple-300/40">Belum ada lagu</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {(selectedGenre ? songs : newest).map((song, i) => (
                <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <SongCard
                    song={song}
                    queue={songs}
                    isLiked={likes.includes(song.id)}
                    onLike={handleLike}
                    onAddToPlaylist={user && !isGuest ? setAddToPlaylistSong : undefined}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {addToPlaylistSong && <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />}
    </div>
  );
}
