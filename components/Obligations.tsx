
import React, { useState, useMemo } from 'react';
import { FinanceState, Payable, Receivable, Installment, AccountType, LinkType, TransactionType, Transaction } from '../types';
import { 
  Plus, X, Calendar, ArrowUpRight, 
  ArrowDownLeft, CheckCircle2, 
  History, CreditCard,
  Link as LinkIcon, AlertCircle, Archive, LayoutList,
  Pencil, Trash2, Wallet, Landmark
} from 'lucide-react';
import { financeLogic } from '../src/services/financeLogic';
import { translations } from '../translations';

interface ObligationsProps {
  state: FinanceState & { notify: (msg: string, type: any) => void, requestConfirm: (t: string, m: string, c: () => void, d?: boolean) => void };
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

const Obligations: React.FC<ObligationsProps> = ({ state, updateState }) => {
  const t = translations[state.settings.language];
  const lang = state.settings.language;
  const isRTL = lang === 'ar';

  const [view, setView] = useState<'payables' | 'receivables'>('payables');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Payment confirmation state
  const [isPayConfirmModalOpen, setIsPayConfirmModalOpen] = useState(false);
  const [activePayable, setActivePayable] = useState<Payable | null>(null);
  const [activeInstallment, setActiveInstallment] = useState<Installment | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Partial collection state
  const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
  const [activeReceivable, setActiveReceivable] = useState<Receivable | null>(null);
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');

  // Forms state
  const [payableForm, setPayableForm] = useState({
    title: '',
    totalAmount: 0,
    installmentsCount: 1,
    startDate: new Date().toISOString().split('T')[0],
    linkType: LinkType.UNLINKED,
    linkedAccountId: ''
  });

  const [receivableForm, setReceivableForm] = useState({
    debtor: '',
    amount: 0,
    dueDate: ''
  });

  const summaryStats = useMemo(() => {
    const totalPayableRemaining = state.payables.reduce((sum, p) => sum + p.remainingBalance, 0);
    const totalReceivableRemaining = state.receivables.reduce((sum, r) => sum + r.remainingBalance, 0);
    return {
      totalPayableRemaining,
      totalReceivableRemaining
    };
  }, [state.payables, state.receivables]);

  const filteredAccountsForLink = useMemo(() => {
    if (payableForm.linkType === LinkType.CREDIT_CARD) {
      return state.accounts.filter(a => a.type === AccountType.CREDIT_CARD);
    }
    if (payableForm.linkType === LinkType.INSTALLMENT) {
      return state.accounts.filter(a => a.type === AccountType.INSTALLMENTS);
    }
    return [];
  }, [state.accounts, payableForm.linkType]);

  const paymentAccounts = useMemo(() => {
    return state.accounts.filter(a => a.type !== AccountType.INSTALLMENTS);
  }, [state.accounts]);

  const collectionAccounts = useMemo(() => {
    return state.accounts.filter(a => 
      a.type !== AccountType.CREDIT_CARD && a.type !== AccountType.INSTALLMENTS
    );
  }, [state.accounts]);

  const displayPayables = useMemo(() => {
    return state.payables.filter(p => statusFilter === 'active' ? p.remainingBalance > 0 : p.remainingBalance <= 0);
  }, [state.payables, statusFilter]);

  const displayReceivables = useMemo(() => {
    return state.receivables.filter(r => statusFilter === 'active' ? r.remainingBalance > 0 : r.remainingBalance <= 0);
  }, [state.receivables, statusFilter]);

  const recordTransaction = (data: Partial<Transaction>) => {
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      amount: data.amount || 0,
      accountId: data.accountId || '',
      type: data.type || TransactionType.EXPENSE,
      category: data.category || t.obligations.title,
      note: data.note || '',
      userId: ''
    } as Transaction;

    updateState(prev => {
      const accounts = prev.accounts.map(acc => {
        if (acc.id === newTransaction.accountId) {
          const impact = newTransaction.type === TransactionType.INCOME ? newTransaction.amount : -newTransaction.amount;
          return { ...acc, balance: acc.balance + impact };
        }
        return acc;
      });

      return {
        ...prev,
        accounts,
        transactions: [newTransaction, ...prev.transactions]
      };
    });
  };

