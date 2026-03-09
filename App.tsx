
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FinanceState, 
  AccountType, 
  TransactionType, 
  Account, 
  Transaction,
  Payable,
  Receivable,
  Budget,
  FinancialGoal,
  Category,
  User,
  UserPermissions,
  FinanceNotification
} from './types';
import { storageService } from './services/storageService';
import { NAV_ITEMS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './constants';
import Dashboard from './components/Dashboard';
import Accounts from './components/Accounts';
import Transactions from './components/Transactions';
import Obligations from './components/Obligations';
import Budgets from './components/Budgets';
import Goals from './components/Goals';
import AIInsights from './components/AIInsights';
import SettingsView from './components/SettingsView';
import UserManagement from './components/UserManagement';
import AdminUserManagement from './components/AdminUserManagement';
import Login from './components/LoginSaaS';
import { Menu, X, Plus, Sparkles, LogOut, ShieldCheck, CheckCircle, AlertCircle, Info, AlertTriangle, Languages, Globe, Wifi, WifiOff } from 'lucide-react';
import { translations } from './translations';

const INITIAL_PERMISSIONS: UserPermissions = {
  dashboard: true,
  accounts: true,
  transactions: true,
  obligations: true,
  budgets: true,
  goals: true,
  ai: true,
  settings: true
};

const createDefaultCategories = (userId: string): Category[] => [
  ...DEFAULT_EXPENSE_CATEGORIES.map(c => ({
    id: `${userId}-${c.id}`,
    name: c.name,
    type: TransactionType.EXPENSE,
    userId,
    subCategories: c.subCategories.map(s => ({ id: crypto.randomUUID(), name: s }))
  })),
  ...DEFAULT_INCOME_CATEGORIES.map(c => ({
    id: `${userId}-${c.toLowerCase().replace(/\s+/g, '-')}`,
    name: c,
    type: TransactionType.INCOME,
    userId,
    subCategories: []
  }))
];

const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    email: 'abdulhaq.serag@gmail.com',
    username: 'admin',
    password: '123456',
    role: 'ADMIN',
    permissions: INITIAL_PERMISSIONS,
    settings: {
      currency: 'EGP',
      language: 'en'
    }
  }
];

const INITIAL_STATE: FinanceState = {
  users: INITIAL_USERS,
  accounts: [],
  transactions: [],
  payables: [],
  receivables: [],
  budgets: [],
  goals: [],
  categories: createDefaultCategories('admin-1'),
  globalSettings: {
    language: 'en'
  }
};

