import React, { useState, useMemo } from 'react';
import { User, FinanceState, UserPermissions } from '../types';
import { translations } from '../translations';
import {
  Plus, Users, Trash2, UserCheck, UserX, Shield, Edit2,
  Key, CheckCircle, XCircle, RefreshCw, X, Search
} from 'lucide-react';

interface AdminUserManagementProps {
  state: FinanceState & { notify: (msg: string, type: any) => void };
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  dashboard: true, accounts: true, transactions: true,
  obligations: true, budgets: true, goals: true, ai: true, settings: true,
};

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ state, updateState }) => {
  const lang = state.globalSettings?.language || 'en';
  const t = translations[lang];

  const [showCreateForm, setShowCreate] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<User>>({
    email: '', password: '', username: '', role: 'USER',
    expirationDate: '', permissions: { ...DEFAULT_PERMISSIONS },
    settings: { currency: 'EGP', language: 'en' }
  });

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.users, searchTerm]);

  const handleSave = () => {
    if (!formData.email || (!editingUserId && !formData.password)) return;

    updateState(prev => {
      const userData: User = {
        id: editingUserId || crypto.randomUUID(),
        email: formData.email!,
        username: formData.username || formData.email!.split('@')[0],
        password: formData.password || prev.users.find(u => u.id === editingUserId)?.password || '',
        role: formData.role || 'USER',
        permissions: formData.permissions || { ...DEFAULT_PERMISSIONS },
        expirationDate: formData.expirationDate || undefined,
        settings: formData.settings || { currency: 'EGP', language: 'en' }
      };

      state.notify(editingUserId ? 'User updated successfully' : 'User created successfully', 'SUCCESS');
      
      if (editingUserId) {
        return { ...prev, users: prev.users.map(u => u.id === editingUserId ? userData : u) };
      } else {
        if (prev.users.some(u => u.email === formData.email)) {
          state.notify('User already exists', 'ERROR');
          return prev;
        }
        return { ...prev, users: [...prev.users, userData] };
      }
    });

    setShowCreate(false);
    setEditingUserId(null);
    setFormData({ 
      email: '', password: '', username: '', role: 'USER', 
      expirationDate: '', permissions: { ...DEFAULT_PERMISSIONS },
      settings: { currency: 'EGP', language: 'en' }
    });
  };

  const handleDelete = (id: string) => {
    if (state.users.find(u => u.id === id)?.role === 'ADMIN' && state.users.filter(u => u.role === 'ADMIN').length <= 1) {
      state.notify("Cannot delete the last administrator.", 'ERROR');
      return;
    }

    if (confirm('Are you sure you want to delete this user?')) {
      updateState(prev => ({
        ...prev,
        users: prev.users.filter(u => u.id !== id)
      }));
      state.notify('User deleted', 'SUCCESS');
    }
  };

  const openEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({ ...user, password: '' }); // Don't show password in form
    setShowCreate(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-orchestra">User Management</h2>
          <p className="text-sm font-bold text-slate-400">Manage local system users and permissions</p>
        </div>
        <button 
          onClick={() => {
            setEditingUserId(null);
            setFormData({ email: '', password: '', username: '', role: 'USER', expirationDate: '', permissions: { ...DEFAULT_PERMISSIONS } });
            setShowCreate(true);
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-metadata shadow-xl hover:bg-black transition-all"
        >
          <Plus size={18} /> Add New User
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900/5 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-xs">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{user.username}</p>
                        <p className="text-[10px] font-bold text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-metadata ${
                      user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs">
                      <CheckCircle size={14} /> Active
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(user)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-soft">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900 tracking-orchestra">
                {editingUserId ? 'Edit User' : 'Create User'}
              </h3>
              <button onClick={() => setShowCreate(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-slate-900/5"
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Username</label>
                  <input 
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-slate-900/5"
                    placeholder="john_doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Password {editingUserId && '(leave blank to keep current)'}</label>
                  <input 
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-slate-900/5"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Role</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-slate-900/5"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 block">Permissions</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(DEFAULT_PERMISSIONS).map(perm => (
                    <label key={perm} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox"
                        checked={formData.permissions?.[perm as keyof UserPermissions] ?? true}
                        onChange={e => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions as UserPermissions,
                            [perm]: e.target.checked
                          }
                        })}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span className="text-[11px] font-black uppercase tracking-metadata text-slate-600">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex gap-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-4 text-slate-500 font-black uppercase tracking-metadata rounded-2xl hover:bg-slate-100 transition-all">
                Cancel
              </button>
              <button onClick={handleSave} className="flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-metadata rounded-2xl shadow-xl hover:bg-black transition-all">
                {editingUserId ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
