import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastContainer } from './components/ui/CommonUI';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { JobDiscoveryPage } from './pages/JobDiscoveryPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { GigBoardPage } from './pages/GigBoardPage';
import { GigDetailPage } from './pages/GigDetailPage';
import { JobSeekerDashboard } from './pages/JobSeekerDashboard';
import { EmployerDashboard } from './pages/EmployerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { MessagesPage, NotificationsPage } from './pages/MessagesAndNotificationsPage';
import type { UserRole } from './types';

const ProtectedRoute: React.FC<{
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, authLoading, navigate } = useApp();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      const target =
        user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer' : '/seeker';
      navigate(target);
    }
  }, [authLoading, user, allowedRoles, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex items-center justify-center text-sm text-slate-500 dark:text-[#94A3B8]">
        Loading workspace...
      </div>
    );
  }
  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;
  return <>{children}</>;
};

const RouterView: React.FC = () => {
  const { currentPath } = useApp();
  const pathname = currentPath.split('?')[0] || '/';

  if (pathname === '/') return <LandingPage />;
  if (pathname === '/auth') return <AuthPage />;
  if (pathname === '/onboarding') {
    return (
      <ProtectedRoute>
        <OnboardingWizard />
      </ProtectedRoute>
    );
  }

  if (pathname === '/jobs') return <JobDiscoveryPage />;
  if (pathname.startsWith('/jobs/')) {
    return <JobDetailPage jobId={pathname.slice('/jobs/'.length)} />;
  }

  if (pathname === '/gigs') return <GigBoardPage />;
  if (pathname.startsWith('/gigs/')) {
    return <GigDetailPage gigId={pathname.slice('/gigs/'.length)} />;
  }

  if (pathname.startsWith('/profile/')) {
    return <PublicProfilePage userId={pathname.slice('/profile/'.length)} />;
  }

  if (pathname.startsWith('/seeker')) {
    return (
      <ProtectedRoute allowedRoles={['job_seeker']}>
        <JobSeekerDashboard />
      </ProtectedRoute>
    );
  }

  if (pathname.startsWith('/employer')) {
    return (
      <ProtectedRoute allowedRoles={['employer']}>
        <EmployerDashboard />
      </ProtectedRoute>
    );
  }

  if (pathname.startsWith('/admin')) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    );
  }

  if (pathname === '/messages') {
    return (
      <ProtectedRoute>
        <MessagesPage />
      </ProtectedRoute>
    );
  }

  if (pathname === '/notifications') {
    return (
      <ProtectedRoute>
        <NotificationsPage />
      </ProtectedRoute>
    );
  }

  return <LandingPage />;
};

export function App() {
  return (
    <AppProvider>
      <RouterView />
      <ToastContainer />
    </AppProvider>
  );
}

export default App;