  const handleDeletePayable = (id: string) => {
    const payable = state.payables.find(p => p.id === id);
    if (!payable) return;

    if (payable.remainingBalance < payable.totalAmount) {
      state.notify(t.obligations.deleteErrorLinked, 'WARNING');
      return;
    }

    state.requestConfirm(
      t.common.delete,
      t.common.confirmDelete,
      () => {
        updateState(prev => ({
          ...prev,
          payables: prev.payables.filter(p => p.id !== id)
        }));
        state.notify(t.common.delete, 'SUCCESS');
      },
      true
    );
  };

  const handleDeleteReceivable = (id: string) => {
    const receivable = state.receivables.find(r => r.id === id);
    if (!receivable) return;

    if (receivable.history.length > 0) {
      state.notify(t.obligations.deleteErrorLinked, 'WARNING');
      return;
    }

    state.requestConfirm(
      t.common.delete,
      t.common.confirmDelete,
      () => {
        updateState(prev => ({
          ...prev,
          receivables: prev.receivables.filter(r => r.id !== id)
        }));
        state.notify(t.common.delete, 'SUCCESS');
      },
      true
    );
  };

  const handlePayInstallment = () => {
    if (!activePayable || !activeInstallment || !selectedAccountId || paymentAmount <= 0) return;

    updateState(prev => ({
      ...prev,
      payables: prev.payables.map(p => {
        if (p.id === activePayable.id) {
          return {
            ...p,
            remainingBalance: p.remainingBalance - paymentAmount,
            installments: p.installments.map(i => {
              if (i.id === activeInstallment.id) {
                const newAmount = i.amount - paymentAmount;
                return { 
                  ...i, 
                  amount: Math.max(0, newAmount), 
                  status: newAmount <= 0 ? 'PAID' : 'PENDING' 
                };
              }
              return i;
            })
          };
        }
        return p;
      })
    }));

    recordTransaction({
      type: TransactionType.EXPENSE,
      amount: paymentAmount,
      accountId: selectedAccountId,
      note: `${activePayable.title} - ${t.obligations.pay} (${activeInstallment.dueDate})`
    });

    state.notify(t.obligations.paymentSuccess, 'SUCCESS');
    setIsPayConfirmModalOpen(false);
    setActivePayable(null);
    setActiveInstallment(null);
    setPaymentAmount(0);
  };

  const handlePayFullPayable = () => {
    if (!activePayable || !selectedAccountId || paymentAmount <= 0) return;

    updateState(prev => ({
      ...prev,
      payables: prev.payables.map(p => {
        if (p.id === activePayable.id) {
          const newRem = Math.max(0, p.remainingBalance - paymentAmount);
          return {
            ...p,
            remainingBalance: newRem,
            installments: p.installments.map(i => ({ ...i, status: newRem <= 0 ? 'PAID' : i.status }))
          };
        }
        return p;
      })
    }));

    recordTransaction({
      type: TransactionType.EXPENSE,
      amount: paymentAmount,
      accountId: selectedAccountId,
      note: `${activePayable.title} - ${t.obligations.payFull}`
    });

    state.notify(t.obligations.paymentSuccess, 'SUCCESS');
    setIsPayConfirmModalOpen(false);
    setActivePayable(null);
    setPaymentAmount(0);
  };

  const handleSavePayable = () => {
    if (!payableForm.title || !payableForm.totalAmount) return;

    updateState(prev => {
      let existing = prev.payables.find(p => p.id === editingId);
      const paidAmount = existing ? (existing.totalAmount - existing.remainingBalance) : 0;
      const newRemainingBalance = Math.max(0, payableForm.totalAmount - paidAmount);
      const preservedPaidInstallments = existing ? existing.installments.filter(i => i.status === 'PAID') : [];
      const newPendingInstallments: Installment[] = [];
      const installmentsToGenerate = Math.max(1, payableForm.installmentsCount - preservedPaidInstallments.length);
      const amtPerInst = newRemainingBalance / installmentsToGenerate;
      const startDate = new Date(payableForm.startDate);

      for (let i = 0; i < installmentsToGenerate; i++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + i);
        newPendingInstallments.push({
          id: crypto.randomUUID(),
          amount: amtPerInst,
          dueDate: d.toISOString().split('T')[0],
          status: 'PENDING'
        });
      }

      const combinedInstallments = [...preservedPaidInstallments, ...newPendingInstallments];
      const newPayable: Payable = {
        id: editingId || crypto.randomUUID(),
        title: payableForm.title,
        totalAmount: payableForm.totalAmount,
        totalInstallments: combinedInstallments.length,
        remainingBalance: newRemainingBalance,
        installments: combinedInstallments,
        linkType: payableForm.linkType,
        linkedAccountId: payableForm.linkType !== LinkType.UNLINKED ? payableForm.linkedAccountId : undefined,
        userId: '' 
      };

      state.notify(t.obligations.title, 'SUCCESS');
      if (editingId) {
        return { ...prev, payables: prev.payables.map(p => p.id === editingId ? newPayable : p) };
      } else {
        return { ...prev, payables: [newPayable, ...prev.payables] };
      }
    });

