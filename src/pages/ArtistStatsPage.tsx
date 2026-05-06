import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Play, Heart, Users, Music, TrendingUp, Disc3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';

export default function ArtistStatsPage() {
  const { user, isArtist } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isArtist) return;
    fetch(`/api/extras?route=artist-stats&artist_id=${user.id}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user, isArtist]);

  if (!isArtist) return (
    <div className="min-h-screen bg-[#0a0010] pt-20 flex items-center justify-center">
      <p className="text-purple-300/40">Hanya untuk artis</p>
    </div>
  );

  const statCards = [
    { label: 'Total Play', value: stats?.totalPlays || 0, icon: Play, color: '#9333ea' },
    { label: 'Total Like', value: stats?.totalLikes || 0, icon: Heart, color: '#ec4899' },
    { label: 'Total Lagu', value: stats?.totalSongs || 0, icon: Music, color: '#a855f7' },
    { label: 'Pengikut', value: stats?.followerCount || 0, icon: Users, color: '#06b6d4' },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 size={28} className="text-purple-400" />
            <h1 className="text-3xl font-black text-white">Statistik Artis</h1>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#12001f]/60 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {statCards.map(({ label, value, icon: Icon, color }, i) => (
                  <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-purple-300/60 text-sm">{label}</span>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <p className="text-3xl font-black text-white">{value.toLocaleString('id-ID')}</p>
                  </motion.div>
                ))}
              </div>

              {/* Grafik plays per hari */}
              <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={18} className="text-purple-400" />
                  <h2 className="text-white font-bold">Plays 7 Hari Terakhir</h2>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats?.playsPerDay || []}>
                    <defs>
                      <linearGradient id="playGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#9333ea15" />
                    <XAxis dataKey="date" tick={{ fill: '#9333ea60', fontSize: 11 }}
                      tickFormatter={(v: any) => new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
                    <YAxis tick={{ fill: '#9333ea60', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#12001f', border: '1px solid #9333ea40', borderRadius: 12, color: '#fff' }}
                      labelFormatter={(v: any) => new Date(v).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} />
                    <Area type="monotone" dataKey="plays" stroke="#9333ea" strokeWidth={2} fill="url(#playGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Top Songs */}
              {stats?.topSongs?.length > 0 && (
                <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6">
                  <h2 className="text-white font-bold mb-4">Lagu Terpopuler</h2>
                  <div className="space-y-3">
                    {stats.topSongs.map((song: any, i: number) => (
                      <div key={song.id} className="flex items-center gap-4">
                        <span className="text-2xl font-black text-purple-500/30 w-6 text-center">{i + 1}</span>
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={14} className="text-purple-400" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate text-sm">{song.title}</p>
                        </div>
                        <div className="flex items-center gap-1 text-purple-300/50 text-sm">
                          <Play size={12} />
                          <span>{(song.play_count || 0).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
