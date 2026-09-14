import { useState, useEffect } from 'react';
  import { motion } from 'framer-motion';
  import { ArrowLeft, Play, Pause, Heart, Plus, Share2, Copy, MessageCircle, Disc3, BadgeCheck, ListPlus, Download } from 'lucide-react';
  import { useNavigate, useParams, Link } from 'react-router-dom';
  import { usePlayer, Song } from '../context/PlayerContext';
  import { useAuth } from '../context/AuthContext';
  import AddToPlaylistModal from '../components/AddToPlaylistModal';
  import { downloadSong } from '../lib/songDownload';

  function formatPlays(n: number) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + ' Jt';
    if (n >= 1000) return (n / 1000).toFixed(1) + ' Rb';
    return String(n);
  }

  export default function SongPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
    const { user, isGuest } = useAuth();

    const [song, setSong] = useState<Song | null>(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const isActive = currentSong?.id === song?.id;

    useEffect(() => {
      if (!id) return;
      setLoading(true);
      fetch(`/api/songs?id=${id}`)
        .then(r => r.json())
        .then(data => {
          const s = Array.isArray(data) ? data[0] : data;
          if (s?.id) {
            setSong(s);
            playSong(s, [s]);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, [id]);

    useEffect(() => {
      if (!song || !user || isGuest) return;
      fetch(`/api/likes?user_id=${user.id}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setLiked(data.some((l: any) => l.song_id === song.id));
        });
    }, [song?.id, user?.id]);

    const handleLike = async () => {
      if (!user || isGuest || !song) return;
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, song_id: song.id }),
      });
      const data = await res.json();
      setLiked(data.liked);
    };

    const handleDownload = async () => {
      if (!song || downloading) return;
      setDownloading(true);
      try {
        await downloadSong(song);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal mengunduh lagu');
      } finally {
        setDownloading(false);
      }
    };

    const handleShare = async () => {
      const url = window.location.href;
      const text = `🎵 Dengerin "${song?.title}" oleh ${song?.artist_name} di NeonBeat!\n${url}`;
      if (navigator.share) {
        try { await navigator.share({ title: song?.title, text, url }); } catch {}
      } else {
        await navigator.clipboard.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    const handleCopyLink = async () => {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const shareWA = () => {
      const url = window.location.href;
      const text = `🎵 Dengerin "${song?.title}" oleh ${song?.artist_name} di NeonBeat!\n${url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

    if (!song) return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex flex-col items-center justify-center gap-4">
        <Disc3 size={56} className="text-purple-500/30" />
        <p className="text-purple-300/50">Lagu tidak ditemukan</p>
        <button onClick={() => navigate(-1)} className="text-purple-400 underline text-sm">Kembali</button>
      </div>
    );

    return (
      <div className="min-h-screen bg-[#0a0010] pb-32">
        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-[#0a0010]/80 backdrop-blur-sm border border-purple-500/20 flex items-center justify-center text-white hover:bg-[#12001f] transition-all">
          <ArrowLeft size={18} />
        </button>

        {/* Blurred background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {song.cover_url && (
            <img src={song.cover_url} alt="" className="w-full h-full object-cover opacity-10 blur-3xl scale-110" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0010]/30 via-[#0a0010]/80 to-[#0a0010]" />
        </div>

        <div className="relative max-w-lg mx-auto px-4 pt-24 flex flex-col items-center">
          {/* Cover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="w-64 h-64 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(147,51,234,0.5)] mb-8"
          >
            {song.cover_url
              ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={80} className="text-purple-400" /></div>}
          </motion.div>

          {/* Song info */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center mb-6 w-full">
            <h1 className="text-2xl font-black text-white mb-1">{song.title}</h1>
            <Link to={`/user/${song.artist_id}`} className="text-purple-300/60 hover:text-purple-300 transition-colors flex items-center justify-center gap-1.5">
              {song.artist_name}
              {song.profiles?.is_verified && <BadgeCheck size={14} className="text-blue-400" />}
            </Link>
            {song.genres && (
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm"
                style={{ background: `${song.genres.color}20`, color: song.genres.color, border: `1px solid ${song.genres.color}30` }}>
                {song.genres.name}
              </span>
            )}
            <p className="text-purple-300/30 text-sm mt-2">{formatPlays(song.play_count || 0)} kali diputar</p>
          </motion.div>

          {/* Play button */}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => isActive ? togglePlay() : playSong(song, [song])}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.6)] mb-8"
          >
            {isActive && isPlaying
              ? <Pause size={32} className="text-white" />
              : <Play size={32} className="text-white ml-1" />}
          </motion.button>

          {/* Action row */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-6 mb-10">
            {user && !isGuest && (
              <>
                <button onClick={handleLike}
                  className={`flex flex-col items-center gap-1 transition-all ${liked ? 'text-pink-400' : 'text-purple-300/50 hover:text-pink-400'}`}>
                  <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
                  <span className="text-xs">Suka</span>
                </button>
                <button onClick={() => setShowPlaylistModal(true)}
                  className="flex flex-col items-center gap-1 text-purple-300/50 hover:text-purple-300 transition-all">
                  <ListPlus size={24} />
                  <span className="text-xs">Playlist</span>
                </button>
              </>
            )}
            <button onClick={handleDownload} disabled={downloading}
              className="flex flex-col items-center gap-1 text-purple-300/50 hover:text-purple-300 transition-all disabled:opacity-50">
              <Download size={24} className={downloading ? 'animate-pulse' : ''} />
              <span className="text-xs">Download</span>
            </button>
            <button onClick={handleShare}
              className="flex flex-col items-center gap-1 text-purple-300/50 hover:text-purple-300 transition-all">
              <Share2 size={24} />
              <span className="text-xs">Bagikan</span>
            </button>
          </motion.div>

          {/* Share links */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="w-full bg-[#12001f]/60 border border-purple-500/20 rounded-2xl p-4 space-y-2">
            <p className="text-purple-300/40 text-xs font-semibold uppercase tracking-widest mb-3">Bagikan Lagu</p>
            <button onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-white text-sm transition-all">
              <Copy size={16} className="text-purple-400" />
              {copied ? '✅ Link tersalin!' : 'Salin Link'}
            </button>
            <button onClick={shareWA}
              className="w-full flex items-center gap-3 px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl text-white text-sm transition-all">
              <MessageCircle size={16} className="text-green-400" />
              Bagikan ke WhatsApp
            </button>
          </motion.div>
        </div>

        {showPlaylistModal && song && (
          <AddToPlaylistModal song={song} onClose={() => setShowPlaylistModal(false)} />
        )}
      </div>
    );
  }
  