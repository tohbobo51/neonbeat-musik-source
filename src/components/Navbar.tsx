import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Home, Search, Library, History, User, LogOut, Crown, Menu, X, Heart, ListMusic, Upload, Sparkles, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import QueuePanel from './QueuePanel';
import { usePlayer } from '../context/PlayerContext';
import { ListMusic as QueueIcon } from 'lucide-react';

export default function Navbar() {
  const { user, profile, isGuest, isAdmin, isArtist, signOut, displayName } = useAuth();
  const { currentSong } = usePlayer();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const navLinks = [
    { to: '/', icon: Home, label: 'Beranda' },
    { to: '/search', icon: Search, label: 'Cari' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/recommendations', icon: Sparkles, label: 'Rekomendasi' },
    ...(!isGuest && user ? [
      { to: '/history', icon: History, label: 'Riwayat' },
      { to: '/liked', icon: Heart, label: 'Disukai' },
      { to: '/playlists', icon: ListMusic, label: 'Playlist' },
      ...(isArtist ? [
        { to: '/my-music', icon: Upload, label: 'Musik Saya' },
        { to: '/artist-stats', icon: BarChart3, label: 'Statistik' },
      ] : []),
    ] : []),
    ...(isAdmin ? [{ to: '/admin', icon: Crown, label: 'Admin' }] : []),
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0010]/90 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_#9333ea]">
              <Music size={16} className="text-white" />
            </div>
            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 hidden sm:block" style={{ fontFamily: 'Orbitron, monospace' }}>NeonBeat</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  location.pathname === to
                    ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_10px_rgba(147,51,234,0.2)]'
                    : 'text-purple-300/60 hover:text-purple-300 hover:bg-purple-500/10'
                }`}>
                <Icon size={15} />{label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Queue button */}
            {currentSong && (
              <button onClick={() => setQueueOpen(true)} className="p-2 text-purple-300/60 hover:text-purple-300 transition-colors hidden md:flex">
                <QueueIcon size={18} />
              </button>
            )}

            {/* Notifikasi */}
            {user && !isGuest && <NotificationBell />}

            {isGuest ? (
              <Link to="/auth" className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-semibold shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] transition-all">
                Masuk
              </Link>
            ) : user ? (
              <div className="flex items-center gap-1">
                {/* Settings icon — desktop only */}
                <Link to="/settings" className="p-2 text-purple-300/50 hover:text-purple-300 transition-colors hidden lg:flex">
                  <Settings size={16} />
                </Link>
                <Link to="/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-500/10 transition-all">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-purple-500/40" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <User size={14} className="text-white" />
                    </div>
                  )}
                  <span className="text-purple-300 text-sm hidden xl:block">{displayName}</span>
                </Link>
                <button onClick={signOut} className="p-2 text-purple-300/50 hover:text-purple-300 transition-colors hidden lg:flex">
                  <LogOut size={16} />
                </button>
              </div>
            ) : null}
            <button className="lg:hidden text-purple-300 p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 z-40 bg-[#0a0010]/95 backdrop-blur-xl border-b border-purple-500/20 p-4 max-h-[80vh] overflow-y-auto">

            {/* Profile summary if logged in */}
            {user && profile && (
              <Link to="/profile" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500/30 flex-shrink-0">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><User size={16} className="text-white" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{displayName}</p>
                  <p className="text-purple-300/50 text-xs">@{profile.username}</p>
                </div>
              </Link>
            )}

            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 text-sm font-medium transition-all ${
                  location.pathname === to ? 'bg-purple-500/20 text-purple-300' : 'text-purple-300/60'
                }`}>
                <Icon size={18} />{label}
              </Link>
            ))}

            {/* Settings link in mobile menu */}
            {user && (
              <Link to="/settings" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 text-sm font-medium transition-all ${
                  location.pathname === '/settings' ? 'bg-purple-500/20 text-purple-300' : 'text-purple-300/60'
                }`}>
                <Settings size={18} /> Pengaturan
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
    </>
  );
}
