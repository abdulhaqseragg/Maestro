import React, { useState, useEffect, useRef } from 'react';
import { Lock, Delete, X, ArrowRight } from 'lucide-react';

interface PinEntryProps {
  correctPin: string;
  onSuccess: () => void;
  onCancel: () => void;
  lang: 'en' | 'ar';
}

const PinEntry: React.FC<PinEntryProps> = ({ correctPin, onSuccess, onCancel, lang }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const isRTL = lang === 'ar';

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const verifyPin = (inputPin: string) => {
    if (inputPin === correctPin) {
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 1000);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-[#05050a] p-6 selection:bg-indigo-500/30 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] p-8 lg:p-12 relative z-10 text-center">
        <div className="mb-10">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
            <Lock className="text-indigo-400" size={32} />
          </div>
          <h3 className="text-2xl font-black text-white mb-2">
            {lang === 'ar' ? 'أدخل الرقم السري' : 'Enter Security PIN'}
          </h3>
          <p className="text-slate-500 font-bold text-sm">
            {lang === 'ar' ? 'مطلوب 6 أرقام للوصول إلى بياناتك' : '6 digits required to access your data'}
          </p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-12">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i}
              className={`w-10 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                error ? 'border-rose-500 bg-rose-500/10' : 
                pin.length > i ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 
                'border-white/5 bg-white/5'
              }`}
            >
              {pin.length > i ? (
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              ) : null}
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="w-full aspect-square rounded-2xl bg-white/5 border border-white/5 text-white text-2xl font-black hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={onCancel}
            className="w-full aspect-square rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 active:scale-95 transition-all"
          >
            <X size={24} />
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className="w-full aspect-square rounded-2xl bg-white/5 border border-white/5 text-white text-2xl font-black hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-full aspect-square rounded-2xl bg-white/5 border border-white/5 text-slate-400 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
          >
            <Delete size={24} />
          </button>
        </div>

        {error && (
          <p className="mt-8 text-rose-500 text-sm font-black animate-in shake duration-300">
            {lang === 'ar' ? 'الرمز غير صحيح، حاول مرة أخرى' : 'Incorrect PIN, try again'}
          </p>
        )}
      </div>
      
      {/* Footer Branding */}
      <div className="fixed bottom-8 text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] pointer-events-none">
        &copy; 2026 Maestro Financial Systems
      </div>
    </div>
  );
};

export default PinEntry;
