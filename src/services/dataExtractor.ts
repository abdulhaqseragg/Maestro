import { Transaction, Payable, Receivable, Budget, Account } from "../../types";

export interface ExtractedBalances {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number;
  currency: string;
}

export interface ExtractedInstallments {
  totalMonthlyCommitments: number;
  count: number;
  items: { category: string; amount: number; remainingMonths: number | null }[];
}

export interface ExtractedPattern {
  byCategory: Record<string, number>;
  topCategory: string;
  percentages: Record<string, number>;
}

export interface FinancialContext {
  balances: ExtractedBalances;
  installments: ExtractedInstallments;
  transactions: { amount: number; category: string; type: string; dayOfWeek: string }[];
  patterns: ExtractedPattern;
  meta: { month: string; timestamp: number };
}

class FinancialDataExtractor {
  static extract(rawData: any): FinancialContext {
    return {
      balances: this._extractBalances(rawData),
      installments: this._extractInstallments(rawData),
      transactions: this._extractRecentTransactions(rawData),
      patterns: this._extractSpendingPatterns(rawData),
      meta: this._buildMeta()
    };
  }

  static _extractBalances(data: any): ExtractedBalances {
    return {
      totalIncome: data.income ?? 0,
      totalExpenses: data.expenses ?? 0,
      netBalance: (data.income ?? 0) - (data.expenses ?? 0),
      savingsRate: FinancialDataExtractor._calcSavingsRate(data.income, data.expenses), // ✅
      currency: data.currency ?? 'EGP'
    };
  }

  static _extractInstallments(data: any): ExtractedInstallments {
    const items = data.installments ?? [];
    return {
      totalMonthlyCommitments: items.reduce((s: number, i: any) => s + i.amount, 0),
      count: items.length,
      items: items.map((i: any) => ({
        category: i.category,
        amount: i.amount,
        remainingMonths: i.remaining ?? null
      }))
    };
  }

  static _extractRecentTransactions(data: any) {
    const txns = (data.transactions ?? []).slice(-20);
    return txns.map((t: any) => ({
      amount: t.amount,
      category: t.category ?? t.note ?? 'مصروف',
      type: t.type,
      dayOfWeek: new Date(t.date).toLocaleDateString('ar', { weekday: 'long' })
    }));
  }

  static _extractSpendingPatterns(data: any): ExtractedPattern {
    const txns = data.transactions ?? [];
    const byCategory: Record<string, number> = {};
    
    txns.forEach((t: any) => {
      if (t.type !== 'expense' && t.type !== 'EXPENSE') return;
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    });
    
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    
    return {
      byCategory,
      topCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'غير محدد',
      percentages: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [
          k, total > 0 ? Math.round((v / total) * 100) : 0
        ])
      )
    };
  }

  static _buildMeta() {
    return {
      month: new Date().toLocaleDateString('ar', { month: 'long', year: 'numeric' }),
      timestamp: Date.now()
    };
  }

  static _calcSavingsRate(income: number, expenses: number): number {
    if (!income || income === 0) return 0;
    return Math.round(((income - expenses) / income) * 100);
  }
}

export default FinancialDataExtractor;
