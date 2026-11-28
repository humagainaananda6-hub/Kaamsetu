import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { KbnBrandMark } from '../components/ui/Navigation';
import type { User } from '../types';

type AuthMode = 'login' | 'register' | 'otp' | 'reset';

const DEMO_ACCOUNTS = [
  {
    label: 'Aarav Shrestha (Job Seeker)',
    detail: 'Verified Identity · Verified SEE · Pending B.Sc.',
    email: 'aarav@kaamsetu.np',
    pass: 'KaamSetu@2026',
  },
  {
    label: 'Bikash Thapa (Employer)',
    detail: 'Himalayan Tech Labs · Verified Startup',
    email: 'bikash@himalayantech.np',
    pass: 'KaamSetu@2026',
  },
  {
    label: 'Prativa Adhikari (Platform Admin)',
    detail: 'Verification Queue, Moderation & Audit Logs',
    email: 'admin@kaamsetu.np',
    pass: 'AdminSetu@2026',
  },
];

export const AuthPage: React.FC = () => {
  const { user, currentPath, navigate, establishSession, logout, showToast } = useApp();

  const searchString = currentPath.includes('?') ? currentPath.split('?')[1] : window.location.search.slice(1);
  const params = new URLSearchParams(searchString);
  const queryMode = params.get('mode') as AuthMode | null;
  const queryRole = params.get('role') === 'employer' ? 'employer' : 'job_seeker';

  const [mode, setMode] = useState<AuthMode>(
    queryMode && ['login', 'register', 'otp', 'reset'].includes(queryMode) ? queryMode : 'login',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login / Register state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'job_seeker' | 'employer'>(queryRole);

  // Phone OTP state
  const [otpPhone, setOtpPhone] = useState('+977-9841234567');
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');

  // Reset Password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (queryMode && ['login', 'register', 'otp', 'reset'].includes(queryMode)) {
      setMode(queryMode);
      setError(null);
    }
    setRole(queryRole);
  }, [queryMode, queryRole]);

  const workspaceForRole = (userRole: string) =>
    userRole === 'admin' ? '/admin' : userRole === 'employer' ? '/employer' : '/seeker';

  const handleLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ user: User; token?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      await establishSession(res.user, res.token);
      showToast(`Signed in as ${res.user.fullName}!`, 'success');
      navigate(workspaceForRole(res.user.role));
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ user: User; token?: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, phoneNumber, password, role }),
      });
      await establishSession(res.user, res.token);
      showToast(`Account created & signed in as ${res.user.fullName}!`, 'success');
      navigate(workspaceForRole(res.user.role));
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ devPreviewNotice: string }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: otpPhone }),
      });
      setOtpSent(true);
      setOtpNotice(res.devPreviewNotice);
      showToast('OTP generated for your Nepal mobile number.', 'info');
    } catch (err: any) {
      setError(err.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ user: User; token?: string }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: otpPhone, code: otpCode, role }),
      });
      await establishSession(res.user, res.token);
      showToast(`Phone verified! Signed in as ${res.user.fullName}.`, 'success');
      navigate(workspaceForRole(res.user.role));
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ devPreviewNotice: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
      });
      setResetSent(true);
      setResetNotice(res.devPreviewNotice);
    } catch (err: any) {
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, token: resetToken, newPassword }),
      });
      showToast('Password updated! You can now sign in.', 'success');
      setMode('login');
      setEmail(resetEmail);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#0B1220] dark:text-[#F8FAFC] flex flex-col">
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <KbnBrandMark />
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pb-12 pt-2 space-y-6">
        {user && (
          <div className="kbn-card-surface rounded-[20px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-[#16C784]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#16C784]/15 text-[#16C784] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">
                  Signed in as {user.fullName} ({user.role.replace('_', ' ')})
                </p>
                <p className="text-xs text-[#51617a] dark:text-[#94A3B8]">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(workspaceForRole(user.role))}
                className="px-4 py-2 text-xs font-bold rounded-[12px] kbn-btn-primary"
              >
                Open My Workspace
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-3.5 py-2 text-xs font-semibold rounded-[12px] border border-[#d5deea] dark:border-[#263449] text-[#EF4444] hover:bg-[#EF4444]/10 inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Main Auth Card */}
          <div className="lg:col-span-7 kbn-card-surface rounded-[24px] p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-[#EEF3F9] dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]">
              {(
                [
                  ['login', 'Sign In', Mail],
                  ['register', 'Create Account', UserPlus],
                  ['otp', '+977 OTP', Phone],
                  ['reset', 'Reset Password', KeyRound],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMode(id);
                    setError(null);
                  }}
                  className={`flex-1 min-w-[100px] py-2 px-3 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                    mode === id
                      ? 'bg-white dark:bg-[#172338] text-[#0B1220] dark:text-[#F8FAFC] shadow-xs'
                      : 'text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {error && (
              <div role="alert" className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-sm text-[#EF4444]">
                {error}
              </div>
            )}

            {mode === 'login' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin(email, password);
                }}
                className="space-y-4"
              >
                <div>
                  <h1 className="text-2xl font-extrabold font-display tracking-tight">
                    Sign in to KaamBridgeNepal
                  </h1>
                  <p className="text-sm text-[#51617a] dark:text-[#94A3B8] mt-1">
                    Access your logged-in workspace, job applications, and verified certificates.
                  </p>
                </div>
                <div>
                  <label htmlFor="login-email" className="block text-xs font-semibold mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.np"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-xs font-semibold mb-1.5">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-bold rounded-[14px] kbn-btn-primary disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign In to Workspace'}
                </button>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#51617a] dark:text-[#94A3B8]">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className="font-semibold text-[#16C784] hover:underline"
                  >
                    New here? Create a working account →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                    }}
                    className="hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <h1 className="text-2xl font-extrabold font-display tracking-tight">
                    Create Your KBN Account
                  </h1>
                  <p className="text-sm text-[#51617a] dark:text-[#94A3B8] mt-1">
                    Your account signs in immediately and opens your personal workspace.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('job_seeker')}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      role === 'job_seeker'
                        ? 'border-[#16C784] bg-[#16C784]/10'
                        : 'border-[#d5deea] dark:border-[#263449]'
                    }`}
                  >
                    <span className="block text-sm font-semibold">I am looking for work</span>
                    <span className="block text-xs text-[#51617a] dark:text-[#94A3B8] mt-0.5">
                      Jobs, internships &amp; local gigs
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('employer')}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      role === 'employer'
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                        : 'border-[#d5deea] dark:border-[#263449]'
                    }`}
                  >
                    <span className="block text-sm font-semibold">I want to hire people</span>
                    <span className="block text-xs text-[#51617a] dark:text-[#94A3B8] mt-0.5">
                      Post vacancies &amp; micro-tasks
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-name" className="block text-xs font-semibold mb-1">
                      Full Name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Adhikari"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-phone" className="block text-xs font-semibold mb-1">
                      Nepal Mobile (+977, Optional)
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+977-9841234567"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold mb-1">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@example.np"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-pw" className="block text-xs font-semibold mb-1">
                    Password (6+ characters)
                  </label>
                  <input
                    id="reg-pw"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-bold rounded-[14px] kbn-btn-primary disabled:opacity-60"
                >
                  {loading ? 'Creating Account...' : 'Create Account & Sign In'}
                </button>
              </form>
            )}

            {mode === 'otp' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-extrabold font-display tracking-tight">
                    Nepal Mobile OTP Sign-In
                  </h1>
                  <p className="text-sm text-[#51617a] dark:text-[#94A3B8] mt-1">
                    Register or sign in using a +977 mobile number.
                  </p>
                </div>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label htmlFor="otp-phone" className="block text-xs font-semibold mb-1">
                        Mobile Number (+977)
                      </label>
                      <input
                        id="otp-phone"
                        type="tel"
                        required
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value)}
                        placeholder="+977-9841234567"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 text-sm font-bold rounded-[14px] kbn-btn-primary"
                    >
                      {loading ? 'Sending...' : 'Send 6-Digit OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    {otpNotice && (
                      <div className="p-3 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-xs text-[#3B82F6]">
                        {otpNotice}
                      </div>
                    )}
                    <div>
                      <label htmlFor="otp-code" className="block text-xs font-semibold mb-1">
                        6-Digit Verification Code
                      </label>
                      <input
                        id="otp-code"
                        type="text"
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="482910"
                        className="w-full px-3.5 py-2.5 text-sm font-mono-num rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 text-sm font-bold rounded-[14px] kbn-btn-primary"
                    >
                      {loading ? 'Verifying...' : 'Verify & Sign In'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {mode === 'reset' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-extrabold font-display tracking-tight">
                    Forgot &amp; Reset Password
                  </h1>
                  <p className="text-sm text-[#51617a] dark:text-[#94A3B8] mt-1">
                    Request a reset code for your registered email address.
                  </p>
                </div>
                {!resetSent ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label htmlFor="reset-email" className="block text-xs font-semibold mb-1">
                        Account Email
                      </label>
                      <input
                        id="reset-email"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.np"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 text-sm font-bold rounded-[14px] kbn-btn-primary"
                    >
                      Send Reset Code
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {resetNotice && (
                      <div className="p-3 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-xs text-[#3B82F6]">
                        {resetNotice}
                      </div>
                    )}
                    <div>
                      <label htmlFor="reset-token" className="block text-xs font-semibold mb-1">
                        Reset Token
                      </label>
                      <input
                        id="reset-token"
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="KS-RESET-2026"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                      />
                    </div>
                    <div>
                      <label htmlFor="reset-newpw" className="block text-xs font-semibold mb-1">
                        New Password
                      </label>
                      <input
                        id="reset-newpw"
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#0B1220] border border-[#d5deea] dark:border-[#263449]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 text-sm font-bold rounded-[14px] kbn-btn-primary"
                    >
                      Update Password
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Demo Accounts Quick Access Panel */}
          <aside className="lg:col-span-5 kbn-card-surface rounded-[24px] p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#16C784]">
              <ShieldCheck className="w-4 h-4" />
              <span>Instant Demo Accounts</span>
            </div>
            <p className="text-xs text-[#51617a] dark:text-[#94A3B8]">
              Sign in instantaneously with any Nepali demo account or create your own new account on the left.
            </p>
            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((acc) => (
                <div
                  key={acc.email}
                  className="p-4 rounded-2xl bg-[#EEF3F9]/80 dark:bg-[#111B2E] border border-[#d5deea] dark:border-[#263449] flex flex-col gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold">{acc.label}</p>
                    <p className="text-xs text-[#51617a] dark:text-[#94A3B8]">{acc.detail}</p>
                    <p className="text-[11px] font-mono-num text-[#51617a] dark:text-[#94A3B8] mt-1">{acc.email}</p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleLogin(acc.email, acc.pass)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#16C784]/15 text-[#16C784] hover:bg-[#16C784] hover:text-[#041016] transition-colors self-start whitespace-nowrap"
                  >
                    Sign In as {acc.label.split(' ')[0]}
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
