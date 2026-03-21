
import React, { useState, useEffect, useCallback } from 'react';
import { FinanceState } from '../types';
import { getFinancialInsights, runWhatIfScenario } from '../src/services/geminiService';
import { BrainCircuit, Sparkles, AlertTriangle, Lightbulb, Play, Loader2 } from 'lucide-react';
import { translations } from '../translations';

interface AIInsightsProps {
  state: FinanceState;
}

const AIInsights: React.FC<AIInsightsProps> = ({ state }) => {
  const lang = state.settings.language;
  const t = translations[lang];
  
  // ─── Initial State from Cache ──────────────────────────────
  const getInitialData = () => {
    const userId = state.settings.userId || 'default';
    const cached = localStorage.getItem(`maestro_ai_cache_${userId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { insights: parsed.data, fingerprint: parsed.fingerprint };
      } catch { return { insights: '', fingerprint: '' }; }
    }
    return { insights: '', fingerprint: '' };
  };

  const initialData = getInitialData();
  const [insights, setInsights] = useState<string>(initialData.insights);
  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState<'NONE' | 'MISSING_KEY' | 'INVALID_KEY' | 'GENERIC' | 'INSUFFICIENT_DATA'>('NONE');
  const [scenario, setScenario] = useState('');
  const [scenarioResult, setScenarioResult] = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // ─── Smart Auto-Refresh ─────────────────────────────────────
  const getDataFingerprint = useCallback(() => {
    const counts = `${state.accounts.length}-${state.transactions.length}-${state.budgets.length}-${state.payables.length}-${state.receivables.length}-${state.goals.length}`;
    const balances = state.accounts.reduce((acc, a) => acc + a.balance, 0);
    return `${counts}-${balances}`;
  }, [state]);

  useEffect(() => {
    const fingerprint = getDataFingerprint();
    const userId = state.settings.userId || 'default';
    const cacheKey = `maestro_ai_cache_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    
    let shouldFetch = false;
    if (cached) {
      const { fingerprint: cachedFingerprint, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > 1000 * 60 * 60 * 24;
      if (cachedFingerprint !== fingerprint || isExpired) {
        shouldFetch = true;
      }
    } else {
      shouldFetch = true;
    }

    if (shouldFetch && !loading) {
      fetchInsights();
    }
  }, [getDataFingerprint, state.settings.userId]);

  const fetchInsights = async () => {
    setLoading(true);
    setErrorType('NONE');
    window.dispatchEvent(new CustomEvent('maestro:ai-start'));
    try {
      const res = await getFinancialInsights(state);
      if (res) {
        setInsights(res);
        const userId = state.settings.userId || 'default';
        const cacheKey = `maestro_ai_cache_${userId}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          data: res,
          fingerprint: getDataFingerprint(),
          timestamp: Date.now()
        }));
      } else {
        setInsights(t.ai.placeholderInsight);
      }
    } catch (error: any) {
      console.error('AI Fetch Error:', error);
      if (error.message === 'API_KEY_MISSING') setErrorType('MISSING_KEY');
      else if (error.message === 'INVALID_API_KEY') setErrorType('INVALID_KEY');
      else if (error.message === 'INSUFFICIENT_DATA') setErrorType('INSUFFICIENT_DATA');
      else {
        setErrorType('GENERIC');
        setInsights(t.ai.placeholderInsight);
      }
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent('maestro:ai-end'));
    }
  };

  const handleQuickScenario = (s: string) => {
    setScenario(s);
  };

  const quickScenarios = state.settings.language === 'ar' ? [
    'ماذا لو قمت بسداد جميع ديوني الآن؟',
    'ماذا لو قمت بتوفير 20% إضافية من دخلي؟',
    'ماذا لو اشتريت سيارة بالتقسيط (5000 شهرياً)؟',
  ] : [
    'What if I pay off all my debts now?',
    'What if I save an extra 20% of my income?',
    'What if I buy a car with 5000/mo installments?',
  ];

  const runScenario = async () => {
    if (!scenario) return;
    setScenarioLoading(true);
    try {
      const res = await runWhatIfScenario(state, scenario);
      setScenarioResult(res || '');
    } catch (error) {
      setScenarioResult(t.ai.placeholderInsight);
    } finally {
      setScenarioLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t.ai.title}</h2>
          <p className="text-sm text-slate-500">{t.ai.subtitle}</p>
        </div>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {t.ai.refreshInsights}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Insights Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <BrainCircuit className="text-indigo-600" />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">{t.ai.deepAnalysis}</h3>
            </div>
            <div className="p-8 prose prose-slate max-w-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                  <Loader2 size={40} className="animate-spin text-indigo-500" />
                  <p className="animate-pulse">{t.ai.crunching}</p>
                </div>
              ) : errorType !== 'NONE' ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className={`w-16 h-16 ${errorType === 'INSUFFICIENT_DATA' ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'} rounded-2xl flex items-center justify-center`}>
                    {errorType === 'INSUFFICIENT_DATA' ? <Database size={32} /> : <AlertTriangle size={32} />}
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-bold mb-2">
                      {errorType === 'MISSING_KEY' ? (lang === 'ar' ? 'مفتاح API مفقود' : 'API Key Missing') :
                       errorType === 'INVALID_KEY' ? (lang === 'ar' ? 'مفتاح API غير صالح' : 'Invalid API Key') :
                       errorType === 'INSUFFICIENT_DATA' ? (lang === 'ar' ? 'بانتظار بياناتك المالية' : 'Waiting for Financial Data') :
                       (lang === 'ar' ? 'خطأ في الاتصال' : 'Connection Error')}
                    </h4>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                      {errorType === 'MISSING_KEY' ? (lang === 'ar' ? 'يرجى إدخال مفتاح Gemini API في الإعدادات لتفعيل التحليل الذكي.' : 'Please enter your Gemini API key in settings to enable smart analysis.') :
                       errorType === 'INVALID_KEY' ? (lang === 'ar' ? 'مفتاح API الذي أدخلته غير صحيح أو انتهت صلاحيته.' : 'The API key provided is incorrect or has expired.') :
                       errorType === 'INSUFFICIENT_DATA' ? (lang === 'ar' ? 'الذكاء الاصطناعي يحتاج إلى حسابين ومعاملتين على الأقل لبدء تحليل نمطك المالي.' : 'AI needs at least 2 accounts and 2 transactions to start analyzing your financial patterns.') :
                       (lang === 'ar' ? 'تعذر الاتصال بخوادم الذكاء الاصطناعي. يرجى التحقق من اتصالك بالإنترنت.' : 'Could not connect to AI servers. Please check your internet connection.')}
                    </p>
                  </div>
                  {errorType === 'INSUFFICIENT_DATA' ? (
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('maestro:open-tab', { detail: 'dashboard' }))}
                      className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all"
                    >
                      {lang === 'ar' ? 'إضافة بيانات الآن' : 'Add Data Now'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('maestro:open-settings'))}
                      className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all"
                    >
                      {lang === 'ar' ? 'انتقل للإعدادات' : 'Go to Settings'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-slate-600 leading-relaxed">
                  {insights || t.ai.placeholderInsight}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel: What-If & Quick Tips */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="flex items-center gap-2 font-bold mb-4 text-indigo-200 uppercase tracking-widest text-xs">
              <Play size={16} /> {t.ai.whatIf}
            </h3>
            <p className="text-sm text-indigo-100 mb-4 leading-relaxed">
              {t.ai.predictOutcome}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {quickScenarios.map((s, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleQuickScenario(s)}
                  className="text-[9px] font-bold px-3 py-1.5 bg-white/5 hover:bg-white/20 border border-white/10 rounded-lg transition-all"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <textarea 
                value={scenario}
                onChange={e => setScenario(e.target.value)}
                placeholder={t.ai.scenarioPlaceholder}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm focus:bg-white/20 outline-none transition-all resize-none h-24 placeholder:text-indigo-300"
              />
              <button 
                onClick={runScenario}
                disabled={scenarioLoading || !scenario}
                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scenarioLoading ? <Loader2 size={16} className="animate-spin" /> : t.ai.runPrediction}
              </button>
            </div>
            {scenarioResult && (
              <div className="mt-4 p-4 bg-white/10 rounded-xl border border-white/10 text-xs text-indigo-50">
                {scenarioResult}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="flex items-center gap-2 font-bold mb-4 text-slate-900 uppercase tracking-widest text-xs">
              <Lightbulb size={16} className="text-amber-500" /> {t.ai.smartSuggestions}
            </h3>
            <div className="space-y-4">
              {t.ai.tips.map((tip: string, idx: number) => (
                <div key={idx} className="flex gap-3">
                  <div className={`w-1.5 h-auto rounded-full flex-shrink-0 ${idx % 2 === 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <p className="text-sm text-slate-600">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
