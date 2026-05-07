import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Check, User, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ImageCropper from '../components/ImageCropper';
import supabase from '../lib/supabase';

export default function EditProfilePage() {
  const { user, profile, refreshProfile, displayName } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, full_name: fullName.trim(), bio }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Gagal menyimpan');
      setSaving(false);
      return;
    }
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate('/profile'); }, 1200);
  };

  if (!user || !profile) return null;

  const initials = (profile.full_name || profile.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a0010] pt-20 pb-32">
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/profile')} className="p-2 rounded-xl text-purple-300/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-2xl font-black text-white">Edit Profil</h1>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-purple-500/40 shadow-[0_0_30px_rgba(147,51,234,0.4)]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-700 to-pink-700 flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{initials}</span>
                </div>
              )}
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_12px_rgba(147,51,234,0.6)] hover:scale-110 transition-transform">
              <Camera size={16} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
        </div>

        <div className="space-y-5">
          {/* Username — READ-ONLY (permanent) */}
          <div>
            <label className="text-purple-300/70 text-sm mb-1.5 block font-medium">Username (Permanen)</label>
            <div className="w-full bg-[#1a0030]/60 border border-purple-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-purple-400 text-sm font-bold">@</span>
              <span className="text-purple-300/60 font-mono">{profile.username}</span>
              <span className="ml-auto text-xs text-purple-300/30 bg-purple-500/10 px-2 py-0.5 rounded-full">Tidak bisa diubah</span>
            </div>
            <p className="text-purple-300/30 text-xs mt-1">Username adalah identitas unikmu dan bersifat permanen.</p>
          </div>

          {/* Nama (display name) — EDITABLE */}
          <div>
            <label className="text-purple-300/70 text-sm mb-1.5 block font-medium">Nama <span className="text-purple-400">(bisa diubah)</span></label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              maxLength={50}
              className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all"
              placeholder="Nama yang ditampilkan di profil"
            />
          </div>

          {/* Bio — EDITABLE */}
          <div>
            <label className="text-purple-300/70 text-sm mb-1.5 block font-medium">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              maxLength={150}
              className="w-full bg-[#1a0030] border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-400 transition-all resize-none"
              placeholder="Ceritakan tentang dirimu..."
            />
            <p className="text-right text-purple-300/30 text-xs mt-1">{bio.length}/150</p>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-50 transition-all"
          >
            {saved ? <><Check size={18} /> Tersimpan!</> : saving ? 'Menyimpan...' : <><Save size={18} /> Simpan Perubahan</>}
          </motion.button>
        </div>
      </div>
      {cropSrc && <ImageCropper imageSrc={cropSrc} onCrop={handleCrop} onCancel={() => setCropSrc(null)} />}
    </div>
  );
}