    setIsModalOpen(false);
    setEditingId(null);
    setPayableForm({ title: '', totalAmount: 0, installmentsCount: 1, startDate: new Date().toISOString().split('T')[0], linkType: LinkType.UNLINKED, linkedAccountId: '' });
  };

  const handleSaveReceivable = () => {
    if (!receivableForm.debtor || !receivableForm.amount) return;

    updateState(prev => {
      let existing = prev.receivables.find(r => r.id === editingId);
      const totalCollected = existing ? existing.history.reduce((sum, h) => sum + h.amount, 0) : 0;
      const newRemaining = Math.max(0, receivableForm.amount - totalCollected);

      const newReceivable: Receivable = {
        id: editingId || crypto.randomUUID(),
        debtor: receivableForm.debtor,
        amount: receivableForm.amount,
        remainingBalance: newRemaining,
        dueDate: receivableForm.dueDate || undefined,
        history: existing ? existing.history : [],
        userId: '' 
      };

      state.notify(t.obligations.receivables, 'SUCCESS');
      if (editingId) {
        return { ...prev, receivables: prev.receivables.map(r => r.id === editingId ? newReceivable : r) };
      } else {
        return { ...prev, receivables: [newReceivable, ...prev.receivables] };
      }
    });

    setIsModalOpen(false);
    setEditingId(null);
    setReceivableForm({ debtor: '', amount: 0, dueDate: '' });
  };

  const handlePartialCollection = () => {
    if (!activeReceivable || partialAmount <= 0 || !selectedAccountId) return;
    const transactionId = crypto.randomUUID();

    updateState(prev => ({
      ...prev,
      receivables: prev.receivables.map(r => {
        if (r.id === activeReceivable.id) {
          return {
            ...r,
            remainingBalance: Math.max(0, r.remainingBalance - partialAmount),
            dueDate: rescheduleDate || r.dueDate,
            history: [...r.history, { date: new Date().toISOString().split('T')[0], amount: partialAmount, transactionId }]
          };
        }
        return r;
      })
    }));

    recordTransaction({
      id: transactionId,
      type: TransactionType.INCOME,
      amount: partialAmount,
      accountId: selectedAccountId,
      note: `${t.obligations.collect} - ${activeReceivable.debtor}`
    });

    state.notify(t.obligations.collectSuccess, 'SUCCESS');
    setIsPartialModalOpen(false);
    setActiveReceivable(null);
    setPartialAmount(0);
    setRescheduleDate('');
    setSelectedAccountId('');
  };

  const openPayConfirm = (payable: Payable, installment?: Installment) => {
    setActivePayable(payable);
    setActiveInstallment(installment || null);
    setSelectedAccountId(payable.linkedAccountId || '');
    setPaymentAmount(installment ? installment.amount : payable.remainingBalance);
    setIsPayConfirmModalOpen(true);
  };

  const openEditPayable = (p: Payable) => {
    setEditingId(p.id);
    setModalType('PAYABLE');
    setPayableForm({
      title: p.title,
      totalAmount: p.totalAmount,
      installmentsCount: p.totalInstallments,
      startDate: p.installments.find(inst => inst.status === 'PENDING')?.dueDate || new Date().toISOString().split('T')[0],
      linkType: p.linkType,
      linkedAccountId: p.linkedAccountId || ''
    });
    setIsModalOpen(true);
  };

  const openEditReceivable = (r: Receivable) => {
    setEditingId(r.id);
    setModalType('RECEIVABLE');
    setReceivableForm({
      debtor: r.debtor,
      amount: r.amount,
      dueDate: r.dueDate || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.obligations.title}</h2>
          <p className="text-sm text-slate-500">{t.obligations.subtitle}</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setModalType(view === 'payables' ? 'PAYABLE' : 'RECEIVABLE');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus size={18} />
          {view === 'payables' ? t.obligations.addNewPayable : t.obligations.addNewReceivable}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.obligations.totalDebt}</p>
            <p className="text-2xl font-black text-rose-600">{financeLogic.formatCurrency(summaryStats.totalPayableRemaining, state.settings.currency, lang, state.settings.isPrivacyMode)}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <ArrowUpRight size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.obligations.totalReceivable}</p>
            <p className="text-2xl font-black text-emerald-600">{financeLogic.formatCurrency(summaryStats.totalReceivableRemaining, state.settings.currency, lang, state.settings.isPrivacyMode)}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ArrowDownLeft size={24} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => setView('payables')}
            className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${view === 'payables' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.obligations.payables}
          </button>
          <button 
            onClick={() => setView('receivables')}
            className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${view === 'receivables' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.obligations.receivables}
          </button>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutList size={14} />
            {t.common.active}
          </button>
          <button 
            onClick={() => setStatusFilter('archived')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${statusFilter === 'archived' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Archive size={14} />
            {t.common.archived}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {view === 'payables' ? (
          displayPayables.map(payable => {
            const nextInstallment = payable.installments.find(i => i.status === 'PENDING');
            const progress = ((payable.totalAmount - payable.remainingBalance) / payable.totalAmount) * 100;
            const linkedAccount = state.accounts.find(a => a.id === payable.linkedAccountId);
            
            return (
              <div key={payable.id} className={`bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-blue-200 transition-all group relative ${payable.remainingBalance <= 0 ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${payable.remainingBalance <= 0 ? 'bg-slate-50 text-slate-400' : 'bg-rose-50 text-rose-600'}`}>
                    {payable.remainingBalance <= 0 ? <CheckCircle2 size={24} /> : <ArrowUpRight size={24} />}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openEditPayable(payable)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeletePayable(payable.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900">{payable.title}</h3>
                  {payable.linkType !== LinkType.UNLINKED && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      <LinkIcon size={10} />
                      {linkedAccount?.name || t.obligations.unlinked}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                  <Calendar size={12} />
                  <span>{t.obligations.next}: {nextInstallment?.dueDate || t.goals.complete}</span>
                </div>

                <div className="space-y-4">
                  <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50">
                    <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mb-1">{t.obligations.remainingBalance}</p>
                    <p className="text-xl font-black text-rose-900">{financeLogic.formatCurrency(payable.remainingBalance, state.settings.currency, lang, state.settings.isPrivacyMode)}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>{Math.round(progress)}% {t.common.achieved}</span>
                      <span>{financeLogic.formatCurrency(payable.totalAmount, state.settings.currency, lang, state.settings.isPrivacyMode)} {t.common.total}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${payable.remainingBalance <= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {payable.installments.map((inst, idx) => (
                      <div key={inst.id} className={`flex items-center justify-between p-3 rounded-2xl ${inst.status === 'PAID' ? 'bg-slate-50 opacity-60' : 'bg-slate-50 border border-slate-100'}`}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">#{idx + 1}</span>
                          <span className="text-xs font-semibold text-slate-700">{inst.dueDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900">{financeLogic.formatCurrency(inst.amount, state.settings.currency, lang, state.settings.isPrivacyMode)}</span>
                          {inst.status === 'PAID' ? (
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          ) : (
                            <button 
                              onClick={() => openPayConfirm(payable, inst)}
                              className="p-1.5 bg-white border border-slate-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <CreditCard size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {payable.remainingBalance > 0 && (
                    <button 
                      onClick={() => openPayConfirm(payable)}
                      className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all uppercase tracking-wider"
                    >
                      {t.obligations.payFull}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          displayReceivables.map(receivable => {
            const progress = receivable.amount > 0 ? ((receivable.amount - receivable.remainingBalance) / receivable.amount) * 100 : 0;
            return (
              <div key={receivable.id} className={`bg-white rounded-3xl border border-slate-200 p-6 shadow-sm group hover:border-emerald-200 transition-all ${receivable.remainingBalance <= 0 ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${receivable.remainingBalance <= 0 ? 'bg-slate-50 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    {receivable.remainingBalance <= 0 ? <CheckCircle2 size={24} /> : <ArrowDownLeft size={24} />}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openEditReceivable(receivable)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteReceivable(receivable.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 mb-1">{receivable.debtor}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                  <Calendar size={12} />
                  <span>{t.obligations.due}: {receivable.dueDate || '-'}</span>
                </div>

                <div className="space-y-6">
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">{t.obligations.balanceToCollect}</p>
                    <p className="text-xl font-black text-emerald-900">{financeLogic.formatCurrency(receivable.remainingBalance, state.settings.currency, lang, state.settings.isPrivacyMode)}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>{Math.round(progress)}% {t.common.achieved}</span>
                      <span>{financeLogic.formatCurrency(receivable.amount, state.settings.currency, lang, state.settings.isPrivacyMode)} {t.common.total}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 bg-emerald-500`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {receivable.history.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <History size={10} /> {t.obligations.paymentHistory}
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {receivable.history.map((h, i) => (
                          <div key={i} className="flex justify-between text-[10px] p-2 bg-slate-50 rounded-lg">
                            <span className="text-slate-500">{h.date}</span>
                            <span className="font-bold text-emerald-600">+{financeLogic.formatCurrency(h.amount, state.settings.currency, lang, state.settings.isPrivacyMode)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {receivable.remainingBalance > 0 && (
                    <button 
                      onClick={() => {
                        setActiveReceivable(receivable);
                        setSelectedAccountId('');
                        setPartialAmount(0);
                        setIsPartialModalOpen(true);
                      }}
                      className="w-full py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black hover:bg-emerald-700 transition-all uppercase tracking-wider shadow-lg shadow-emerald-100"
                    >
                      {t.obligations.collect}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        {((view === 'payables' ? displayPayables.length : displayReceivables.length) === 0) && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-200">
              {view === 'payables' ? <ArrowUpRight size={32} /> : <ArrowDownLeft size={32} />}
            </div>
            <p className="text-slate-400 font-medium">{t.common.noData}</p>
          </div>
        )}
      </div>

      {/* Main Creation/Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {modalType === 'PAYABLE' 
                  ? (editingId ? t.obligations.editPayable : t.obligations.addNewPayable) 
                  : (editingId ? t.obligations.editReceivable : t.obligations.addNewReceivable)}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4 max-h-[85vh] sm:max-h-[70vh] overflow-y-auto custom-scrollbar">
              {modalType === 'PAYABLE' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.common.name}</label>
                    <input 
                      type="text" 
                      value={payableForm.title}
                      onChange={e => setPayableForm({ ...payableForm, title: e.target.value })}
                      placeholder="e.g. Car Loan"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">{t.common.total}</label>
                      <input 
                        type="number" 
                        value={payableForm.totalAmount}
                        onChange={e => setPayableForm({ ...payableForm, totalAmount: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">{t.obligations.installmentsCount}</label>
                      <input 
                        type="number" 
                        min="1"
                        value={payableForm.installmentsCount}
                        onChange={e => setPayableForm({ ...payableForm, installmentsCount: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.obligations.firstInstallmentDate}</label>
                    <input 
                      type="date" 
                      value={payableForm.startDate}
                      onChange={e => setPayableForm({ ...payableForm, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.obligations.linkTo}</label>
                    <select 
                      value={payableForm.linkType}
                      onChange={e => setPayableForm({ ...payableForm, linkType: e.target.value as LinkType, linkedAccountId: '' })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {Object.values(LinkType).map(type => (
                        <option key={type} value={type}>{t.obligations.linkTypes[type]}</option>
                      ))}
                    </select>
                  </div>

                  {payableForm.linkType !== LinkType.UNLINKED && (
                    <div className="space-y-1 animate-in slide-in-from-top-2">
                      <label className="text-sm font-semibold text-slate-700">{t.obligations.linkedAccount}</label>
                      <select 
                        value={payableForm.linkedAccountId}
                        onChange={e => setPayableForm({ ...payableForm, linkedAccountId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">{t.transactions.selectAccount}</option>
                        {filteredAccountsForLink.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.obligations.debtorName}</label>
                    <input 
                      type="text" 
                      value={receivableForm.debtor}
                      onChange={e => setReceivableForm({ ...receivableForm, debtor: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.common.total}</label>
                    <input 
                      type="number" 
                      value={receivableForm.amount}
                      onChange={e => setReceivableForm({ ...receivableForm, amount: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">{t.obligations.dueDateOptional}</label>
                    <input 
                      type="date" 
                      value={receivableForm.dueDate}
                      onChange={e => setReceivableForm({ ...receivableForm, dueDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </>
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
                onClick={modalType === 'PAYABLE' ? handleSavePayable : handleSaveReceivable}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md"
              >
                {editingId ? t.common.save : t.common.add}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {isPayConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPayConfirmModalOpen(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{activeInstallment ? t.obligations.pay : t.obligations.payFull}</h3>
              <button onClick={() => setIsPayConfirmModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-8 space-y-4">
               <div className="p-5 bg-rose-50 rounded-2xl text-center border border-rose-100/50">
                  <p className="text-[10px] text-rose-600 font-bold uppercase mb-1 tracking-widest">{t.obligations.remainingBalance}</p>
                  <p className="text-2xl font-black text-rose-900">
                    {financeLogic.formatCurrency(activeInstallment ? activeInstallment.amount : activePayable?.remainingBalance || 0, state.settings.currency, lang, state.settings.isPrivacyMode)}
                  </p>
               </div>
               
               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.common.amount}</label>
                <input 
                  type="number" 
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  max={activeInstallment ? activeInstallment.amount : activePayable?.remainingBalance}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-100 text-sm font-bold"
                />
              </div>

               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.obligations.selectPaymentAccount}</label>
                <select 
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-100 text-sm font-bold"
                >
                  <option value="">{t.transactions.selectAccount}</option>
                  {paymentAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({financeLogic.formatCurrency(acc.balance, state.settings.currency, lang, state.settings.isPrivacyMode)})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button onClick={() => setIsPayConfirmModalOpen(false)} className="flex-1 py-4 text-[10px] font-bold text-slate-500 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 btn-interaction uppercase tracking-widest">
                {t.common.cancel}
              </button>
              <button 
                onClick={activeInstallment ? handlePayInstallment : handlePayFullPayable} 
                disabled={!selectedAccountId || paymentAmount <= 0}
                className="flex-1 py-4 text-[10px] font-bold text-white bg-slate-900 rounded-2xl hover:bg-black shadow-xl shadow-slate-100 btn-interaction disabled:opacity-50 uppercase tracking-widest"
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {isPartialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPartialModalOpen(false)} />
          <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{t.obligations.recordPayment}</h3>
              <button onClick={() => setIsPartialModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-8 space-y-4">
               <div className="p-5 bg-emerald-50 rounded-2xl text-center border border-emerald-100/50">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1 tracking-widest">{t.obligations.balanceToCollect}</p>
                  <p className="text-2xl font-black text-emerald-900">{financeLogic.formatCurrency(activeReceivable?.remainingBalance || 0, state.settings.currency, lang, state.settings.isPrivacyMode)}</p>
               </div>
               
               <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.obligations.amountToCollect}</label>
                <input 
                  type="number" 
                  value={partialAmount}
                  onChange={e => setPartialAmount(Number(e.target.value))}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-100 text-sm font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.obligations.selectCollectAccount}</label>
                <select 
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 text-sm font-bold outline-none"
                >
                  <option value="">{t.transactions.selectAccount}</option>
                  {collectionAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({financeLogic.formatCurrency(acc.balance, state.settings.currency, lang, state.settings.isPrivacyMode)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.obligations.dueDateOptional}</label>
                <input 
                  type="date" 
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold"
                />
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button onClick={() => setIsPartialModalOpen(false)} className="flex-1 py-4 text-[10px] font-bold text-slate-500 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 btn-interaction uppercase tracking-widest">
                {t.common.cancel}
              </button>
              <button 
                onClick={handlePartialCollection} 
                disabled={!selectedAccountId || partialAmount <= 0}
                className="flex-1 py-4 text-[10px] font-bold text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 btn-interaction disabled:opacity-50 uppercase tracking-widest"
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

export default Obligations;
