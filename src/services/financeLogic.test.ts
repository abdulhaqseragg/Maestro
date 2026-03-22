import { describe, it, expect } from 'vitest';
import { financeLogic } from './financeLogic';
import { Account, Transaction, TransactionType, AccountType } from '../../types';

describe('FinanceLogic', () => {
  const mockAccount: Account = {
    id: 'acc-1',
    name: 'Bank',
    type: AccountType.BANK,
    balance: 1000,
    openingBalance: 1000,
    color: '#000000',
    userId: 'user-1'
  };

  it('should calculate account balance with income correctly', () => {
    const transactions: Transaction[] = [
      { id: 't1', type: TransactionType.INCOME, amount: 500, date: '2025-01-01', accountId: 'acc-1', userId: 'user-1' }
    ];
    const balance = financeLogic.calculateAccountBalance(mockAccount, transactions);
    expect(balance).toBe(1500);
  });

  it('should calculate account balance with expense correctly', () => {
    const transactions: Transaction[] = [
      { id: 't1', type: TransactionType.EXPENSE, amount: 200, date: '2025-01-01', accountId: 'acc-1', userId: 'user-1' }
    ];
    const balance = financeLogic.calculateAccountBalance(mockAccount, transactions);
    expect(balance).toBe(800);
  });

  it('should format currency in Privacy Mode correctly', () => {
    const formatted = financeLogic.formatCurrency(1234.56, 'EGP', 'ar', true);
    expect(formatted).toBe('****');
  });

  it('should format currency for Arabic locale correctly', () => {
    const formatted = financeLogic.formatCurrency(100, 'EGP', 'ar', false);
    // Standard Arabic formatting for 100 EGP
    expect(formatted).toContain('١٠٠');
  });
});
