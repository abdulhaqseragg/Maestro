
import React, { useState } from 'react';
import { User, FinanceState } from '../types';
import { translations } from '../translations';
import { Mail, User as UserIcon, Lock, ArrowRight, ShieldCheck, Key, RefreshCw, Globe, Check } from 'lucide-react';

interface LoginProps {
  state: FinanceState & { notify: (msg: string, type: any) => void };
  onLogin: (user: User) => void;
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

const Login: React.FC<LoginProps> = ({ state, onLogin, updateState }) => {
  // Use globalSettings for pre-login language
  const lang = state.globalSettings?.language || 'en';
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<'EMAIL' | 'OTP' | 'NEW_PASS'>('EMAIL');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = state.users.find(u => 
      u.email.toLowerCase() === formData.email.toLowerCase() &&
      u.username === formData.username &&
      u.password === formData.password
    );

    if (user) {
      if (user.expirationDate && new Date(user.expirationDate) < new Date()) {
        setError(t.auth.accountExpired);
        return;
      }
      
      if (rememberMe) {
        localStorage.setItem('maestro_remembered_user_id', user.id);
      } else {
        localStorage.removeItem('maestro_remembered_user_id');
      }
      
      onLogin(user);
      state.notify(`${t.auth.loginTitle} - ${user.username}`, 'SUCCESS');
    } else {
      setError(t.auth.invalidCreds);
      state.notify(t.auth.invalidCreds, 'ERROR');
    }
  };

  const handleLanguageSwitch = (newLang: string) => {
    updateState(prev => ({
      ...prev,
      // Map to settings so the App.tsx updater correctly identifies it as a language change
      settings: { ...prev.settings, language: newLang } as any
    }));
  };

  const startReset = () => {
    const admin = state.users.find(u => u.role === 'ADMIN');
    if (!admin) return;
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    console.log(`[SIMULATION] OTP for admin reset: ${code}`);
    state.notify(`${t.auth.otpSent}: ${admin.email}`, 'INFO');
    setResetStep('OTP');
    setIsResetMode(true);
  };

  const verifyOtp = () => {
    if (otp === generatedOtp) {
      setResetStep('NEW_PASS');
      state.notify(t.common.loading, 'SUCCESS');
    } else {
      setError('Invalid OTP');
      state.notify('Invalid OTP', 'ERROR');
    }
  };

  const saveNewPassword = () => {
    updateState(prev => ({
      ...prev,
      users: prev.users.map(u => u.role === 'ADMIN' ? { ...u, password: newPassword } : u)
    }));
    state.notify(t.auth.resetSuccess, 'SUCCESS');
    setIsResetMode(false);
    setResetStep('EMAIL');
    setFormData({ ...formData, password: '' });
  };

  if (isResetMode) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50 rounded-full blur-[120px] opacity-40 pointer-events-none" />
        
        <div className="bg-white rounded-[3.5rem] shadow-2xl p-12 w-full max-w-md animate-soft border border-slate-100/50 relative z-10">
          <div className="mb-10 text-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-200">
              <Key className="text-white" size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-orchestra">{t.auth.otpTitle}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-metadata mt-2">{t.auth.otpSubtitle}</p>
          </div>

          <div className="space-y-8">
            {resetStep === 'OTP' && (
              <div className="space-y-6">
                <input 
                  type="text" 
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center text-4xl font-black tracking-[0.5em] py-6 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-8 focus:ring-indigo-50 transition-all font-mono"
                />
                <button onClick={verifyOtp} className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-metadata rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-100 btn-interaction">
                  {t.auth.verifyBtn}
                </button>
              </div>
            )}

