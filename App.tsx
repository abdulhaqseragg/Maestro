
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { storageService } from './src/services/storageService';
import { authService } from './src/services/authService';
import { NAV_ITEMS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './constants';
import Dashboard from './components/Dashboard';
import Accounts from './components/Accounts';
import Transactions from './components/Transactions';
import Obligations from './components/Obligations';
import Budgets from './components/Budgets';
import Goals from './components/Goals';
import Login from './components/Login';
import PinEntry from './components/PinEntry';
import SettingsView from './components/SettingsView';
import AdminUserManagement from './components/AdminUserManagement';
import FinancialAdvisorDrawer from './components/FinancialAdvisorDrawer';
import { Menu, X, Plus, Sparkles, LogOut, ShieldCheck, CheckCircle, AlertCircle, Info, AlertTriangle, Languages, Globe, Wifi, WifiOff, Eye, EyeOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { translations } from './translations';

const INITIAL_PERMISSIONS: UserPermissions = {
  dashboard: true,
  accounts: true,
  transactions: true,
  obligations: true,
  budgets: true,
  goals: true,
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
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [openAddModalOnMount, setOpenAddModalOnMount] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ pending: 0, isSyncing: false });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Sync Status Polling ──────────────────────────────
  useEffect(() => {
    const checkSync = async () => {
      const status = await storageService.getSyncStatus();
      setSyncStatus({ pending: status.pending, isSyncing: status.isSyncing });
    };

    const interval = setInterval(checkSync, 3000);
    return () => {
      clearInterval(interval);
    };
  }, []);

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

  // ── Session Timeout (5 mins) ─────────────────────────
  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (currentUser && currentUser.role !== 'ADMIN' && currentUser.settings?.isPinEnabled) {
      timeoutRef.current = setTimeout(() => {
        setIsPinVerified(false);
        notify(currentLang === 'ar' ? 'انتهت الجلسة، يرجى إدخال الرمز السري' : 'Session timed out, please enter PIN', 'INFO');
      }, 5 * 60 * 1000); // 5 minutes
    }
  };

  useEffect(() => {
    if (currentUser && needsPin) {
      window.addEventListener('mousemove', resetTimeout);
      window.addEventListener('keypress', resetTimeout);
      window.addEventListener('click', resetTimeout);
      window.addEventListener('scroll', resetTimeout);
      resetTimeout();
    }
    return () => {
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keypress', resetTimeout);
      window.removeEventListener('click', resetTimeout);
      window.removeEventListener('scroll', resetTimeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentUser, needsPin, currentLang]);

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
      role: currentUser.role,
      globalSettings: globalState.globalSettings,
      notify,
      requestConfirm
    };
    console.log('[App] scopedState created:', state);
    return state;
  }, [globalState, currentUser, notify, requestConfirm]);

  useEffect(() => {
    const initData = async () => {
      // ── Load all local data first ────────────────────────
      const saved = await storageService.load();
      if (saved) {
        setGlobalState(prev => ({ 
          ...prev, 
          ...saved,
          users: saved.users && saved.users.length > 0 ? saved.users : INITIAL_USERS
        }));
      }

      // ── Restore session ──────────────────────────────────
      try {
        const { data: { user: authUser } } = await authService.getCurrentUser();
        if (authUser) {
          // Map auth user to app User type
          const appUser: User = {
            id:             authUser.id,
            email:          authUser.email,
            username:       authUser.username || authUser.email.split('@')[0],
            password:       authUser.password || '',
            role:           authUser.role as any,
            permissions:    authUser.permissions || {} as any,
            settings:       authUser.settings    || { currency: 'EGP', language: 'en' },
            expirationDate: authUser.expirationDate || (authUser as any).expiration_date,
          };

          handleLogin(appUser);
        }
      } catch {
        // No valid session
      }

      setIsLoaded(true);
    };

    initData();

    // ── Listen for JWT expiry from apiClient ─────────────
    const onSessionExpired = () => {
      setCurrentUser(null);
      setActiveTab('dashboard');
      notify('Session expired. Please sign in again.', 'WARNING');
    };
    window.addEventListener('maestro:session-expired', onSessionExpired);
    
    // Listen for Settings navigation from AI Insights
    const onOpenSettings = () => setActiveTab('settings');
    const onOpenTab = (e: any) => setActiveTab(e.detail);
    
    window.addEventListener('maestro:open-settings', onOpenSettings);
    window.addEventListener('maestro:open-tab', onOpenTab);

    return () => {
      window.removeEventListener('maestro:session-expired', onSessionExpired);
      window.removeEventListener('maestro:open-settings', onOpenSettings);
      window.removeEventListener('maestro:open-tab', onOpenTab);
    };
  }, []);

  useEffect(() => {
    if (isLoaded) storageService.save(globalState);
  }, [globalState, isLoaded]);

  useEffect(() => {
    if (currentUser) {
      authService.updateSession(currentUser);
    }
  }, [currentUser]);

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
      console.log('[App] updateGlobalState: newState users count:', newState.users.length);
      if (currentUser) {
        const updatedUser = newState.users.find(u => u.id === currentUser.id);
        if (updatedUser) {
          // Sync settings to currentUser state if they changed
          if (JSON.stringify(updatedUser.settings) !== JSON.stringify(currentUser.settings)) {
            console.log('[App] Syncing updated user settings to currentUser');
            setCurrentUser(updatedUser);
          }
        }
      }
      return newState;
    });
  };

  const handleLogin = async (user: User) => {
    console.log('[App] handleLogin called with user:', user);
    setCurrentUser(user);

    // ── Check if PIN is required ────────────────────────
    if (user.role !== 'ADMIN' && user.settings?.isPinEnabled && user.settings?.pin) {
      setNeedsPin(true);
      setIsPinVerified(false);
    } else {
      setNeedsPin(false);
      setIsPinVerified(true);
    }

    // Merge state with any existing data in storage
    const userData = await storageService.loadUserData(user.id);
    setGlobalState(prev => {
      const mergedState = userData ? { ...prev, ...userData } : prev;
      
      // Ensure the user is in the users list
      const userExists = mergedState.users.some(u => u.id === user.id);
      const updatedUsers = userExists 
        ? mergedState.users.map(u => u.id === user.id ? user : u)
        : [...mergedState.users, user];

      // Ensure the user has default categories
      const userHasCats = mergedState.categories.some(c => c.userId === user.id);
      const updatedCategories = userHasCats 
        ? mergedState.categories 
        : [...mergedState.categories, ...createDefaultCategories(user.id)];

      return {
        ...mergedState,
        users: updatedUsers,
        categories: updatedCategories
      };
    });

    if (user.role === 'ADMIN') {
      setActiveTab('user-management');
    } else {
      const firstPermitted = NAV_ITEMS.find(item => user.permissions[item.id as keyof UserPermissions]);
      if (firstPermitted) setActiveTab(firstPermitted.id);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    setCurrentUser(null);
    setIsPinVerified(false);
    setNeedsPin(false);
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

  const handlePrivacyToggle = () => {
    if (!currentUser) return;
    updateScopedState(prev => ({
      ...prev,
      settings: { ...prev.settings, isPrivacyMode: !prev.settings.isPrivacyMode }
    }));
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

      // Update local currentUser state to reflect changes immediately
      const updatedUser = { ...currentUser, settings: result.settings };
      setCurrentUser(updatedUser);
      authService.updateSession(updatedUser);

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

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fcfdfe]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login 
        state={{ ...globalState, notify } as any}
        onLogin={handleLogin}
        updateState={updateGlobalState} 
      />
    );
  }

  if (needsPin && !isPinVerified) {
    return (
      <PinEntry 
        correctPin={currentUser.settings.pin!} 
        onSuccess={() => setIsPinVerified(true)} 
        onCancel={handleLogout}
        lang={currentLang}
      />
    );
  }

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) return currentUser.role === 'ADMIN';
    return currentUser.permissions[item.id as keyof UserPermissions];
  });

  const bottomNavItems = filteredNavItems.filter(item => 
    ['dashboard', 'accounts', 'transactions', 'obligations', 'settings'].includes(item.id)
  );

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
            <button 
              onClick={handlePrivacyToggle}
              className={`p-3 rounded-2xl transition-colors btn-interaction flex items-center justify-center ${
                currentUser?.settings?.isPrivacyMode ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'
              }`}
              title={currentUser?.settings?.isPrivacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
            >
              {currentUser?.settings?.isPrivacyMode ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
            </button>

            {/* Sync Indicator */}
            <div 
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-500 ${
                syncStatus.isSyncing ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                syncStatus.pending > 0 ? 'bg-amber-50 border-amber-100 text-amber-600' :
                'bg-slate-50 border-slate-100 text-slate-400'
              }`}
              title={syncStatus.isSyncing ? 'Syncing...' : `${syncStatus.pending} pending operations`}
            >
              {syncStatus.isSyncing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : syncStatus.pending > 0 ? (
                <CloudOff size={16} />
              ) : (
                <Cloud size={16} />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
                {syncStatus.isSyncing ? 'Syncing' : syncStatus.pending > 0 ? `${syncStatus.pending} Pending` : 'Synced'}
              </span>
            </div>

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
          <div className="max-w-7xl mx-auto p-4 sm:p-8 lg:p-14">{renderContent()}</div>
          <div className="h-24 lg:h-16" />
        </div>
        
        {/* Bottom Navigation (Mobile Only) */}
        <nav className="lg:hidden fixed bottom-6 left-6 right-6 bg-white/85 backdrop-blur-2xl border border-white shadow-[0_20px_40px_-15px_rgba(49,46,129,0.15)] ring-1 ring-slate-900/5 px-2 py-3 flex items-center justify-around z-50 rounded-[2rem]">
          {bottomNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setOpenAddModalOnMount(false);
                setActiveTab(item.id);
                // Haptic feedback simulation
                if ('vibrate' in navigator) navigator.vibrate(5);
              }}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-500 min-w-[64px] relative
                ${activeTab === item.id ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <div className={`p-2.5 rounded-xl transition-all duration-500 relative ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 -translate-y-2' : ''}`}>
                {React.cloneElement(item.icon as React.ReactElement, { 
                  size: 20, 
                  strokeWidth: activeTab === item.id ? 2.5 : 2,
                })}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === item.id ? 'opacity-100 translate-y-0' : 'opacity-70'}`}>{t.nav[item.id]}</span>
            </button>
          ))}
        </nav>
        
        {currentUser.permissions.transactions && (
          <button className={`md:hidden fixed bottom-24 ${isRTL ? 'right-6' : 'right-6'} w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center z-40 btn-interaction ring-8 ring-slate-900/10 active:scale-90`} onClick={handleQuickAddTransaction}>
            <Plus size={24} strokeWidth={3} />
          </button>
        )}

        {/* AI Advisor FAB */}
        {scopedState && (
          <>
            <button 
              onClick={() => setIsAdvisorOpen(true)}
              className={`fixed z-[45] w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl shadow-indigo-500/30 flex items-center justify-center btn-interaction ring-4 ring-indigo-50 hover:scale-110 transition-all ${isRTL ? 'left-6 md:left-8' : 'left-6 md:right-8'} bottom-24 md:bottom-8`}
              title={isRTL ? 'المستشار المالي' : 'Financial Advisor'}
            >
              <Sparkles size={24} className="animate-pulse" />
            </button>

            <FinancialAdvisorDrawer 
              isOpen={isAdvisorOpen} 
              onClose={() => setIsAdvisorOpen(false)} 
              state={scopedState} 
            />
          </>
        )}
      </main>
    </div>
  );
};

export default App;
