import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FollowButton({ artistId, size = 'md', onFollowChange }: { artistId: string; size?: 'sm' | 'md'; onFollowChange?: (newCount: number) => void }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.id === artistId) return;
    fetch(`/api/extras?route=follows&follower_id=${user.id}&artist_id=${artistId}`)
      .then(r => r.json()).then(d => setFollowing(d.following));
  }, [user, artistId]);

  if (!user || user.id === artistId) return null;

  const toggle = async () => {
    setLoading(true);
    const res = await fetch('/api/extras?route=follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ follower_id: user.id, artist_id: artistId }) });
    const data = await res.json();
    setFollowing(data.following);
    if (onFollowChange) onFollowChange(data.follower_count ?? -1);
    setLoading(false);
  };

  const sm = size === 'sm';
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggle} disabled={loading}
      className={`flex items-center gap-1.5 rounded-xl font-semibold transition-all disabled:opacity-50 ${
        sm ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${
        following
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
          : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
      }`}>
      {following ? <><UserCheck size={sm ? 12 : 14} /> Mengikuti</> : <><UserPlus size={sm ? 12 : 14} /> Ikuti</>}
    </motion.button>
  );
}
