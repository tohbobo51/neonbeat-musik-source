import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { ThemeProvider } from './context/ThemeContext';
import { handleGoogleRedirect } from './lib/googleAuth';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import MusicPlayer from './components/MusicPlayer';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import HistoryPage from './pages/HistoryPage';
import LikedPage from './pages/LikedPage';
import PlaylistsPage from './pages/PlaylistsPage';
import ProfilePage from './pages/ProfilePage';
import UploadPage from './pages/UploadPage';
import AdminPage from './pages/AdminPage';
import MyMusicPage from './pages/MyMusicPage';
import ArtistStatsPage from './pages/ArtistStatsPage';
import RecommendationsPage from './pages/RecommendationsPage';

handleGoogleRedirect();

function AnimatedRoutes() {
  const location = useLocation();
  const { user, isGuest } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/liked" element={<LikedPage />} />
        <Route path="/playlists" element={<PlaylistsPage />} />
        <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/auth" replace />} />
        <Route path="/upload" element={user ? <UploadPage /> : <Navigate to="/auth" replace />} />
        <Route path="/my-music" element={user ? <MyMusicPage /> : <Navigate to="/auth" replace />} />
        <Route path="/artist-stats" element={user ? <ArtistStatsPage /> : <Navigate to="/auth" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function AppRoutes() {
  const { user, isGuest, loading } = useAuth();

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
