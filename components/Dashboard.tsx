
import React, { useMemo } from 'react';
import { FinanceState, TransactionType } from '../types';
import { financeLogic } from '../services/financeLogic';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  Calendar,
  AlertCircle,
  BrainCircuit,
  ArrowDownLeft
} from 'lucide-react';
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { translations } from '../translations';

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

  return (
    <div className="space-y-8 animate-soft">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t.dashboard.totalBalance} 
          amount={stats.totalBalance} 
          icon={<Wallet size={20} />} 
          variant="slate"
          currency={state.settings.currency}
          language={locale}
        />
        <StatCard 
          title={t.dashboard.monthlyIncome} 
          amount={stats.monthlyIncome} 
          icon={<TrendingUp size={20} />} 
          variant="emerald"
          currency={state.settings.currency}
          language={locale}
        />
        <StatCard 
          title={t.dashboard.monthlyExpenses} 
          amount={stats.monthlyExpense} 
          icon={<TrendingDown size={20} />} 
          variant="rose"
          currency={state.settings.currency}
          language={locale}
        />
        <StatCard 
          title={t.dashboard.netCashFlow} 
          amount={stats.netCashFlow} 
          icon={<ArrowUpRight size={20} />} 
          variant="indigo"
          currency={state.settings.currency}
          language={locale}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-orchestra">{t.dashboard.weeklyCashFlow}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-metadata mt-1">Activity over 7 days</p>
            </div>
            <div className="flex gap-4 text-[9px] font-black uppercase tracking-metadata">
              <div className="flex items-center gap-1.5 text-emerald-600"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> {t.dashboard.income}</div>
              <div className="flex items-center gap-1.5 text-rose-600"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> {t.dashboard.expense}</div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} reversed={isRTL} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} orientation={isRTL ? 'right' : 'left'} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Actions & Insights */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-metadata mb-6">{t.dashboard.recentTransactions}</h3>
            <div className="space-y-5">
              {state.payables.slice(0, 3).map(p => {
                const next = p.installments.find(i => i.status === 'PENDING');
                return (
                  <div key={p.id} className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 group hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-rose-500 transition-colors shadow-sm">
                      <Calendar size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{p.title}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.obligations.due} {next?.dueDate}</p>
                    </div>
                    <p className="text-xs font-black text-rose-600">-{financeLogic.formatCurrency(next?.amount || 0, state.settings.currency, locale)}</p>
                  </div>
                );
              })}
              {state.payables.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-metadata">{t.dashboard.noBills}</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => setActiveTab('obligations')}
              className="w-full mt-6 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-metadata hover:bg-indigo-50/50 rounded-xl transition-all btn-interaction"
            >
              {t.dashboard.viewAll}
            </button>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-indigo-400" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-metadata text-slate-400">{t.common.aiWarning}</span>
              </div>
              <p className="text-sm font-semibold text-slate-200 leading-relaxed mb-6 italic">
                "{t.dashboard.aiMessage}"
              </p>
              <div className="h-px bg-slate-800 w-full mb-6" />
              <button 
                onClick={() => setActiveTab('ai')}
                className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-metadata group-hover:gap-3 transition-all"
              >
                 {t.nav.fullAnalysis}
                 <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
              <BrainCircuit size={160} strokeWidth={1} />
            </div>
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
        <div className="overflow-x-auto">
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
                      {isIncome ? '+' : '-'}{financeLogic.formatCurrency(tData.amount, state.settings.currency, locale)}
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
}

const StatCard: React.FC<StatCardProps> = ({ title, amount, icon, variant, currency, language }) => {
  const styles = {
    slate: 'bg-white text-slate-600 ring-slate-100',
    emerald: 'bg-white text-emerald-600 ring-emerald-50',
    rose: 'bg-white text-rose-600 ring-rose-50',
    indigo: 'bg-white text-indigo-600 ring-indigo-50'
  };

  return (
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover-lift relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3.5 rounded-2xl ${styles[variant]} ring-4 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-metadata mb-2">{title}</p>
      <p className="text-2xl font-black text-slate-900 tracking-orchestra">
        {financeLogic.formatCurrency(amount, currency, language)}
      </p>
      <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full -mr-12 -mt-12 transition-colors ${
        variant === 'emerald' ? 'bg-emerald-500' : variant === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'
      }`} />
    </div>
  );
};

export default Dashboard;
