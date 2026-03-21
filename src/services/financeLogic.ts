import { Account, Transaction, TransactionType, Payable, Receivable } from '../../types';

export const financeLogic = {
  calculateAccountBalance: (account: Account, transactions: Transaction[]): number => {
    let balance = account.openingBalance;
    
    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME && t.accountId === account.id) {
        balance += t.amount;
      } else if (t.type === TransactionType.EXPENSE && t.accountId === account.id) {
        balance -= t.amount;
      } else if (t.type === TransactionType.TRANSFER) {
        if (t.accountId === account.id) {
          balance -= t.amount;
        } else if (t.toAccountId === account.id) {
          balance += t.amount;
        }
      }
    });
    
    return balance;
  },

  getNextInstallment: (payable: Payable) => {
    return payable.installments.find(i => i.status === 'PENDING');
  },

  getOutstandingPayables: (payables: Payable[]) => {
    return payables.reduce((acc, p) => acc + p.remainingBalance, 0);
  },

  getOutstandingReceivables: (receivables: Receivable[]) => {
    return receivables.reduce((acc, r) => acc + r.remainingBalance, 0);
  },

  formatCurrency: (amount: number, currency: string = 'EGP', language: string = 'en', isPrivacyMode: boolean = false) => {
    if (isPrivacyMode) return '****';
    const locale = language === 'ar' ? 'ar-EG' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
};
