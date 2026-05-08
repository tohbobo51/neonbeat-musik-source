import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Disc3, Clock, User, Music, Users } from 'lucide-react';
import SongCard from '../components/SongCard';
import { Song } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from 'react-router-dom';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import FollowButton from '../components/FollowButton';

const HISTORY_KEY = 'neonbeat_search_history';
const MAX_HISTORY = 8;

type Tab = 'semua' | 'lagu' | 'artis' | 'profil';

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function addToHistory(q: string) {
  if (!q.trim()) return;
  const prev = getHistory().filter(h => h !== q.trim());
  localStorage.setItem(HISTORY_KEY, JSON.stringify([q.trim(), ...prev].slice(0, MAX_HISTORY)));
}
function removeFromHistory(q: string) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter(h => h !== q)));
}
function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export default function SearchPage() {
  const { user, isGuest } = useAuth();
  const { playSong } = usePlayer();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('semua');
  const [songs, setSongs] = useState<Song[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [likes, setLikes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>(getHistory);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);

  useEffect(() => {
    if (user && !isGuest) {
      fetch(`/api/likes?user_id=${user.id}`).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setLikes(data.map((l: any) => l.song_id));
      });
    }
  }, [user]);

  useEffect(() => {
    if (!query.trim()) { setSongs([]); setProfiles([]); setArtists([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      addToHistory(query.trim());
      setHistory(getHistory());
      const [songsRes, profilesRes, artistsRes] = await Promise.all([
        fetch(`/api/songs?search=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => []),
        fetch(`/api/profiles?search=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => []),
        fetch(`/api/profiles?search=${encodeURIComponent(query)}&is_artist=true`).then(r => r.json()).catch(() => []),
      ]);
      setSongs(Array.isArray(songsRes) ? songsRes : []);
      setProfiles(Array.isArray(profilesRes) ? profilesRes : []);
      setArtists(Array.isArray(artistsRes) ? artistsRes : []);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const handleLike = async (songId: string) => {
    if (!user || isGuest) return;
    await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, song_id: songId }) });
    const res = await fetch(`/api/likes?user_id=${user.id}`);
    const data = await res.json();
    if (Array.isArray(data)) setLikes(data.map((l: any) => l.song_id));
  };

  const pickHistory = (q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  };

  const hasResults = songs.length > 0 || profiles.length > 0 || artists.length > 0;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'semua', label: 'Semua' },
    { key: 'lagu', label: 'Lagu' },
    { key: 'artis', label: 'Artis' },
    { key: 'profil', label: 'Profil' },
  ];

  const filteredSongs: Song[] = (activeTab === 'semua' || activeTab === 'lagu') ? songs : [];
  const filteredArtists: any[] = (activeTab === 'semua' || activeTab === 'artis') ? artists : [];
  const filteredProfiles: any[] = activeTab === 'semua'
    ? profiles.filter((p: any) => !p.is_artist)
    : activeTab === 'profil'
      ? profiles
      : [];

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Search bar */}
        <div className="relative mb-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
          <input
            ref={inputRef}
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Cari lagu, artis, profil..."
            className="w-full bg-[#12001f] border border-purple-500/30 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 focus:shadow-[0_0_20px_rgba(147,51,234,0.2)] transition-all text-base"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300/60 hover:text-purple-300">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Search history (no query) */}
        {!query && (
          <AnimatePresence>
            {history.length > 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white font-bold text-base">Pencarian Terbaru</p>
                  <button onClick={() => { clearHistory(); setHistory([]); }}
                    className="text-purple-300/40 hover:text-purple-300 text-xs transition-colors">
                    Hapus semua
                  </button>
                </div>
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <motion.div key={h} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#12001f]/60 transition-all cursor-pointer group">
                      <Clock size={16} className="text-purple-300/40 flex-shrink-0" />
                      <span className="flex-1 text-purple-300/70 text-sm" onClick={() => pickHistory(h)}>{h}</span>
                      <button onClick={() => { removeFromHistory(h); setHistory(getHistory()); }}
                        className="opacity-0 group-hover:opacity-100 text-purple-300/40 hover:text-purple-300 transition-all">
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <Disc3 size={64} className="text-purple-500/20 mx-auto mb-4" />
                <p className="text-purple-300/30 text-base">Ketik untuk mencari musik, artis, atau profil</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Results with tabs */}
        {query && (
          <div>
            {/* Filter tabs */}
            {!loading && hasResults && (
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {tabs.map(({ key, label }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                      activeTab === key
                        ? 'bg-white text-black'
                        : 'bg-[#12001f] text-purple-300/60 border border-purple-500/20 hover:border-purple-500/40'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Loading skeletons */}
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-[#12001f]/60 rounded-xl p-3 animate-pulse">
                    <div className="aspect-square bg-purple-900/30 rounded-lg mb-3" />
                    <div className="h-4 bg-purple-900/30 rounded mb-2" />
                    <div className="h-3 bg-purple-900/20 rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {!loading && !hasResults && (
              <div className="text-center py-16">
                <Search size={48} className="text-purple-500/30 mx-auto mb-4" />
                <p className="text-purple-300/40">Tidak ada hasil untuk "{query}"</p>
              </div>
            )}

            {/* Songs */}
            {!loading && filteredSongs.length > 0 && (
              <div className="mb-8">
                {(activeTab === 'semua') && <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Music size={16} className="text-purple-400" /> Lagu</h3>}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredSongs.map((song, i) => (
                    <motion.div key={song.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <SongCard song={song} queue={filteredSongs} isLiked={likes.includes(song.id)} onLike={handleLike}
                        onAddToPlaylist={user && !isGuest ? setAddToPlaylistSong : undefined} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Artists */}
            {!loading && filteredArtists.length > 0 && (
              <div className="mb-8">
                {activeTab === 'semua' && <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Users size={16} className="text-purple-400" /> Artis</h3>}
                <div className="space-y-2">
                  {filteredArtists.map((artist, i) => (
                    <motion.div key={artist.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer"
                      onClick={() => navigate(`/user/${artist.user_id}`)}>
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-purple-500/20">
                        {artist.avatar_url
                          ? <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gradient-to-br from-purple-700 to-pink-700 flex items-center justify-center">
                              <span className="text-lg font-black text-white">{(artist.full_name || artist.username).charAt(0).toUpperCase()}</span>
                            </div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold truncate">{artist.full_name || artist.username}</p>
                        <p className="text-purple-300/40 text-xs">Artis • {artist.follower_count || 0} pengikut</p>
                      </div>
                      {user && <FollowButton artistId={artist.user_id} size="sm" />}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Profiles (non-artists) */}
            {!loading && filteredProfiles.length > 0 && (
              <div className="mb-8">
                {activeTab === 'semua' && <h3 className="text-white font-bold mb-3 flex items-center gap-2"><User size={16} className="text-purple-400" /> Profil</h3>}
                <div className={activeTab === 'profil' ? 'space-y-2' : 'grid grid-cols-2 sm:grid-cols-3 gap-3'}>
                  {filteredProfiles.map((prof, i) => (
                    <motion.div key={prof.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer"
                      onClick={() => navigate(`/user/${prof.user_id}`)}>
                      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-purple-500/20">
                        {prof.avatar_url
                          ? <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gradient-to-br from-purple-700 to-pink-700 flex items-center justify-center">
                              <span className="font-black text-white">{(prof.full_name || prof.username).charAt(0).toUpperCase()}</span>
                            </div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{prof.full_name || prof.username}</p>
                        <p className="text-purple-300/40 text-xs truncate">@{prof.username}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {addToPlaylistSong && <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />}
    </div>
  );
}
