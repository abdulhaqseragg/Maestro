import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import AIService from '../src/services/aiService';
import { FinanceState } from '../types';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

interface FinancialAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: FinanceState;
}

const FinancialAdvisorDrawer: React.FC<FinancialAdvisorDrawerProps> = ({ isOpen, onClose, state }) => {
  const lang = state.globalSettings?.language || 'en';
  const isRTL = lang === 'ar';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'default-1',
      sender: 'ai',
      text: isRTL ? 'أهلاً بك في Maestro. أنا مستشارك المالي، كيف يمكنني مساعدتك في التخطيط لأموالك اليوم؟' : 'Welcome to Maestro. I am your financial advisor, how can I help you plan your finances today?',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      sender: 'user',
      text: userText,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await AIService.askAdvisor(state, userText);
      
      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        sender: 'ai',
        text: response.message || response.data || (isRTL ? 'عذراً لا يمكنني الإجابة حالياً.' : 'Sorry, I cannot answer right now.'),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get advisor response:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '-err',
        sender: 'ai',
        text: isRTL ? 'عذراً، حدث خطأ في النظام. يرجى المحاولة لاحقاً.' : 'Sorry, a system error occurred. Please try again later.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 ${isRTL ? 'left-0' : 'right-0'} h-full w-full max-w-[90vw] sm:max-w-md bg-white shadow-2xl z-[160] flex flex-col transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-x-0' : (isRTL ? '-translate-x-full' : 'translate-x-full')} ${isRTL ? 'font-arabic' : ''}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between shadow-md relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
          
          <div className="relative flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
              <Sparkles size={20} className="text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-indigo-50">{isRTL ? 'المستشار المالي' : 'Financial Advisor'}</h2>
              <p className="text-[10px] text-indigo-200 font-bold tracking-widest uppercase">Maestro AI Advisor</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-md relative group"
          >
            <X size={20} className="text-white group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50 relative scroll-smooth">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            
            return (
              <div key={msg.id} className={`flex gap-3 items-end ${isUser ? (isRTL ? 'flex-row' : 'flex-row-reverse') : (isRTL ? 'flex-row-reverse' : 'flex-row')} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isUser ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                  {isUser ? <User size={14} /> : <Bot size={14} strokeWidth={2.5} />}
                </div>
                
                <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${
                  isUser 
                    ? `bg-indigo-600 text-white ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}` 
                    : `bg-white border border-slate-100 text-slate-700 ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'} leading-relaxed`
                }`}>
                  <p className="text-sm font-medium whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className={`flex gap-3 items-end ${isRTL ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-300`}>
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-white border border-slate-200 text-indigo-600">
                <Bot size={14} strokeWidth={2.5} />
              </div>
              <div className={`max-w-[75%] rounded-2xl p-4 bg-white border border-slate-100 text-slate-700 ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'} shadow-sm flex items-center justify-center gap-1.5 h-[52px]`}>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRTL ? 'اكتب استفسارك المالي هنا...' : 'Type your financial question...'}
              className={`w-full bg-slate-50 border-none rounded-2xl py-3.5 ${isRTL ? 'pr-5 pl-14' : 'pl-5 pr-14'} text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all focus:bg-white shadow-inner focus:shadow-md`}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`absolute ${isRTL ? 'left-2' : 'right-2'} p-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-white transition-all transform active:scale-95`}
            >
              <Send size={18} className={isRTL ? 'rotate-180 -ml-0.5' : '-mr-0.5'} />
            </button>
          </form>
          <div className="text-center mt-3 flex items-center justify-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            <Sparkles size={10} className="text-indigo-300" />
            <span>Powered by Maestro AI & Gemini</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default FinancialAdvisorDrawer;
