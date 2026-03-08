
import React, { useState, useMemo, useEffect } from 'react';
import { FinanceState, Transaction, TransactionType, Account, Category, AccountType } from '../types';
import { 
  Plus, X, Filter, Download, ArrowUpRight, 
  ArrowDownLeft, ArrowRightLeft, Search, 
  Printer, FileSpreadsheet, Calendar as CalendarIcon,
  Pencil, Trash2
} from 'lucide-react';
import { financeLogic } from '../services/financeLogic';
import { translations } from '../translations';

interface TransactionsProps {
  state: FinanceState & { notify: (msg: string, type: any) => void, requestConfirm: (t: string, m: string, c: () => void, d?: boolean) => void };
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
  openAddModalOnMount?: boolean;
  onAddModalOpened?: () => void;
}

const Transactions: React.FC<TransactionsProps> = ({ state, updateState, openAddModalOnMount, onAddModalOpened }) => {
  const t = translations[state.settings.language];
  const lang = state.settings.language;
  const isRTL = lang === 'ar';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filter States
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Form State for new/editing transaction
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: TransactionType.EXPENSE,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    accountId: state.accounts[0]?.id || '',
    note: ''
  });

  const incomeCategories = useMemo(() => state.categories.filter(c => c.type === TransactionType.INCOME), [state.categories]);
  const expenseCategories = useMemo(() => state.categories.filter(c => c.type === TransactionType.EXPENSE), [state.categories]);

  const getAvailableAccounts = (type?: TransactionType) => {
    if (type === TransactionType.EXPENSE) return state.accounts;
    return state.accounts.filter(a => 
      a.type !== AccountType.CREDIT_CARD && a.type !== AccountType.INSTALLMENTS
    );
  };

  useEffect(() => {
    if (openAddModalOnMount) {
      setEditingTransaction(null);
      setFormData({ 
        type: TransactionType.EXPENSE, 
        amount: 0, 
        date: new Date().toISOString().split('T')[0],
        accountId: getAvailableAccounts(TransactionType.EXPENSE)[0]?.id || '',
        note: ''
      });
      setIsModalOpen(true);
      if (onAddModalOpened) onAddModalOpened();
    }
  }, [openAddModalOnMount]);

  const filteredTransactions = useMemo(() => {
    return state.transactions.filter(tr => {
      const matchType = filterType === 'ALL' || tr.type === filterType;
      const matchStart = !filterDateStart || new Date(tr.date) >= new Date(filterDateStart);
      const matchEnd = !filterDateEnd || new Date(tr.date) <= new Date(filterDateEnd);
      const matchCat = !filterCategory || tr.category === filterCategory;
      const matchAcc = !filterAccount || tr.accountId === filterAccount || tr.toAccountId === filterAccount;
      const matchSearch = !filterSearch || (tr.note?.toLowerCase().includes(filterSearch.toLowerCase()));

      return matchType && matchStart && matchEnd && matchCat && matchAcc && matchSearch;
    });
  }, [state.transactions, filterType, filterDateStart, filterDateEnd, filterCategory, filterAccount, filterSearch]);

  const handleSave = () => {
    if (!formData.amount || !formData.accountId) return;

    updateState(prev => {
      let accounts = [...prev.accounts];
      if (editingTransaction) {
        accounts = accounts.map(acc => {
          if (editingTransaction.type === TransactionType.INCOME && acc.id === editingTransaction.accountId) {
            return { ...acc, balance: acc.balance - editingTransaction.amount };
          }
          if (editingTransaction.type === TransactionType.EXPENSE && acc.id === editingTransaction.accountId) {
            return { ...acc, balance: acc.balance + editingTransaction.amount };
          }
          if (editingTransaction.type === TransactionType.TRANSFER) {
            if (acc.id === editingTransaction.accountId) return { ...acc, balance: acc.balance + editingTransaction.amount };
            if (acc.id === editingTransaction.toAccountId) return { ...acc, balance: acc.balance - editingTransaction.amount };
          }
          return acc;
        });
      }

      const transactionData: Transaction = {
        id: editingTransaction ? editingTransaction.id : crypto.randomUUID(),
        ...formData
      } as Transaction;

      // Budget check
      if (transactionData.type === TransactionType.EXPENSE && transactionData.category) {
        const budget = prev.budgets.find(b => b.category === transactionData.category);
        if (budget) {
          const newSpent = budget.spent + transactionData.amount;
          if (newSpent > budget.limit) {
            state.notify(`${t.budgets.overBudget}: ${budget.category}`, 'WARNING');
          }
        }
      }

      accounts = accounts.map(acc => {
        if (transactionData.type === TransactionType.INCOME && acc.id === transactionData.accountId) {
          return { ...acc, balance: acc.balance + transactionData.amount };
        }
        if (transactionData.type === TransactionType.EXPENSE && acc.id === transactionData.accountId) {
          return { ...acc, balance: acc.balance - transactionData.amount };
        }
        if (transactionData.type === TransactionType.TRANSFER) {
          if (acc.id === transactionData.accountId) return { ...acc, balance: acc.balance - transactionData.amount };
          if (acc.id === transactionData.toAccountId) return { ...acc, balance: acc.balance + transactionData.amount };
        }
        return acc;
      });

      const transactions = editingTransaction 
        ? prev.transactions.map(t => t.id === editingTransaction.id ? transactionData : t)
        : [transactionData, ...prev.transactions];

      state.notify(t.nav.dashboard, 'SUCCESS');
      return { ...prev, transactions, accounts };
    });

    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleDelete = () => {
    if (!editingTransaction) return;
    state.requestConfirm(
      t.common.delete,
      t.common.confirmDelete,
      () => {
        updateState(prev => {
          const accounts = prev.accounts.map(acc => {
            if (editingTransaction.type === TransactionType.INCOME && acc.id === editingTransaction.accountId) {
              return { ...acc, balance: acc.balance - editingTransaction.amount };
            }
            if (editingTransaction.type === TransactionType.EXPENSE && acc.id === editingTransaction.accountId) {
              return { ...acc, balance: acc.balance + editingTransaction.amount };
            }
            if (editingTransaction.type === TransactionType.TRANSFER) {
              if (acc.id === editingTransaction.accountId) return { ...acc, balance: acc.balance + editingTransaction.amount };
              if (acc.id === editingTransaction.toAccountId) return { ...acc, balance: acc.balance - editingTransaction.amount };
            }
            return acc;
          });
          const transactions = prev.transactions.filter(t => t.id !== editingTransaction.id);
          return { ...prev, transactions, accounts };
        });
        state.notify(t.common.delete, 'SUCCESS');
        setIsModalOpen(false);
        setEditingTransaction(null);
      },
      true
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [t.common.date, t.common.type, t.common.account, t.common.category, t.common.amount, t.common.note];
    const rows = filteredTransactions.map(tr => {
      const acc = state.accounts.find(a => a.id === tr.accountId)?.name || '';
      return [
        tr.date,
        t.transactions.types[tr.type],
        acc,
        tr.category || t.transactions.noCategory,
        tr.amount.toString(),
        tr.note || ''
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `maestro_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    state.notify(t.transactions.exportSuccess, 'SUCCESS');
  };

  const openEditModal = (tr: Transaction) => {
    setEditingTransaction(tr);
    setFormData(tr);
    setIsModalOpen(true);
  };

  const getFilterSummary = () => {
    const active = [];
    if (filterType !== 'ALL') active.push(`${t.common.type}: ${t.transactions.types[filterType as TransactionType]}`);
    if (filterDateStart || filterDateEnd) active.push(`${t.common.period}: ${filterDateStart || '...'} - ${filterDateEnd || '...'}`);
    if (filterCategory) active.push(`${t.common.category}: ${filterCategory}`);
    if (filterAccount) active.push(`${t.common.account}: ${state.accounts.find(a => a.id === filterAccount)?.name}`);
    if (filterSearch) active.push(`${t.common.search}: "${filterSearch}"`);
    return active.length > 0 ? active.join(" | ") : t.common.all;
  };

  return (
    <div className="space-y-6 animate-soft">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; font-size: 10pt; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:table-cell { display: table-cell !important; }
          @page { margin: 1.5cm; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          th, td { border-bottom: 1px solid #eee; padding: 8px 4px; text-align: ${isRTL ? 'right' : 'left'}; }
        }
      `}} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t.transactions.title}</h2>
          <p className="text-sm text-slate-500 font-medium">{t.transactions.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all btn-interaction ${showFilters ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter size={18} />
            {t.common.filter}
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 btn-interaction"
          >
            <Printer size={18} />
            {t.common.print}
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 btn-interaction"
          >
            <FileSpreadsheet size={18} />
            {t.common.export}
          </button>
          <button 
            onClick={() => {
              setEditingTransaction(null);
              setFormData({ 
                type: TransactionType.EXPENSE, 
                amount: 0, 
                date: new Date().toISOString().split('T')[0],
                accountId: getAvailableAccounts(TransactionType.EXPENSE)[0]?.id || '',
                note: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-black transition-all btn-interaction"
          >
            <Plus size={18} />
            {t.transactions.addNew}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-200 print:hidden">
          <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-interaction ${filterType === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}
            >
              {t.common.all}
            </button>
            {Object.values(TransactionType).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-interaction ${filterType === type ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}
              >
                {t.transactions.types[type]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.startDate}</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={filterDateStart} 
                  onChange={e => setFilterDateStart(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none`} 
                />
                <CalendarIcon className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} text-slate-400`} size={16} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.endDate}</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={filterDateEnd} 
                  onChange={e => setFilterDateEnd(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none`} 
                />
                <CalendarIcon className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} text-slate-400`} size={16} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.category}</label>
              <select 
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="">{t.common.all}</option>
                {state.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.account}</label>
              <select 
                value={filterAccount}
                onChange={e => setFilterAccount(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="">{t.common.all}</option>
                {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder={t.common.searchNotes}
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all`}
            />
            <Search className={`absolute top-3.5 ${isRTL ? 'right-3.5' : 'left-3.5'} text-slate-400`} size={18} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="hidden print:block p-8 border-b border-slate-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">Maestro Financial Orchestration</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{t.transactions.reportTitle}</p>
            </div>
            <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${isRTL ? 'text-left' : 'text-right'}`}>
              {new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[9px] font-bold text-slate-600">
             <span className="text-slate-400 uppercase mr-2">{t.common.filter}:</span> {getFilterSummary()}
          </div>
        </div>
        
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left print:text-black">
            <thead>
              <tr className={`bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'} print:bg-white print:text-black print:border-b-2 print:border-slate-900`}>
                <th className="px-6 py-4 print:hidden">{t.common.status}</th>
                <th className="hidden print:table-cell px-2 py-4">{t.common.type}</th>
                <th className="px-6 py-4 print:px-2">{t.common.date}</th>
                <th className="px-6 py-4 print:px-2">{t.common.account}</th>
                <th className="px-6 py-4 print:px-2">{t.common.category}</th>
                <th className="hidden print:table-cell px-2 py-4">{t.common.note}</th>
                <th className={`px-6 py-4 print:px-2 ${isRTL ? 'text-left' : 'text-right'}`}>{t.common.amount}</th>
                <th className="px-6 py-4 print:hidden">{t.common.note}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50 print:divide-slate-200">
              {filteredTransactions.map(tr => {
                const account = state.accounts.find(a => a.id === tr.accountId);
                return (
                  <tr key={tr.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer print:cursor-default print:hover:bg-transparent" onClick={() => !window.matchMedia('print').matches && openEditModal(tr)}>
                    <td className="px-6 py-5 print:hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                        tr.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-500' : 
                        tr.type === TransactionType.EXPENSE ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {tr.type === TransactionType.INCOME ? <ArrowDownLeft size={20} /> : 
                         tr.type === TransactionType.EXPENSE ? <ArrowUpRight size={20} /> : <ArrowRightLeft size={20} />}
                      </div>
                    </td>
                    <td className="hidden print:table-cell px-2 py-5 text-[9px] font-bold">
                       {t.transactions.types[tr.type]}
                    </td>
                    <td className="px-6 py-5 text-xs font-medium text-slate-500 print:text-black print:px-2">
                       {new Date(tr.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="px-6 py-5 print:px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full print:hidden" style={{ backgroundColor: account?.color || '#cbd5e1' }} />
                        <span className="text-xs font-semibold text-slate-600 print:text-black">{account?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 print:px-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
                         {tr.category}{tr.subCategory ? ` > ${tr.subCategory}` : ''}
                       </span>
                    </td>
                    <td className="hidden print:table-cell px-2 py-5 text-[9px] font-medium italic">
                       {tr.note || '-'}
                    </td>
                    <td className={`px-6 py-5 text-sm font-bold print:px-2 print:text-black ${isRTL ? 'text-left' : 'text-right'} ${
                      tr.type === TransactionType.INCOME ? 'text-emerald-500' : 
                      tr.type === TransactionType.EXPENSE ? 'text-rose-500' : 'text-slate-900'
                    }`}>
                      {tr.type === TransactionType.INCOME ? '+' : tr.type === TransactionType.EXPENSE ? '-' : ''}
                      {financeLogic.formatCurrency(tr.amount, state.settings.currency, lang)}
                    </td>
                    <td className="px-6 py-5 text-xs font-medium text-slate-400 truncate max-w-[150px] print:hidden">
                       {tr.note}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="text-slate-200 space-y-3 print:text-black">
                      <ArrowRightLeft className="mx-auto print:hidden" size={48} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] print:text-black">{t.common.noData}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="hidden print:block p-8 text-center border-t border-slate-100">
           <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">Generated by Maestro - Your Financial Orchestrator</p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-soft">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {editingTransaction ? t.common.edit : t.transactions.addNew}
              </h3>
              <div className="flex items-center gap-2">
                {editingTransaction && (
                  <button 
                    onClick={handleDelete}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors btn-interaction"
                    title={t.common.delete}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 btn-interaction">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex p-1 bg-slate-100/50 rounded-2xl border border-slate-100">
                {Object.values(TransactionType).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      const available = getAvailableAccounts(type);
                      setFormData(prev => {
                        const newAccountId = available.some(a => a.id === prev.accountId) 
                          ? prev.accountId 
                          : (available[0]?.id || '');
                        
                        let newToAccountId = prev.toAccountId;
                        if (type === TransactionType.TRANSFER) {
                           const validTargets = available.filter(a => a.id !== newAccountId);
                           if (!validTargets.some(a => a.id === prev.toAccountId)) {
                             newToAccountId = validTargets[0]?.id || '';
                           }
                        } else {
                          newToAccountId = undefined;
                        }

                        return { 
                          ...prev, 
                          type, 
                          category: '', 
                          subCategory: '',
                          accountId: newAccountId,
                          toAccountId: newToAccountId
                        };
                      });
                    }}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all btn-interaction ${
                      formData.type === type ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t.transactions.types[type]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.amount}</label>
                  <input 
                    autoFocus
                    type="number" 
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-sm font-bold transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.date}</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-sm font-bold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  {formData.type === TransactionType.TRANSFER ? t.transactions.fromAccount : t.common.account}
                </label>
                <select 
                  value={formData.accountId}
                  onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-sm font-bold transition-all"
                >
                  <option value="">{t.transactions.selectAccount}</option>
                  {getAvailableAccounts(formData.type).map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({financeLogic.formatCurrency(acc.balance, state.settings.currency, lang)})
                    </option>
                  ))}
                </select>
              </div>

              {formData.type === TransactionType.TRANSFER && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.transactions.toAccount}</label>
                  <select 
                    value={formData.toAccountId}
                    onChange={e => setFormData({ ...formData, toAccountId: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-sm font-bold transition-all"
                  >
                    <option value="">{t.transactions.selectTarget}</option>
                    {getAvailableAccounts(TransactionType.TRANSFER).filter(a => a.id !== formData.accountId).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({financeLogic.formatCurrency(acc.balance, state.settings.currency, lang)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(formData.type === TransactionType.EXPENSE || formData.type === TransactionType.INCOME) && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.category}</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value, subCategory: '' })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-sm font-bold transition-all"
                    >
                      <option value="">{t.common.category}</option>
                      {(formData.type === TransactionType.EXPENSE ? expenseCategories : incomeCategories).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.subCategory}</label>
                    <select 
                      value={formData.subCategory}
                      onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-sm font-bold transition-all"
                      disabled={!formData.category}
                    >
                      <option value="">{t.common.subCategory}</option>
                      {(formData.type === TransactionType.EXPENSE ? expenseCategories : incomeCategories)
                        .find(c => c.name === formData.category)?.subCategories.map(sub => (
                        <option key={sub.id} value={sub.name}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.note}</label>
                <textarea 
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  placeholder={t.transactions.whatFor}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-sm font-bold h-24 resize-none transition-all"
                />
              </div>
            </div>
            <div className="p-8 bg-slate-50/50 flex gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-4 bg-white border border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all btn-interaction"
              >
                {t.common.cancel}
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 px-4 py-4 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-100 btn-interaction"
              >
                {editingTransaction ? t.common.save : t.common.add}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
