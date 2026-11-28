import React, { useState } from 'react';
import {
  Bell,
  Box,
  Briefcase,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  User as UserIcon,
  Wrench,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { t } from '../../lib/i18n';
import { PWAInstallButton } from './PWAComponents';

export const KbnBrandMark: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <span className="inline-flex items-center gap-2 font-extrabold tracking-tight font-display whitespace-nowrap shrink-0">
    <i
      aria-hidden="true"
      className="w-[28px] h-[28px] sm:w-[30px] sm:h-[30px] rounded-[9px] grid place-items-center not-italic text-[10px] sm:text-[11px] font-extrabold text-[#041016] -rotate-8 shrink-0"
      style={{ background: 'linear-gradient(135deg, #16C784, #3B82F6)' }}
    >
      KBN
    </i>
    {!compact && (
      <span className="text-[16px] sm:text-[19px] tracking-[-0.5px] text-[#0B1220] dark:text-[#F8FAFC]">
        KaamBridge<span className="text-[#16C784]">Nepal</span>
      </span>
    )}
  </span>
);

export const PublicNavbar: React.FC = () => {
  const { user, logout, lang, setLang, theme, toggleTheme, currentPath, unreadMessages, unreadNotifications, navigate } =
    useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = currentPath.split('?')[0] || '/';
  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'employer' ? '/employer' : '/seeker';

  const appTabs = [
    { label: lang === 'ne' ? 'होम' : 'Home', to: '/', match: (p: string) => p === '/' },
    { label: t(lang, 'navJobs'), to: '/jobs', match: (p: string) => p.startsWith('/jobs') },
    { label: t(lang, 'navGigs'), to: '/gigs', match: (p: string) => p.startsWith('/gigs') },
    {
      label: lang === 'ne' ? '३डी शोकेस' : 'Showcase',
      to: '/showcase',
      match: (p: string) => p.startsWith('/showcase'),
    },
    {
      label: lang === 'ne' ? 'प्रमाणित' : 'Verify',
      to: '/verify',
      match: (p: string) => p.startsWith('/verify'),
    },
    ...(user
      ? [
          {
            label: lang === 'ne' ? 'प्रोफाइल' : 'Workspace',
            to: dashboardPath,
            match: (p: string) => p.startsWith(dashboardPath),
          },
          {
            label: t(lang, 'messages'),
            to: '/messages',
            match: (p: string) => p.startsWith('/messages'),
            badge: unreadMessages,
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#EEF3F9]/85 dark:bg-[#0B1220]/85 backdrop-blur-md border-b border-[#d5deea]/70 dark:border-[#263449]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Signature Tilted KBN Emblem + Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          aria-label="KaamBridgeNepal (KBN) home"
          className="inline-flex items-center gap-2 shrink-0"
        >
          <KbnBrandMark compact={false} />
        </a>

        {/* Zone 2: Single-Row Pill Tabs */}
        <nav aria-label="App navigation" className="hidden md:flex items-center gap-1">
          {appTabs.map((item) => {
            const active = item.match(pathname);
            return (
              <a
                key={item.to}
                href={item.to}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.to);
                }}
                className={`px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-[#172338] text-[#0B1220] dark:text-[#F8FAFC] border border-[#d5deea] dark:border-[#263449] shadow-xs'
                    : 'text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] hover:bg-white/70 dark:hover:bg-[#172338]/70'
                }`}
              >
                <span>{item.label}</span>
                {'badge' in item && item.badge ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#3B82F6] text-white text-[10px] font-mono-num leading-none">
                    {item.badge}
                  </span>
                ) : null}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Theme Toggle + Auth / Workspace Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden sm:inline-flex">
            <PWAInstallButton compact />
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
            className="hidden sm:inline-flex px-2.5 py-1.5 text-xs font-semibold rounded-full border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#172338] text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white whitespace-nowrap"
          >
            {lang === 'en' ? 'नेपाली' : 'EN'}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#172338] text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                aria-label={`Notifications (${unreadNotifications} unread)`}
                className="relative w-9 h-9 rounded-full border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#172338] text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white inline-flex items-center justify-center"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[15px] h-4 rounded-full bg-[#16C784] text-[#03130d] text-[10px] font-bold flex items-center justify-center font-mono-num">
                    {unreadNotifications}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(dashboardPath)}
                className="px-3.5 py-2 text-xs font-bold rounded-[14px] kbn-btn-primary whitespace-nowrap shrink-0"
              >
                {user.fullName.split(' ')[0]}
              </button>
              <button
                type="button"
                onClick={logout}
                aria-label="Log out"
                title="Log out"
                className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#172338] text-[#51617a] dark:text-[#94A3B8] hover:text-[#EF4444] hover:border-[#EF4444]/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/auth?mode=login')}
                className="hidden sm:inline-flex px-3.5 py-2 text-xs font-bold rounded-[14px] border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#172338] text-[#0B1220] dark:text-[#F8FAFC] hover:border-[#16C784] transition-colors whitespace-nowrap shrink-0"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth?mode=register')}
                className="px-4 py-2 text-xs font-bold rounded-[14px] kbn-btn-primary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Sign up</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden p-2 rounded-lg text-[#0B1220] dark:text-[#F8FAFC]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#111B2E] px-4 py-3 space-y-2">
          {appTabs.map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate(item.to);
              }}
              className="block w-full text-left py-2 text-sm font-semibold text-[#0B1220] dark:text-[#F8FAFC]"
            >
              {item.label}
            </button>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#d5deea] dark:border-[#263449]">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#d5deea] dark:border-[#263449]"
            >
              {lang === 'en' ? 'नेपाली' : 'English'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#d5deea] dark:border-[#263449]"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            {user && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#EF4444]/40 text-[#EF4444] inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out ({user.fullName.split(' ')[0]})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export const MobileAppBottomNav: React.FC = () => {
  const { user, currentPath, unreadMessages, navigate } = useApp();
  const pathname = currentPath.split('?')[0] || '/';
  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'employer' ? '/employer' : '/seeker';

  const items = [
    {
      label: 'Home',
      icon: Home,
      active: pathname === '/',
      onClick: () => navigate('/'),
    },
    {
      label: 'Jobs',
      icon: Briefcase,
      active: pathname.startsWith('/jobs'),
      onClick: () => navigate('/jobs'),
    },
    {
      label: 'Showcase',
      icon: Box,
      active: pathname.startsWith('/showcase'),
      onClick: () => navigate('/showcase'),
    },
    {
      label: 'Verify',
      icon: ShieldCheck,
      active: pathname.startsWith('/verify'),
      onClick: () => navigate('/verify'),
    },
    {
      label: user ? 'Profile' : 'Sign In',
      icon: user ? LayoutDashboard : LogIn,
      active: user ? pathname.startsWith(dashboardPath) : pathname.startsWith('/auth'),
      badge: user ? unreadMessages : 0,
      onClick: () => navigate(user ? dashboardPath : '/auth?mode=login'),
    },
  ];

  return (
    <nav
      aria-label="Mobile app navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-white/95 dark:bg-[#111B2E]/95 backdrop-blur-md border-t border-[#d5deea] dark:border-[#263449] grid grid-cols-5 pb-[env(safe-area-inset-bottom,0px)]"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
              item.active ? 'text-[#16C784]' : 'text-[#51617a] dark:text-[#94A3B8]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className="absolute top-1.5 right-3 px-1 min-w-[14px] h-3.5 rounded-full bg-[#3B82F6] text-white text-[9px] font-bold flex items-center justify-center font-mono-num">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const DashboardLayout: React.FC<{
  title: string;
  navItems: SidebarNavItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  children: React.ReactNode;
}> = ({ title, navItems, activeTab, onSelectTab, children }) => {
  const {
    user,
    logout,
    theme,
    toggleTheme,
    lang,
    setLang,
    navigate,
    unreadNotifications,
    unreadMessages,
  } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/jobs?q=${encodeURIComponent(quickSearch.trim())}`);
    } else {
      navigate('/jobs');
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight font-display text-[#0B1220] dark:text-[#F8FAFC] whitespace-nowrap"
          >
            <i
              aria-hidden="true"
              className="w-7 h-7 rounded-[8px] grid place-items-center not-italic text-[10px] font-extrabold text-[#041016] -rotate-8 shrink-0"
              style={{ background: 'linear-gradient(135deg, #16C784, #3B82F6)' }}
            >
              KBN
            </i>
            <span>
              KaamBridge<span className="text-[#16C784]">Nepal</span>
            </span>
          </button>
        </div>

        <nav className="space-y-1" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[#16C784]/15 text-[#16C784]'
                    : 'text-[#51617a] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#172338] hover:text-[#0B1220] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-xs font-mono-num font-semibold text-[#16C784]">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-[#d5deea] dark:border-[#263449] space-y-2.5">
        <div className="px-1">
          <PWAInstallButton />
        </div>
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#d5deea] dark:border-[#263449] text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white"
          >
            {lang === 'en' ? 'नेपाली' : 'English'}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-full border border-[#d5deea] dark:border-[#263449] text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>{t(lang, 'logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EEF3F9] dark:bg-[#0B1220] text-[#0B1220] dark:text-[#F8FAFC] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-white/95 dark:bg-[#111B2E]/95 border-r border-[#d5deea] dark:border-[#263449] sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 bg-white dark:bg-[#111B2E] border-r border-[#d5deea] dark:border-[#263449] h-full overflow-y-auto">
            {sidebarContent}
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        <header className="sticky top-0 z-30 h-14 bg-[#EEF3F9]/90 dark:bg-[#0B1220]/90 backdrop-blur-md border-b border-[#d5deea] dark:border-[#263449] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation drawer"
              className="lg:hidden p-2 rounded-lg text-[#51617a] dark:text-[#94A3B8]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-bold truncate">{title}</h1>
          </div>

          <form onSubmit={handleQuickSearch} className="hidden md:flex items-center max-w-xs w-full">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search jobs or skills..."
                aria-label="Quick search jobs"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#111B2E] border border-[#d5deea] dark:border-[#263449] text-[#0B1220] dark:text-[#F8FAFC]"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label={`Notifications (${unreadNotifications} unread)`}
              className="relative p-2 rounded-full text-[#51617a] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#172338]"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[16px] h-4 rounded-full bg-[#16C784] text-[#03130d] text-[10px] font-bold flex items-center justify-center font-mono-num">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/messages')}
              aria-label={`Messages (${unreadMessages} unread)`}
              className="relative p-2 rounded-full text-[#51617a] dark:text-[#94A3B8] hover:bg-white dark:hover:bg-[#172338]"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[16px] h-4 rounded-full bg-[#3B82F6] text-white text-[10px] font-bold flex items-center justify-center font-mono-num">
                  {unreadMessages}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-[#d5deea] dark:border-[#263449]">
              {user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt={user.fullName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#16C784]/20 text-[#16C784] text-xs font-bold flex items-center justify-center">
                  {user?.fullName.charAt(0) || 'K'}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-semibold max-w-[120px] truncate">
                {user?.fullName}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Compact Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 dark:bg-[#111B2E]/95 backdrop-blur-md border-t border-[#d5deea] dark:border-[#263449] grid grid-cols-4"
      >
        <button
          type="button"
          onClick={() => onSelectTab(navItems[0]?.id || 'overview')}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-[#51617a] dark:text-[#94A3B8]"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/jobs')}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-[#51617a] dark:text-[#94A3B8]"
        >
          <Briefcase className="w-4 h-4" />
          <span>Jobs</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/gigs')}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-[#51617a] dark:text-[#94A3B8]"
        >
          <Wrench className="w-4 h-4" />
          <span>Gigs</span>
        </button>
        <button
          type="button"
          onClick={() =>
            user?.role === 'admin'
              ? onSelectTab('identity')
              : user?.role === 'employer'
                ? onSelectTab('candidates')
                : onSelectTab('vault')
          }
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-[#51617a] dark:text-[#94A3B8]"
        >
          {user?.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
          <span>{user?.role === 'admin' ? 'Verify' : user?.role === 'employer' ? 'Talent' : 'Vault'}</span>
        </button>
      </nav>
    </div>
  );
};
