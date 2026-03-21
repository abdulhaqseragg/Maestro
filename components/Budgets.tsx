
import React, { useState } from 'react';
import { FinanceState, Budget, TransactionType } from '../types';
import { Plus, X, ChartPie, Pencil, Trash2 } from 'lucide-react';
import { financeLogic } from '../src/services/financeLogic';
import { translations } from '../translations';

interface BudgetsProps {
  state: FinanceState;
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

const Budgets: React.FC<BudgetsProps> = ({ state, updateState }) => {
  const t = translations[state.settings.language];
  const lang = state.settings.language;
  const isRTL = lang === 'ar';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Budget>>({
    category: '',
    limit: 0,
    period: 'MONTHLY'
  });

  const expenseCategories = state.categories.filter(c => c.type === TransactionType.EXPENSE);

  const handleSave = () => {
    if (!formData.category || !formData.limit) return;
    
    updateState(prev => {
      if (editingId) {
        return {
          ...prev,
          budgets: prev.budgets.map(b => b.id === editingId ? { ...b, ...formData } as Budget : b)
        };
      } else {
        return {
          ...prev,
          budgets: [...prev.budgets, {
            id: crypto.randomUUID(),
            spent: 0,
            ...formData
          } as Budget]
        };
      }
    });
    
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ category: '', limit: 0, period: 'MONTHLY' });
  };

  const handleDelete = (id: string) => {
    if (confirm(t.common.confirmDelete)) {
      updateState(prev => ({
        ...prev,
        budgets: prev.budgets.filter(b => b.id !== id)
      }));
    }
  };

  const openEditModal = (budget: Budget) => {
    setEditingId(budget.id);
    setFormData(budget);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.budgets.title}</h2>
          <p className="text-sm text-slate-500">{t.budgets.subtitle}</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ category: '', limit: 0, period: 'MONTHLY' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          {t.budgets.create}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.budgets.map(budget => {
          const percent = Math.min((budget.spent / budget.limit) * 100, 100);
          const isNearLimit = percent > 85;
          const isOverLimit = percent >= 100;

          return (
            <div key={budget.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 group transition-all hover:border-blue-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{budget.category}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t.budgets.periods[budget.period]}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(budget)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(budget.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t.common.spent}: {financeLogic.formatCurrency(budget.spent, state.settings.currency, lang, state.settings.isPrivacyMode)}</span>
                  <span className="text-slate-900 font-bold">{t.common.limit}: {financeLogic.formatCurrency(budget.limit, state.settings.currency, lang, state.settings.isPrivacyMode)}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isOverLimit ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {isOverLimit && (
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider text-center">{t.budgets.overBudget}</p>
                )}
              </div>
            </div>
          );
        })}
        {state.budgets.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ChartPie className="text-slate-200" size={32} />
            </div>
            <p className="text-slate-400 font-medium">{t.common.noData}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setEditingId(null); }} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">{editingId ? t.budgets.editBudget : t.budgets.newBudget}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">{t.common.category}</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">{t.transactions.categories.other}</option>
                  {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">{t.common.period}</label>
                <select 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.period}
                  onChange={e => setFormData({ ...formData, period: e.target.value as 'WEEKLY' | 'MONTHLY' })}
                >
                  <option value="WEEKLY">{t.budgets.periods.WEEKLY}</option>
                  <option value="MONTHLY">{t.budgets.periods.MONTHLY}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">{t.common.limit}</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.limit}
                  onChange={e => setFormData({ ...formData, limit: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => { setIsModalOpen(false); setEditingId(null); }} 
                className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 transition-all"
              >
                {t.common.cancel}
              </button>
              <button 
                onClick={handleSave} 
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
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

export default Budgets;
