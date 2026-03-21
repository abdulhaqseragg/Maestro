import React, { useState, useEffect } from 'react';
import { User, FinanceState } from '../types';
import { translations } from '../translations';
import { apiClient } from '../src/services/apiClient';
import {
  Plus, Users, Trash2, UserCheck, UserX, Shield, Edit2,
  Key, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';

interface AdminUserManagementProps {
  state: FinanceState & { notify: (msg: string, type: any) => void };
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

interface ManagedUser {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  permissions: Record<string, boolean>;
  settings: { currency: string; language: string };
  expiration_date: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_PERMISSIONS = {
  dashboard: true, accounts: true, transactions: true,
  obligations: true, budgets: true, goals: true, ai: true, settings: true,
};

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ state }) => {
  const lang = state.globalSettings?.language || 'en';
  const t = translations[lang];

  const [users, setUsers]               = useState<ManagedUser[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showCreateForm, setShowCreate] = useState(false);
  const [editingUser, setEditingUser]   = useState<ManagedUser | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  const [newUser, setNewUser] = useState({
    email: '', password: '', username: '', role: 'USER',
    expirationDate: '', permissions: { ...DEFAULT_PERMISSIONS },
  });

  const [editForm, setEditForm] = useState({
    username: '', role: 'USER', password: '',
    expirationDate: '', isActive: true,
    permissions: { ...DEFAULT_PERMISSIONS },
  });

  // ─── Load users ──────────────────────────────────────────────
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<{ users: ManagedUser[] }>('/users');
      setUsers(data.users || []);
    } catch (err: any) {
      state.notify(`Failed to load users: ${err.message}`, 'ERROR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // ─── Create user ─────────────────────────────────────────────
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/users', {
        email:          newUser.email,
        password:       newUser.password,
        username:       newUser.username,
        role:           newUser.role,
        expirationDate: newUser.expirationDate || null,
        permissions:    newUser.permissions,
      });
      state.notify('User created successfully', 'SUCCESS');
      setNewUser({ email: '', password: '', username: '', role: 'USER', expirationDate: '', permissions: { ...DEFAULT_PERMISSIONS } });
      setShowCreate(false);
      loadUsers();
    } catch (err: any) {
      state.notify(`Failed to create user: ${err.message}`, 'ERROR');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Update user ─────────────────────────────────────────────
  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/users/${editingUser.id}`, {
        username:       editForm.username,
        role:           editForm.role,
        password:       editForm.password || undefined,
        expirationDate: editForm.expirationDate || null,
        isActive:       editForm.isActive,
        permissions:    editForm.permissions,
      });
      state.notify('User updated successfully', 'SUCCESS');
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      state.notify(`Failed to update user: ${err.message}`, 'ERROR');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Toggle role ─────────────────────────────────────────────
  const toggleRole = async (user: ManagedUser) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await apiClient.put(`/users/${user.id}`, { role: newRole });
      state.notify(`Role updated to ${newRole}`, 'SUCCESS');
      loadUsers();
    } catch (err: any) {
      state.notify(`Failed to update role: ${err.message}`, 'ERROR');
    }
  };

  // ─── Delete user ─────────────────────────────────────────────
  const deleteUser = async (user: ManagedUser) => {
    if (!confirm(`Delete user "${user.username || user.email}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/users/${user.id}`);
      state.notify('User deleted', 'SUCCESS');
      loadUsers();
    } catch (err: any) {
      state.notify(`Failed to delete user: ${err.message}`, 'ERROR');
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────
  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : '—';

  const isExpired = (d: string | null) =>
    d ? new Date(d) < new Date() : false;

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900">User Management</h2>
          <p className="text-sm font-bold text-slate-400 mt-1">Manage accounts and permissions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadUsers}
            className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-950 transition-all shadow-xl shadow-slate-200"
          >
            <Plus size={18} strokeWidth={3} /> Create User
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3">
          <Users size={18} className="text-slate-400" strokeWidth={2.5} />
          <span className="font-black text-slate-900">
            {loading ? 'Loading...' : `${users.length} User${users.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Users size={40} strokeWidth={1.5} className="mb-3" />
            <p className="font-bold text-sm">No users yet</p>
            <p className="text-xs mt-1">Create your first user above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['User', 'Role', 'Status', 'Expires', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* User info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white ${user.role === 'ADMIN' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                          {user.role === 'ADMIN'
                            ? <Shield size={16} strokeWidth={2.5} />
                            : (user.username?.charAt(0) || user.email.charAt(0)).toUpperCase()
                          }
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{user.username || '—'}</p>
                          <p className="text-xs font-semibold text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        user.role === 'ADMIN'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${user.is_active ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {user.is_active
                          ? <><CheckCircle size={13} strokeWidth={2.5} /> Active</>
                          : <><XCircle  size={13} strokeWidth={2.5} /> Inactive</>
                        }
                      </span>
                    </td>

                    {/* Expires */}
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${isExpired(user.expiration_date) ? 'text-rose-500' : 'text-slate-400'}`}>
                        {user.expiration_date ? formatDate(user.expiration_date) : 'Never'}
                        {isExpired(user.expiration_date) && ' (Expired)'}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-400">
                        {formatDate(user.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {/* Toggle role */}
                        <button
                          onClick={() => toggleRole(user)}
                          className={`p-2 rounded-xl transition-colors ${
                            user.role === 'ADMIN'
                              ? 'text-indigo-600 hover:bg-indigo-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                        >
                          {user.role === 'ADMIN' ? <UserX size={15} strokeWidth={2.5} /> : <UserCheck size={15} strokeWidth={2.5} />}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditForm({
                              username:       user.username || '',
                              role:           user.role,
                              password:       '',
                              expirationDate: user.expiration_date ? user.expiration_date.split('T')[0] : '',
                              isActive:       user.is_active,
                              permissions:    user.permissions || { ...DEFAULT_PERMISSIONS },
                            });
                          }}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} strokeWidth={2.5} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => deleteUser(user)}
                          className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────────── */}
      {showCreateForm && (
        <Modal title="Create New User" onClose={() => setShowCreate(false)}>
          <form onSubmit={createUser} className="space-y-5">
            <Field label="Email">
              <input type="email" required autoFocus
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                className={inputCls} placeholder="user@example.com"
              />
            </Field>
            <Field label="Username">
              <input type="text" required
                value={newUser.username}
                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                className={inputCls} placeholder="username"
              />
            </Field>
            <Field label="Password">
              <input type="password" required minLength={6}
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                className={inputCls} placeholder="Min. 6 characters"
              />
            </Field>
            <Field label="Role">
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className={inputCls}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
            <Field label="Expiration Date (Optional)">
              <input type="date"
                value={newUser.expirationDate}
                onChange={e => setNewUser({ ...newUser, expirationDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <PermissionsGrid
              permissions={newUser.permissions}
              onChange={p => setNewUser({ ...newUser, permissions: p })}
            />
            <ModalActions onCancel={() => setShowCreate(false)} submitLabel="Create User" loading={submitting} />
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ───────────────────────────────────────── */}
      {editingUser && (
        <Modal title={`Edit — ${editingUser.username || editingUser.email}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={updateUser} className="space-y-5">
            <Field label="Email (readonly)">
              <input type="email" disabled value={editingUser.email} className={`${inputCls} opacity-60 cursor-not-allowed`} />
            </Field>
            <Field label="Username">
              <input type="text" required
                value={editForm.username}
                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="New Password">
              <input type="password" minLength={6}
                value={editForm.password}
                onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                className={inputCls} placeholder="Leave blank to keep unchanged"
              />
            </Field>
            <Field label="Role">
              <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className={inputCls}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
            <Field label="Expiration Date (Optional)">
              <input type="date"
                value={editForm.expirationDate}
                onChange={e => setEditForm({ ...editForm, expirationDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-sm font-bold text-slate-700">Active Account</span>
              </label>
            </div>
            <PermissionsGrid
              permissions={editForm.permissions}
              onChange={p => setEditForm({ ...editForm, permissions: p })}
            />
            <ModalActions onCancel={() => setEditingUser(null)} submitLabel="Save Changes" loading={submitting} />
          </form>
        </Modal>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const inputCls = "w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition-colors";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</label>
    {children}
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md" onClick={onClose} />
    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-black text-slate-900 mb-6">{title}</h3>
      {children}
    </div>
  </div>
);

const ModalActions: React.FC<{ onCancel: () => void; submitLabel: string; loading: boolean }> = ({ onCancel, submitLabel, loading }) => (
  <div className="flex gap-3 pt-2">
    <button type="button" onClick={onCancel}
      className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-200 transition-colors">
      Cancel
    </button>
    <button type="submit" disabled={loading}
      className="flex-1 py-3.5 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-indigo-950 transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Saving...
        </span>
      ) : submitLabel}
    </button>
  </div>
);

const PERMISSION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', accounts: 'Accounts', transactions: 'Transactions',
  obligations: 'Obligations', budgets: 'Budgets', goals: 'Goals',
  ai: 'AI Insights', settings: 'Settings',
};

const PermissionsGrid: React.FC<{
  permissions: Record<string, boolean>;
  onChange: (p: Record<string, boolean>) => void;
}> = ({ permissions, onChange }) => (
  <div>
    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Permissions</label>
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
        <label key={key} className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            checked={permissions[key] ?? true}
            onChange={e => onChange({ ...permissions, [key]: e.target.checked })}
            className="w-4 h-4 rounded accent-indigo-600"
          />
          <span className="text-xs font-bold text-slate-700">{label}</span>
        </label>
      ))}
    </div>
  </div>
);

export default AdminUserManagement;