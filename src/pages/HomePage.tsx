import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Disc3, Sparkles, LogIn, X, ChevronLeft, ChevronRight, Music, Heart, ListMusic, Zap } from 'lucide-react';
import SongCard from '../components/SongCard';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const HERO_SLIDES = [
  {
    type: 'default' as const,
    bg: null,
  },
  {
    type: 'image' as const,
    bg: '/banners/hero2.png',
  },
  {
    type: 'image' as const,
    bg: '/banners/hero3.png',
  },
  {
    type: 'image' as const,
    bg: '/banners/hero4.png',
  },
];

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (idx: number, dir = 1) => {
    setDirection(dir);
    setCurrent(idx);
  };

  const next = () => {
    const nextIdx = (current + 1) % HERO_SLIDES.length;
    goTo(nextIdx, 1);
  };

  const prev = () => {
    const prevIdx = (current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length;
    goTo(prevIdx, -1);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent(c => {
        setDirection(1);
        return (c + 1) % HERO_SLIDES.length;
      });
    }, 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => {
        setDirection(1);
        return (c + 1) % HERO_SLIDES.length;
      });
    }, 4500);
  };

  const handleNext = () => { next(); resetTimer(); };
  const handlePrev = () => { prev(); resetTimer(); };
  const handleDot = (i: number) => { goTo(i, i > current ? 1 : -1); resetTimer(); };

  const slide = HERO_SLIDES[current];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'clamp(220px, 40vw, 400px)' }}>
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 w-full h-full"
        >
          {slide.type === 'image' ? (
            /* Image slide */
            <div className="relative w-full h-full">
              <img
                src={slide.bg!}
                alt="NeonBeat Banner"
                className="w-full h-full object-cover object-center"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0010]/60 via-transparent to-transparent" />
            </div>
          ) : (
            /* Default hero slide */
            <div className="relative w-full h-full bg-gradient-to-br from-[#0a0010] via-[#1a0030] to-[#0a0010] flex items-center overflow-hidden">
              {/* Glow blobs */}
              <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl" />
              <div className="absolute -bottom-20 right-10 w-72 h-72 rounded-full bg-pink-600/15 blur-3xl" />
              <div className="absolute top-10 right-1/3 w-40 h-40 rounded-full bg-blue-600/10 blur-2xl" />

              <div className="relative z-10 px-8 md:px-16 w-full">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-2 mb-3"
                >
                  <Sparkles size={18} className="text-pink-400" />
                  <span className="text-pink-300/80 text-sm font-medium">Selamat Datang di</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-4xl md:text-6xl font-black mb-3 leading-tight"
                  style={{ fontFamily: 'Orbitron, monospace' }}
                >
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-300 bg-clip-text text-transparent">Neon</span>
                  <span className="text-white">Beat</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-purple-200/70 text-base md:text-lg mb-6 max-w-md"
                >
                  Temukan musik terbaik dari artis Indonesia
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex flex-wrap gap-4 text-xs text-purple-300/60"
                >
                  {[
                    { icon: Music, label: '100% GRATIS', sub: 'Semua fitur gratis' },
                    { icon: TrendingUp, label: 'MUSIK TERBAIK', sub: 'Update setiap hari' },
                    { icon: ListMusic, label: 'PLAYLIST KEREN', sub: 'Untuk setiap mood' },
                    { icon: Zap, label: 'DENGARKAN', sub: 'Kapan saja, di mana saja' },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="flex items-center gap-2">
                      <Icon size={14} className="text-pink-400" />
                      <div>
                        <p className="text-white/80 font-bold text-[10px]">{label}</p>
                        <p className="text-purple-300/40 text-[9px]">{sub}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-all"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-all"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'w-6 h-2 bg-pink-400'
                : 'w-2 h-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

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

  return (
    <div className="min-h-screen bg-[#0a0010] pt-16 pb-32">
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Guest banner */}
      <AnimatePresence>
        {isGuest && guestBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-4 p-3 bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/30 rounded-xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <LogIn size={18} className="text-pink-400 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-semibold">Masuk untuk pengalaman penuh</p>
                <p className="text-purple-300/60 text-xs">Like, playlist, riwayat, dan lebih banyak fitur</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/auth" className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-xs font-semibold whitespace-nowrap">
                Masuk
              </Link>
              <button onClick={() => setGuestBanner(false)} className="text-purple-300/50 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Genre filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              !selectedGenre
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                : 'bg-[#12001f]/60 text-purple-300/60 hover:text-purple-300 border border-purple-500/20'
            }`}
          >
            Semua
          </button>
          {genres.map(genre => (
            <button
              key={genre.id}
              onClick={() => setSelectedGenre(genre.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                selectedGenre === genre.id
                  ? 'text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                  : 'bg-[#12001f]/60 text-purple-300/60 hover:text-purple-300 border border-purple-500/20'
              }`}
              style={selectedGenre === genre.id ? { background: `linear-gradient(to right, ${genre.color}, ${genre.color}99)` } : {}}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Disc3 size={20} className="text-purple-400" />
            <h2 className="text-xl font-bold text-white">
              {selectedGenre ? genres.find(g => g.id === selectedGenre)?.name || 'Lagu' : 'Semua Lagu'}
            </h2>
          </div>
          <Link to="/trending" className="flex items-center gap-1 text-purple-400 text-sm hover:text-pink-400 transition-colors">
            <TrendingUp size={14} /> Charts
          </Link>
        </div>

        {/* Songs grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-[#12001f]/60 rounded-2xl aspect-square animate-pulse" />
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 size={48} className="text-purple-500/30 mx-auto mb-4" />
            <p className="text-purple-300/40 text-lg">Belum ada lagu</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {songs.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
              >
                <SongCard
                  song={song}
                  queue={songs}
                  isLiked={likes.includes(song.id)}
                  onLike={handleLike}
                  onAddToPlaylist={user && !isGuest ? () => setAddToPlaylistSong(song) : undefined}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {addToPlaylistSong && (
        <AddToPlaylistModal
          song={addToPlaylistSong}
          onClose={() => setAddToPlaylistSong(null)}
        />
      )}
    </div>
  );
}