const App: React.FC = () => {
  console.log('App component loaded');
  const [globalState, setGlobalState] = useState<FinanceState>(INITIAL_STATE);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [openAddModalOnMount, setOpenAddModalOnMount] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Global Notification & Confirmation State
  const [notifications, setNotifications] = useState<FinanceNotification[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  } | null>(null);

  const currentLang = currentUser?.settings?.language || globalState?.globalSettings?.language || 'en';
  const t = translations[currentLang];
  const isRTL = currentLang === 'ar';

  const notify = useCallback((message: string, type: FinanceNotification['type'] = 'INFO') => {
    const id = crypto.randomUUID();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const requestConfirm = useCallback((title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, isDestructive });
  }, []);

  const scopedState = useMemo(() => {
    console.log('[App] Creating scopedState for user:', currentUser);
    if (!currentUser) {
      console.log('[App] No currentUser, returning null');
      return null;
    }
    const state = {
      users: globalState.users,
      accounts: globalState.accounts.filter(a => a.userId === currentUser.id),
      transactions: globalState.transactions.filter(t => t.userId === currentUser.id),
      payables: globalState.payables.filter(p => p.userId === currentUser.id),
      receivables: globalState.receivables.filter(r => r.userId === currentUser.id),
      budgets: globalState.budgets.filter(b => b.userId === currentUser.id),
      goals: globalState.goals.filter(g => g.userId === currentUser.id),
      categories: globalState.categories.filter(c => c.userId === currentUser.id),
      settings: currentUser.settings,
      globalSettings: globalState.globalSettings,
      notify,
      requestConfirm
    };
    console.log('[App] scopedState created:', state);
    return state;
  }, [globalState, currentUser, notify, requestConfirm]);

  useEffect(() => {
    const saved = storageService.load();
    const rememberedUserId = localStorage.getItem('maestro_remembered_user_id');
    
    let currentState = INITIAL_STATE;
    if (saved) {
      if (!saved.users || saved.users.length === 0) saved.users = INITIAL_USERS;
      currentState = saved;
      setGlobalState(saved);
    }
    
    if (rememberedUserId) {
      const user = currentState.users.find(u => u.id === rememberedUserId);
      if (user) {
        const isExpired = user.expirationDate && new Date(user.expirationDate) < new Date();
        if (!isExpired) {
          handleLogin(user);
        } else {
          localStorage.removeItem('maestro_remembered_user_id');
        }
      }
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) storageService.save(globalState);
  }, [globalState, isLoaded]);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateGlobalState = (updater: (prev: FinanceState) => FinanceState) => {
    setGlobalState(prev => {
      const newState = updater(prev);
      if (currentUser) {
        const updatedUser = newState.users.find(u => u.id === currentUser.id);
        if (updatedUser && (updatedUser.settings.language !== currentUser.settings.language || updatedUser.settings.currency !== currentUser.settings.currency)) {
          setCurrentUser(updatedUser);
        }
      }
      return newState;
    });
  };

  const handleLogin = async (user: User) => {
    console.log('[App] handleLogin called with user:', user);
    setCurrentUser(user);

    // Load user data from Supabase if authenticated
    if (user.id && user.id !== 'admin-1') { // Skip for demo admin
      const userData = await storageService.loadUserData(user.id);
      if (userData) {
        setGlobalState(prev => ({
          ...prev,
          accounts: [...prev.accounts, ...userData.accounts],
          transactions: [...prev.transactions, ...userData.transactions],
          users: [...prev.users.filter(u => u.id !== user.id), user] // Update user data
        }));
      }
    } else {
      // For demo admin, ensure categories exist
      setGlobalState(prev => {
        const userHasCats = prev.categories.some(c => c.userId === user.id);
        if (!userHasCats) {
          return { ...prev, categories: [...prev.categories, ...createDefaultCategories(user.id)] };
        }
        return prev;
      });
    }

    if (user.role === 'ADMIN') {
      setActiveTab('user-management');
    } else {
      const firstPermitted = NAV_ITEMS.find(item => user.permissions[item.id as keyof UserPermissions]);
      if (firstPermitted) setActiveTab(firstPermitted.id);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('maestro_remembered_user_id');
    setActiveTab('dashboard');
    notify(t.common.logout, 'INFO');
  };

  const handleLanguageSwitch = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    if (currentUser) {
      updateScopedState(prev => ({
        ...prev,
        settings: { ...prev.settings, language: newLang }
      }));
    } else {
      updateGlobalState(prev => ({
        ...prev,
        globalSettings: { ...prev.globalSettings, language: newLang }
      }));
    }
  };

  const handleQuickAddTransaction = () => {
    if (!currentUser?.permissions.transactions) return;
    setOpenAddModalOnMount(true);
    setActiveTab('transactions');
  };

  const updateScopedState = (updater: (prev: any) => any) => {
    if (!currentUser) return;
    updateGlobalState(prev => {
      const currentUserData = {
        accounts: prev.accounts?.filter(a => a.userId === currentUser.id) || [],
        transactions: prev.transactions?.filter(t => t.userId === currentUser.id) || [],
        payables: prev.payables?.filter(p => p.userId === currentUser.id) || [],
        receivables: prev.receivables?.filter(r => r.userId === currentUser.id) || [],
        budgets: prev.budgets?.filter(b => b.userId === currentUser.id) || [],
        goals: prev.goals?.filter(g => g.userId === currentUser.id) || [],
        categories: prev.categories?.filter(c => c.userId === currentUser.id) || [],
        settings: currentUser.settings || { language: 'en', currency: 'USD' }
      };

      const result = updater(currentUserData);
      const injectUserId = (arr: any[]) => arr.map(item => ({ ...item, userId: currentUser.id }));

      return {
        ...prev,
        accounts: [...prev.accounts.filter(a => a.userId !== currentUser.id), ...injectUserId(result.accounts)],
        transactions: [...prev.transactions.filter(t => t.userId !== currentUser.id), ...injectUserId(result.transactions)],
        payables: [...prev.payables.filter(p => p.userId !== currentUser.id), ...injectUserId(result.payables)],
        receivables: [...prev.receivables.filter(r => r.userId !== currentUser.id), ...injectUserId(result.receivables)],
        budgets: [...prev.budgets.filter(b => b.userId !== currentUser.id), ...injectUserId(result.budgets)],
        goals: [...prev.goals.filter(g => g.userId !== currentUser.id), ...injectUserId(result.goals)],
        categories: [...prev.categories.filter(c => c.userId !== currentUser.id), ...injectUserId(result.categories)],
        users: prev.users.map(u => u.id === currentUser.id ? { ...u, settings: result.settings } : u)
      };
    });
  };

  if (!currentUser) {
    return (
      <Login 
        state={{ ...globalState, notify, requestConfirm } as any} 
        onLogin={handleLogin} 
        updateState={(updater: any) => {
           setGlobalState(prev => {
             const result = updater(prev);
             return { ...prev, globalSettings: result.settings ? { language: result.settings.language } : prev.globalSettings, users: result.users || prev.users };
           });
        }} 
      />
    );
  }

  const renderContent = () => {
    console.log('[App] renderContent called, scopedState:', scopedState);
    if (!scopedState) {
      console.log('[App] No scopedState, returning null');
      return null;
    }
    return (
      <div className="animate-soft">
        {(() => {
          switch (activeTab) {
            case 'dashboard': return <Dashboard state={scopedState as any} setActiveTab={setActiveTab} />;
            case 'accounts': return <Accounts state={scopedState as any} updateState={updateScopedState} />;
            case 'transactions': return (
              <Transactions 
                state={scopedState as any} 
                updateState={updateScopedState} 
                openAddModalOnMount={openAddModalOnMount} 
                onAddModalOpened={() => setOpenAddModalOnMount(false)}
              />
            );
            case 'obligations': return <Obligations state={scopedState as any} updateState={updateScopedState} />;
            case 'budgets': return <Budgets state={scopedState as any} updateState={updateScopedState} />;
            case 'goals': return <Goals state={scopedState as any} updateState={updateScopedState} />;
            case 'ai': return <AIInsights state={scopedState as any} />;
            case 'settings': return <SettingsView state={scopedState as any} updateState={updateScopedState} />;
            case 'user-management': return (
              <AdminUserManagement
                state={{ ...globalState, notify } as any}
                updateState={updateGlobalState}
              />
            );
            default: return <Dashboard state={scopedState as any} setActiveTab={setActiveTab} />;
          }
        })()}
      </div>
    );
  };

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) return currentUser.role === 'ADMIN';
    return currentUser.permissions[item.id as keyof UserPermissions];
  });

  return (
    <div className={`flex h-screen bg-[#fcfdfe] overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      {/* Toast Notifications */}
      <div className={`fixed z-[100] top-8 ${isRTL ? 'left-8' : 'right-8'} flex flex-col gap-3 w-80 pointer-events-none`}>
        {notifications.map(n => (
          <div key={n.id} className="pointer-events-auto animate-soft flex items-center gap-4 p-5 bg-white rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] border border-slate-100 ring-1 ring-black/5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              n.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
              n.type === 'ERROR' ? 'bg-rose-50 text-rose-600' :
              n.type === 'WARNING' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {n.type === 'SUCCESS' && <CheckCircle size={20} strokeWidth={2.5} />}
              {n.type === 'ERROR' && <AlertCircle size={20} strokeWidth={2.5} />}
              {n.type === 'WARNING' && <AlertTriangle size={20} strokeWidth={2.5} />}
              {n.type === 'INFO' && <Info size={20} strokeWidth={2.5} />}
            </div>
            <p className="text-[11px] font-black uppercase tracking-metadata leading-tight text-slate-900">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Global Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setConfirmModal(null)} />
          <div className="relative bg-white rounded-[3.5rem] shadow-2xl w-full max-w-md p-10 animate-soft">
            <div className="mb-10 text-center">
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl ${
                confirmModal.isDestructive ? 'bg-rose-600 shadow-rose-200' : 'bg-slate-900 shadow-slate-200'
              }`}>
                {confirmModal.isDestructive ? <AlertTriangle className="text-white" size={32} /> : <Info className="text-white" size={32} />}
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-orchestra mb-3">{confirmModal.title}</h3>
              <p className="text-sm font-bold text-slate-400 leading-relaxed px-4">{confirmModal.message}</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-5 bg-slate-50 text-slate-500 font-black uppercase tracking-metadata rounded-[1.5rem] hover:bg-slate-100 transition-all btn-interaction"
              >
                {t.common.cancel}
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`flex-1 py-5 text-white font-black uppercase tracking-metadata rounded-[1.5rem] shadow-2xl transition-all btn-interaction ${
                  confirmModal.isDestructive ? 'bg-rose-600 shadow-rose-200 hover:bg-rose-700' : 'bg-slate-900 shadow-slate-200 hover:bg-black'
                }`}
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/15 backdrop-blur-md z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-72 bg-white transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : (isRTL ? 'translate-x-full' : '-translate-x-full') + ' lg:translate-x-0'}
        border-r border-slate-100/50
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-4">
            <div className="bg-slate-900 p-2.5 rounded-[1.25rem] text-white shadow-xl shadow-slate-200">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 18L12 6L20 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 18H20" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="12" cy="11" r="2" fill="#6366f1" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 block leading-none tracking-orchestra">Maestro</span>
              <span className="text-[9px] font-black uppercase tracking-metadata text-slate-400">Orchestration</span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-1 custom-scrollbar">
            {filteredNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setOpenAddModalOnMount(false);
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold btn-interaction
                  ${activeTab === item.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50/50 hover:text-slate-900'}`}
              >
                {React.cloneElement(item.icon as React.ReactElement, { 
                  size: 18, strokeWidth: 2.5,
                  className: activeTab === item.id ? 'text-indigo-400' : 'text-slate-300' 
                })}
                {t.nav[item.id]}
              </button>
            ))}
          </nav>

          <div className="p-6 space-y-4">
            <div className="bg-indigo-600 rounded-[2.5rem] p-7 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-indigo-200" />
                  <span className="text-[10px] font-black uppercase tracking-metadata text-indigo-100">{t.common.aiInsight}</span>
                </div>
                <p className="text-xs text-indigo-50 font-semibold mb-5 leading-relaxed line-clamp-2">{t.dashboard.aiMessage}</p>
                <button 
                  onClick={() => currentUser.permissions.ai ? setActiveTab('ai') : null}
                  className="w-full py-3 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-metadata rounded-2xl transition-all shadow-lg btn-interaction"
                >
                  {t.nav.fullAnalysis}
                </button>
              </div>
            </div>

            <button onClick={handleLogout} className="w-full flex items-center gap-3.5 px-5 py-4 text-slate-400 font-bold hover:text-rose-600 hover:bg-rose-50/50 rounded-[1.5rem] transition-all btn-interaction">
              <LogOut size={18} strokeWidth={2.5} />
              {t.common.logout}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-24 glass sticky top-0 z-30 flex items-center justify-between px-8 lg:px-14 border-b border-slate-100/50">
          <div className="flex items-center gap-6">
            <button className="lg:hidden p-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors btn-interaction" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} strokeWidth={2.5} />
            </button>
            <h1 className="text-2xl font-black text-slate-900 tracking-orchestra">{t.nav[activeTab] || activeTab}</h1>
          </div>
          
          <div className="flex items-center gap-5">
            {currentUser.permissions.transactions && (
              <button className="hidden md:flex items-center gap-2.5 px-6 py-3 bg-slate-900 hover:bg-indigo-950 text-white rounded-[1.25rem] text-[11px] font-black uppercase tracking-metadata transition-all shadow-2xl shadow-slate-200 btn-interaction" onClick={handleQuickAddTransaction}>
                <Plus size={18} strokeWidth={3} /> {t.nav.addTransaction}
              </button>
            )}
            <button 
              onClick={handleLanguageSwitch}
              className="p-3 text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors btn-interaction flex items-center justify-center"
              title={t.common.language}
            >
              <Globe size={20} strokeWidth={2.5} />
            </button>
            <div className={`p-3 rounded-2xl flex items-center justify-center transition-colors ${
              isOnline ? 'text-emerald-500' : 'text-slate-300'
            }`}>
              {isOnline ? <Wifi size={20} strokeWidth={2.5} /> : <WifiOff size={20} strokeWidth={2.5} />}
            </div>
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-black text-slate-900 leading-none group-hover:text-indigo-600 transition-colors">{currentUser.username}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-metadata mt-1">{currentUser.role}</p>
              </div>
              <div className="w-12 h-12 rounded-[1.25rem] bg-white border border-slate-200 flex items-center justify-center text-slate-900 font-black text-sm hover-lift shadow-sm ring-4 ring-slate-50">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto p-8 lg:p-14">{renderContent()}</div>
          <div className="h-16" />
        </div>
        
        {currentUser.permissions.transactions && (
          <button className="md:hidden fixed bottom-8 right-8 w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl flex items-center justify-center z-40 btn-interaction ring-8 ring-slate-900/10" onClick={handleQuickAddTransaction}>
            <Plus size={28} strokeWidth={3} />
          </button>
        )}
      </main>
    </div>
  );
};

export default App;
