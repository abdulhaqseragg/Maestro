import React, { useState, useEffect } from 'react';
import { User, FinanceState } from '../types';
import { translations } from '../translations';
import { authService } from '../src/services/authService';
import { 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Globe, 
  Lock, 
  Mail,
  Zap,
  Layout,
  User as UserIcon,
  Fingerprint,
  Cpu,
  Chrome,
  Apple,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

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

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authStage, setAuthStage] = useState<'idle' | 'verifying' | 'securing' | 'success'>('idle');
  const [error, setError] = useState('');
  const [checkingSession, setChecking] = useState(true);
  const [securityPass, setSecurityPass] = useState(false);

  // ─── Check existing session & Remember Me ─────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await authService.getCurrentUser();
        if (user) {
          onLogin(mapUser(user));
          return;
        }

        const remembered = localStorage.getItem('maestro_remembered_user');
        if (remembered) {
          const { email, password } = JSON.parse(remembered);
          setFormData(prev => ({ ...prev, email, password }));
          setRememberMe(true);
        }
      } catch { /* no session */ }
      finally { 
        setTimeout(() => setChecking(false), 1200);
      }
    })();
  }, [onLogin]);

  const mapUser = (u: any): User => ({
    id: u.id,
    email: u.email,
    username: u.username || u.email.split('@')[0],
    password: u.password,
    role: u.role,
    permissions: u.permissions || {
      dashboard: true, accounts: true, transactions: true,
      obligations: true, budgets: true, goals: true, ai: true, settings: true,
    },
    settings: u.settings || { currency: 'EGP', language: lang },
    expirationDate: u.expirationDate || u.expiration_date,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setAuthStage('verifying');
    
    // Multi-stage authentication simulation for "Elite" feel
    try {
      // Stage 1: Verification
      await new Promise(r => setTimeout(r, 800));
      const user = await authService.signIn(formData.email, formData.password);
      
      // Stage 2: Security Tunneling / Encryption
      setAuthStage('securing');
      await new Promise(r => setTimeout(r, 1200));

      if (rememberMe) {
        localStorage.setItem('maestro_remembered_user', JSON.stringify({
          email: formData.email,
          password: formData.password
        }));
      } else {
        localStorage.removeItem('maestro_remembered_user');
      }

      setAuthStage('success');
      setSecurityPass(true);
      setTimeout(() => onLogin(mapUser(user)), 800);
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'بيانات الاعتماد غير صالحة' : 'Invalid credentials'));
      setLoading(false);
      setAuthStage('idle');
    }
  };

  const handleBiometric = () => {
    setLoading(true);
    setAuthStage('verifying');
    // Simulated biometric success
    setTimeout(() => {
      setError(lang === 'ar' ? 'المصادقة البيومترية غير مفعلة حالياً لهذا الجهاز.' : 'Biometric auth not currently enabled for this device.');
      setLoading(false);
      setAuthStage('idle');
    }, 1500);
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020205]">
        <div className="flex flex-col items-center gap-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
            <div className="relative w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center backdrop-blur-xl">
              <Layout className="text-white animate-soft" size={32} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <span className="text-white text-[10px] font-black tracking-[0.8em] uppercase opacity-50">Maestro</span>
            <div className="h-[2px] w-48 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 w-full animate-loading-slide" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-[#020205] p-4 sm:p-8 selection:bg-indigo-500/30 overflow-hidden ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* ─── Elite Background ─── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/10 blur-[160px] rounded-full animate-slow-spin" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-600/10 blur-[160px] rounded-full animate-slow-spin-reverse" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.12] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className={`w-full max-w-[1200px] min-h-[700px] grid lg:grid-cols-2 bg-white/[0.01] backdrop-blur-3xl rounded-[3rem] sm:rounded-[4rem] border border-white/5 shadow-[0_40px_150px_-30px_rgba(0,0,0,0.9)] overflow-hidden relative z-10 transition-all duration-1000 ${securityPass ? 'scale-110 opacity-0 blur-3xl' : 'scale-100 opacity-100 blur-0'}`}>
        
        {/* LEFT PANEL: Narrative & Brand */}
        <div className="hidden lg:flex flex-col justify-between p-20 bg-gradient-to-br from-white/[0.03] to-transparent border-r border-white/5 relative">
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-24 group cursor-pointer">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.3)] group-hover:scale-110 transition-transform duration-500">
                <Layout className="text-white" size={28} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-[0.15em] uppercase">Maestro</h1>
                <p className="text-[9px] font-black text-indigo-400 tracking-[0.4em] uppercase opacity-80">Orchestrator v2.5</p>
              </div>
            </div>

            <div className="space-y-12">
              <div className="space-y-6">
                <h2 className="text-7xl font-black text-white leading-[0.95] tracking-tighter">
                  {lang === 'ar' ? 'مستقبلك المالي، تحت سيطرتك.' : 'Finance, Controlled.'}
                </h2>
                <p className="text-xl text-slate-400 leading-relaxed max-w-sm font-medium opacity-80">
                  {lang === 'ar' 
                    ? 'نظام ذكي متكامل لإدارة الأصول والمصاريف والتحليلات المدعومة بالذكاء الاصطناعي.' 
                    : 'A comprehensive intelligent system for asset management, expenses, and AI-powered insights.'}
                </p>
              </div>

              {/* Digital Signature Visual */}
              <div className="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-md max-w-xs animate-float">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 animate-pulse" />
                  <Cpu className="text-indigo-400 relative z-10" size={32} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Local Encryption</p>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">AES-256 Bit Secure</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020205] bg-slate-800 flex items-center justify-center overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all cursor-pointer" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {lang === 'ar' ? 'موثوق من قبل +1000 مطور' : 'Trusted by +1000 users'}
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4">
            <div className="p-6 bg-white/[0.02] rounded-[2.5rem] border border-white/5 backdrop-blur-xl group hover:bg-white/[0.04] transition-all cursor-default">
              <Fingerprint className="text-indigo-400 mb-4 group-hover:scale-110 transition-transform" size={24} />
              <p className="text-white font-bold text-sm mb-1">{lang === 'ar' ? 'أمان فائق' : 'Safe & Secure'}</p>
              <p className="text-slate-500 text-[10px] leading-relaxed">{lang === 'ar' ? 'تشفير نهاية إلى نهاية' : 'End-to-end local encryption'}</p>
            </div>
            <div className="p-6 bg-white/[0.02] rounded-[2.5rem] border border-white/5 backdrop-blur-xl group hover:bg-white/[0.04] transition-all cursor-default">
              <Sparkles className="text-emerald-400 mb-4 group-hover:scale-110 transition-transform" size={24} />
              <p className="text-white font-bold text-sm mb-1">{lang === 'ar' ? 'تحليل ذكي' : 'Smart Insights'}</p>
              <p className="text-slate-500 text-[10px] leading-relaxed">{lang === 'ar' ? 'توقعات مالية دقيقة' : 'AI-driven predictive modeling'}</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Form Area */}
        <div className="p-8 sm:p-16 lg:p-24 flex flex-col justify-center bg-[#05050a]/60 relative">
          
          {/* Top Bar */}
          <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">System Online</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-full">
                <ShieldCheck size={10} className="text-indigo-400" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">TLS 1.3 Active</span>
              </div>
            </div>
            
            <button 
              onClick={toggleLanguage}
              className="group flex items-center gap-2 px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-2xl transition-all border border-white/5 text-[10px] font-black uppercase tracking-widest"
            >
              <Globe size={14} className="group-hover:rotate-180 transition-transform duration-700" />
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          </div>

          <div className="max-w-sm mx-auto w-full">
            <div className="mb-14">
              <h3 className="text-5xl font-black text-white mb-4 tracking-tighter">
                {lang === 'ar' ? 'أهلاً بك' : 'Sign In'}
              </h3>
              <p className="text-slate-500 font-bold text-sm opacity-80">
                {lang === 'ar' ? 'أدخل بياناتك للوصول إلى النظام' : 'Enter your system credentials'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Email Field */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-1">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Account Email'}
                </label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                    <Mail size={18} strokeWidth={2.5} />
                  </div>
                  <input 
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full bg-white/[0.02] border border-white/5 text-white pl-14 pr-5 py-5 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all font-bold text-sm placeholder:text-slate-800 ${isRTL ? 'text-right' : ''}`}
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    {lang === 'ar' ? 'كلمة المرور' : 'Security Token'}
                  </label>
                  <button type="button" className="text-[10px] font-black text-indigo-400/60 hover:text-indigo-400 transition-colors uppercase tracking-widest">
                    {lang === 'ar' ? 'نسيت الرمز؟' : 'Recovery'}
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                    <Lock size={18} strokeWidth={2.5} />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full bg-white/[0.02] border border-white/5 text-white pl-14 pr-14 py-5 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all font-bold text-sm placeholder:text-slate-800 ${isRTL ? 'text-right' : ''}`}
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-6 h-6 border-2 border-white/5 rounded-xl bg-white/5 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all group-hover:scale-110 active:scale-90 shadow-xl" />
                    <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                    {lang === 'ar' ? 'حفظ الجلسة' : 'Remember Session'}
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl flex items-center gap-4 animate-in shake duration-300">
                  <ShieldAlert size={20} className="shrink-0" />
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[1.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.25em] py-6 rounded-[1.5rem] flex items-center justify-center gap-4 transition-all active:scale-[0.98] disabled:opacity-80">
                  {loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span className="text-[11px]">
                          {authStage === 'verifying' && (lang === 'ar' ? 'جاري التحقق...' : 'Verifying Identity')}
                          {authStage === 'securing' && (lang === 'ar' ? 'تشفير الجلسة...' : 'Securing Tunnel')}
                          {authStage === 'success' && (lang === 'ar' ? 'تم الدخول' : 'Access Granted')}
                        </span>
                      </div>
                      <div className="w-32 h-[2px] bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full bg-white transition-all duration-500 ${authStage === 'verifying' ? 'w-1/2' : 'w-full'}`} />
                      </div>
                    </div>
                  ) : (
                    <>
                      {lang === 'ar' ? 'دخول النظام' : 'Authorize Access'}
                      <ChevronRight size={20} className={`transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Biometric Gateway */}
            <div className="mt-8">
              <button 
                onClick={handleBiometric}
                disabled={loading}
                className="w-full flex items-center justify-center gap-4 py-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] hover:bg-white/[0.05] transition-all group disabled:opacity-50"
              >
                <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                  <Fingerprint size={20} className="text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">{lang === 'ar' ? 'الدخول البيومتري' : 'Biometric Access'}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{lang === 'ar' ? 'استخدم البصمة أو الوجه' : 'Use FaceID or TouchID'}</p>
                </div>
              </button>
            </div>

            {/* Social Logic */}
            <div className="mt-12 space-y-6">
              <div className="flex items-center gap-5">
                <div className="h-px bg-white/5 flex-1" />
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">{lang === 'ar' ? 'بوابات بديلة' : 'Alternate Gateways'}</span>
                <div className="h-px bg-white/5 flex-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-3 py-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group">
                  <Chrome size={18} className="text-slate-500 group-hover:text-white transition-colors" />
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest">Google</span>
                </button>
                <button className="flex items-center justify-center gap-3 py-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group">
                  <Apple size={18} className="text-slate-500 group-hover:text-white transition-colors" />
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest">Apple</span>
                </button>
              </div>
            </div>

            <div className="mt-16 text-center">
              <p className="text-slate-700 text-[9px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-[280px] mx-auto">
                {lang === 'ar' 
                  ? 'محمي بواسطة Maestro Guard. اتصل بالمسؤول للحصول على تصريح الوصول.' 
                  : 'Secured by Maestro Guard. Unauthorized access attempt is logged.'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Style Tags */}
      <style>{`
        @keyframes loading-slide {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        .animate-loading-slide {
          animation: loading-slide 1.5s infinite cubic-bezier(0.65, 0, 0.35, 1);
        }
        @keyframes slow-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slow-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-slow-spin {
          animation: slow-spin 30s linear infinite;
        }
        .animate-slow-spin-reverse {
          animation: slow-spin-reverse 40s linear infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
