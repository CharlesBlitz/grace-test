'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

export type AdminRole = 'super_admin' | 'support_staff' | 'billing_admin' | 'read_only_auditor';

export interface AdminUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AdminRole;
  is_active: boolean;
  last_login_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminAuthContextType {
  user: User | null;
  adminProfile: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canManageUsers: boolean;
  canManageTickets: boolean;
  canManageBilling: boolean;
  canViewAuditLogs: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAdminProfile: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadAdminProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAdminProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkAdmin() {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await loadAdminProfile(session.user);
      }
    } catch (error) {
      console.error('Error checking admin session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAdminProfile(authUser: User) {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading admin profile:', error);
        setUser(null);
        setAdminProfile(null);
        return;
      }

      if (data) {
        setUser(authUser);
        setAdminProfile(data as AdminUser);

        // Update last login
        await supabase
          .from('admin_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.id);
      } else {
        // User is authenticated but not an admin
        setUser(null);
        setAdminProfile(null);
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Error loading admin profile:', error);
      setUser(null);
      setAdminProfile(null);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        await loadAdminProfile(data.user);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAdminProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  async function refreshAdminProfile() {
    if (user) {
      await loadAdminProfile(user);
    }
  }

  // Permission checks
  const isAdmin = !!adminProfile && adminProfile.is_active;
  const isSuperAdmin = isAdmin && adminProfile.role === 'super_admin';
  const canManageUsers = isSuperAdmin || adminProfile?.role === 'support_staff';
  const canManageTickets = isAdmin; // All admins can manage tickets
  const canManageBilling = isSuperAdmin || adminProfile?.role === 'billing_admin';
  const canViewAuditLogs = isAdmin; // All admins can view audit logs

  const value = {
    user,
    adminProfile,
    loading,
    isAdmin,
    isSuperAdmin,
    canManageUsers,
    canManageTickets,
    canManageBilling,
    canViewAuditLogs,
    signIn,
    signOut,
    refreshAdminProfile,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
