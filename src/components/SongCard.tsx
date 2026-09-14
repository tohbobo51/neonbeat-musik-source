import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, Plus, Share2, Copy, MessageCircle, BadgeCheck, Disc3, Download } from 'lucide-react';
import { useState } from 'react';
import { usePlayer, Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { downloadSong } from '../lib/songDownload';

interface Props {
  song: Song;
  queue?: Song[];
  onLike?: (id: string) => void;
  isLiked?: boolean;
  onAddToPlaylist?: (song: Song) => void;
}

function shareSong(song: Song) {
  const url = `${window.location.origin}/song/${song.id}`;
  const text = `🎵 Dengerin "${song.title}" oleh ${song.artist_name} di NeonBeat!\n${url}`;
  return { url, text };
}

export default function SongCard({ song, queue, onLike, isLiked, onAddToPlaylist }: Props) {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { user, isGuest } = useAuth();
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const isActive = currentSong?.id === song.id;
  const isVerified = song.profiles?.is_verified;

  const handleCopyLink = async () => {
    const { url } = shareSong(song);
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => { setCopied(false); setShowShare(false); }, 1500);
  };

  const handleWhatsApp = () => {
    const { text } = shareSong(song);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShare(false);
  };

  const handleDownload = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadSong(song);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengunduh lagu');
    } finally {
      setDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    const { url, text } = shareSong(song);
    try {
      await navigator.share({ title: song.title, text, url });
    } catch {}
    setShowShare(false);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`relative group bg-[#12001f]/80 border rounded-xl p-3 cursor-pointer transition-all ${
        isActive
          ? 'border-purple-500/60 shadow-[0_0_20px_rgba(147,51,234,0.3)]'
          : 'border-purple-500/10 hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(147,51,234,0.15)]'
      }`}
      onClick={() => playSong(song, queue || [song])}
    >
      {/* Cover */}
      <div className="relative mb-3 aspect-square rounded-lg overflow-hidden">
        {song.cover_url ? (
          <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
            <Disc3 size={32} className="text-purple-400" />
          </div>
        )}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <motion.div
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.6)]"
          >
            {isActive && isPlaying ? (
              <div className="flex gap-0.5 items-end h-4">
                {[1,2,3].map(i => (
                  <motion.div key={i} className="w-1 bg-white rounded-full"
                    animate={{ height: ['4px', '12px', '4px'] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            ) : <Play size={16} className="text-white ml-0.5" />}
          </motion.div>
        </div>
        {isActive && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,1)]" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className={`font-semibold text-sm truncate ${isActive ? 'text-purple-300' : 'text-white'}`}>{song.title}</p>
        <p className="text-purple-300/50 text-xs truncate mt-0.5 flex items-center gap-1">
          {song.artist_name}
          {isVerified && <BadgeCheck size={11} className="text-blue-400 flex-shrink-0" />}
        </p>
        {song.genres && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs"
            style={{ background: `${song.genres.color}20`, color: song.genres.color }}>
            {song.genres.name}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        {user && !isGuest && onLike && (
          <button onClick={() => onLike(song.id)}
            className={`p-1.5 rounded-lg transition-all ${
              isLiked ? 'text-pink-400 bg-pink-500/20' : 'text-purple-300/60 hover:text-pink-400 bg-black/30'
            }`}>
            <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        )}
        {user && !isGuest && onAddToPlaylist && (
          <button onClick={() => onAddToPlaylist(song)} className="p-1.5 rounded-lg text-purple-300/60 hover:text-purple-300 bg-black/30">
            <Plus size={14} />
          </button>
        )}
        <button onClick={handleDownload} disabled={downloading} aria-label="Download lagu" title="Download lagu" className="p-1.5 rounded-lg text-purple-300/60 hover:text-purple-300 bg-black/30 disabled:opacity-50">
          <Download size={14} className={downloading ? 'animate-pulse' : ''} />
        </button>
        {/* Share button */}
        <div className="relative">
          <button onClick={() => setShowShare(v => !v)} className="p-1.5 rounded-lg text-purple-300/60 hover:text-purple-300 bg-black/30">
            <Share2 size={14} />
          </button>
          <AnimatePresence>
            {showShare && (
              <motion.div initial={{ opacity: 0, scale: 0.85, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85 }}
                className="absolute right-0 top-full mt-1 w-44 bg-[#1a0030] border border-purple-500/30 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.6)] overflow-hidden z-20">
                <button onClick={handleCopyLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-white hover:bg-purple-500/10 transition-colors text-xs">
                  <Copy size={13} className="text-purple-400" />
                  {copied ? 'Tersalin!' : 'Salin Link'}
                </button>
                <button onClick={handleWhatsApp}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-white hover:bg-green-500/10 transition-colors text-xs">
                  <MessageCircle size={13} className="text-green-400" />
                  Bagikan ke WhatsApp
                </button>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button onClick={handleNativeShare}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-white hover:bg-purple-500/10 transition-colors text-xs">
                    <Share2 size={13} className="text-purple-400" />
                    Bagikan lainnya...
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showShare && <div className="fixed inset-0 z-10" onClick={() => setShowShare(false)} />}
    </motion.div>
  );
}
