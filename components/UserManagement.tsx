
import React, { useState, useMemo } from 'react';
import { User, FinanceState, UserPermissions } from '../types';
import { translations } from '../translations';
import { 
  UserPlus, Edit3, Trash2, X, Shield, 
  Calendar, Check, Search, Filter, 
  Settings2, UserCog, User as UserIcon,
  ShieldCheck, ShieldAlert
} from 'lucide-react';

interface UserManagementProps {
  state: FinanceState & { notify: (msg: string, type: any) => void, requestConfirm: (t: string, m: string, c: () => void, d?: boolean) => void };
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
  currentLang: string;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  dashboard: true,
  accounts: true,
  transactions: true,
  obligations: true,
  budgets: true,
  goals: true,
  ai: true,
  settings: true
};

const UserManagement: React.FC<UserManagementProps> = ({ state, updateState, currentLang }) => {
  const lang = currentLang;
  const t = translations[lang];
  const isRTL = lang === 'ar';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    email: '',
    password: '',
    role: 'USER',
    permissions: { ...DEFAULT_PERMISSIONS },
    expirationDate: '',
    settings: {
      currency: 'EGP',
      language: 'en'
    }
  });

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.users, searchTerm]);

  const handleSave = () => {
    if (!formData.username || !formData.email || (!editingUserId && !formData.password)) return;

    updateState(prev => {
      const userData: User = {
        id: editingUserId || crypto.randomUUID(),
        email: formData.email!,
        username: formData.username!,
        password: formData.password || prev.users.find(u => u.id === editingUserId)?.password,
        role: formData.role || 'USER',
        permissions: formData.permissions!,
        expirationDate: formData.expirationDate || undefined,
        settings: formData.settings || { currency: 'EGP', language: 'en' }
      };

      state.notify(editingUserId ? t.userManagement.userUpdated : t.userManagement.userAdded, 'SUCCESS');
      if (editingUserId) {
        return { ...prev, users: prev.users.map(u => u.id === editingUserId ? userData : u) };
      } else {
        return { ...prev, users: [...prev.users, userData] };
      }
    });

    setIsModalOpen(false);
    setEditingUserId(null);
    setFormData({ 
      username: '', 
      email: '', 
      password: '', 
      role: 'USER', 
      permissions: { ...DEFAULT_PERMISSIONS }, 
      expirationDate: '',
      settings: { currency: 'EGP', language: 'en' }
    });
  };

  const handleDelete = (id: string) => {
    const user = state.users.find(u => u.id === id);
    if (user?.role === 'ADMIN' && state.users.filter(u => u.role === 'ADMIN').length <= 1) {
      state.notify("Cannot delete the last administrator.", 'ERROR');
      return;
    }
    state.requestConfirm(
      t.common.delete,
      t.common.confirmDelete,
      () => {
        updateState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
        state.notify(t.userManagement.userDeleted, 'SUCCESS');
      },
      true
    );
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions!,
        [key]: !prev.permissions![key]
      }
    }));
  };

  const toggleAllPermissions = (val: boolean) => {
    const newPerms = { ...DEFAULT_PERMISSIONS };
    Object.keys(newPerms).forEach(k => {
      (newPerms as any)[k] = val;
    });
    setFormData(prev => ({ ...prev, permissions: newPerms }));
  };

  return (
    <div className="space-y-6 animate-soft">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-orchestra">{t.userManagement.title}</h2>
          <p className="text-sm text-slate-500 font-medium">{t.userManagement.subtitle}</p>
        </div>
        <button 
          onClick={() => {
            setEditingUserId(null);
            setFormData({ 
              username: '', 
              email: '', 
              password: '', 
              role: 'USER', 
              permissions: { ...DEFAULT_PERMISSIONS }, 
              expirationDate: '',
              settings: { currency: 'EGP', language: 'en' }
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-metadata hover:bg-black transition-all shadow-2xl shadow-slate-200 btn-interaction"
        >
          <UserPlus size={18} strokeWidth={2.5} />
          {t.userManagement.addUser}
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
          <input 
            type="text"
            placeholder={t.userManagement.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-slate-100 outline-none font-bold text-sm transition-all`}
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-metadata text-slate-400">
           <Filter size={14} />
           {state.users.length} {t.nav.userManagement}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-metadata ${isRTL ? 'text-right' : 'text-left'}`}>
                <th className="px-8 py-5">{t.common.name}</th>
                <th className="px-8 py-5">{t.common.role}</th>
                <th className="px-8 py-5">{t.common.expiration}</th>
                <th className="px-8 py-5">{t.common.status}</th>
                <th className={`px-8 py-5 ${isRTL ? 'text-left' : 'text-right'}`}>{t.common.edit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => {
                const isExpired = user.expirationDate && new Date(user.expirationDate) < new Date();
                const isAdmin = user.role === 'ADMIN';
                return (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${isAdmin ? 'bg-indigo-600' : 'bg-slate-100'} flex items-center justify-center text-white font-black text-sm shadow-sm`}>
                          {isAdmin ? <ShieldCheck size={20} /> : <UserIcon size={20} className="text-slate-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 tracking-tight">{user.username}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-metadata">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-metadata ${isAdmin ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                        {t.userManagement.roles[user.role]}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-500">
                      {user.expirationDate || t.userManagement.neverExpires}
                    </td>
                    <td className="px-8 py-5">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${isExpired ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-metadata">
                          {isExpired ? t.userManagement.expired : t.common.active}
                        </span>
                      </div>
                    </td>
                    <td className={`px-8 py-5`}>
                      <div className={`flex gap-1 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                        <button 
                          onClick={() => {
                            setEditingUserId(user.id);
                            setFormData({ ...user, password: '' });
                            setIsModalOpen(true);
                          }}
                          className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all btn-interaction shadow-sm border border-transparent hover:border-slate-100"
                        >
                          <Edit3 size={18} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-3 text-slate-300 hover:text-rose-600 hover:bg-white rounded-2xl transition-all btn-interaction shadow-sm border border-transparent hover:border-slate-100"
                        >
                          <Trash2 size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                       <UserCog size={64} strokeWidth={1} />
                       <p className="text-[10px] font-black text-slate-900 uppercase tracking-metadata">{t.common.noData}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-soft border border-slate-100">
            <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-metadata">
                  {editingUserId ? t.userManagement.editUser : t.userManagement.addUser}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-metadata mt-1">Configure profile & permissions</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-colors shadow-sm btn-interaction">
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-1">{t.auth.username}</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-slate-50 font-bold text-sm transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-1">{t.auth.email}</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-slate-50 font-bold text-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-1">{t.auth.password}</label>
                  <input 
                    type="password" 
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUserId ? "••••••••" : ""}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-slate-50 font-bold text-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-1">{t.common.expiration}</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={formData.expirationDate}
                      onChange={e => setFormData({ ...formData, expirationDate: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-slate-50 font-bold text-sm transition-all"
                    />
                    <Calendar className={`absolute ${isRTL ? 'left-5' : 'right-5'} top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none`} size={18} />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UserCog size={18} className="text-indigo-600" /> {t.common.role}
                </h4>
                <div className="flex gap-4 p-1 bg-slate-50 rounded-[1.5rem] w-fit">
                   <button 
                     onClick={() => setFormData({...formData, role: 'USER'})}
                     className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-metadata transition-all ${formData.role === 'USER' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {t.userManagement.roles.USER}
                   </button>
                   <button 
                     onClick={() => setFormData({...formData, role: 'ADMIN'})}
                     className={`px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-metadata transition-all ${formData.role === 'ADMIN' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {t.userManagement.roles.ADMIN}
                   </button>
                </div>
              </div>

              {/* User Settings */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Settings2 size={18} className="text-green-600" /> {t.settings.general}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-1">{t.common.language}</label>
                    <div className="flex gap-2 p-1 bg-slate-50 rounded-[1.5rem] w-fit">
                      <button 
                        onClick={() => setFormData({
                          ...formData, 
                          settings: { ...formData.settings!, language: 'en' }
                        })}
                        className={`px-4 py-2 rounded-[1rem] text-[10px] font-black uppercase tracking-metadata transition-all ${
                          formData.settings?.language === 'en' 
                            ? 'bg-white text-slate-900 shadow-lg' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {t.settings.langName}
                      </button>
                      <button 
                        onClick={() => setFormData({
                          ...formData, 
                          settings: { ...formData.settings!, language: 'ar' }
                        })}
                        className={`px-4 py-2 rounded-[1rem] text-[10px] font-black uppercase tracking-metadata transition-all ${
                          formData.settings?.language === 'ar' 
                            ? 'bg-white text-slate-900 shadow-lg' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {t.settings.arName}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-metadata px-1">{t.common.currency}</label>
                    <select 
                      value={formData.settings?.currency || 'EGP'}
                      onChange={e => setFormData({
                        ...formData, 
                        settings: { ...formData.settings!, currency: e.target.value }
                      })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-slate-50 font-bold text-sm transition-all"
                    >
                      <option value="EGP">{t.settings.currencies.EGP}</option>
                      <option value="SAR">{t.settings.currencies.SAR}</option>
                      <option value="USD">{t.settings.currencies.USD}</option>
                      <option value="EUR">{t.settings.currencies.EUR}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Permissions Control */}
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Shield size={18} className="text-blue-600" /> {t.userManagement.grantAccess}
                  </h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleAllPermissions(true)}
                      className="text-[9px] font-black uppercase tracking-metadata text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {t.userManagement.selectAll}
                    </button>
                    <span className="text-slate-200">|</span>
                    <button 
                      onClick={() => toggleAllPermissions(false)}
                      className="text-[9px] font-black uppercase tracking-metadata text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {t.userManagement.clearAll}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(formData.permissions!).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => togglePermission(key as keyof UserPermissions)}
                      className={`px-4 py-4 rounded-[1.5rem] border text-[10px] font-black uppercase tracking-metadata transition-all flex items-center justify-between group btn-interaction ${
                        value 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="truncate">{t.nav[key]}</span>
                      {value && <Check size={16} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50/50 flex gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-5 bg-white border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-metadata rounded-[1.5rem] hover:bg-slate-50 transition-all btn-interaction"
              >
                {t.common.cancel}
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 px-4 py-5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-metadata rounded-[1.5rem] hover:bg-black transition-all shadow-2xl shadow-slate-200 btn-interaction"
              >
                {editingUserId ? t.common.save : t.common.add}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
