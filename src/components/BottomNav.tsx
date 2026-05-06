import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Library, User, Sparkles, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const { user, isGuest, isAdmin } = useAuth();
  const { currentSong } = usePlayer();
  const location = useLocation();

  const playerOffset = currentSong ? 'pb-[136px]' : 'pb-[56px]';

  const links = [
    { to: '/', icon: Home, label: 'Beranda' },
    { to: '/search', icon: Search, label: 'Cari' },
    { to: '/recommendations', icon: Sparkles, label: 'Untuk Kamu' },
    { to: '/library', icon: Library, label: 'Library' },
    ...(isAdmin ? [{ to: '/admin', icon: Crown, label: 'Admin' }] : []),
    { to: user && !isGuest ? '/profile' : '/auth', icon: User, label: user && !isGuest ? 'Profil' : 'Masuk' },
  ];

  return (
    <>
      <div className={`lg:hidden ${playerOffset}`} />
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0a0010]/95 backdrop-blur-xl border-t border-purple-500/20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-stretch justify-around h-14">
          {links.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} className="flex flex-col items-center justify-center flex-1 gap-0.5 relative group">
                {active && (
                  <motion.div layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(147,51,234,0.8)' }} />
                )}
                <motion.div animate={active ? { scale: 1.1 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  <Icon size={20} className={`transition-colors ${active ? 'text-purple-400' : 'text-purple-300/40 group-hover:text-purple-300/70'}`}
                    style={active ? { filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.8))' } : {}} />
                </motion.div>
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-purple-400' : 'text-purple-300/40'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
