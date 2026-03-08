
import React, { useState, useEffect } from 'react';
import { FinanceState } from '../types';
import { getFinancialInsights, runWhatIfScenario } from '../services/geminiService';
import { BrainCircuit, Sparkles, AlertTriangle, Lightbulb, Play, Loader2 } from 'lucide-react';
import { translations } from '../translations';

interface AIInsightsProps {
  state: FinanceState;
}

const AIInsights: React.FC<AIInsightsProps> = ({ state }) => {
  const t = translations[state.settings.language];
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState('');
  const [scenarioResult, setScenarioResult] = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await getFinancialInsights(state);
      setInsights(res || t.ai.placeholderInsight);
    } catch (error) {
      setInsights(t.ai.placeholderInsight);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchInsights();
  }, []);

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