            {resetStep === 'NEW_PASS' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-2">{t.auth.password}</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-8 focus:ring-indigo-50 font-bold"
                    />
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} strokeWidth={2.5} />
                  </div>
                </div>
                <button onClick={saveNewPassword} className="w-full py-5 bg-indigo-600 text-white font-black uppercase tracking-metadata rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-100 btn-interaction">
                  {t.common.save}
                </button>
              </div>
            )}

            <button onClick={() => setIsResetMode(false)} className="w-full text-xs font-black text-slate-300 hover:text-slate-500 uppercase tracking-metadata transition-colors">
              {t.common.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full -mr-48 -mt-48 opacity-50 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50 rounded-full -ml-48 -mb-48 opacity-50 blur-[100px]" />

      {/* Language Switcher Top Right */}
      <div className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} z-20 flex gap-2`}>
        <button 
          onClick={() => handleLanguageSwitch('en')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-metadata uppercase transition-all ${lang === 'en' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white/50 text-slate-400 hover:text-slate-900 hover:bg-white'}`}
        >
          EN
        </button>
        <button 
          onClick={() => handleLanguageSwitch('ar')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-metadata uppercase transition-all ${lang === 'ar' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white/50 text-slate-400 hover:text-slate-900 hover:bg-white'}`}
        >
          عربي
        </button>
      </div>

      <div className="bg-white rounded-[4rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.08)] p-14 w-full max-w-lg animate-soft border border-slate-100 relative z-10">
        <div className="mb-14 text-center">
          <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-slate-200 group-hover:scale-105 transition-transform duration-700">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 18L12 6L20 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 18H20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="12" cy="11" r="2" fill="#6366f1" />
              </svg>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-orchestra">{t.auth.loginTitle}</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-metadata mt-4">{t.auth.loginSubtitle}</p>
        </div>

        {error && (
          <div className="mb-8 p-5 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-metadata rounded-[1.5rem] flex items-center gap-3 animate-soft">
            <ShieldCheck size={20} strokeWidth={2.5} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-2">{t.auth.email}</label>
            <div className="relative">
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className={`w-full ${isRTL ? 'pr-14 pl-6' : 'pl-14 pr-6'} py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-8 focus:ring-slate-100 focus:bg-white transition-all font-bold text-sm`}
              />
              <Mail className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 text-slate-300`} size={22} strokeWidth={2} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-2">{t.auth.username}</label>
            <div className="relative">
              <input 
                required
                type="text" 
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                className={`w-full ${isRTL ? 'pr-14 pl-6' : 'pl-14 pr-6'} py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-8 focus:ring-slate-100 focus:bg-white transition-all font-bold text-sm`}
              />
              <UserIcon className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 text-slate-300`} size={22} strokeWidth={2} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-2">{t.auth.password}</label>
            <div className="relative">
              <input 
                required
                type="password" 
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className={`w-full ${isRTL ? 'pr-14 pl-6' : 'pl-14 pr-6'} py-5 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-8 focus:ring-slate-100 focus:bg-white transition-all font-bold text-sm`}
              />
              <Lock className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 text-slate-300`} size={22} strokeWidth={2} />
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div 
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200 group-hover:border-slate-400'}`}
              >
                {rememberMe && <Check size={14} strokeWidth={4} className="text-white" />}
              </div>
              <span className="text-[11px] font-black uppercase tracking-metadata text-slate-400 group-hover:text-slate-900 transition-colors">
                {t.auth.rememberMe}
              </span>
            </label>
            <button 
              type="button"
              onClick={startReset}
              className="text-[10px] font-black text-slate-300 hover:text-indigo-600 transition-colors uppercase tracking-metadata"
            >
              {t.auth.forgotPass}
            </button>
          </div>

          <button 
            type="submit" 
            className="w-full py-6 bg-slate-900 text-white font-black uppercase tracking-metadata rounded-[2rem] hover:bg-black shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] transition-all flex items-center justify-center gap-4 btn-interaction mt-4"
          >
            {t.auth.loginBtn}
            <ArrowRight size={20} strokeWidth={3} className={isRTL ? 'rotate-180' : ''} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
