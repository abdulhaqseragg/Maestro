
import React, { useState } from 'react';
import { FinanceState, TransactionType, Category } from '../types';
import { Globe, DollarSign, Trash2, Database, Plus, ChevronDown, ChevronUp, Edit3, X, AlertTriangle, Lock, Sparkles } from 'lucide-react';
import { translations } from '../translations';
import { generateDemoData } from '../src/services/demoDataService';
import { authService } from '../src/services/authService';

interface SettingsViewProps {
  state: FinanceState & { 
    notify: (msg: string, type: any) => void, 
    requestConfirm: (t: string, m: string, c: () => void, d?: boolean) => void,
    role: 'ADMIN' | 'USER'
  };
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ state, updateState }) => {
  const t = translations[state.settings.language];
  const [activeCatType, setActiveCatType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  
  // Modal states
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catToEdit, setCatToEdit] = useState<{ id?: string, subId?: string, parentId?: string, name: string } | null>(null);

  // PIN Modal states
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinData, setPinData] = useState({ pin: '', confirm: '' });

  const handleGenerateDemoData = async () => {
    const { data: { user } } = await authService.getCurrentUser();
    if (!user) return;

    state.requestConfirm(
      lang === 'ar' ? 'توليد بيانات تجريبية' : 'Generate Demo Data',
      lang === 'ar' 
        ? 'سيتم إضافة حسابات ومعاملات وأهداف وهمية لاختبار قوة التحليل. هل تريد الاستمرار؟' 
        : 'Fake accounts, transactions, and goals will be added to test analysis power. Do you want to continue?',
      () => {
        const demoData = generateDemoData(user);
        updateState(prev => ({
          ...prev,
          accounts: [...prev.accounts, ...(demoData.accounts || [])],
          transactions: [...prev.transactions, ...(demoData.transactions || [])],
          budgets: [...prev.budgets, ...(demoData.budgets || [])],
          payables: [...prev.payables, ...(demoData.payables || [])],
          receivables: [...prev.receivables, ...(demoData.receivables || [])],
          goals: [...prev.goals, ...(demoData.goals || [])]
        }));
        state.notify(lang === 'ar' ? 'تم توليد البيانات بنجاح' : 'Demo data generated successfully', 'SUCCESS');
      }
    );
  };

  const resetApp = () => {
    state.requestConfirm(
      t.settings.clearData,
      t.common.confirmReset,
      () => {
        localStorage.clear();
        window.location.reload();
      },
      true
    );
  };

  const handleLanguageChange = (lang: string) => {
    updateState(prev => ({
      ...prev,
      settings: { ...prev.settings, language: lang } as any
    }));
    state.notify(t.common.language, 'INFO');
  };

  const handleCurrencyChange = (curr: string) => {
    updateState(prev => ({
      ...prev,
      settings: { ...prev.settings, currency: curr } as any
    }));
    state.notify(t.common.currency, 'INFO');
  };

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `maestro_export_${date}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      state.notify(lang === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully', 'SUCCESS');
    } catch (error) {
      console.error('Export failed:', error);
      state.notify('Export failed', 'ERROR');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!importedData.users || !importedData.accounts) {
          throw new Error('Invalid backup file');
        }

        state.requestConfirm(
          lang === 'ar' ? 'استيراد البيانات' : 'Import Data',
          lang === 'ar' ? 'سيؤدي هذا إلى استبدال بياناتك الحالية بالبيانات المستوردة. هل تريد الاستمرار؟' : 'This will replace your current data with the imported data. Do you want to continue?',
          () => {
            updateState(() => importedData);
            state.notify(lang === 'ar' ? 'تم استيراد البيانات بنجاح' : 'Data imported successfully', 'SUCCESS');
            setTimeout(() => window.location.reload(), 1000);
          },
          true
        );
      } catch (err) {
        state.notify(lang === 'ar' ? 'ملف غير صالح' : 'Invalid file format', 'ERROR');
      }
    };
    reader.readAsText(file);
  };

  const lang = state.settings.language;

  const filteredCategories = state.categories.filter(c => c.type === activeCatType);

  const handleSaveCategory = () => {
    if (!catToEdit || !catToEdit.name) return;

    updateState(prev => {
      let newCategories = [...prev.categories];

      if (catToEdit.parentId) {
        newCategories = newCategories.map(cat => {
          if (cat.id === catToEdit.parentId) {
            const newSubs = [...cat.subCategories];
            if (catToEdit.subId) {
              const subIdx = newSubs.findIndex(s => s.id === catToEdit.subId);
              if (subIdx !== -1) newSubs[subIdx].name = catToEdit.name;
            } else {
              newSubs.push({ id: crypto.randomUUID(), name: catToEdit.name });
            }
            return { ...cat, subCategories: newSubs };
          }
          return cat;
        });
      } else {
        if (catToEdit.id) {
          newCategories = newCategories.map(cat => cat.id === catToEdit.id ? { ...cat, name: catToEdit.name } : cat);
        } else {
          newCategories.push({
            id: crypto.randomUUID(),
            name: catToEdit.name,
            type: activeCatType,
            subCategories: [],
            userId: ''
          });
        }
      }

      return { ...prev, categories: newCategories };
    });

    state.notify(t.common.save, 'SUCCESS');
    setIsCatModalOpen(false);
    setCatToEdit(null);
  };

  const handleDeleteMainCategory = (id: string) => {
    const cat = state.categories.find(c => c.id === id);
    if (cat && cat.subCategories.length > 0) {
      state.notify(t.settings.deleteCategoryError, 'WARNING');
      return;
    }
    state.requestConfirm(
      t.common.delete,
      t.common.confirmDelete,
      () => {
        updateState(prev => ({
          ...prev,
          categories: prev.categories.filter(c => c.id !== id)
        }));
        state.notify(t.common.delete, 'SUCCESS');
      },
      true
    );
  };

  const handleDeleteSubCategory = (parentId: string, subId: string) => {
    state.requestConfirm(
      t.common.delete,
      t.common.confirmDelete,
      () => {
        updateState(prev => ({
          ...prev,
          categories: prev.categories.map(cat => {
            if (cat.id === parentId) {
              return { ...cat, subCategories: cat.subCategories.filter(s => s.id !== subId) };
            }
            return cat;
          })
        }));
        state.notify(t.common.delete, 'SUCCESS');
      },
      true
    );
  };

  const handleSavePin = () => {
    if (pinData.pin.length !== 6 || pinData.pin !== pinData.confirm) {
      state.notify(lang === 'ar' ? 'الرمز غير متطابق أو غير مكتمل' : 'PIN mismatch or incomplete', 'ERROR');
      return;
    }
    updateState(prev => {
      const updatedSettings = { 
        ...state.settings, 
        pin: pinData.pin, 
        isPinEnabled: true 
      };
      return {
        ...prev,
        users: prev.users.map(u => u.id === state.settings.userId ? { ...u, settings: updatedSettings } : u)
      };
    });
    setIsPinModalOpen(false);
    state.notify(lang === 'ar' ? 'تم تفعيل الرمز السري بنجاح' : 'PIN enabled successfully', 'SUCCESS');
  };

  const handleTogglePin = (enabled: boolean) => {
    if (enabled) {
      setIsPinModalOpen(true);
    } else {
      state.requestConfirm(
        lang === 'ar' ? 'تعطيل الرمز السري' : 'Disable PIN',
        lang === 'ar' ? 'هل أنت متأكد من تعطيل حماية الرمز السري؟' : 'Are you sure you want to disable PIN protection?',
        () => {
          updateState(prev => {
            const updatedSettings = { ...state.settings, isPinEnabled: false };
            return {
              ...prev,
              users: prev.users.map(u => u.id === state.settings.userId ? { ...u, settings: updatedSettings } : u)
            };
          });
          state.notify(lang === 'ar' ? 'تم تعطيل الرمز السري' : 'PIN disabled', 'SUCCESS');
        },
        true
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-soft">
      {/* General Settings */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover-lift">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">{t.settings.general}</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 text-slate-900 rounded-xl"><Globe size={18} /></div>
              <div>
                <p className="text-sm font-bold text-slate-800">{t.common.language}</p>
              </div>
            </div>
            <select 
              value={state.settings.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl text-xs px-3 py-1.5 font-bold focus:ring-4 focus:ring-slate-100 outline-none btn-interaction cursor-pointer"
            >
              <option value="en">{t.settings.langName}</option>
              <option value="ar">{t.settings.arName}</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 text-slate-900 rounded-xl"><DollarSign size={18} /></div>
              <div>
                <p className="text-sm font-bold text-slate-800">{t.common.currency}</p>
              </div>
            </div>
            <select 
              value={state.settings.currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl text-xs px-3 py-1.5 font-bold focus:ring-4 focus:ring-slate-100 outline-none btn-interaction cursor-pointer"
            >
              <option value="EGP">{t.settings.currencies.EGP}</option>
              <option value="SAR">{t.settings.currencies.SAR}</option>
              <option value="USD">{t.settings.currencies.USD}</option>
              <option value="EUR">{t.settings.currencies.EUR}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Category Management */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover-lift">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">{t.settings.categoryManagement}</h3>
          <div className="flex bg-slate-100/50 p-1 rounded-xl gap-1">
            <button 
              onClick={() => setActiveCatType(TransactionType.EXPENSE)}
              className={`px-3 py-1 text-[9px] font-bold uppercase rounded-lg transition-all btn-interaction ${activeCatType === TransactionType.EXPENSE ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              {t.dashboard.expense}
            </button>
            <button 
              onClick={() => setActiveCatType(TransactionType.INCOME)}
              className={`px-3 py-1 text-[9px] font-bold uppercase rounded-lg transition-all btn-interaction ${activeCatType === TransactionType.INCOME ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
            >
              {t.dashboard.income}
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{t.settings.mainCategories}</h4>
            <button 
              onClick={() => {
                setCatToEdit({ name: '' });
                setIsCatModalOpen(true);
              }}
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 btn-interaction"
            >
              <Plus size={14} /> {t.settings.addMainCategory}
            </button>
          </div>

          <div className="space-y-2">
            {filteredCategories.map(cat => (
              <div key={cat.id} className="border border-slate-50 rounded-2xl overflow-hidden transition-all">
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors btn-interaction ${expandedCat === cat.id ? 'bg-slate-50/50' : ''}`}
                  onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-400 rounded-md uppercase">
                      {cat.subCategories.length} {t.settings.subCategories}
                    </span>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setCatToEdit({ id: cat.id, name: cat.name });
                        setIsCatModalOpen(true);
                      }}
                      className="p-1.5 text-slate-300 hover:text-indigo-500 rounded-lg hover:bg-white btn-interaction"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteMainCategory(cat.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-white btn-interaction"
                    >
                      <Trash2 size={14} />
                    </button>
                    {expandedCat === cat.id ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                  </div>
                </div>

                {expandedCat === cat.id && (
                  <div className="px-4 pb-4 space-y-2 bg-slate-50/30 border-t border-slate-50 pt-3 animate-in slide-in-from-top-1 duration-200">
                    {cat.subCategories.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-2 pl-6 bg-white rounded-xl border border-slate-50 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <span className="font-bold text-slate-600">{sub.name}</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              setCatToEdit({ subId: sub.id, parentId: cat.id, name: sub.name });
                              setIsCatModalOpen(true);
                            }}
                            className="p-1 text-slate-200 hover:text-indigo-400 btn-interaction"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSubCategory(cat.id, sub.id)}
                            className="p-1 text-slate-200 hover:text-rose-400 btn-interaction"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        setCatToEdit({ parentId: cat.id, name: '' });
                        setIsCatModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1 py-2 text-[9px] font-bold text-slate-400 hover:text-indigo-500 border border-dashed border-slate-200 rounded-xl hover:bg-indigo-50/20 transition-all btn-interaction"
                    >
                      <Plus size={12} /> {t.settings.addSubCategory}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security PIN Settings (User only) */}
      {state.role !== 'ADMIN' && (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover-lift">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">{t.security.title}</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100/50 group transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                  <Lock size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{t.security.enablePin}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{lang === 'ar' ? 'حماية الدخول برمز 6 أرقام' : 'Secure access with 6-digit PIN'}</p>
                </div>
              </div>
              <button 
                onClick={() => handleTogglePin(!state.settings.isPinEnabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  state.settings.isPinEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                  state.settings.isPinEnabled ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : (lang === 'ar' ? '-translate-x-1' : 'translate-x-1')
                }`} />
              </button>
            </div>

            {state.settings.isPinEnabled && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.security.setPin}</p>
                <button 
                  onClick={() => setIsPinModalOpen(true)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-metadata text-indigo-600 hover:text-indigo-700 btn-interaction"
                >
                  <Edit3 size={14} /> {t.security.changePin}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Storage & Export Management */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover-lift">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">{t.settings.dataPrivacy}</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-5 bg-slate-50/50 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between group border border-slate-100/50 transition-all gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl text-slate-400 group-hover:text-slate-900 transition-colors shadow-sm">
                <Database size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">{t.settings.exportJson}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{lang === 'ar' ? 'تصدير أو استيراد نسخة احتياطية كاملة' : 'Export or import full backup'}</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <label className="flex-1 sm:flex-none">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportJSON} 
                  className="hidden" 
                />
                <div className="px-6 py-2.5 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all shadow-sm btn-interaction cursor-pointer text-center">
                  {lang === 'ar' ? 'استيراد' : 'Import'}
                </div>
              </label>
              <button 
                onClick={handleExportJSON}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-black transition-all shadow-sm btn-interaction"
              >
                {t.common.export}
              </button>
            </div>
          </div>

          <div className="p-5 bg-indigo-50/30 rounded-[2rem] flex items-center justify-between group border border-indigo-100/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl text-indigo-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-900">{lang === 'ar' ? 'توليد بيانات تجريبية' : 'Generate Demo Data'}</p>
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">{lang === 'ar' ? 'أضف بيانات وهمية لاختبار الذكاء الاصطناعي' : 'Add fake data to test AI insights'}</p>
              </div>
            </div>
            <button 
              onClick={handleGenerateDemoData}
              className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all shadow-sm btn-interaction"
            >
              {lang === 'ar' ? 'توليد' : 'Generate'}
            </button>
          </div>

          <div className="p-5 bg-rose-50/30 rounded-[2rem] flex items-center justify-between group border border-rose-100/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl text-rose-400 group-hover:text-rose-600 transition-colors shadow-sm">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-900">{t.settings.clearData}</p>
                <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest">{t.common.warningIrreversible}</p>
              </div>
            </div>
            <button 
              onClick={resetApp}
              className="px-6 py-2.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all btn-interaction"
            >
              {t.common.reset}
            </button>
          </div>
        </div>
      </section>

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsCatModalOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-soft">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {catToEdit?.parentId 
                  ? (catToEdit?.subId ? t.settings.editSubCategory : t.settings.addSubCategory)
                  : (catToEdit?.id ? t.settings.editMainCategory : t.settings.addMainCategory)}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-900 btn-interaction">
                <X size={18} />
              </button>
            </div>
            <div className="p-8">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{t.common.name}</label>
              <input 
                autoFocus
                type="text" 
                value={catToEdit?.name || ''}
                onChange={e => setCatToEdit({ ...catToEdit!, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-sm font-bold transition-all"
              />
            </div>
            <div className="p-8 bg-slate-50/50 flex gap-3">
              <button onClick={() => setIsCatModalOpen(false)} className="flex-1 py-3.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 btn-interaction">
                {t.common.cancel}
              </button>
              <button onClick={handleSaveCategory} className="flex-1 py-3.5 text-[10px] font-bold text-white bg-slate-900 rounded-2xl hover:bg-black shadow-xl shadow-slate-100 btn-interaction">
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Setup Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsPinModalOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-soft">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t.security.setupPin}</h3>
              <button onClick={() => setIsPinModalOpen(false)} className="text-slate-400 hover:text-slate-900 btn-interaction">
                <X size={18} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{t.security.enterPin}</label>
                <input 
                  autoFocus
                  type="password" 
                  maxLength={6}
                  value={pinData.pin}
                  onChange={e => setPinData({ ...pinData, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-center text-2xl font-black tracking-[1em] transition-all"
                  placeholder="••••••"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{t.security.confirmPin}</label>
                <input 
                  type="password" 
                  maxLength={6}
                  value={pinData.confirm}
                  onChange={e => setPinData({ ...pinData, confirm: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-slate-100 outline-none text-center text-2xl font-black tracking-[1em] transition-all"
                  placeholder="••••••"
                />
              </div>
            </div>
            <div className="p-8 bg-slate-50/50 flex gap-3">
              <button onClick={() => setIsPinModalOpen(false)} className="flex-1 py-3.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 btn-interaction">
                {t.common.cancel}
              </button>
              <button onClick={handleSavePin} className="flex-1 py-3.5 text-[10px] font-bold text-white bg-slate-900 rounded-2xl hover:bg-black shadow-xl shadow-slate-100 btn-interaction">
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center py-6">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Maestro v1.0.0</p>
      </div>
    </div>
  );
};

export default SettingsView;
