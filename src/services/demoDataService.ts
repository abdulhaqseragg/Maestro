import { FinanceState, AccountType, TransactionType, LinkType, User } from '../../types';

export const generateDemoData = (currentUser: User): Partial<FinanceState> => {
  const userId = currentUser.id;
  const now = new Date();
  
  // 1. Accounts
  const accounts = [
    {
      id: crypto.randomUUID(),
      name: 'Main Bank Account',
      type: AccountType.BANK,
      balance: 45000,
      openingBalance: 40000,
      color: '#6366f1',
      userId
    },
    {
      id: crypto.randomUUID(),
      name: 'Cash Wallet',
      type: AccountType.CASH,
      balance: 2500,
      openingBalance: 1000,
      color: '#10b981',
      userId
    },
    {
      id: crypto.randomUUID(),
      name: 'Visa Gold',
      type: AccountType.CREDIT_CARD,
      balance: -12000,
      openingBalance: 0,
      ccSettings: {
        statementStartDay: 1,
        statementEndDay: 30,
        gracePeriod: 55,
        dueDay: 25
      },
      color: '#f43f5e',
      userId
    }
  ];

  // 2. Categories (Simplified mapping for demo)
  const categories = [
    { id: 'cat-1', name: 'Salary', type: TransactionType.INCOME },
    { id: 'cat-2', name: 'Freelance', type: TransactionType.INCOME },
    { id: 'cat-3', name: 'Rent', type: TransactionType.EXPENSE },
    { id: 'cat-4', name: 'Groceries', type: TransactionType.EXPENSE },
    { id: 'cat-5', name: 'Dining', type: TransactionType.EXPENSE },
    { id: 'cat-6', name: 'Subscription', type: TransactionType.EXPENSE },
    { id: 'cat-7', name: 'Shopping', type: TransactionType.EXPENSE }
  ];

  // 3. Transactions
  const transactions = [
    {
      id: crypto.randomUUID(),
      type: TransactionType.INCOME,
      amount: 35000,
      date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      accountId: accounts[0].id,
      category: 'Salary',
      note: 'Monthly Salary',
      userId
    },
    {
      id: crypto.randomUUID(),
      type: TransactionType.EXPENSE,
      amount: 8000,
      date: new Date(now.getFullYear(), now.getMonth(), 2).toISOString(),
      accountId: accounts[0].id,
      category: 'Rent',
      note: 'Apartment Rent',
      userId
    },
    {
      id: crypto.randomUUID(),
      type: TransactionType.EXPENSE,
      amount: 1500,
      date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
      accountId: accounts[1].id,
      category: 'Dining',
      note: 'Dinner with friends',
      userId
    },
    {
      id: crypto.randomUUID(),
      type: TransactionType.EXPENSE,
      amount: 4500,
      date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
      accountId: accounts[2].id,
      category: 'Shopping',
      note: 'New Smartphone installment',
      userId
    },
    {
      id: crypto.randomUUID(),
      type: TransactionType.EXPENSE,
      amount: 2800,
      date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(),
      accountId: accounts[0].id,
      category: 'Groceries',
      note: 'Weekly Hypermarket',
      userId
    },
    {
      id: crypto.randomUUID(),
      type: TransactionType.EXPENSE,
      amount: 3200,
      date: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
      accountId: accounts[0].id,
      category: 'Groceries',
      note: 'Weekly Hypermarket 2',
      userId
    },
    {
      id: crypto.randomUUID(),
      type: TransactionType.EXPENSE,
      amount: 1200,
      date: new Date(now.getFullYear(), now.getMonth(), 18).toISOString(),
      accountId: accounts[2].id,
      category: 'Dining',
      note: 'Launch delivery',
      userId
    }
  ];

  // 4. Budgets
  const budgets = [
    {
      id: crypto.randomUUID(),
      category: 'Groceries',
      limit: 5000,
      spent: 6000, // Over budget
      period: 'MONTHLY',
      userId
    },
    {
      id: crypto.randomUUID(),
      category: 'Dining',
      limit: 2000,
      spent: 2700, // Over budget
      period: 'MONTHLY',
      userId
    }
  ];

  // 5. Obligations
  const payables = [
    {
      id: crypto.randomUUID(),
      title: 'Car Loan',
      totalAmount: 120000,
      remainingBalance: 85000,
      totalInstallments: 48,
      installments: Array.from({ length: 12 }).map((_, i) => ({
        id: crypto.randomUUID(),
        amount: 2500,
        dueDate: new Date(now.getFullYear(), now.getMonth() + i, 5).toISOString().split('T')[0],
        status: 'PENDING'
      })),
      linkType: LinkType.UNLINKED,
      userId
    }
  ];

  const receivables = [
    {
      id: crypto.randomUUID(),
      debtor: 'John Doe',
      amount: 5000,
      remainingBalance: 5000,
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().split('T')[0],
      history: [],
      userId
    }
  ];

  // 6. Goals
  const goals = [
    {
      id: crypto.randomUUID(),
      name: 'Summer Vacation 2026',
      targetAmount: 50000,
      currentAmount: 15000,
      targetDate: '2026-07-01',
      accountId: accounts[0].id,
      status: 'ACTIVE',
      userId
    }
  ];

  return {
    accounts,
    transactions,
    budgets,
    payables,
    receivables,
    goals
  };
};
