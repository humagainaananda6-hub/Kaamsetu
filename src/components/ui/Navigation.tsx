import React, { useState } from 'react';
import {
  Bell,
  Briefcase,
  LayoutDashboard,
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

export const PublicNavbar: React.FC = () => {
  const { user, lang, navigate } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'employer' ? '/employer' : '/seeker';

  const navItems = [
    { label: t(lang, 'navJobs'), to: '/jobs' },
    { label: t(lang, 'navGigs'), to: '/gigs' },
    { label: t(lang, 'navEmployers'), to: '#for-employers' },
    { label: t(lang, 'navHowItWorks'), to: '#how-it-works' },
    { label: t(lang, 'navAbout'), to: '#about-us' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-sm border-b border-slate-200 dark:border-[#263449]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          className="text-lg font-extrabold tracking-tight font-display text-slate-900 dark:text-[#F8FAFC] whitespace-nowrap shrink-0"
        >
          KAAMSETU
        </a>

        {/* Zone 2: 5 concise single-line text links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.to}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.to);
              }}
              className="hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Primary action zone */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] transition-colors whitespace-nowrap shrink-0"
            >
              Dashboard
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/auth?mode=login')}
                className="hidden sm:inline-flex px-3 py-2 text-xs font-medium text-slate-700 dark:text-[#F8FAFC] hover:text-[#16C784] transition-colors whitespace-nowrap shrink-0"
              >
                {t(lang, 'login')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth?mode=register')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] transition-colors whitespace-nowrap shrink-0"
              >
                {t(lang, 'getStarted')}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden p-2 rounded-lg text-slate-700 dark:text-[#F8FAFC]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111B2E] px-4 py-3 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate(item.to);
              }}
              className="block w-full text-left py-2 text-sm font-medium text-slate-700 dark:text-[#F8FAFC]"
            >
              {item.label}
            </button>
          ))}
          {!user && (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate('/auth?mode=login');
              }}
              className="block w-full text-left py-2 text-sm font-medium text-[#16C784]"
            >
              {t(lang, 'login')}
            </button>
          )}
        </div>
      )}
    </header>
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
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-lg font-extrabold tracking-tight font-display text-slate-900 dark:text-[#F8FAFC] whitespace-nowrap"
          >
            KAAMSETU
          </button>
          <span className="text-[11px] font-medium text-slate-500 dark:text-[#94A3B8] capitalize">
            {user?.role.replace('_', ' ')}
          </span>
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
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#16C784]/15 text-[#16C784]'
                    : 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#172338] hover:text-slate-900 dark:hover:text-[#F8FAFC]'
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

      <div className="pt-4 border-t border-slate-200 dark:border-[#263449] space-y-2">
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#263449] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
          >
            {lang === 'en' ? 'नेपाली' : 'English'}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg border border-slate-200 dark:border-[#263449] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>{t(lang, 'logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-white dark:bg-[#111B2E] border-r border-slate-200 dark:border-[#263449] sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 bg-white dark:bg-[#111B2E] border-r border-slate-200 dark:border-[#263449] h-full overflow-y-auto">
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
        <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-sm border-b border-slate-200 dark:border-[#263449] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation drawer"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-[#94A3B8]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-semibold truncate">{title}</h1>
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
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] text-slate-900 dark:text-[#F8FAFC]"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label={`Notifications (${unreadNotifications} unread)`}
              className="relative p-2 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#172338]"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[16px] h-4 rounded-full bg-[#16C784] text-[#0B1220] text-[10px] font-bold flex items-center justify-center font-mono-num">
                  {unreadNotifications}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/messages')}
              aria-label={`Messages (${unreadMessages} unread)`}
              className="relative p-2 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#172338]"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[16px] h-4 rounded-full bg-[#3B82F6] text-white text-[10px] font-bold flex items-center justify-center font-mono-num">
                  {unreadMessages}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-[#263449]">
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
              <span className="hidden sm:inline text-xs font-medium max-w-[120px] truncate">
                {user?.fullName}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Compact Mobile Bottom Navigation (<= 56px height, well under 15% sticky cap) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 dark:bg-[#111B2E]/95 backdrop-blur-sm border-t border-slate-200 dark:border-[#263449] grid grid-cols-4"
      >
        <button
          type="button"
          onClick={() => onSelectTab(navItems[0]?.id || 'overview')}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600 dark:text-[#94A3B8]"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/jobs')}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600 dark:text-[#94A3B8]"
        >
          <Briefcase className="w-4 h-4" />
          <span>Jobs</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/gigs')}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600 dark:text-[#94A3B8]"
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
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600 dark:text-[#94A3B8]"
        >
          {user?.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
          <span>{user?.role === 'admin' ? 'Verify' : user?.role === 'employer' ? 'Talent' : 'Vault'}</span>
        </button>
      </nav>
    </div>
  );
};
