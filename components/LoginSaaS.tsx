import React, { useState, useEffect } from 'react';
import { User, FinanceState } from '../types';
import { translations } from '../translations';
import { authService } from '../src/services/authService';
import { Eye, EyeOff, TrendingUp, Users, Sparkles, Shield, Lock, Globe } from 'lucide-react';

interface LoginProps {
  state: FinanceState & { notify: (msg: string, type: any) => void };
  onLogin: (user: User) => void;
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

const Login: React.FC<LoginProps> = ({ state, onLogin }) => {
  const [lang, setLang] = useState<'en' | 'ar'>(
    (state.globalSettings?.language as 'en' | 'ar') || 'en'
  );
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [formData, setFormData]       = useState({ email: '', password: '' });
  const [showPassword, setShowPass]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [checkingSession, setChecking] = useState(true);

  // ─── Check existing session ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await authService.getCurrentUser();
        if (user) onLogin(mapUser(user));
      } catch { /* no session */ }
      finally  { setChecking(false); }
    })();
  }, [onLogin]);

  const mapUser = (u: any): User => ({
    id:             u.id,
    email:          u.email,
    username:       u.username || u.email.split('@')[0],
    password:       '',
    role:           u.role,
    permissions:    u.permissions || defaultPerms(),
    settings:       u.settings   || { currency: 'EGP', language: lang },
    expirationDate: u.expirationDate || u.expiration_date,
  });

  const defaultPerms = () => ({
    dashboard: true, accounts: true, transactions: true,
    obligations: true, budgets: true, goals: true, ai: true, settings: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await authService.signIn(formData.email, formData.password);
      onLogin(mapUser(user));
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  // Dev bypass
  const handleDevBypass = () => {
    const u = state.users?.find(u => u.id === 'admin-1');
    if (u) onLogin(u);
    else state.notify('Dev user not found', 'ERROR');
  };

  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-semibold tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ══════════════════════════════════════════════════════
          LEFT PANEL — Brand / Feature showcase
      ══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[58%] relative bg-[#080818] flex-col justify-between p-12 overflow-hidden">

        {/* Background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/40 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%]  w-[500px] h-[500px] rounded-full bg-violet-900/30 blur-[100px]" />
          <div className="absolute top-[40%]  left-[30%]       w-[300px] h-[300px] rounded-full bg-blue-900/20   blur-[80px]"  />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* ── Top: Logo ─────────────────────────────────────── */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-[14px] shadow-2xl shadow-indigo-900/60">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 18L12 6L20 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 18H20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="12" cy="11" r="2.5" fill="#a5b4fc"/>
            </svg>
          </div>
          <span className="text-white font-black text-xl tracking-tight">Maestro</span>
        </div>

        {/* ── Center: Hero text ──────────────────────────────── */}
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Financial Intelligence Platform</span>
          </div>

          <h1 className="text-5xl font-black text-white leading-[1.1] mb-5">
            Orchestrate<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              Your Finances
            </span>
          </h1>

          <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10">
            {lang === 'ar'
              ? 'منصة إدارة مالية متكاملة مع ذكاء اصطناعي، تحليلات فورية، وتعاون متعدد المستخدمين.'
              : 'A complete financial management platform with AI insights, real-time analytics, and multi-user collaboration.'}
          </p>

          {/* Feature cards */}
          <div className="space-y-3">
            {[
              {
                icon: <TrendingUp size={18} />,
                color: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20',
                iconBg: 'bg-indigo-500/20 text-indigo-400',
                title: lang === 'ar' ? 'تحليلات فورية' : 'Real-time Analytics',
                desc:  lang === 'ar' ? 'تقارير حية ورسوم بيانية تفاعلية' : 'Live reports and interactive dashboards',
              },
              {
                icon: <Users size={18} />,
                color: 'from-violet-500/20 to-violet-500/5 border-violet-500/20',
                iconBg: 'bg-violet-500/20 text-violet-400',
                title: lang === 'ar' ? 'مساحة عمل مشتركة' : 'Multi-user Workspace',
                desc:  lang === 'ar' ? 'صلاحيات محكومة لكل مستخدم' : 'Role-based access control per user',
              },
              {
                icon: <Sparkles size={18} />,
                color: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
                iconBg: 'bg-blue-500/20 text-blue-400',
                title: lang === 'ar' ? 'رؤى الذكاء الاصطناعي' : 'AI-Powered Insights',
                desc:  lang === 'ar' ? 'توصيات ذكية لتحسين أدائك المالي' : 'Smart recommendations powered by Gemini',
              },
            ].map((f, i) => (
              <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${f.color} border backdrop-blur-sm`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${f.iconBg}`}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{f.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom: Trust badges ───────────────────────────── */}
        <div className="relative z-10 flex items-center gap-6">
          {[
            { icon: <Shield size={14} />, label: 'SOC2 Compliant' },
            { icon: <Lock size={14} />,   label: 'Bank-Grade Encryption' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-500">
              <span className="text-slate-600">{b.icon}</span>
              <span className="text-xs font-semibold">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL — Login form
      ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-white relative">

        {/* Language toggle */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors text-xs font-bold"
          >
            <Globe size={14} />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>

        {/* Form container — centered */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-10">
              <div className="bg-slate-900 p-2 rounded-[10px]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M4 18L12 6L20 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 18H20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="12" cy="11" r="2" fill="#6366f1"/>
                </svg>
              </div>
              <span className="font-black text-slate-900 text-lg">Maestro</span>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900 mb-1.5">
                {lang === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'}
              </h2>
              <p className="text-slate-400 font-semibold text-sm">
                {lang === 'ar' ? 'سجّل دخولك للمتابعة' : 'Sign in to your account to continue'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email address'}
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-semibold text-sm placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button type="button" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                    {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••••"
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-semibold text-sm placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-2 rounded-2xl font-black text-sm uppercase tracking-widest transition-all text-white relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? '#6366f1'
                    : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #7c3aed 100%)',
                  boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)',
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading && (
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  )}
                  {loading
                    ? (lang === 'ar' ? 'جارٍ تسجيل الدخول...' : 'Signing in...')
                    : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')
                  }
                </span>
              </button>

              {/* Dev bypass */}
              {(import.meta as any).env.VITE_DISABLE_LOGIN === 'true' && (
                <button
                  type="button"
                  onClick={handleDevBypass}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-300 text-amber-600 text-xs font-bold hover:bg-amber-50 transition-colors"
                >
                  🚀 Dev Mode — Skip Login
                </button>
              )}
            </form>

            {/* Footer note */}
            <p className="mt-8 text-center text-xs text-slate-400 font-semibold">
              {lang === 'ar'
                ? 'تواصل مع المدير لإنشاء حساب'
                : 'Contact your administrator to request access'}
            </p>
          </div>
        </div>

        {/* Bottom brand bar on mobile */}
        <div className="lg:hidden py-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400 font-semibold">Maestro © 2025 — Financial Orchestration</p>
        </div>
      </div>

    </div>
  );
};

export default Login;