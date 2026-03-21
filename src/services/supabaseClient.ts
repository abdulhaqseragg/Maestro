/**
 * supabaseClient.ts — REPLACED BY apiClient.ts
 *
 * This file is kept as a compatibility shim to avoid breaking any
 * remaining imports. All actual functionality now lives in apiClient.ts.
 *
 * TODO: Once all components are updated, this file can be deleted.
 */

// Re-export a minimal no-op "supabase" object so existing imports
// don't crash before they're fully migrated.
export const supabase = {
  from: (_table: string) => ({
    select: (_cols?: string) => ({
      eq: (_col: string, _val: any) => ({
        single: async () => ({ data: null, error: new Error('Supabase removed — use apiClient') }),
        order:  (_col: string, _opts?: any) => ({ data: null, error: new Error('Supabase removed — use apiClient') }),
      }),
      order: (_col: string, _opts?: any) => Promise.resolve({ data: [], error: null }),
    }),
    insert: (_data: any) => ({
      select: () => ({
        single: async () => ({ data: null, error: new Error('Supabase removed — use apiClient') }),
      }),
    }),
    update: (_data: any) => ({
      eq: (_col: string, _val: any) => Promise.resolve({ data: null, error: null }),
    }),
    delete: () => ({
      eq: (_col: string, _val: any) => Promise.resolve({ data: null, error: null }),
    }),
  }),
  auth: {
    getUser:  async () => ({ data: { user: null }, error: null }),
    signUp:   async () => ({ data: null, error: new Error('Supabase Auth removed') }),
    signInWithPassword: async () => ({ data: null, error: new Error('Supabase Auth removed') }),
    signOut:  async () => ({ error: null }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    admin: {
      createUser:     async () => ({ data: null, error: new Error('Supabase Admin removed') }),
      updateUserById: async () => ({ data: null, error: new Error('Supabase Admin removed') }),
      deleteUser:     async () => ({ data: null, error: new Error('Supabase Admin removed') }),
    },
  },
};