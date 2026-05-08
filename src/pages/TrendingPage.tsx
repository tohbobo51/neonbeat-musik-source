import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Play, Disc3, BadgeCheck, Radio } from 'lucide-react';
import { usePlayer, Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

interface TrendingSong extends Song {
  trend_rank: number;
  weekly_plays: number;
}

export default function TrendingPage() {
  const { playSong, currentSong, isPlaying, radioMode, setRadioMode } = usePlayer();
  const { isGuest } = useAuth();

  const [songs, setSongs] = useState<TrendingSong[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/genres').then(r => r.json()).then(d => { if (Array.isArray(d)) setGenres(d); });
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = `/api/extras?route=trending&limit=20${selectedGenre ? `&genre_id=${selectedGenre}` : ''}`;
    fetch(url).then(r => r.json()).then(data => {
      setSongs(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedGenre]);

  const handlePlay = (song: TrendingSong) => {
    playSong(song, songs);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) playSong(songs[0], songs);
  };

  const rankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-purple-300/30';
  };

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="h-40 bg-gradient-to-b from-pink-900/60 via-purple-900/40 to-[#0a0010]">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-pink-500/15 blur-3xl" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp size={28} className="text-pink-400" />
            <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>Charts</h1>
          </div>
          <p className="text-purple-300/50 text-sm">Lagu terpopuler minggu ini</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Controls row */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Play all */}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handlePlayAll}
            disabled={songs.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold text-sm disabled:opacity-40 shadow-[0_0_16px_rgba(147,51,234,0.4)]">
            <Play size={16} fill="white" /> Putar Semua
          </motion.button>

          {/* Radio mode toggle */}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setRadioMode(!radioMode)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm border transition-all ${
              radioMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(147,51,234,0.3)]'
                : 'border-purple-500/20 text-purple-300/50 hover:border-purple-500/40'
            }`}>
            <Radio size={15} className={radioMode ? 'text-purple-400' : ''} />
            Radio {radioMode ? 'ON' : 'OFF'}
          </motion.button>
        </div>

        {/* Genre filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <button onClick={() => setSelectedGenre('')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              !selectedGenre ? 'bg-white text-black' : 'bg-[#12001f] text-purple-300/60 border border-purple-500/20'
            }`}>
            Semua Genre
          </button>
          {genres.map(g => (
            <button key={g.id} onClick={() => setSelectedGenre(g.id === selectedGenre ? '' : g.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
                selectedGenre === g.id
                  ? 'text-white border-transparent'
                  : 'bg-[#12001f] text-purple-300/60 border-purple-500/20'
              }`}
              style={selectedGenre === g.id ? { background: g.color, borderColor: g.color } : {}}>
              {g.name}
            </button>
          ))}
        </div>

        {/* Song list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-[#12001f]/60 rounded-xl animate-pulse">
                <div className="w-8 h-4 bg-purple-900/40 rounded" />
                <div className="w-12 h-12 bg-purple-900/40 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-purple-900/40 rounded w-3/4" />
                  <div className="h-3 bg-purple-900/30 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 size={64} className="text-purple-500/20 mx-auto mb-4" />
            <p className="text-purple-300/40">Belum ada data trending</p>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((song, i) => {
              const isActive = currentSong?.id === song.id;
              return (
                <motion.div key={song.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => handlePlay(song)}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group ${
                    isActive
                      ? 'bg-purple-500/15 border border-purple-500/40'
                      : 'bg-[#12001f]/60 border border-purple-500/0 hover:border-purple-500/20 hover:bg-[#12001f]/90'
                  }`}>
                  {/* Rank */}
                  <div className={`w-7 text-center font-black text-lg flex-shrink-0 ${rankColor(song.trend_rank)}`}>
                    {song.trend_rank <= 3 ? (
                      <span>{['🥇','🥈','🥉'][song.trend_rank - 1]}</span>
                    ) : (
                      <span className="text-sm">{song.trend_rank}</span>
                    )}
                  </div>

                  {/* Cover */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                    {song.cover_url
                      ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={18} className="text-purple-400" /></div>}
                    {isActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex gap-0.5 items-end h-4">
                          {[1,2,3].map(j => (
                            <motion.div key={j} className="w-0.5 bg-purple-400 rounded-full"
                              animate={isPlaying ? { height: ['3px','10px','3px'] } : { height: '3px' }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.15 }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isActive ? 'text-purple-300' : 'text-white'}`}>{song.title}</p>
                    <p className="text-purple-300/50 text-xs truncate flex items-center gap-1">
                      {song.artist_name}
                      {song.profiles?.is_verified && <BadgeCheck size={10} className="text-blue-400 flex-shrink-0" />}
                    </p>
                    {song.genres && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${song.genres.color}20`, color: song.genres.color }}>
                        {song.genres.name}
                      </span>
                    )}
                  </div>

                  {/* Play count */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-white font-bold text-sm">{(song.weekly_plays || song.play_count || 0).toLocaleString()}</p>
                    <p className="text-purple-300/30 text-xs">diputar</p>
                  </div>

                  {/* Play icon on hover */}
                  <div className={`flex-shrink-0 ${isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <Play size={18} className="text-purple-400" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
