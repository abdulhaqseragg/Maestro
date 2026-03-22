import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, AlertCircle, TrendingUp, PiggyBank, ArrowLeft } from 'lucide-react';
import AIService, { AIResponse } from '../src/services/aiService';
import { FinanceState } from '../types';

interface SmartInsightCardProps {
  state: FinanceState;
}

const SmartInsightCard: React.FC<SmartInsightCardProps> = ({ state }) => {
  const [insight, setInsight] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const lang = state.globalSettings?.language || 'en';
  const isRTL = lang === 'ar';

  useEffect(() => {
    let isMounted = true;
    
    const fetchInsight = async () => {
      try {
        setIsLoading(true);
        // We pass the full state object as the rawData to be extracted
        const response = await AIService.getAdvice(state);
        if (isMounted) {
          setInsight(response);
          setError(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch Maestro AI Insight:", err);
          setError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInsight();

    return () => {
      isMounted = false;
    };
  }, []); // Fetch once on mount

  if (error) {
    return null; // Silent failure
  }

  const renderIcon = (actionType?: string) => {
    switch (actionType) {
      case 'save':
        return <PiggyBank size={16} />;
      case 'alert':
        return <AlertCircle size={16} />;
      case 'forecast':
        return <TrendingUp size={16} />;
      default:
        return null; // No icon fallback
    }
  };

  return (
    <div className={`w-full mb-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-2xl relative group transition-all duration-300 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-full h-full bg-gradient-to-t from-black/20 to-transparent -translate-x-1/2"></div>

      <div className="relative p-7 sm:p-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1 space-y-5 w-full">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-[1.2rem] backdrop-blur-md shadow-inner border border-white/5">
              <Sparkles size={20} className="text-indigo-200" />
            </div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-indigo-200/90 flex items-center gap-2">
              {isRTL ? 'رؤية المايسترو' : 'Maestro Insight'}
            </h3>
          </div>

          {isLoading ? (
            <div className="space-y-4 pt-1 w-full max-w-2xl">
              <div className="h-6 bg-white/10 rounded-xl animate-pulse w-full"></div>
              <div className="h-6 bg-white/10 rounded-xl animate-pulse w-4/5"></div>
            </div>
          ) : insight ? (
            <p className="text-lg sm:text-xl font-bold leading-relaxed text-white/95 max-w-3xl drop-shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700">
              {insight.message}
            </p>
          ) : null}
        </div>

        {/* Action Badge */}
        {!isLoading && insight && insight.action && insight.action !== 'none' && (
          <div className={`shrink-0 flex items-center self-start ${isRTL ? 'md:self-end' : 'md:self-end'} mt-2 md:mt-0 animate-in fade-in zoom-in duration-500 delay-300`}>
            <button className="flex items-center gap-2.5 px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95 group-hover:shadow-indigo-900/50">
              {renderIcon(insight.action)}
              <span className="capitalize">{isRTL && insight.action === 'save' ? 'توفير' : isRTL && insight.action === 'alert' ? 'تنبيه' : isRTL && insight.action === 'forecast' ? 'توقع' : insight.action}</span>
              {isRTL ? <ArrowLeft size={16} strokeWidth={3} className="opacity-70" /> : <ArrowRight size={16} strokeWidth={3} className="opacity-70" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartInsightCard;
