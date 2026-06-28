// ============================================================
// Adapter — Supabase Authentication Service
// ============================================================

import { IAuthService } from '../../core/interfaces/IAuthService.js';
import { supabase } from '../../infrastructure/database/supabase-client.js';

export class SupabaseAuthService extends IAuthService {
  async getUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return session.user;
      }
    } catch (e) {
      console.warn('Failed to retrieve session from local storage:', e);
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error fetching authenticated user:', error);
      return null;
    }
    return user;
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  async signUp(email, password, fullName, phone) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone
        }
      }
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('brm_role_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Failed to clear cached roles from sessionStorage:', e);
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async checkAdmin(userId) {
    if (!userId) return false;
    
    try {
      const cachedRole = sessionStorage.getItem(`brm_role_${userId}`);
      if (cachedRole) {
        return cachedRole === 'admin';
      }
    } catch (e) {
      console.warn('sessionStorage check failed:', e);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error || !data) return false;

      try {
        sessionStorage.setItem(`brm_role_${userId}`, data.role);
      } catch (e) {
        console.warn('Failed to cache role in sessionStorage:', e);
      }

      return data.role === 'admin';
    } catch {
      return false;
    }
  }
}
