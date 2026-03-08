
import React, { useState, useMemo, useEffect } from 'react';
import { FinanceState, FinancialGoal, AccountType } from '../types';
import { 
  Plus, X, Target, Trophy, Archive, 
  RotateCcw, Pencil, Trash2, CheckCircle2, 
  AlertCircle, LayoutList, History
} from 'lucide-react';
import { financeLogic } from '../services/financeLogic';
import { translations } from '../translations';

interface GoalsProps {
  state: FinanceState & { notify: (msg: string, type: any) => void, requestConfirm: (t: string, m: string, c: () => void, d?: boolean) => void };
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

const Goals: React.FC<GoalsProps> = ({ state, updateState }) => {
  const t = translations[state.settings.language];
  const lang = state.settings.language;
  const isRTL = lang === 'ar';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'EXECUTED'>('ACTIVE');

  const [formData, setFormData] = useState<Partial<FinancialGoal>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: new Date().toISOString().split('T')[0],
    accountId: '',
    status: 'ACTIVE'
  });

  const availableAccounts = useMemo(() => {
    return state.accounts.filter(a => 
      a.type !== AccountType.CREDIT_CARD && a.type !== AccountType.INSTALLMENTS
    );
  }, [state.accounts]);

  const filteredGoals = useMemo(() => {
    return state.goals.filter(g => g.status === statusFilter);
  }, [state.goals, statusFilter]);

  // Milestone check: Notify if a goal becomes achievable
  useEffect(() => {
    state.goals.forEach(goal => {
      if (goal.status === 'ACTIVE') {
        const account = state.accounts.find(a => a.id === goal.accountId);
        if (account && account.balance >= goal.targetAmount) {
          // We could track if we already notified for this specific goal to avoid spam, 
          // but for now, simple reactive toast on state changes.
        }
      }
    });
  }, [state.accounts, state.goals]);

  const handleSave = () => {
    if (!formData.name || !formData.targetAmount || !formData.accountId) return;

    updateState(prev => {
      const goalData: FinancialGoal = {
        id: editingId || crypto.randomUUID(),
        name: formData.name!,
        targetAmount: formData.targetAmount!,
        currentAmount: formData.currentAmount || 0,
        targetDate: formData.targetDate!,
        accountId: formData.accountId!,
        status: formData.status || 'ACTIVE',
        userId: '' 
      };

      state.notify(t.goals.title, 'SUCCESS');
      if (editingId) {
        return {
          ...prev,
          goals: prev.goals.map(g => g.id === editingId ? goalData : g)
        };
      } else {
        return {
          ...prev,
          goals: [...prev.goals, goalData]
        };
      }
    });

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', targetAmount: 0, currentAmount: 0, targetDate: new Date().toISOString().split('T')[0], accountId: '', status: 'ACTIVE' });
  };

  const handleDelete = (id: string) => {
    state.requestConfirm(
      t.common.delete,
      t.goals.deleteConfirm,
      () => {
        updateState(prev => ({
          ...prev,
          goals: prev.goals.filter(g => g.id !== id)
        }));
        state.notify(t.common.delete, 'SUCCESS');
      },
      true
    );
  };

  const handleArchive = (id: string) => {
    updateState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, status: 'ARCHIVED' } : g)
    }));
    state.notify(t.goals.ignore, 'INFO');
  };

  const handleRestore = (id: string) => {
    updateState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, status: 'ACTIVE' } : g)
    }));
    state.notify(t.goals.restore, 'SUCCESS');
  };

  const handleExecute = (goal: FinancialGoal) => {
    const account = state.accounts.find(a => a.id === goal.accountId);
    if (!account || account.balance < goal.targetAmount) return;

    updateState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === goal.id ? { ...g, status: 'EXECUTED', currentAmount: g.targetAmount } : g)
    }));
    state.notify(t.goals.executedNote, 'SUCCESS');
  };

  const openEditModal = (goal: FinancialGoal) => {
    setEditingId(goal.id);
    setFormData(goal);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.goals.title}</h2>
          <p className="text-sm text-slate-500">{t.goals.subtitle}</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', targetAmount: 0, currentAmount: 0, targetDate: new Date().toISOString().split('T')[0], accountId: '', status: 'ACTIVE' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          {t.goals.newGoal}
        </button>
      </div>

      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button 
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'ACTIVE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <LayoutList size={14} />
          {t.common.active}
        </button>
        <button 
          onClick={() => setStatusFilter('EXECUTED')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'EXECUTED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CheckCircle2 size={14} />
          {t.common.executed}
        </button>
        <button 
          onClick={() => setStatusFilter('ARCHIVED')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'ARCHIVED' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Archive size={14} />
          {t.common.archived}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGoals.map(goal => {
          const account = state.accounts.find(a => a.id === goal.accountId);
          const currentProgress = account ? account.balance : 0;
          const percent = Math.min((currentProgress / goal.targetAmount) * 100, 100);
          const isAchievable = account ? account.balance >= goal.targetAmount : false;

          return (
            <div key={goal.id} className={`bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden group transition-all hover:border-blue-200 ${goal.status === 'ARCHIVED' ? 'opacity-70 grayscale-[0.5]' : ''}`}>
              {goal.status === 'EXECUTED' && (
                <div className="absolute top-0 right-0 p-4">
                  <Trophy className="text-amber-500 drop-shadow-lg" size={40} />
                </div>
              )}
              
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${goal.status === 'EXECUTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {goal.status === 'EXECUTED' ? <CheckCircle2 size={24} /> : <Target size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{goal.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full">{account?.name || t.common.account}</span>
                      <span>•</span>
                      <span>{t.common.target}: {new Date(goal.targetDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(goal)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(goal.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.common.current}</p>
                    <p className="text-2xl font-black text-slate-900">{financeLogic.formatCurrency(currentProgress, state.settings.currency, lang)}</p>
                  </div>
                  <div className={`${isRTL ? 'text-left' : 'text-right'}`}>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.common.target}</p>
                    <p className="text-lg font-bold text-slate-500">{financeLogic.formatCurrency(goal.targetAmount, state.settings.currency, lang)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="text-indigo-600">{Math.round(percent)}% {t.goals.complete}</span>
                    {isAchievable && goal.status === 'ACTIVE' && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {t.goals.readyToExecute}
                      </span>
                    )}
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${percent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {goal.status === 'ACTIVE' && (
                    <>
                      <button 
                        onClick={() => handleExecute(goal)}
                        disabled={!isAchievable}
                        className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 ${
                          isAchievable 
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Trophy size={14} />
                        {t.goals.execute}
                      </button>
                      <button 
                        onClick={() => handleArchive(goal.id)}
                        className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
                        title={t.goals.ignore}
                      >
                        <Archive size={18} />
                      </button>
                    </>
                  )}
                  {goal.status === 'ARCHIVED' && (
                    <button 
                      onClick={() => handleRestore(goal.id)}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={14} />
                      {t.goals.restore}
                    </button>
                  )}
                  {goal.status === 'EXECUTED' && (
                    <div className="flex-1 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold text-center border border-emerald-100">
                      {t.goals.executedNote}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filteredGoals.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-200">
               <Target size={32} />
            </div>
            <p className="text-slate-400 font-medium">{t.common.noData}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? t.goals.editGoal : t.goals.setGoal}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">{t.goals.goalName}</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">{t.goals.associatedAccount}</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.accountId}
                  onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                >
                  <option value="">{t.transactions.selectAccount}</option>
                  {availableAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({financeLogic.formatCurrency(acc.balance, state.settings.currency, lang)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.common.target}</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    value={formData.targetAmount}
                    onChange={e => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.common.date}</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    value={formData.targetDate}
                    onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100">
                {t.common.cancel}
              </button>
              <button 
                onClick={handleSave} 
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-100"
              >
                {editingId ? t.common.save : t.common.add}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
