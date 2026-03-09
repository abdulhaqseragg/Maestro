import React, { useState, useEffect } from 'react';
import { User, FinanceState } from '../types';
import { translations } from '../translations';
import { authService } from '../src/services/authService';
import { supabase } from '../src/services/supabaseClient';

interface LoginProps {
  state: FinanceState & { notify: (msg: string, type: any) => void };
  onLogin: (user: User) => void;
  updateState: (updater: (prev: FinanceState) => FinanceState) => void;
}

const Login: React.FC<LoginProps> = ({ state, onLogin, updateState }) => {
  const lang = state.globalSettings?.language || 'en';
  const t = translations[lang];

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await authService.getCurrentUser();
      if (user) {
        console.log('[LoginSaaS] Found existing user:', user);
        // Load user data from Supabase
        let { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') { // User not found
          console.log('[LoginSaaS] User not found in users table, creating...');
          // Create user record if it doesn't exist
          const { data: newUserData, error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
              role: 'USER' // Default role, can be changed later by admin
            })
            .select()
            .single();

          if (insertError) {
            console.error('[LoginSaaS] Error creating user record:', insertError);
            setError('Failed to create user profile');
            return;
          }

          userData = newUserData;
        } else if (error) {
          console.error('[LoginSaaS] Error loading user data:', error);
          setError('Failed to load user data');
          return;
        }

        if (userData) {
          console.log('[LoginSaaS] User data loaded:', userData);
          onLogin(userData);
        } else {
          console.error('[LoginSaaS] No user data found');
          setError('User data not found');
        }
      }
    };
    checkUser();

    // Listen to auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log('[LoginSaaS] Auth state change:', event, session?.user?.id);
      if (event === 'SIGNED_IN' && session?.user) {
        // First, try to get user data from users table
        let { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code === 'PGRST116') { // User not found
          console.log('[LoginSaaS] User not found in users table, creating...');
          // Create user record if it doesn't exist
          const { data: newUserData, error: insertError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email,
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
              role: 'USER' // Default role, can be changed later by admin
            })
            .select()
            .single();

          if (insertError) {
            console.error('[LoginSaaS] Error creating user record:', insertError);
            setError('Failed to create user profile');
            return;
          }

          userData = newUserData;
        } else if (error) {
          console.error('[LoginSaaS] Error loading user data on sign in:', error);
          setError('Failed to load user data');
          return;
        }

        if (userData) {
          console.log('[LoginSaaS] User signed in, data loaded:', userData);
          onLogin(userData);
        } else {
          console.error('[LoginSaaS] No user data found on sign in');
          setError('User data not found');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [onLogin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.signIn(formData.email, formData.password);
      // onLogin will be called via auth state change
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Sign In
          </h2>
          <p className="text-gray-600">
            Welcome back to Maestro
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Contact your administrator to create an account
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;