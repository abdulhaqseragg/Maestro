
import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowRightLeft, 
  Receipt, 
  ChartPie, 
  Target, 
  Settings,
  Users
} from 'lucide-react';

export const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#06b6d4'
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'accounts', label: 'Accounts', icon: <Wallet size={20} /> },
  { id: 'transactions', label: 'Transactions', icon: <ArrowRightLeft size={20} /> },
  { id: 'obligations', label: 'Obligations', icon: <Receipt size={20} /> },
  { id: 'budgets', label: 'Budgets', icon: <ChartPie size={20} /> },
  { id: 'goals', label: 'Goals', icon: <Target size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  { id: 'user-management', label: 'Users', icon: <Users size={20} />, adminOnly: true }
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', subCategories: ['Groceries', 'Restaurants', 'Coffee'] },
  { id: 'transport', name: 'Transportation', subCategories: ['Fuel', 'Public Transit', 'Taxi'] },
  { id: 'home', name: 'Home', subCategories: ['Rent', 'Utilities', 'Maintenance'] },
  { id: 'shopping', name: 'Shopping', subCategories: ['Clothing', 'Electronics', 'Personal Care'] },
  { id: 'entertainment', name: 'Entertainment', subCategories: ['Movies', 'Games', 'Subscriptions'] },
];

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Gift', 'Other'
];
