
export enum AccountType {
  CASH = 'CASH',
  BANK = 'BANK',
  E_WALLET = 'E_WALLET',
  CREDIT_CARD = 'CREDIT_CARD',
  INSTALLMENTS = 'INSTALLMENTS'
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER'
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  subCategories: { id: string; name: string }[];
  userId: string;
}

export interface CreditCardSettings {
  statementStartDay: number;
  statementEndDay: number;
  gracePeriod: number;
  dueDay: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  openingBalance: number;
  ccSettings?: CreditCardSettings;
  color: string;
  userId: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  accountId: string;
  toAccountId?: string;
  category?: string;
  subCategory?: string;
  note?: string;
  userId: string;
}

export interface Installment {
  id: string;
  amount: number;
  dueDate: string;
  status: 'PAID' | 'PENDING';
}

export enum LinkType {
  UNLINKED = 'UNLINKED',
  CREDIT_CARD = 'CREDIT_CARD',
  INSTALLMENT = 'INSTALLMENT'
}

export interface Payable {
  id: string;
  title: string;
  totalAmount: number;
  installments: Installment[];
  totalInstallments: number;
  remainingBalance: number;
  linkType: LinkType;
  linkedAccountId?: string;
  userId: string;
}

export interface Receivable {
  id: string;
  debtor: string;
  amount: number;
  remainingBalance: number;
  dueDate?: string;
  history: { date: string; amount: number; transactionId: string }[];
  userId: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'WEEKLY' | 'MONTHLY';
  userId: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  accountId: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'EXECUTED';
  userId: string;
}

export interface UserPermissions {
  dashboard: boolean;
  accounts: boolean;
  transactions: boolean;
  obligations: boolean;
  budgets: boolean;
  goals: boolean;
  ai: boolean;
  settings: boolean;
}

export interface UserSettings {
  currency: string;
  language: string;
  pin?: string;
  isPinEnabled?: boolean;
  isPrivacyMode?: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  password?: string;
  role: 'ADMIN' | 'USER';
  permissions: UserPermissions;
  expirationDate?: string;
  settings: UserSettings;
}

export interface FinanceNotification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
  message: string;
}

export interface FinanceState {
  users: User[];
  accounts: Account[];
  transactions: Transaction[];
  payables: Payable[];
  receivables: Receivable[];
  budgets: Budget[];
  goals: FinancialGoal[];
  categories: Category[];
  settings?: UserSettings;
  globalSettings: {
    language: string;
  };
}
