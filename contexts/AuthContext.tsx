import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  // Initialize session on mount
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    })();

    // onAuthStateChange — wrap async work to avoid deadlock
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }));
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile whenever user changes
  useEffect(() => {
    if (!state.user) {
      setState((prev) => ({ ...prev, profile: null }));
      return;
    }

    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', state.user!.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setState((prev) => ({ ...prev, error: error.message }));
        return;
      }

      setState((prev) => ({ ...prev, profile: data }));
    })();

    return () => { mounted = false; };
  }, [state.user]);

  const refreshProfile = async () => {
    if (!state.user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', state.user.id)
      .maybeSingle();
    if (!error && data) {
      setState((prev) => ({ ...prev, profile: data }));
    }
  };

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
      return { error: error.message };
    }
    setState((prev) => ({ ...prev, loading: false }));
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
      return { error: error.message };
    }
    setState((prev) => ({ ...prev, loading: false }));
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ session: null, user: null, profile: null, loading: false, error: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
