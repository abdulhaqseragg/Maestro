import React, { useMemo, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, 
  Calendar, AlertCircle, ArrowDownLeft,
  ArrowRight, Plus, PieChart as PieIcon,
  BarChart as BarIcon, Target, ChevronRight, Activity,
  Sparkles, Wifi, CreditCard, Download, UploadCloud
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { FinanceState, TransactionType } from '../types';
import { financeLogic } from '../src/services/financeLogic';
import { translations } from '../translations';
import SmartInsightCard from './SmartInsightCard';

interface DashboardProps {
  state: FinanceState;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, setActiveTab }) => {
  const t = translations[state.settings.language];
  const locale = state.settings.language;
  const isRTL = locale === 'ar';



  const stats = useMemo(() => {
    const totalBalance = state.accounts.reduce((acc, a) => acc + a.balance, 0);
    const monthlyIncome = state.transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);
    const monthlyExpense = state.transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);
    
    return {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      netCashFlow: monthlyIncome - monthlyExpense
    };
  }, [state]);

  const recentTransactions = useMemo(() => {
    return [...state.transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 5);
  }, [state.transactions]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayTransactions = state.transactions.filter(t => t.date.split('T')[0] === date);
      return {
        date: date.split('-').slice(1).join('/'),
        income: dayTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0),
        expense: dayTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0),
      };
    });
  }, [state.transactions]);

  const healthScore = useMemo(() => {
    const totalPayables = state.payables.reduce((acc, p) => acc + p.remainingBalance, 0);
    const dtiRatio = stats.monthlyIncome > 0 ? totalPayables / (stats.monthlyIncome * 12) : 1;
    const dtiScore = Math.max(0, 100 - (dtiRatio * 100));

    const totalBudgetLimit = state.budgets.reduce((acc, b) => acc + b.limit, 0);
    const totalBudgetSpent = state.budgets.reduce((acc, b) => acc + b.spent, 0);
    const budgetRatio = totalBudgetLimit > 0 ? totalBudgetSpent / totalBudgetLimit : 0;
    const budgetScore = budgetRatio > 1 ? Math.max(0, 100 - (budgetRatio - 1) * 100) : 100;

    const savingsRate = stats.monthlyIncome > 0 ? stats.netCashFlow / stats.monthlyIncome : 0;
    const savingsScore = Math.min(100, Math.max(0, savingsRate * 100 * 2));

    return Math.round((dtiScore * 0.3) + (budgetScore * 0.3) + (savingsScore * 0.4));
  }, [state, stats]);

  return (
    <div className={`space-y-6 sm:space-y-8 pb-20 sm:pb-8 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <SmartInsightCard state={state} />

      {/* ── Custom Magical Styling ─────────────────────────────────────── */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-float { animation: float-slow 7s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .glass-panel {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.06);
        }
        .neon-text {
          text-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
        }
      `}</style>

      {/* ── Top App Bar (Welcome & Actions) ───────────────────────────────── */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            {t.dashboard.title || "Overview"}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Main Bento Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
        
        {/* The Virtual Platinum Card (Col: 1-7) */}
        <div className="md:col-span-12 lg:col-span-7 animate-float">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-[#0b1021] p-8 sm:p-10 shadow-2xl shadow-indigo-900/20 w-full aspect-[1.8/1] sm:aspect-auto sm:h-full flex flex-col justify-between group cursor-default">
            {/* Holographic Orbs */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/30 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3 group-hover:bg-indigo-500/40 transition-colors duration-1000" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/20 blur-[80px] rounded-full translate-y-1/4 -translate-x-1/4 group-hover:bg-fuchsia-500/30 transition-colors duration-1000" />
            
            {/* Card Content - Top */}
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-indigo-200/60 font-medium tracking-widest uppercase text-[10px] mb-1">
                  {t.dashboard.totalBalance}
                </p>
                <div className="flex items-center gap-2">
                  <h1 className="text-4xl sm:text-5xl font-black text-white drop-shadow-md tracking-tight">
                    {financeLogic.formatCurrency(stats.totalBalance, state.settings.currency, locale, state.settings.isPrivacyMode)}
                  </h1>
                </div>
              </div>
              <Wifi className="text-white/30 transform rotate-90" size={28} />
            </div>

            {/* Quick Flow Mini-Stats overlapping inside the card */}
            <div className="relative z-10 hidden sm:flex items-center gap-6 mt-6">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-3">
                <div className="bg-emerald-500/20 text-emerald-300 p-2 rounded-xl">
                  <ArrowDownLeft size={16} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-emerald-200/70">{t.dashboard.monthlyIncome}</p>
                  <p className="text-sm font-bold text-white">{financeLogic.formatCurrency(stats.monthlyIncome, state.settings.currency, locale, state.settings.isPrivacyMode)}</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-3">
                <div className="bg-rose-500/20 text-rose-300 p-2 rounded-xl">
                  <ArrowUpRight size={16} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-rose-200/70">{t.dashboard.monthlyExpenses}</p>
                  <p className="text-sm font-bold text-white">{financeLogic.formatCurrency(stats.monthlyExpense, state.settings.currency, locale, state.settings.isPrivacyMode)}</p>
                </div>
              </div>
            </div>
            
            {/* Card Content - Bottom Base */}
            <div className="relative z-10 flex justify-between items-end mt-8 sm:mt-0 pt-6 border-t border-white/10 sm:border-transparent">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-white/40 font-medium uppercase text-[9px] tracking-widest leading-none mb-1">{t.dashboard.member}</p>
                  <p className="text-white/90 text-sm font-bold tracking-widest">
                    MAESTRO PRO
                  </p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-white/40 font-medium uppercase text-[9px] tracking-widest leading-none mb-1">{t.dashboard.statusLabel}</p>
                  <p className="text-emerald-400 text-sm font-bold tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> {t.dashboard.activeStatus}
                  </p>
                </div>
              </div>
              
              {/* Virtual Chip / Brand mark */}
              <div className="w-12 h-10 border border-white/20 rounded-xl flex items-center justify-center backdrop-blur bg-white/5 relative overflow-hidden group-hover:border-white/40 transition-colors">
                 <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 to-orange-400/20" />
                 <CreditCard size={20} className="text-white/50 relative z-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Financial Health Orbit (Col: 8-12) */}
        <div className="md:col-span-12 lg:col-span-5 glass-panel rounded-[2.5rem] p-6 sm:p-8 flex flex-col justify-between hover:shadow-[0_15px_60px_-15px_rgba(99,102,241,0.15)] transition-all duration-500 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{t.dashboard.healthOrbit}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-slate-100 rounded-full ${healthScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
               {t.dashboard.healthScore}: {healthScore}/100
            </span>
          </div>
          
          <div className="flex-1 flex items-center justify-center py-4 relative">
            {/* Custom Circular SVG Progress */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90 filter drop-shadow-md">
                {/* Background Track */}
                <circle cx="80" cy="80" r="70" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                {/* Foreground Track */}
                <circle 
                  cx="80" 
                  cy="80" 
                  r="70" 
                  stroke="url(#orbitGradient)" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeLinecap="round" 
                  strokeDasharray={439.8} 
                  strokeDashoffset={439.8 - (439.8 * healthScore) / 100} 
                  className="transition-all duration-1500 ease-out" 
                />
                <defs>
                  <linearGradient id="orbitGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Inner Heartbeat / Percentage */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <Target size={24} className="text-indigo-400 mb-1" />
                <span className="text-3xl font-black text-slate-800 tracking-tighter">{healthScore}%</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-slate-50/80 p-4 rounded-2xl border border-white flex gap-4">
             <div className="flex-1 text-center">
               <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">{t.dashboard.savingsRate}</p>
               <p className="text-sm font-black text-emerald-600">+{(stats.monthlyIncome > 0 ? (stats.netCashFlow / stats.monthlyIncome) * 100 : 0).toFixed(0)}%</p>
             </div>
             <div className="w-px bg-slate-200" />
             <div className="flex-1 text-center">
               <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">{t.dashboard.cashflow}</p>
               <p className="text-sm font-black text-slate-800">{financeLogic.formatCurrency(stats.netCashFlow, state.settings.currency, locale, state.settings.isPrivacyMode)}</p>
             </div>
          </div>
        </div>

        {/* ── Action Rows (Send/Receive/Insights) ────────────────────────── */}
        <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <button onClick={() => setActiveTab('transactions')} className="glass-panel p-5 rounded-3xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group">
             <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl group-hover:scale-110 group-hover:bg-emerald-100 transition-all">
               <Download size={20} strokeWidth={2.5} />
             </div>
             <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t.dashboard.income}</span>
          </button>
          <button onClick={() => setActiveTab('transactions')} className="glass-panel p-5 rounded-3xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group">
             <div className="bg-rose-50 text-rose-600 p-3.5 rounded-2xl group-hover:scale-110 group-hover:bg-rose-100 transition-all">
               <UploadCloud size={20} strokeWidth={2.5} />
             </div>
             <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t.dashboard.expense}</span>
          </button>
          <button onClick={() => setActiveTab('accounts')} className="glass-panel p-5 rounded-3xl flex flex-col items-center justify-center gap-3 hover:-translate-y-1 transition-transform group">
             <div className="bg-indigo-50 text-indigo-600 p-3.5 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-100 transition-all">
               <Wallet size={20} strokeWidth={2.5} />
             </div>
             <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t.dashboard.wallets}</span>
          </button>
        </div>

        {/* ── Rhythm Chart (Area) ────────────────────────────────────────── */}
        <div className="md:col-span-12 lg:col-span-7 glass-panel rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{t.dashboard.cashflowRhythm}</h3>
            <div className="flex items-center gap-4 text-[10px] uppercase font-bold text-slate-500 tracking-widest">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> {t.dashboard.incomeShort}</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> {t.dashboard.expenseShort}</span>
            </div>
          </div>
          
          <div className="h-[220px] w-full -ml-3 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="areaExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 7" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                  dy={10} 
                  reversed={isRTL} 
                />
                <Tooltip 
                  cursor={{stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4'}}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', borderRadius: '1.5rem', border: '1px solid rgba(255, 255, 255, 1)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '800' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#areaIncome)" strokeWidth={3} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3 }} />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#areaExpense)" strokeWidth={3} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Frictionless Transactions List ─────────────────────────────── */}
        <div className="md:col-span-12 lg:col-span-5 glass-panel rounded-[2.5rem] p-6 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{t.dashboard.recentActivity}</h3>
            <button onClick={() => setActiveTab('transactions')} className="text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 p-2 rounded-full transition-colors">
              <ChevronRight size={18} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </div>
          
          <div className="flex-1 space-y-2 relative">
            {recentTransactions.map((tData, idx) => {
              const isIncome = tData.type === TransactionType.INCOME;
              return (
                <div 
                  key={tData.id} 
                  className="group flex items-center justify-between p-3.5 bg-white/40 hover:bg-white/80 rounded-2xl transition-all cursor-pointer border border-white/20 hover:shadow-sm"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${isIncome ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-500/20 shadow-lg' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}>
                      {isIncome ? <TrendingUp size={16} strokeWidth={3} /> : <TrendingDown size={16} strokeWidth={3} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{tData.note || tData.category || t.transactions.types[tData.type]}</p>
                      <p className="text-[10px] font-medium text-slate-500 mt-0.5">{new Date(tData.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-black tracking-tight ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {isIncome ? '+' : '-'}{financeLogic.formatCurrency(tData.amount, state.settings.currency, locale, state.settings.isPrivacyMode)}
                  </span>
                </div>
              );
            })}
            
            {recentTransactions.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                <Activity size={40} className="text-slate-300 mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.dashboard.noActivityYet}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
