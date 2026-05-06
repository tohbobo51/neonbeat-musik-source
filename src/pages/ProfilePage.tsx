import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Save, Trash2, Music, Check, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ImageCropper from '../components/ImageCropper';
import ThemeSelector from '../components/ThemeSelector';
import PageTransition from '../components/PageTransition';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

function sanitizeUsername(raw: string) {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
}

export default function ProfilePage() {
  const { user, profile, refreshProfile, signOut, isArtist } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(profile?.username || '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'short'>('idle');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [becomingArtist, setBecomingArtist] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cek ketersediaan username saat edit (kecuali username sendiri)
  useEffect(() => {
    const clean = sanitizeUsername(username);
    if (!clean || clean === profile?.username) { setUsernameStatus('idle'); return; }
    if (clean.length < 3) { setUsernameStatus('short'); return; }
    setUsernameStatus('checking');
    const t = setTimeout(async () => {
      const res = await fetch(`/api/profiles?check_username=${encodeURIComponent(clean)}&user_id=${user?.id}`);
      const data = await res.json();
      setUsernameStatus(data.available ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(t);
  }, [username]);

  const handleSave = async () => {
    if (!user) return;
    if (usernameStatus === 'taken') { setSaveError('Username sudah dipakai orang lain'); return; }
    if (usernameStatus === 'short') { setSaveError('Username minimal 3 karakter'); return; }
    setSaving(true);
    setSaveError('');
    const clean = sanitizeUsername(username);
    const res = await fetch('/api/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, username: clean, bio }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSaveError(data.error || 'Gagal menyimpan');
      setSaving(false);
      return;
    }
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCrop = async (blob: Blob) => {
    setCropSrc(null);
    if (!user) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'avatar.jpg', contentType: 'image/jpeg', bucket: 'avatars' }),
    });
    const { signedUrl, path } = await uploadRes.json();
    await fetch(signedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await fetch('/api/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, avatar_url: publicUrl }),
    });
    await refreshProfile();
  };

  const handleBecomeArtist = async () => {
    if (!user) return;
    setBecomingArtist(true);
    await fetch('/api/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, is_artist: true, role: 'artist' }),
    });
    await refreshProfile();
    setBecomingArtist(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    await fetch('/api/profiles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    });
    await signOut();
    navigate('/');
  };

  if (!user || !profile) return null;

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32 w-full">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black text-white mb-8">Profil Saya</h1>

        <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6 mb-6">
          {/* Avatar */}
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500/40 shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
                    <User size={36} className="text-purple-400" />
                  </div>
                )}
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_10px_rgba(147,51,234,0.5)] hover:scale-110 transition-transform">
                <Camera size={14} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
            <div>
              <p className="text-white font-bold text-xl">{profile.username}</p>
              <p className="text-purple-300/50 text-sm">{user.email}</p>
              <div className="flex gap-2 mt-2">
                {profile.role === 'admin' && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold border border-yellow-500/30">Admin</span>}
                {isArtist && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs font-semibold border border-purple-500/30">Artis</span>}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-purple-300/70 text-sm mb-1 block">Username</label>
              <div className="relative">
                <input value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-3 pr-10 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
                  {usernameStatus === 'available' && <Check size={16} className="text-green-400" />}
                  {(usernameStatus === 'taken' || usernameStatus === 'short') && <X size={16} className="text-red-400" />}
                </div>
              </div>
              {usernameStatus === 'short' && <p className="text-red-400 text-xs mt-1">Username minimal 3 karakter</p>}
              {usernameStatus === 'taken' && <p className="text-red-400 text-xs mt-1">Username sudah dipakai orang lain</p>}
              {usernameStatus === 'available' && <p className="text-green-400 text-xs mt-1">✓ Username tersedia</p>}
              {sanitizeUsername(username) !== username && username && (
                <p className="text-purple-300/40 text-xs mt-1">Akan disimpan sebagai: <span className="text-purple-300">@{sanitizeUsername(username)}</span></p>
              )}
              <p className="text-purple-300/30 text-xs mt-1">Hanya huruf kecil, angka, underscore. Tanpa spasi.</p>
            </div>
            <div>
              <label className="text-purple-300/70 text-sm mb-1 block">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all resize-none"
                placeholder="Ceritakan tentang dirimu..."
              />
            </div>
            {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
            <motion.button onClick={handleSave} disabled={saving || usernameStatus === 'taken' || usernameStatus === 'short' || usernameStatus === 'checking'}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.4)] disabled:opacity-50">
              {saved ? <><Check size={18} /> Tersimpan!</> : saving ? 'Menyimpan...' : <><Save size={18} /> Simpan Perubahan</>}
            </motion.button>
          </div>
        </div>

        {/* Become Artist */}
        {!isArtist && (
          <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Music size={20} className="text-purple-400" />
              <h2 className="text-white font-bold">Bergabung sebagai Artis</h2>
            </div>
            <p className="text-purple-300/50 text-sm mb-4">Jadilah artis dan upload musikmu sendiri untuk dinikmati semua orang!</p>
            <motion.button onClick={handleBecomeArtist} disabled={becomingArtist}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold shadow-[0_0_15px_rgba(147,51,234,0.4)] disabled:opacity-50">
              {becomingArtist ? 'Memproses...' : 'Jadilah Artis'}
            </motion.button>
          </div>
        )}

        {/* Upload Music (for artists) */}
        {isArtist && (
          <div className="bg-[#12001f]/80 border border-purple-500/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Music size={20} className="text-purple-400" />
              <h2 className="text-white font-bold">Upload Musik</h2>
            </div>
            <p className="text-purple-300/50 text-sm mb-4">Kamu adalah artis! Upload musik kamu dari halaman upload.</p>
            <motion.button onClick={() => navigate('/upload')}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold shadow-[0_0_15px_rgba(147,51,234,0.4)]">
              Upload Lagu
            </motion.button>
          </div>
        )}

        {/* Delete Account */}
        <div className="bg-[#12001f]/80 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-red-400" />
            <h2 className="text-white font-bold">Hapus Akun</h2>
          </div>
          <p className="text-purple-300/50 text-sm mb-4">Tindakan ini tidak dapat dibatalkan. Semua data kamu akan dihapus permanen.</p>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-2.5 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition-all">
              Hapus Akun
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={handleDeleteAccount}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all font-semibold">
                Ya, Hapus Akun
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all">
                Batal
              </button>
            </div>
          )}
        </div>

        {/* Tema */}
        <ThemeSelector />
      </div>

      {cropSrc && <ImageCropper imageSrc={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />}
    </div>
    </PageTransition>
  );

}
