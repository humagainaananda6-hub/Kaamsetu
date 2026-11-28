import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, setAuthToken } from '../lib/api';
import type { Language } from '../lib/i18n';
import type { CategoryItem, SkillItem, User } from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface PlatformStats {
  activeJobs: number;
  openGigs: number;
  verifiedSeekers: number;
  verifiedEmployers: number;
}

interface AppContextValue {
  user: User | null;
  authLoading: boolean;
  refreshUser: () => Promise<User | null>;
  establishSession: (nextUser: User, token?: string | null) => Promise<User>;
  logout: () => Promise<void>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  currentPath: string;
  navDirection: 1 | -1;
  navigate: (to: string) => void;
  categories: CategoryItem[];
  skills: SkillItem[];
  platformStats: PlatformStats;
  refreshMeta: () => Promise<void>;
  unreadNotifications: number;
  unreadMessages: number;
  refreshUnreadCounts: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('kaamsetu_theme') : null;
    return saved === 'light' ? 'light' : 'dark';
  });

  const [lang, setLangState] = useState<Language>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('kaamsetu_lang') : null;
    return saved === 'ne' ? 'ne' : 'en';
  });

  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/',
  );
  const [navDirection, setNavDirection] = useState<1 | -1>(1);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    activeJobs: 0,
    openGigs: 0,
    verifiedSeekers: 0,
    verifiedEmployers: 0,
  });

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('kaamsetu_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    window.localStorage.setItem('kaamsetu_lang', next);
  }, []);

  const getRouteRank = (path: string) => {
    const clean = path.split('?')[0] || '/';
    if (clean === '/') return 0;
    if (clean.startsWith('/jobs')) return 1;
    if (clean.startsWith('/gigs')) return 2;
    if (clean.startsWith('/showcase')) return 3;
    if (clean.startsWith('/verify')) return 4;
    if (clean.startsWith('/messages') || clean.startsWith('/notifications')) return 5;
    if (clean.startsWith('/seeker') || clean.startsWith('/employer') || clean.startsWith('/admin')) return 6;
    if (clean.startsWith('/auth') || clean.startsWith('/onboarding')) return 7;
    return 2;
  };

  const navigate = useCallback((to: string) => {
    if (to.startsWith('#')) {
      const targetId = to.slice(1);
      if (window.location.pathname !== '/') {
        setNavDirection(-1);
        window.history.pushState({}, '', '/');
        setCurrentPath('/');
        window.setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    const prevPath = window.location.pathname + window.location.search;
    if (prevPath !== to) {
      const nextRank = getRouteRank(to);
      const prevRank = getRouteRank(prevPath);
      setNavDirection(nextRank >= prevRank ? 1 : -1);
      window.history.pushState({}, '', to);
      setCurrentPath(to);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      setNavDirection(-1);
      setCurrentPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const refreshMeta = useCallback(async () => {
    try {
      const data = await apiFetch<{
        categories: CategoryItem[];
        skills: SkillItem[];
        stats: PlatformStats;
      }>('/api/meta');
      setCategories(data.categories);
      setSkills(data.skills);
      setPlatformStats(data.stats);
    } catch {
      // ignore meta errors during boot
    }
  }, []);

  const refreshUnreadCounts = useCallback(async () => {
    try {
      const [notifRes, convRes] = await Promise.all([
        apiFetch<{ notifications: Array<{ isRead: boolean }> }>('/api/notifications'),
        apiFetch<{ conversations: Array<{ unreadCount: number }> }>('/api/conversations'),
      ]);
      setUnreadNotifications(notifRes.notifications.filter((n) => !n.isRead).length);
      setUnreadMessages(convRes.conversations.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch {
      setUnreadNotifications(0);
      setUnreadMessages(0);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: User | null }>('/api/auth/me');
      setUser(data.user);
      if (data.user) {
        await refreshUnreadCounts();
      } else {
        setUnreadNotifications(0);
        setUnreadMessages(0);
      }
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, [refreshUnreadCounts]);

  const establishSession = useCallback(
    async (nextUser: User, token?: string | null) => {
      if (token) {
        setAuthToken(token);
      }
      setUser(nextUser);
      setAuthLoading(false);
      await refreshUnreadCounts();
      return nextUser;
    },
    [refreshUnreadCounts],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local session state even if network call fails
    }
    setAuthToken(null);
    setUser(null);
    setUnreadNotifications(0);
    setUnreadMessages(0);
    showToast('Signed out successfully.', 'info');
    navigate('/');
  }, [navigate, showToast]);

  useEffect(() => {
    refreshUser();
    refreshMeta();
  }, [refreshUser, refreshMeta]);

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        refreshUser,
        establishSession,
        logout,
        theme,
        toggleTheme,
        lang,
        setLang,
        currentPath,
        navDirection,
        navigate,
        categories,
        skills,
        platformStats,
        refreshMeta,
        unreadNotifications,
        unreadMessages,
        refreshUnreadCounts,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
