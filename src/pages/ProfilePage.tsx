import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, MoreVertical, Share2, Music, Disc3, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from 'react-router-dom';
import SongCard from '../components/SongCard';

export default function ProfilePage() {
  const { user, profile, isArtist, displayName } = useAuth();
  const { playSong } = usePlayer();
  const navigate = useNavigate();

  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);

  const followerCount = profile?.follower_count || 0;
  const followingCount = profile?.following_count || 0;

  useEffect(() => {
    if (isArtist && user) {
      setLoading(true);
      fetch(`/api/songs?artist_id=${user.id}`)
        .then(r => r.json())
        .then(data => { setSongs(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [isArtist, user]);

  const handleShare = async () => {
    const url = `${window.location.origin}/user/${user?.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: displayName, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link profil disalin!');
    }
    setShowDotMenu(false);
  };

  if (!user || !profile) return null;

  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a0010] pb-32">

      {/* Hero Header */}
      <div className="relative">
        {/* Gradient background */}
        <div className="h-52 bg-gradient-to-b from-purple-800 via-purple-900 to-[#0a0010] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-600/40 to-[#0a0010]" />
          {/* Decorative blur circles */}
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="absolute -top-5 right-10 w-32 h-32 rounded-full bg-pink-500/20 blur-3xl" />
        </div>

        {/* Avatar positioned over gradient */}
        <div className="absolute left-6" style={{ bottom: '-44px' }}>
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#0a0010] shadow-[0_0_30px_rgba(147,51,234,0.5)]">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <span className="text-4xl font-black text-white">{initials}</span>
              </div>
            )}
          </div>
        </div>

        {/* Settings icon top right */}
        <button onClick={() => navigate('/settings')}
          className="absolute top-14 right-4 p-2 text-white/60 hover:text-white transition-colors">
          <Settings size={22} />
        </button>
      </div>

      {/* Content below header */}
      <div className="pt-14 px-4">

        {/* Name + username + counts */}
        <div className="mb-4">
          <h1 className="text-2xl font-black text-white leading-tight">{displayName}</h1>
          <p className="text-purple-300/50 text-sm">@{profile.username}</p>
          {profile.bio && <p className="text-purple-300/60 text-sm mt-1.5">{profile.bio}</p>}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm">
              <span className="text-white font-bold">{followerCount}</span>
              <span className="text-purple-300/50"> pengikut</span>
            </span>
            <span className="text-purple-300/30">•</span>
            <span className="text-sm">
              <span className="text-white font-bold">{followingCount}</span>
              <span className="text-purple-300/50"> mengikuti</span>
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-8">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/profile/edit')}
            className="flex items-center gap-2 px-5 py-2 border border-white/30 rounded-full text-white font-semibold text-sm hover:border-white/60 transition-all">
            <Edit2 size={14} /> Edit
          </motion.button>

          {/* Dot menu */}
          <div className="relative">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
              onClick={() => setShowDotMenu(v => !v)}
              className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white hover:border-white/60 transition-all">
              <MoreVertical size={16} />
            </motion.button>
            <AnimatePresence>
              {showDotMenu && (
                <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute left-0 top-full mt-2 w-44 bg-[#1a0030] border border-purple-500/30 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden z-10">
                  <button onClick={handleShare} className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-purple-500/10 transition-colors text-sm">
                    <Share2 size={15} className="text-purple-400" /> Bagikan Profil
                  </button>
                  <button onClick={() => { navigate('/settings'); setShowDotMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-purple-500/10 transition-colors text-sm">
                    <Settings size={15} className="text-purple-400" /> Pengaturan
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Role badge */}
          {isArtist && (
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold border border-purple-500/30">
              Artis
            </span>
          )}
        </div>

        {/* Content */}
        {isArtist ? (
          <div>
            <h2 className="text-white font-bold text-lg mb-4">Lagu Saya</h2>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-[#12001f]/60 rounded-xl p-3 animate-pulse"><div className="aspect-square bg-purple-900/30 rounded-lg mb-3" /><div className="h-4 bg-purple-900/30 rounded mb-2" /></div>)}
              </div>
            ) : songs.length === 0 ? (
              <div className="text-center py-12">
                <Music size={48} className="text-purple-500/20 mx-auto mb-3" />
                <p className="text-purple-300/40">Belum ada lagu diupload</p>
                <button onClick={() => navigate('/upload')}
                  className="mt-4 px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold text-sm">
                  Upload Lagu
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {songs.map((song, i) => (
                  <motion.div key={song.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <SongCard song={song} queue={songs} isLiked={false} onLike={() => {}} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <Disc3 size={56} className="text-purple-500/20 mx-auto mb-3" />
            <p className="text-white font-bold text-lg mb-1">Tidak ada aktivitas terbaru</p>
            <p className="text-purple-300/40 text-sm">Mulai dengarkan musik dan temukan artis favoritmu!</p>
            <button onClick={() => navigate('/')}
              className="mt-5 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold text-sm">
              Mulai Dengarkan
            </button>
          </div>
        )}
      </div>

      {/* Backdrop for dot menu */}
      {showDotMenu && <div className="fixed inset-0 z-0" onClick={() => setShowDotMenu(false)} />}
    </div>
  );
}
