import { GoogleGenAI } from "@google/genai";
import { FinanceState } from "../../types";

const getApiKeys = () => {
  const keys: string[] = [];
  
  // 1. User defined key (Priority 1)
  const userKey = localStorage.getItem('maestro_user_gemini_key');
  if (userKey) keys.push(userKey);

  // 2. System default key (Priority 2 - Fallback)
  // This is read from .env file using Vite environment variables
  const systemKey = (import.meta as any).env.VITE_GEMINI_API_KEY || ''; 
  if (systemKey) keys.push(systemKey);

  return keys;
};

export const getFinancialInsights = async (state: FinanceState) => {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('API_KEY_MISSING');
  }

  // Check if there's enough data to analyze
  if (state.transactions.length < 2 && state.accounts.length === 0) {
    throw new Error('INSUFFICIENT_DATA');
  }

  const lang = state.settings?.language || state.globalSettings.language;
  const promptData = {
    summary: {
      totalBalance: state.accounts.reduce((acc, a) => acc + a.balance, 0),
      currency: state.settings?.currency || 'EGP'
    },
    accounts: state.accounts.map(a => ({ name: a.name, balance: a.balance, type: a.type })),
    recentTransactions: state.transactions.slice(0, 15).map(t => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      note: t.note,
      date: t.date
    })),
    payables: state.payables.filter(p => p.remainingBalance > 0).map(p => ({ 
      title: p.title, 
      remaining: p.remainingBalance,
      nextInstallment: p.installments.find(i => i.status === 'PENDING')?.dueDate
    })),
    receivables: state.receivables.filter(r => r.remainingBalance > 0).map(r => ({ 
      from: r.debtor, 
      remaining: r.remainingBalance,
      dueDate: r.dueDate
    })),
    budgets: state.budgets.map(b => ({ 
      category: b.category, 
      limit: b.limit, 
      spent: b.spent,
      status: b.spent > b.limit ? 'OVER_BUDGET' : 'OK'
    })),
    goals: state.goals.filter(g => g.status === 'ACTIVE').map(g => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount,
      deadline: g.targetDate
    }))
  };

  let lastError: any = null;

  for (const apiKey of apiKeys) {
    try {
      const ai = new GoogleGenAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `Analyze this financial state and provide insights: ${JSON.stringify(promptData)}. 
            Focus on: 
            1. Cash flow forecast for next 30 days based on recent transactions and payables/receivables.
            2. Budget pressure detection and specific advice for over-budget categories.
            3. Goal achievement probability and suggestions to reach them faster.
            4. Debt management strategy (which one to pay first).
            5. General behavioral advice based on spending patterns.
            IMPORTANT: You MUST respond entirely in ${lang === 'ar' ? 'Arabic' : 'English'}. No other language allowed.
            Use a professional yet encouraging tone.
            Return the response in clear markdown with headers and bullet points.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
        }
      });

      return response.response.text();
    } catch (error: any) {
      lastError = error;
      console.warn(`API Key failed: ${apiKey.substring(0, 8)}...`, error.message);
      // If error is invalid key, continue to next key
      if (error.message?.includes('API key not valid')) continue;
      // For other errors, maybe try next key too
      continue;
    }
  }

  // If we reach here, all keys failed
  if (lastError?.message?.includes('API key not valid')) {
    throw new Error('INVALID_API_KEY');
  }
  throw lastError || new Error('ALL_API_KEYS_FAILED');
};

export const runWhatIfScenario = async (state: FinanceState, scenario: string) => {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('API_KEY_MISSING');
  }

  const lang = state.settings?.language || state.globalSettings.language;
  let lastError: any = null;

  for (const apiKey of apiKeys) {
    try {
      const ai = new GoogleGenAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `Current Financial State: ${JSON.stringify(state)}. 
            Scenario: ${scenario}.
            Predict the financial outcome, impact on goals/budgets, and provide a risk assessment.
            IMPORTANT: You MUST respond entirely in ${lang === 'ar' ? 'Arabic' : 'English'}.`
          }]
        }]
      });

      return response.response.text();
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('API key not valid')) continue;
      continue;
    }
  }

  if (lastError?.message?.includes('API key not valid')) {
    throw new Error('INVALID_API_KEY');
  }
  throw lastError || new Error('ALL_API_KEYS_FAILED');
};
