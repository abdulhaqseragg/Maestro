import React, { useState, useEffect } from 'react';
import { User, FinanceState } from '../types';
import { translations } from '../translations';
import { authService } from '../src/services/authService';
import { supabase } from '../src/services/supabaseClient';
import { Plus, Users, Trash2, UserCheck, UserX, Shield, ShieldCheck } from 'lucide-react';

interface AdminUserManagementProps {
  state: FinanceState & { notify: (msg: string, type: any) => void };
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

interface UserWithRole extends User {
  role: string;
  created_at: string;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ state, updateState }) => {
  const lang = state.globalSettings?.language || 'en';
  const t = translations[lang];

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    username: '',
    role: 'USER'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      state.notify(`Failed to load users: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Create user in Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        user_metadata: {
          username: newUser.username
        },
        email_confirm: true // Auto-confirm email
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        // If admin API fails, try regular signup (for development)
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: newUser.email,
          password: newUser.password,
          options: {
            data: {
              username: newUser.username
            }
          }
        });

        if (signupError) throw signupError;

        // For regular signup, we'll need to manually create the user record
        // and set the role later
        state.notify('User created successfully. They will need to verify their email before logging in.', 'success');
        setNewUser({ email: '', password: '', username: '', role: 'USER' });
        setShowCreateForm(false);
        loadUsers();
        return;
      }

      // Create user record in our users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role
        });

      if (userError) throw userError;

      state.notify('User created successfully', 'success');
      setNewUser({ email: '', password: '', username: '', role: 'USER' });
      setShowCreateForm(false);
      loadUsers();
    } catch (error: any) {
      console.error('User creation error:', error);
      state.notify(`Failed to create user: ${error.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';

      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      state.notify(`User role updated to ${newRole}`, 'success');
      loadUsers();
    } catch (error: any) {
      state.notify(`Failed to update user: ${error.message}`, 'error');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from our users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) throw userError;

      // Delete from Supabase Auth (this requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.warn('Could not delete from auth, but user record removed:', authError);
      }

      state.notify('User deleted successfully', 'success');
      loadUsers();
    } catch (error: any) {
      state.notify(`Failed to delete user: ${error.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Create User
        </button>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New User</h2>
            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Users ({users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          user.role === 'ADMIN' ? 'bg-purple-500' : 'bg-indigo-500'
                        }`}>
                          <span className="text-white font-medium text-sm">
                            {user.role === 'ADMIN' ? <Shield size={16} /> : user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username || 'No username'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'ADMIN' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.role)}
                        className={`p-1 rounded ${
                          user.role === 'ADMIN'
                            ? 'text-purple-600 hover:bg-purple-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                      >
                        {user.role === 'ADMIN' ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManagement;