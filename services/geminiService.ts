
import { GoogleGenAI, Type } from "@google/genai";
import { FinanceState } from "../types";

export const getFinancialInsights = async (state: FinanceState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Use optional chaining for scoped settings with fallback to global settings
  const lang = state.settings?.language || state.globalSettings.language;
  
  const promptData = {
    accounts: state.accounts.map(a => ({ name: a.name, balance: a.balance, type: a.type })),
    recentTransactions: state.transactions.slice(-10),
    payables: state.payables.map(p => ({ title: p.title, remaining: p.remainingBalance })),
    receivables: state.receivables.map(r => ({ from: r.debtor, remaining: r.remainingBalance })),
    budgets: state.budgets.map(b => ({ category: b.category, limit: b.limit, spent: b.spent }))
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze this financial state and provide insights: ${JSON.stringify(promptData)}. 
    Focus on: 
    1. Cash flow forecast for next 30 days.
    2. Budget pressure detection.
    3. What-if scenarios (e.g., impact of paying off a debt early).
    4. General behavioral advice.
    IMPORTANT: You MUST respond entirely in ${lang === 'ar' ? 'Arabic' : 'English'}. No other language allowed.
    Return the response in structured markdown.`,
    config: {
      temperature: 0.7,
      topP: 0.95,
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  return response.text;
};

export const runWhatIfScenario = async (state: FinanceState, scenario: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Use optional chaining for scoped settings with fallback to global settings
  const lang = state.settings?.language || state.globalSettings.language;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Current Financial State: ${JSON.stringify(state)}. 
    Scenario: ${scenario}.
    Predict the financial outcome and provide a risk assessment.
    IMPORTANT: You MUST respond entirely in ${lang === 'ar' ? 'Arabic' : 'English'}.`,
  });

  return response.text;
};
