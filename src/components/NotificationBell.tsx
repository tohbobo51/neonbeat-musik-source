import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Heart, UserPlus, Music, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetch_ = async () => {
    if (!user) return;
    const res = await fetch(`/api/extras?route=notifications&user_id=${user.id}`);
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnread(data.unread || 0);
  };

  useEffect(() => {
    if (!user) return;
    fetch_();

    // Supabase Realtime: dengarkan INSERT baru di tabel notifications untuk user ini
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { fetch_(); }
      )
      .subscribe();

    // Polling fallback setiap 30 detik
    const t = setInterval(fetch_, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAll = async () => {
    await fetch('/api/extras?route=notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user?.id }) });
    fetch_();
  };

  const clearAll = async () => {
    await fetch('/api/extras?route=notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user?.id }) });
    setNotifications([]); setUnread(0);
  };

  const icons: Record<string, any> = { follow: UserPlus, like: Heart, upload: Music, collaboration: Users, default: Bell };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); if (!open && unread > 0) markAll(); }}
        className="relative p-2 text-purple-300/60 hover:text-purple-300 transition-colors">
        <Bell size={18} />
        {unread > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pink-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold shadow-[0_0_8px_rgba(236,72,153,0.8)]">
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="fixed right-4 top-16 w-80 max-w-[calc(100vw-2rem)] bg-[#12001f] border border-purple-500/30 rounded-2xl shadow-[0_0_40px_rgba(147,51,234,0.3)] overflow-hidden z-[100]"
          >
            <div className="p-3 border-b border-purple-500/20 flex items-center justify-between">
              <h3 className="text-white font-bold text-sm">Notifikasi</h3>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <>
                    <button onClick={markAll} className="text-purple-300/50 hover:text-purple-300 text-xs flex items-center gap-1"><Check size={12} /> Baca semua</button>
                    <button onClick={clearAll} className="text-red-400/50 hover:text-red-400"><Trash2 size={12} /></button>
                  </>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell size={32} className="text-purple-500/20 mx-auto mb-2" />
                  <p className="text-purple-300/30 text-sm">Belum ada notifikasi</p>
                </div>
              ) : notifications.map(n => {
                const Icon = icons[n.type] || icons.default;
                return (
                  <div key={n.id} className={`flex gap-3 p-3 border-b border-purple-500/10 transition-colors ${ !n.is_read ? 'bg-purple-500/5' : '' }`}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: n.type === 'follow' ? '#9333ea20' : n.type === 'like' ? '#ec489920' : n.type === 'collaboration' ? '#a855f720' : '#a855f720' }}>
                      <Icon size={14} style={{ color: n.type === 'follow' ? '#9333ea' : n.type === 'like' ? '#ec4899' : '#a855f7' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold">{n.title}</p>
                      <p className="text-purple-300/50 text-xs truncate">{n.message}</p>
                      <p className="text-purple-300/30 text-[10px] mt-0.5">{new Date(n.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 mt-1 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
