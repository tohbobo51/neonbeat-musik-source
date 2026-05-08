import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreVertical, Share2, Music, Disc3, ListMusic, User, BadgeCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import FollowButton from '../components/FollowButton';
import SongCard from '../components/SongCard';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { playSong } = usePlayer();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any | null>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDotMenu, setShowDotMenu] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/profiles?user_id=${id}`).then(r => r.json()),
      fetch(`/api/songs?artist_id=${id}`).then(r => r.json()),
      fetch(`/api/playlists?user_id=${id}&public_only=true`).then(r => r.json()),
    ]).then(([prof, s, pl]) => {
      setProfile(prof);
      setSongs(Array.isArray(s) ? s.filter((song: any) => song.is_active) : []);
      setPlaylists(Array.isArray(pl) ? pl : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const isOwn = user?.id === id;
  const isArtist = profile?.is_artist || profile?.role === 'artist' || profile?.role === 'admin';
  const displayName = profile?.full_name || profile?.username || 'User';
  const initials = displayName.charAt(0).toUpperCase();

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: displayName, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link profil disalin!');
    }
    setShowDotMenu(false);
  };

  if (isOwn) { navigate('/profile'); return null; }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex flex-col items-center justify-center gap-4">
        <User size={56} className="text-purple-500/30" />
        <p className="text-purple-300/50">Profil tidak ditemukan</p>
        <button onClick={() => navigate(-1)} className="text-purple-400 underline text-sm">Kembali</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0010] pb-32">

      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-[#0a0010]/80 backdrop-blur-sm border border-purple-500/20 flex items-center justify-center text-white hover:bg-[#12001f] transition-all">
        <ArrowLeft size={18} />
      </button>

      {/* Hero Header */}
      <div className="relative">
        <div className="h-52 bg-gradient-to-b from-purple-800/80 via-purple-900/60 to-[#0a0010] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-600/30 to-[#0a0010]" />
          <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute top-0 right-10 w-32 h-32 rounded-full bg-pink-500/15 blur-3xl" />
        </div>

        {/* Avatar */}
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
      </div>

      {/* Content */}
      <div className="pt-14 px-4">

        {/* Name + username + counts */}
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-white leading-tight flex items-center gap-2">
                {displayName}
                {profile.is_verified && <BadgeCheck size={22} className="text-blue-400 flex-shrink-0" />}
              </h1>
              <p className="text-purple-300/50 text-sm">@{profile.username}</p>
            </div>
            {isArtist && (
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold border border-purple-500/30 mt-1">
                Artis
              </span>
            )}
          </div>
          {profile.bio && <p className="text-purple-300/60 text-sm mt-2">{profile.bio}</p>}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm">
              <span className="text-white font-bold">{profile.follower_count || 0}</span>
              <span className="text-purple-300/50"> pengikut</span>
            </span>
            <span className="text-purple-300/30">•</span>
            <span className="text-sm">
              <span className="text-white font-bold">{profile.following_count || 0}</span>
              <span className="text-purple-300/50"> mengikuti</span>
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-8">
          {user && <FollowButton artistId={id!} />}

          {/* Dot menu */}
          <div className="relative">
            <motion.button whileTap={{ scale: 0.9 }}
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Artist songs */}
        {isArtist && songs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-4">Populer</h2>
            <div className="space-y-2">
              {songs.slice(0, 5).map((song, i) => (
                <motion.div key={song.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer"
                  onClick={() => playSong(song, songs)}>
                  <span className="text-purple-300/30 text-sm w-4 flex-shrink-0">{i + 1}</span>
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                    {song.cover_url
                      ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={16} className="text-purple-400" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{song.title}</p>
                    <p className="text-purple-300/50 text-xs">{song.play_count || 0} diputar</p>
                  </div>
                </motion.div>
              ))}
            </div>
            {songs.length > 5 && (
              <p className="text-purple-300/40 text-sm text-center mt-3">+{songs.length - 5} lagu lainnya</p>
            )}
          </div>
        )}

        {/* Public playlists */}
        {playlists.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Playlist</h2>
            </div>
            <div className="space-y-2">
              {playlists.slice(0, 4).map((pl, i) => (
                <motion.div key={pl.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/playlists/${pl.id}`)}>
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                    {pl.cover_url
                      ? <img src={pl.cover_url} alt="" className="w-full h-full object-cover" />
                      : <ListMusic size={16} className="text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{pl.name}</p>
                    <p className="text-purple-300/50 text-xs">{pl.song_count || 0} lagu</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for non-artist */}
        {!isArtist && playlists.length === 0 && (
          <div className="text-center py-16">
            <Disc3 size={56} className="text-purple-500/20 mx-auto mb-3" />
            <p className="text-purple-300/40">Tidak ada aktivitas terbaru</p>
          </div>
        )}
      </div>

      {showDotMenu && <div className="fixed inset-0 z-0" onClick={() => setShowDotMenu(false)} />}
    </div>
  );
}
