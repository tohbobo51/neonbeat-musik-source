import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Music, Tag, Users, BarChart3, Plus, Edit2, Trash2, X, Check, Upload, Image, Loader, Eye, EyeOff, Disc3, TrendingUp } from 'lucide-react';
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

  const setUserRole = async (userId: string, role: string) => {
    await fetch('/api/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_role', id: userId, role, is_artist: role === 'artist' || role === 'admin' }) });
    fetchAll();
  };

  const COLORS = ['#9333ea', '#a855f7', '#c026d3', '#db2777', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4', '#ef4444'];

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
                      <button onClick={() => { setSongEditing(true); setSongForm({ ...song, genre_id: song.genre_id || '' }); setCoverPreview(song.cover_url || null); setSongModal(true); }}
                        className="p-2 rounded-lg text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteSong(song.id)} className="p-2 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all">
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
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                <Plus size={16} /> Tambah Genre
              </motion.button>
            </div>
            <AnimatePresence>
              {genreEditing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="bg-[#12001f]/80 border border-purple-500/30 rounded-2xl p-6 mb-4 overflow-hidden">
                  <h3 className="text-white font-bold mb-4">{genreForm.id ? 'Edit Genre' : 'Tambah Genre'}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-purple-300/70 text-sm mb-1 block">Nama Genre</label>
                      <input value={genreForm.name} onChange={e => setGenreForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-400" placeholder="Nama genre" />
                    </div>
                    <div>
                      <label className="text-purple-300/70 text-sm mb-1 block">Deskripsi</label>
                      <input value={genreForm.description} onChange={e => setGenreForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-400" placeholder="Deskripsi genre" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-purple-300/70 text-sm mb-2 block">Warna</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setGenreForm(f => ({ ...f, color: c }))}
                          className={`w-8 h-8 rounded-full transition-all ${genreForm.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#12001f]' : 'hover:scale-110'}`}
                          style={{ background: c, boxShadow: genreForm.color === c ? `0 0 10px ${c}` : 'none' }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <motion.button onClick={saveGenre} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold">
                      <Check size={16} className="inline mr-1" /> Simpan
                    </motion.button>
                    <button onClick={() => setGenreEditing(false)} className="px-6 py-2 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10">Batal</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {genres.map(g => (
                <div key={g.id} className="bg-[#12001f]/60 border border-purple-500/10 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: g.color, boxShadow: `0 0 12px ${g.color}80` }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{g.name}</p>
                    <p className="text-purple-300/40 text-xs truncate">{g.description || 'Tidak ada deskripsi'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setGenreForm({ id: g.id, name: g.name, color: g.color, description: g.description || '' }); setGenreEditing(true); }}
                      className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-all"><Edit2 size={14} /></button>
                    <button onClick={() => deleteGenre(g.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Kelola Pengguna ({users.length})</h2>
            {loading ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#12001f]/60 rounded-xl animate-pulse" />)}</div> : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-4 p-3 bg-[#12001f]/60 border border-purple-500/10 rounded-xl">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center"><Users size={16} className="text-purple-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{u.username}</p>
                      <p className="text-purple-300/40 text-xs">{new Date(u.created_at).toLocaleDateString('id-ID')} • {u.follower_count || 0} pengikut</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : u.role === 'artist' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                        {u.role || 'user'}
                      </span>
                      <select value={u.role || 'user'} onChange={e => setUserRole(u.user_id, e.target.value)}
                        className="bg-[#1a0030] border border-purple-500/30 rounded-lg px-2 py-1 text-white text-xs focus:outline-none">
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

      {/* Song Modal */}
      <AnimatePresence>
        {songModal && (
          <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-[#12001f] border border-purple-500/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(147,51,234,0.3)] max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-purple-500/20 flex items-center justify-between sticky top-0 bg-[#12001f] z-10">
                <h3 className="text-white font-bold">{songEditing ? 'Edit Lagu' : 'Tambah Lagu'}</h3>
                <button onClick={() => setSongModal(false)} className="text-purple-300/60 hover:text-purple-300"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-purple-300/70 text-sm mb-2 block">Cover Art</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed border-purple-500/30 cursor-pointer hover:border-purple-400 transition-colors bg-[#1a0030] flex items-center justify-center"
                      onClick={() => coverRef.current?.click()}>
                      {coverPreview ? <img src={coverPreview} alt="" className="w-full h-full object-cover" /> : <Image size={20} className="text-purple-400/50" />}
                    </div>
                    <button type="button" onClick={() => coverRef.current?.click()}
                      className="px-4 py-2 border border-purple-500/30 text-purple-300 rounded-xl text-sm hover:bg-purple-500/10">Pilih Gambar</button>
                    <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
                  </div>
                </div>
                <div>
                  <label className="text-purple-300/70 text-sm mb-1 block">Judul *</label>
                  <input value={songForm.title} onChange={e => setSongForm((f: any) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-400" placeholder="Judul lagu" />
                </div>
                <div>
                  <label className="text-purple-300/70 text-sm mb-1 block">Artis</label>
                  <input value={songForm.artist_name} onChange={e => setSongForm((f: any) => ({ ...f, artist_name: e.target.value }))}
                    className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-400" placeholder="Nama artis" />
                </div>
                <div>
                  <label className="text-purple-300/70 text-sm mb-1 block">Genre</label>
                  <select value={songForm.genre_id} onChange={e => setSongForm((f: any) => ({ ...f, genre_id: e.target.value }))}
                    className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-400">
                    <option value="">Pilih Genre</option>
                    {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-purple-300/70 text-sm mb-1 block">File Audio {!songEditing && '*'}</label>
                  <div className={`flex-1 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${audioFile ? 'border-purple-500/60 bg-purple-500/10' : 'border-purple-500/30 hover:border-purple-400 bg-[#1a0030]'}`}
                    onClick={() => audioRef.current?.click()}>
                    {audioFile ? <p className="text-purple-300 text-sm truncate">{audioFile.name}</p> : <p className="text-purple-300/40 text-sm">Klik untuk pilih audio (MP3, WAV, dll)</p>}
                  </div>
                  <input ref={audioRef} type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} className="hidden" />
                  {songEditing && !audioFile && <p className="text-purple-300/40 text-xs mt-1">Kosongkan jika tidak ingin mengganti audio</p>}
                </div>
                {uploading && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Loader size={14} className="text-purple-400 animate-spin" />
                      <span className="text-purple-300 text-sm">Mengupload... {uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-purple-900/40 rounded-full">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <motion.button onClick={saveSong} disabled={uploading || !songForm.title.trim()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold disabled:opacity-50">
                    {uploading ? 'Mengupload...' : songEditing ? 'Simpan Perubahan' : 'Upload Lagu'}
                  </motion.button>
                  <button onClick={() => setSongModal(false)} className="px-4 py-2.5 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10">Batal</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {cropSrc && <ImageCropper imageSrc={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />}
    </div>
  );
}
