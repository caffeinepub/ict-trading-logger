import { useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Models from './pages/Models';
import Trades from './pages/Trades';
import Analytics from './pages/Analytics';
import ProfileSetupModal from './components/ProfileSetupModal';
import LoginPrompt from './components/LoginPrompt';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isFetched: profileFetched } = useGetCallerUserProfile();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'models' | 'trades' | 'analytics'>('dashboard');

  const isAuthenticated = !!identity;
  
  // Show profile setup modal only when:
  // 1. User is authenticated
  // 2. Profile data has been fetched
  // 3. Profile is null or has empty name
  const showProfileSetup = isAuthenticated && 
                          profileFetched && 
                          (userProfile === null || !userProfile?.name || userProfile.name.trim() === '');

  // Show loading spinner only during initial authentication check
  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Initializing...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="min-h-screen flex flex-col bg-background">
          <Header currentPage={currentPage} onNavigate={setCurrentPage} />
          <LoginPrompt />
          <Footer />
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  // For authenticated users, show app immediately
  // Profile modal will overlay if username is missing
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen flex flex-col bg-background">
        <Header currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1">
          {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
          {currentPage === 'models' && <Models />}
          {currentPage === 'trades' && <Trades />}
          {currentPage === 'analytics' && <Analytics />}
        </main>
        <Footer />
        {showProfileSetup && <ProfileSetupModal />}
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
