import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { ThemeProvider } from './context/ThemeContext';
import { handleGoogleRedirect } from './lib/googleAuth';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import MusicPlayer from './components/MusicPlayer';
import OnboardingModal from './components/OnboardingModal';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import HistoryPage from './pages/HistoryPage';
import LikedPage from './pages/LikedPage';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistDetailPage from './pages/PlaylistDetailPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import SettingsPage from './pages/SettingsPage';
import UserProfilePage from './pages/UserProfilePage';
import UploadPage from './pages/UploadPage';
import AdminPage from './pages/AdminPage';
import MyMusicPage from './pages/MyMusicPage';
import ArtistStatsPage from './pages/ArtistStatsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import TrendingPage from './pages/TrendingPage';
import SongPage from './pages/SongPage';

handleGoogleRedirect();

function AnimatedRoutes() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/liked" element={<LikedPage />} />
        <Route path="/playlists" element={<PlaylistsPage />} />
        <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/auth" replace />} />
        <Route path="/profile/edit" element={user ? <EditProfilePage /> : <Navigate to="/auth" replace />} />
        <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/auth" replace />} />
        <Route path="/user/:id" element={<UserProfilePage />} />
        <Route path="/upload" element={user ? <UploadPage /> : <Navigate to="/auth" replace />} />
        <Route path="/my-music" element={user ? <MyMusicPage /> : <Navigate to="/auth" replace />} />
        <Route path="/artist-stats" element={user ? <ArtistStatsPage /> : <Navigate to="/auth" replace />} />
        <Route path="/song/:id" element={<SongPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function AppRoutes() {
  const { user, isGuest, loading, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && !isGuest) {
      const isNew = localStorage.getItem('neonbeat_is_new_user');
      const onboarded = localStorage.getItem('neonbeat_onboarded');
      if (isNew === 'true' && !onboarded) {
        setTimeout(() => setShowOnboarding(true), 800);
      }
    }
  }, [user, isGuest]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0010] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-[0_0_30px_#9333ea]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M9 18V5l12-2v13M9 18c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
            </svg>
          </div>
          <p className="text-purple-300/60 animate-pulse">Memuat NeonBeat...</p>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0010]">
      <Navbar />
      <AnimatedRoutes />
      <MusicPlayer />
      <BottomNav />
      {showOnboarding && (
        <OnboardingModal
          onDone={() => setShowOnboarding(false)}
          userId={user?.id}
          initialUsername={profile?.username}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <ThemeProvider>
            <AppRoutes />
          </ThemeProvider>
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
