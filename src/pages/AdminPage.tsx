import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Music, Tag, Users, BarChart3, Plus, Edit2, Trash2, X, Check, Upload, Image, Loader, Eye, EyeOff, Disc3, TrendingUp, BadgeCheck, UserCog, Key, Copy } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '../context/AuthContext';
import ImageCropper from '../components/ImageCropper';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

type Tab = 'dashboard' | 'songs' | 'genres' | 'users';

function AdminPlaysChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  useEffect(() => {
    const dayMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    fetch('/api/admin?action=plays_chart').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        data.forEach((h: any) => { const k = h.played_at?.slice(0, 10); if (k && dayMap[k] !== undefined) dayMap[k]++; });
      }
      setChartData(Object.entries(dayMap).map(([date, plays]) => ({ date, plays })));
    }).catch(() => {
      setChartData(Object.entries(dayMap).map(([date, plays]) => ({ date, plays })));
    });
  }, []);
  return (
    <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-purple-400" />
        <h3 className="text-white font-bold">Plays 7 Hari Terakhir</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
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
          <Area type="monotone" dataKey="plays" stroke="#9333ea" strokeWidth={2} fill="url(#adminGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AdminTopSongs({ songs }: { songs: any[] }) {
  const top = [...songs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5);
  if (top.length === 0) return null;
  return (
    <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6">
      <h3 className="text-white font-bold mb-4">Top 5 Lagu</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={top} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#9333ea15" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#9333ea60', fontSize: 11 }} />
          <YAxis type="category" dataKey="title" tick={{ fill: '#fff', fontSize: 11 }} width={110} />
          <Tooltip contentStyle={{ background: '#12001f', border: '1px solid #9333ea40', borderRadius: 12, color: '#fff' }} />
          <Bar dataKey="play_count" fill="#9333ea" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<any>({});
  const [songs, setSongs] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [genreForm, setGenreForm] = useState({ id: '', name: '', color: '#9333ea', description: '' });
  const [genreEditing, setGenreEditing] = useState(false);

  const [songForm, setSongForm] = useState<any>({ id: '', title: '', artist_name: '', genre_id: '', audio_url: '', cover_url: '', is_active: true });
  const [songEditing, setSongEditing] = useState(false);
  const [songModal, setSongModal] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const audioRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // Follower edit modal
  const [followerModal, setFollowerModal] = useState<any>(null);
  const [followerForm, setFollowerForm] = useState({ follower_count: 0, following_count: 0 });
  const [savingFollower, setSavingFollower] = useState(false);

    // Set password modal
    const [setPasswordModal, setSetPasswordModal] = useState(false);
    const [setPasswordUserId, setSetPasswordUserId] = useState('');
    const [setPasswordValue, setSetPasswordValue] = useState('');
    const [settingPassword, setSettingPassword] = useState(false);
    const [setPasswordDone, setSetPasswordDone] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
  }, [isAdmin, tab]);

  const fetchAll = async () => {
    setLoading(true);
    const [s, g, u, st] = await Promise.all([
      fetch('/api/admin?action=songs').then(r => r.json()),
      fetch('/api/genres').then(r => r.json()),
      fetch('/api/admin?action=users').then(r => r.json()),
      fetch('/api/admin?action=stats').then(r => r.json()),
    ]);
    setSongs(Array.isArray(s) ? s : []);
    setGenres(Array.isArray(g) ? g : []);
    setUsers(Array.isArray(u) ? u : []);
    setStats(st || {});
    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0010] pt-20 flex items-center justify-center">
        <div className="text-center">
          <Crown size={64} className="text-purple-500/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h2>
          <p className="text-purple-300/50">Halaman ini hanya untuk admin</p>
        </div>
      </div>
    );
  }

  const saveGenre = async () => {
    if (!genreForm.name.trim()) return;
    if (genreForm.id) {
      await fetch('/api/genres', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(genreForm) });
    } else {
      await fetch('/api/genres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(genreForm) });
    }
    setGenreForm({ id: '', name: '', color: '#9333ea', description: '' });
    setGenreEditing(false);
    fetchAll();
  };

  const deleteGenre = async (id: string) => {
    await fetch('/api/genres', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchAll();
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCrop = (blob: Blob) => {
    setCoverBlob(blob);
    setCoverPreview(URL.createObjectURL(blob));
    setCropSrc(null);
  };

  const uploadFile = async (blob: Blob | File, filename: string, bucket: string, contentType: string) => {
    const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, contentType, bucket }) });
    const { signedUrl, path } = await res.json();
    await fetch(signedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': contentType } });
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  };

  const saveSong = async () => {
    setUploading(true);
    setUploadProgress(10);
    try {
      let coverUrl = songForm.cover_url;
      let audioUrl = songForm.audio_url;
      if (coverBlob) { coverUrl = await uploadFile(coverBlob, 'cover.jpg', 'covers', 'image/jpeg'); setUploadProgress(40); }
      if (audioFile) { audioUrl = await uploadFile(audioFile, audioFile.name, 'music', audioFile.type || 'audio/mpeg'); setUploadProgress(80); }
      const payload = { ...songForm, cover_url: coverUrl, audio_url: audioUrl };
      if (songForm.id) {
        await fetch('/api/songs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await fetch('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      setUploadProgress(100);
      setSongModal(false);
      setSongForm({ id: '', title: '', artist_name: '', genre_id: '', audio_url: '', cover_url: '', is_active: true });
      setCoverBlob(null); setCoverPreview(null); setAudioFile(null);
      fetchAll();
    } finally { setUploading(false); }
  };

  const deleteSong = async (id: string) => {
    await fetch('/api/songs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchAll();
  };

  const toggleSong = async (id: string, is_active: boolean) => {
    await fetch('/api/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle_song', id, is_active: !is_active }) });
    fetchAll();
  };

  const handleSetPassword = async () => {
      if (!setPasswordUserId || !setPasswordValue.trim() || setPasswordValue.length < 6) return;
      setSettingPassword(true);
      try {
        const res = await fetch('/api/admin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_password', id: setPasswordUserId, password: setPasswordValue }),
        });
        if (res.ok) { setSetPasswordDone(true); setTimeout(() => { setSetPasswordModal(false); setSetPasswordDone(false); setSetPasswordValue(''); }, 1500); }
      } catch {}
      setSettingPassword(false);
    };

      const setUserRole = async (userId: string, role: string) => {
    await fetch('/api/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_role', id: userId, role, is_artist: role === 'artist' || role === 'admin' }) });
    fetchAll();
  };

  const toggleVerify = async (userId: string, currentVerified: boolean) => {
    await fetch('/api/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_user', id: userId, is_verified: !currentVerified }),
    });
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_verified: !currentVerified } : u));
  };

  const openFollowerModal = (user: any) => {
    setFollowerModal(user);
    setFollowerForm({ follower_count: user.follower_count || 0, following_count: user.following_count || 0 });
  };

  const saveFollowerCount = async () => {
    if (!followerModal) return;
    setSavingFollower(true);
    await fetch('/api/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_follower_count', id: followerModal.user_id, ...followerForm }),
    });
    setUsers(prev => prev.map(u => u.user_id === followerModal.user_id ? { ...u, ...followerForm } : u));
    setSavingFollower(false);
    setFollowerModal(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Crown size={28} className="text-yellow-400" />
          <h1 className="text-3xl font-black text-white">Admin Panel</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {([['dashboard', BarChart3, 'Dashboard'], ['songs', Music, 'Lagu'], ['genres', Tag, 'Genre'], ['users', Users, 'Pengguna']] as [Tab, any, string][]).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                tab === t ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-[#12001f]/60 text-purple-300/60 hover:text-purple-300 border border-purple-500/20'
              }`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[['Total Lagu', stats.totalSongs, Music, '#9333ea'], ['Total User', stats.totalUsers, Users, '#c026d3'], ['Total Genre', stats.totalGenres, Tag, '#db2777'], ['Total Play', stats.totalPlays, BarChart3, '#f59e0b']].map(([label, val, Icon, color]: any) => (
                <div key={label} className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-purple-300/60 text-sm">{label}</span>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <p className="text-3xl font-black text-white">{(val || 0).toLocaleString('id-ID')}</p>
                </div>
              ))}
            </div>
            <AdminPlaysChart />
            <AdminTopSongs songs={songs} />
          </div>
        )}

        {/* Songs */}
        {tab === 'songs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Kelola Lagu</h2>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setSongEditing(false); setSongForm({ id: '', title: '', artist_name: '', genre_id: '', audio_url: '', cover_url: '', is_active: true }); setCoverPreview(null); setCoverBlob(null); setAudioFile(null); setSongModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                <Plus size={16} /> Tambah Lagu
              </motion.button>
            </div>
            {loading ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#12001f]/60 rounded-xl animate-pulse" />)}</div> : (
              <div className="space-y-2">
                {songs.map(song => (
                  <div key={song.id} className="flex items-center gap-4 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      {song.cover_url ? <img src={song.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Disc3 size={16} className="text-purple-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{song.title}</p>
                      <p className="text-purple-300/50 text-sm truncate">{song.artist_name} • {song.genres?.name} • {(song.play_count || 0).toLocaleString('id-ID')} plays</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleSong(song.id, song.is_active)}
                        className={`p-2 rounded-lg transition-all ${song.is_active ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {song.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button onClick={() => { setSongForm({ ...song, genre_id: song.genre_id || '' }); setCoverPreview(song.cover_url || null); setCoverBlob(null); setAudioFile(null); setSongEditing(true); setSongModal(true); }}
                        className="p-2 rounded-lg text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteSong(song.id)}
                        className="p-2 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Genres */}
        {tab === 'genres' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Kelola Genre</h2>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setGenreForm({ id: '', name: '', color: '#9333ea', description: '' }); setGenreEditing(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold">
                <Plus size={16} /> Tambah Genre
              </motion.button>
            </div>
            <AnimatePresence>
              {genreEditing && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-[#12001f]/80 border border-purple-500/30 rounded-2xl p-6 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input value={genreForm.name} onChange={e => setGenreForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nama genre" className="bg-[#0a0010] border border-purple-500/30 rounded-xl px-4 py-2 text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500" />
                    <input value={genreForm.description} onChange={e => setGenreForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Deskripsi" className="bg-[#0a0010] border border-purple-500/30 rounded-xl px-4 py-2 text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500" />
                    <div className="flex items-center gap-3">
                      <input type="color" value={genreForm.color} onChange={e => setGenreForm(f => ({ ...f, color: e.target.value }))}
                        className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                      <span className="text-purple-300/60 text-sm">Warna</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={saveGenre} className="px-4 py-2 bg-purple-600 rounded-xl text-white font-semibold flex items-center gap-2"><Check size={16} /> Simpan</button>
                    <button onClick={() => setGenreEditing(false)} className="px-4 py-2 bg-[#0a0010] border border-purple-500/30 rounded-xl text-purple-300"><X size={16} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {genres.map(genre => (
                <div key={genre.id} className="flex items-center gap-3 p-4 bg-[#12001f]/60 border border-purple-500/10 rounded-xl">
                  <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: genre.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{genre.name}</p>
                    {genre.description && <p className="text-purple-300/50 text-xs truncate">{genre.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setGenreForm({ id: genre.id, name: genre.name, color: genre.color, description: genre.description || '' }); setGenreEditing(true); }}
                      className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-500/20"><Edit2 size={14} /></button>
                    <button onClick={() => deleteGenre(genre.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Kelola Pengguna</h2>
              <span className="text-purple-300/50 text-sm">{users.length} pengguna</span>
            </div>
            {loading ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-[#12001f]/60 rounded-xl animate-pulse" />)}</div> : (
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.user_id} className="flex items-center gap-3 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center text-white font-bold text-sm">
                            {(user.username || '?').charAt(0).toUpperCase()}
                          </div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-semibold truncate">{user.full_name || user.username}</p>
                        {user.is_verified && <BadgeCheck size={14} className="text-blue-400 flex-shrink-0" />}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-purple-300/50">
                        <span>@{user.username}</span>
                        {user.email && <span className="font-mono text-purple-300/30">{user.email}</span>}
                        <span className="flex items-center gap-1">👥 {user.follower_count || 0} pengikut</span>
                        <span>{user.following_count || 0} mengikuti</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Verify toggle */}
                      <button
                        onClick={() => toggleVerify(user.user_id, user.is_verified)}
                        title={user.is_verified ? 'Hapus verifikasi' : 'Verifikasi artis'}
                        className={`p-2 rounded-lg transition-all ${
                          user.is_verified
                            ? 'text-blue-400 bg-blue-500/20 hover:bg-blue-500/30'
                            : 'text-purple-300/40 bg-[#12001f] hover:text-blue-400 hover:bg-blue-500/10 border border-purple-500/20'
                        }`}>
                        <BadgeCheck size={16} />
                      </button>

                      {/* Edit followers */}
                      <button
                        onClick={() => openFollowerModal(user)}
                        title="Atur pengikut"
                        className="p-2 rounded-lg text-purple-300/60 bg-[#12001f] hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/20 transition-all">
                        <UserCog size={16} />
                      </button>

                      {/* Role selector */}
                      <select
                        value={user.role || 'user'}
                        onChange={e => setUserRole(user.user_id, e.target.value)}
                        className="bg-[#0a0010] border border-purple-500/30 text-purple-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-500">
                        <option value="user">User</option>
                        <option value="artist">Artis</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Song modal */}
      <AnimatePresence>
        {songModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setSongModal(false); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#12001f] border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{songEditing ? 'Edit Lagu' : 'Tambah Lagu'}</h3>
                <button onClick={() => setSongModal(false)} className="text-purple-300/50 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <input value={songForm.title} onChange={e => setSongForm((f: any) => ({ ...f, title: e.target.value }))}
                  placeholder="Judul lagu" className="w-full bg-[#0a0010] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500" />
                <input value={songForm.artist_name} onChange={e => setSongForm((f: any) => ({ ...f, artist_name: e.target.value }))}
                  placeholder="Nama artis" className="w-full bg-[#0a0010] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500" />
                <select value={songForm.genre_id} onChange={e => setSongForm((f: any) => ({ ...f, genre_id: e.target.value }))}
                  className="w-full bg-[#0a0010] border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500">
                  <option value="">Pilih genre</option>
                  {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>

                {/* Cover upload */}
                <div>
                  <p className="text-purple-300/60 text-sm mb-2">Cover lagu</p>
                  <div className="flex items-center gap-3">
                    {coverPreview && <img src={coverPreview} alt="" className="w-16 h-16 rounded-lg object-cover" />}
                    <button onClick={() => coverRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0a0010] border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:border-purple-500">
                      <Image size={16} /> Pilih Gambar
                    </button>
                    <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
                  </div>
                </div>

                {/* Audio upload */}
                <div>
                  <p className="text-purple-300/60 text-sm mb-2">File audio</p>
                  <div className="flex items-center gap-3">
                    {audioFile && <span className="text-purple-300 text-sm truncate max-w-[150px]">{audioFile.name}</span>}
                    <button onClick={() => audioRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0a0010] border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:border-purple-500">
                      <Upload size={16} /> Pilih Audio
                    </button>
                    <input ref={audioRef} type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} className="hidden" />
                  </div>
                  {songEditing && songForm.audio_url && !audioFile && (
                    <p className="text-purple-300/40 text-xs mt-1 truncate">Saat ini: {songForm.audio_url.slice(0, 60)}...</p>
                  )}
                </div>

                <input value={songForm.audio_url} onChange={e => setSongForm((f: any) => ({ ...f, audio_url: e.target.value }))}
                  placeholder="Atau tempel URL audio" className="w-full bg-[#0a0010] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500 text-sm" />

                {uploading && (
                  <div className="w-full bg-purple-950 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}

                <button onClick={saveSong} disabled={uploading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {uploading ? <><Loader size={18} className="animate-spin" /> Mengupload...</> : <><Check size={18} /> {songEditing ? 'Simpan Perubahan' : 'Tambah Lagu'}</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Follower count edit modal */}
      <AnimatePresence>
        {followerModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setFollowerModal(null); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#12001f] border border-purple-500/30 rounded-2xl p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Atur Pengikut</h3>
                <button onClick={() => setFollowerModal(null)} className="text-purple-300/50 hover:text-white"><X size={20} /></button>
              </div>

              <div className="flex items-center gap-3 mb-6 p-3 bg-[#0a0010] rounded-xl">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {followerModal.avatar_url
                    ? <img src={followerModal.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center text-white font-bold text-sm">
                        {(followerModal.username || '?').charAt(0).toUpperCase()}
                      </div>
                  }
                </div>
                <div>
                  <p className="text-white font-semibold">{followerModal.full_name || followerModal.username}</p>
                  <p className="text-purple-300/50 text-sm">@{followerModal.username}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-purple-300/60 text-sm mb-1.5 block">Jumlah Pengikut</label>
                  <input
                    type="number"
                    min="0"
                    value={followerForm.follower_count}
                    onChange={e => setFollowerForm(f => ({ ...f, follower_count: Number(e.target.value) }))}
                    className="w-full bg-[#0a0010] border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-purple-300/60 text-sm mb-1.5 block">Jumlah Mengikuti</label>
                  <input
                    type="number"
                    min="0"
                    value={followerForm.following_count}
                    onChange={e => setFollowerForm(f => ({ ...f, following_count: Number(e.target.value) }))}
                    className="w-full bg-[#0a0010] border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <button onClick={saveFollowerCount} disabled={savingFollower}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {savingFollower ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
                Simpan
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image crop modal */}
      <AnimatePresence>
        {cropSrc && <ImageCropper imageSrc={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />}
      </AnimatePresence>
{/* Set Password Modal */}
        <AnimatePresence>
          {setPasswordModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setSetPasswordModal(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#12001f] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_40px_rgba(147,51,234,0.3)]"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-5">
                  <Key size={20} className="text-yellow-400" />
                  <h3 className="text-white font-bold text-lg">Set Password User</h3>
                  <button onClick={() => setSetPasswordModal(false)} className="ml-auto text-purple-300/40 hover:text-purple-300"><X size={18} /></button>
                </div>
                <p className="text-purple-300/50 text-sm mb-4">Set password baru untuk user ini. Minimal 6 karakter.</p>
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={setPasswordValue}
                    onChange={e => setSetPasswordValue(e.target.value)}
                    placeholder="Password baru (min 6 karakter)"
                    className="w-full bg-[#0a0010] border border-purple-500/30 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <button onClick={() => { navigator.clipboard.writeText(setPasswordValue).catch(()=>{}); }}
                    title="Salin" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300/40 hover:text-purple-300">
                    <Copy size={15} />
                  </button>
                </div>
                <button
                  onClick={handleSetPassword}
                  disabled={settingPassword || setPasswordValue.length < 6}
                  className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white">
                  {settingPassword ? <><Loader size={16} className="animate-spin" /> Menyimpan...</>
                    : setPasswordDone ? <><Check size={16} /> Berhasil!</>
                    : <><Key size={16} /> Set Password</>}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

            </div>
  );
}
