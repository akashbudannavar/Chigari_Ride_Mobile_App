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
  isGuest?: boolean;
}

export interface SignUpResponse {
  error: string | null;
  needsEmailVerification: boolean;
  userAlreadyExists?: boolean;
}

export interface SignInResponse {
  error: string | null;
  needsEmailVerification?: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<SignInResponse>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<SignUpResponse>;
  resendVerificationEmail: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  continueAsGuest: () => void;
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
    isGuest: false,
  });

  // Initialize session on mount from SecureStore
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          console.warn('[AuthContext] Session restoration notice:', error.message);
        }

        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          isGuest: false,
        }));
      } catch (err) {
        if (!isMounted) return;
        setState((prev) => ({ ...prev, loading: false }));
      }
    })();

    // onAuthStateChange — wrap async work to avoid deadlock
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => {
        if (prev.isGuest && !session) return prev;
        return {
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          isGuest: false,
        };
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch / Sync profile whenever user changes
  useEffect(() => {
    if (!state.user || state.isGuest) {
      if (!state.isGuest) {
        setState((prev) => ({ ...prev, profile: null }));
      }
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', state.user!.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.warn('[AuthContext] Profile fetch warning:', error.message);
          return;
        }

        if (data) {
          setState((prev) => ({ ...prev, profile: data }));
        } else {
          // If profile does not exist yet (e.g. trigger didn't fire), create it
          const newProfile: Profile = {
            id: state.user!.id,
            full_name: state.user!.user_metadata?.full_name || state.user!.email?.split('@')[0] || 'Passenger',
            phone: state.user!.user_metadata?.phone || null,
            wallet_balance: 100,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await supabase.from('profiles').insert(newProfile);
          if (mounted) setState((prev) => ({ ...prev, profile: newProfile }));
        }
      } catch {
        // Safe catch for offline/network unavailability
      }
    })();

    return () => { mounted = false; };
  }, [state.user, state.isGuest]);

  const refreshProfile = async () => {
    if (!state.user || state.isGuest) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', state.user.id)
        .maybeSingle();
      if (!error && data) {
        setState((prev) => ({ ...prev, profile: data }));
      }
    } catch {}
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: string | null }> => {
    if (!state.user || state.isGuest) {
      if (state.isGuest && state.profile) {
        setState((prev) => ({
          ...prev,
          profile: prev.profile ? { ...prev.profile, ...updates } : null,
        }));
      }
      return { error: null };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', state.user.id)
        .select()
        .maybeSingle();

      if (error) return { error: error.message };
      if (data) {
        setState((prev) => ({ ...prev, profile: data }));
      }
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to update profile' };
    }
  };

  const continueAsGuest = () => {
    setState({
      session: null,
      user: {
        id: 'guest-rider-id',
        email: 'guest@chigari.app',
        app_metadata: {},
        user_metadata: { full_name: 'Guest User' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User,
      profile: {
        id: 'guest-rider-id',
        full_name: 'Guest User',
        phone: '+91 98765 00000',
        wallet_balance: 100,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      loading: false,
      error: null,
      isGuest: true,
    });
  };

  const signIn = async (email: string, password: string): Promise<SignInResponse> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        const isUnconfirmed = msg.includes('email not confirmed') || msg.includes('not confirmed');
        const friendlyMessage = isUnconfirmed
          ? 'Your email address has not been verified yet. Please check your inbox or tap Resend Verification.'
          : msg.includes('network') || msg.includes('fetch')
          ? 'Unable to connect to authentication server. Please check your network or Continue as Guest.'
          : error.message;

        setState((prev) => ({ ...prev, loading: false, error: friendlyMessage }));
        return { error: friendlyMessage, needsEmailVerification: isUnconfirmed };
      }

      setState((prev) => ({
        ...prev,
        session: data.session,
        user: data.user,
        loading: false,
        isGuest: false,
      }));
      return { error: null, needsEmailVerification: false };
    } catch (err: any) {
      const friendlyMessage = 'Unable to connect to authentication server. Please check your network or Continue as Guest.';
      setState((prev) => ({ ...prev, loading: false, error: friendlyMessage }));
      return { error: friendlyMessage, needsEmailVerification: false };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string
  ): Promise<SignUpResponse> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim(), phone: phone.trim() } },
      });

      if (error) {
        const friendlyMessage = error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')
          ? 'Unable to connect to authentication server. Please check your network or Continue as Guest.'
          : error.message;
        setState((prev) => ({ ...prev, loading: false, error: friendlyMessage }));
        return { error: friendlyMessage, needsEmailVerification: false };
      }

      // Check if user already exists
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        const alreadyExistsMsg = 'This email address is already registered. Please log in instead.';
        setState((prev) => ({ ...prev, loading: false, error: alreadyExistsMsg }));
        return { error: alreadyExistsMsg, needsEmailVerification: false, userAlreadyExists: true };
      }

      // Check if email confirmation is required by Supabase backend
      if (data?.user && !data.session) {
        setState((prev) => ({ ...prev, loading: false, isGuest: false }));
        return { error: null, needsEmailVerification: true };
      }

      // Session established immediately (auto-confirm enabled or verification off)
      setState((prev) => ({
        ...prev,
        session: data?.session || null,
        user: data?.user || null,
        loading: false,
        isGuest: false,
      }));
      return { error: null, needsEmailVerification: false };
    } catch (err: any) {
      const friendlyMessage = 'Unable to connect to authentication server. Please check your network or Continue as Guest.';
      setState((prev) => ({ ...prev, loading: false, error: friendlyMessage }));
      return { error: friendlyMessage, needsEmailVerification: false };
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to resend verification email.' };
    }
  };

  const signOut = async () => {
    if (!state.isGuest) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthContext] Sign out warning:', err);
      }
    }
    setState({ session: null, user: null, profile: null, loading: false, error: null, isGuest: false });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        resendVerificationEmail,
        updateProfile,
        continueAsGuest,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
