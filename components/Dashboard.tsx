
import React, { useMemo, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, 
  Calendar, AlertCircle, BrainCircuit, ArrowDownLeft,
  ArrowRight, Plus, PieChart as PieIcon,
  BarChart as BarIcon, Target, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { FinanceState, TransactionType } from '../types';
import { financeLogic } from '../src/services/financeLogic';
import { translations } from '../translations';
import { getFinancialInsights } from '../src/services/geminiService';

interface DashboardProps {
  state: FinanceState;
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, setActiveTab }) => {
  const t = translations[state.settings.language];
  const locale = state.settings.language;
  const isRTL = locale === 'ar';

  const fetchInsights = async () => {
    if (!state.settings?.language) return;
    try {
      const res = await getFinancialInsights(state);
      // We don't store it in local state to avoid re-renders, 
      // just check if it works or notify success if needed.
      console.log('Auto-insights generated');
    } catch (e) {
      console.error('Auto-insights failed');
    }
  };

  useEffect(() => {
    // Optional: Trigger a silent background check/warmup
    // fetchInsights();
  }, []);

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

  const categoryStats = useMemo(() => {
    const expenses = state.transactions.filter(t => t.type === TransactionType.EXPENSE);
    const data: Record<string, number> = {};
    expenses.forEach(e => {
      data[e.category || 'Other'] = (data[e.category || 'Other'] || 0) + e.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [state.transactions]);

  const healthScore = useMemo(() => {
    // 1. Debt-to-Income (Lower is better)
    const totalPayables = state.payables.reduce((acc, p) => acc + p.remainingBalance, 0);
    const dtiRatio = stats.monthlyIncome > 0 ? totalPayables / (stats.monthlyIncome * 12) : 1;
    const dtiScore = Math.max(0, 100 - (dtiRatio * 100));

    // 2. Budget Adherence (Closer to 100% is better, over 100% is bad)
    const totalBudgetLimit = state.budgets.reduce((acc, b) => acc + b.limit, 0);
    const totalBudgetSpent = state.budgets.reduce((acc, b) => acc + b.spent, 0);
    const budgetRatio = totalBudgetLimit > 0 ? totalBudgetSpent / totalBudgetLimit : 0;
    const budgetScore = budgetRatio > 1 ? Math.max(0, 100 - (budgetRatio - 1) * 100) : 100;

    // 3. Savings Rate (Higher is better)
    const savingsRate = stats.monthlyIncome > 0 ? stats.netCashFlow / stats.monthlyIncome : 0;
    const savingsScore = Math.min(100, Math.max(0, savingsRate * 100 * 2)); // 50% savings = 100 score

    return Math.round((dtiScore * 0.3) + (budgetScore * 0.3) + (savingsScore * 0.4));
  }, [state, stats]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return t.dashboard.healthExcellent;
    if (score >= 50) return t.dashboard.healthStable;
    return t.dashboard.healthCritical;
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className={`space-y-8 animate-soft ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-orchestra mb-2">
            {t.dashboard.title}
          </h1>
          <p className="text-slate-400 font-bold text-sm tracking-metadata uppercase">
            {new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Health Score Component */}
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover-lift cursor-default">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-50" />
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * healthScore) / 100} className={`${getHealthColor(healthScore)} transition-all duration-1000 ease-out`} />
              </svg>
              <span className={`absolute text-[11px] font-black ${getHealthColor(healthScore)}`}>{healthScore}</span>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t.dashboard.healthScore}</p>
              <p className={`text-xs font-black uppercase tracking-widest ${getHealthColor(healthScore)}`}>{getHealthLabel(healthScore)}</p>
            </div>
          </div>

          <div className="bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100/50">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
              {t.dashboard.aiAnalysisStatus}
            </p>
            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs">
              <BrainCircuit size={14} /> {t.dashboard.aiReady}
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title={t.dashboard.totalBalance} 
          amount={stats.totalBalance} 
          icon={<Wallet size={18} />} 
          variant="slate"
          currency={state.settings.currency}
          language={locale}
          isPrivacyMode={state.settings.isPrivacyMode || false}
        />
        <StatCard 
          title={t.dashboard.monthlyIncome} 
          amount={stats.monthlyIncome} 
          icon={<TrendingUp size={18} />} 
          variant="emerald"
          currency={state.settings.currency}
          language={locale}
          isPrivacyMode={state.settings.isPrivacyMode || false}
        />
        <StatCard 
          title={t.dashboard.monthlyExpenses} 
          amount={stats.monthlyExpense} 
          icon={<TrendingDown size={18} />} 
          variant="rose"
          currency={state.settings.currency}
          language={locale}
          isPrivacyMode={state.settings.isPrivacyMode || false}
        />
        <StatCard 
          title={t.dashboard.netCashFlow} 
          amount={stats.netCashFlow} 
          icon={<ArrowUpRight size={18} />} 
          variant="indigo"
          currency={state.settings.currency}
          language={locale}
          isPrivacyMode={state.settings.isPrivacyMode || false}
        />
      </div>

      {/* ── Charts Section ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-orchestra">{t.dashboard.weeklyCashFlow}</h3>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-metadata mt-1">Activity over 7 days</p>
            </div>
            <div className="hidden sm:flex gap-4 text-[9px] font-black uppercase tracking-metadata">
              <div className="flex items-center gap-1.5 text-emerald-600"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> {t.dashboard.income}</div>
              <div className="flex items-center gap-1.5 text-rose-600"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> {t.dashboard.expense}</div>
            </div>
          </div>
          
          <div className="h-[280px] sm:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f8fafc" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} 
                  dy={15} 
                  reversed={isRTL} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} 
                  orientation={isRTL ? 'right' : 'left'} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 shadow-sm">
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-orchestra mb-6 sm:mb-8">
            {t.dashboard.expenseBreakdown || "Expense Breakdown"}
          </h3>
          <div className="h-[200px] sm:h-[240px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <PieIcon className="text-slate-200 mb-1" size={20} />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t.dashboard.top5 || "Top 5"}
              </span>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
            {categoryStats.map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate max-w-[100px] sm:max-w-none">{cat.name}</span>
                </div>
                <span className="text-[11px] sm:text-xs font-black text-slate-900">
                  {financeLogic.formatCurrency(cat.value, state.settings.currency, locale, state.settings.isPrivacyMode)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modern Transactions Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-orchestra">{t.dashboard.recentTransactions}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-metadata mt-1">Last financial movements</p>
          </div>
          <button 
            onClick={() => setActiveTab('transactions')}
            className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-metadata transition-all btn-interaction"
          >
            {t.dashboard.viewAll}
          </button>
        </div>
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-left">
            <thead>
              <tr className={`bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-metadata ${isRTL ? 'text-right' : 'text-left'}`}>
                <th className="px-8 py-5">{t.common.type}</th>
                <th className="px-8 py-5">{t.common.account}</th>
                <th className="px-8 py-5">{t.common.category}</th>
                <th className="px-8 py-5">{t.common.date}</th>
                <th className={`px-8 py-5 ${isRTL ? 'text-left' : 'text-right'}`}>{t.common.amount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentTransactions.map(tData => {
                const account = state.accounts.find(a => a.id === tData.accountId);
                const isIncome = tData.type === TransactionType.INCOME;
                return (
                  <tr key={tData.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} shadow-sm`}>
                          {isIncome ? <ArrowDownLeft size={16} strokeWidth={3} /> : <ArrowUpRight size={16} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-black text-slate-900">{tData.note || t.transactions.types[tData.type]}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100/50 px-2.5 py-1 rounded-lg">{account?.name}</span>
                    </td>
                    <td className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{tData.category || '-'}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-slate-400">
                      {new Date(tData.date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className={`px-8 py-5 text-sm font-black ${isRTL ? 'text-left' : 'text-right'} ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIncome ? '+' : '-'}{financeLogic.formatCurrency(tData.amount, state.settings.currency, locale, state.settings.isPrivacyMode)}
                    </td>
                  </tr>
                );
              })}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-metadata">{t.common.noData}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Transactions Cards */}
        <div className="sm:hidden divide-y divide-slate-50">
          {recentTransactions.map(tData => {
            const account = state.accounts.find(a => a.id === tData.accountId);
            const isIncome = tData.type === TransactionType.INCOME;
            return (
              <div key={tData.id} className="p-6 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} shadow-sm`}>
                    {isIncome ? <ArrowDownLeft size={16} strokeWidth={3} /> : <ArrowUpRight size={16} strokeWidth={3} />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 mb-1">{tData.note || t.transactions.types[tData.type]}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{account?.name}</span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(tData.date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</span>
                    </div>
                  </div>
                </div>
                <p className={`text-sm font-black ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isIncome ? '+' : '-'}{financeLogic.formatCurrency(tData.amount, state.settings.currency, locale, state.settings.isPrivacyMode)}
                </p>
              </div>
            );
          })}
          {recentTransactions.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-metadata">{t.common.noData}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  variant: 'slate' | 'emerald' | 'rose' | 'indigo';
  currency: string;
  language: string;
  isPrivacyMode: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, amount, icon, variant, currency, language, isPrivacyMode }) => {
  const styles = {
    slate: 'bg-white text-slate-600 ring-slate-100',
    emerald: 'bg-white text-emerald-600 ring-emerald-50',
    rose: 'bg-white text-rose-600 ring-rose-50',
    indigo: 'bg-white text-indigo-600 ring-indigo-50'
  };

  return (
    <div className="bg-white p-5 sm:p-7 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm hover-lift relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl ${styles[variant]} ring-4 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
          {React.cloneElement(icon as React.ReactElement, { size: 18, className: 'sm:w-5 sm:h-5' })}
        </div>
      </div>
      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-metadata mb-1 sm:mb-2">{title}</p>
      <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-orchestra">
        {financeLogic.formatCurrency(amount, currency, language, isPrivacyMode)}
      </p>
      <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full -mr-12 -mt-12 transition-colors ${
        variant === 'emerald' ? 'bg-emerald-500' : variant === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'
      }`} />
    </div>
  );
};

export default Dashboard;
