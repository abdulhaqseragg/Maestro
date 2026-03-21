
import React, { useState } from 'react';
import { FinanceState, Account, AccountType, CreditCardSettings } from '../types';
import { Plus, Pencil, Trash2, X, CreditCard, Banknote, Landmark, Smartphone, MoreVertical } from 'lucide-react';
import { financeLogic } from '../src/services/financeLogic';
import { translations } from '../translations';

interface AccountsProps {
  state: FinanceState & { notify: (msg: string, type: any) => void, requestConfirm: (t: string, m: string, c: () => void, d?: boolean) => void };
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

const Accounts: React.FC<AccountsProps> = ({ state, updateState }) => {
  const t = translations[state.settings.language];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [formData, setFormData] = useState<Partial<Account>>({
    name: '',
    type: AccountType.CASH,
    openingBalance: 0,
    color: '#3b82f6',
    ccSettings: {
      statementStartDay: 1,
      statementEndDay: 30,
      gracePeriod: 25,
      dueDay: 25
    }
  });

  const handleSave = () => {
    if (!formData.name) return;

    updateState(prev => {
      if (editingAccount) {
        state.notify(t.accounts.title, 'SUCCESS');
        return {
          ...prev,
          accounts: prev.accounts.map(a => a.id === editingAccount.id ? { ...a, ...formData } as Account : a)
        };
      } else {
        const newAccount: Account = {
          id: crypto.randomUUID(),
          ...formData,
          balance: formData.openingBalance || 0,
          userId: ''
        } as Account;
        state.notify(t.accounts.newAccount, 'SUCCESS');
        return { ...prev, accounts: [...prev.accounts, newAccount] };
      }
    });

    setIsModalOpen(false);
    setEditingAccount(null);
    setFormData({ 
      name: '', 
      type: AccountType.CASH, 
      openingBalance: 0, 
      color: '#3b82f6',
      ccSettings: {
        statementStartDay: 1,
        statementEndDay: 30,
        gracePeriod: 25,
        dueDay: 25
      }
    });
  };

  const handleDelete = (id: string) => {
    const acc = state.accounts.find(a => a.id === id);
    if (acc && acc.balance !== 0) {
      state.notify(t.accounts.deleteError, 'ERROR');
      return;
    }

    state.requestConfirm(
      t.common.delete,
      t.common.confirmDelete,
      () => {
        updateState(prev => ({
          ...prev,
          accounts: prev.accounts.filter(a => a.id !== id)
        }));
        state.notify(t.common.delete, 'SUCCESS');
      },
      true
    );
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.CASH: return <Banknote />;
      case AccountType.BANK: return <Landmark />;
      case AccountType.E_WALLET: return <Smartphone />;
      case AccountType.CREDIT_CARD: return <CreditCard />;
      case AccountType.INSTALLMENTS: return <MoreVertical />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.accounts.title}</h2>
          <p className="text-sm text-slate-500">{t.accounts.subtitle}</p>
        </div>
        <button 
          onClick={() => {
            setEditingAccount(null);
            setFormData({ name: '', type: AccountType.CASH, openingBalance: 0, color: '#3b82f6' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          {t.accounts.addAccount}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.accounts.map(account => (
          <div key={account.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group">
            <div className="h-2 w-full" style={{ backgroundColor: account.color }} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-slate-50 text-slate-600`}>
                  {getAccountIcon(account.type)}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingAccount(account);
                      setFormData(account);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(account.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">{account.name}</h3>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">{t.accounts.types[account.type]}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{t.accounts.currentBalance}</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {financeLogic.formatCurrency(account.balance, state.settings.currency, state.settings.language, state.settings.isPrivacyMode)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {state.accounts.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
            <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Plus className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-500 font-medium">{t.common.noData}</p>
            <p className="text-xs text-slate-400 mt-1">{t.common.createFirst} {t.common.account}</p>
          </div>
        )}
      </div>

      {/* Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAccount ? t.accounts.editAccount : t.accounts.newAccount}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">{t.accounts.accountName}</label>
                <input 
                  type="text" 
                  value={formData.name}
                  disabled={!!editingAccount}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${editingAccount ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {editingAccount && <p className="text-[10px] text-slate-400 italic">Name cannot be changed to preserve history</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.common.type}</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as AccountType })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.values(AccountType).map(type => (
                      <option key={type} value={type}>{t.accounts.types[type]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">{t.accounts.openingBalance}</label>
                  <input 
                    type="number" 
                    value={formData.openingBalance}
                    onChange={e => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">{t.accounts.themeColor}</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#64748b'].map(c => (
                    <button 
                      key={c}
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-8 h-8 rounded-full border-2 ${formData.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {formData.type === AccountType.CREDIT_CARD && (
                <div className="p-4 bg-blue-50 rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest">{t.accounts.ccSettings}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">{t.accounts.statementStart}</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="31" 
                        value={formData.ccSettings?.statementStartDay || 1}
                        onChange={e => setFormData({ ...formData, ccSettings: { ...formData.ccSettings!, statementStartDay: Number(e.target.value) } })}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-blue-100 rounded-lg outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">{t.accounts.statementEnd}</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="31" 
                        value={formData.ccSettings?.statementEndDay || 30}
                        onChange={e => setFormData({ ...formData, ccSettings: { ...formData.ccSettings!, statementEndDay: Number(e.target.value) } })}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-blue-100 rounded-lg outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">{t.accounts.dueDay}</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="31" 
                        value={formData.ccSettings?.dueDay || 25}
                        onChange={e => setFormData({ ...formData, ccSettings: { ...formData.ccSettings!, dueDay: Number(e.target.value) } })}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-blue-100 rounded-lg outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">{t.accounts.gracePeriod}</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="90" 
                        value={formData.ccSettings?.gracePeriod || 25}
                        onChange={e => setFormData({ ...formData, ccSettings: { ...formData.ccSettings!, gracePeriod: Number(e.target.value) } })}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-blue-100 rounded-lg outline-none" 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-all"
              >
                {t.common.cancel}
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
