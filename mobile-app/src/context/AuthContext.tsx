import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Session, User } from "@supabase/supabase-js";
import * as LocalAuthentication from "expo-local-authentication";
import { supabase } from "../lib/supabase";
import { secureStorage } from "../lib/secureStorage";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  authenticateBiometric: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const BIOMETRIC_KEY = "ep:biometric-enabled";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [sessionRes, biometricRaw] = await Promise.all([
        supabase.auth.getSession(),
        secureStorage.getItem(BIOMETRIC_KEY)
      ]);
      if (!mounted) return;
      setSession(sessionRes.data.session ?? null);
      setBiometricEnabledState(biometricRaw === "1");
      setLoading(false);
    })();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (payload: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
    }) => {
      const { error } = await supabase.auth.signUp({
        email: payload.email.trim(),
        password: payload.password,
        options: {
          data: {
            full_name: payload.fullName.trim(),
            phone: payload.phone?.trim() || ""
          }
        }
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    setBiometricEnabledState(enabled);
    if (enabled) await secureStorage.setItem(BIOMETRIC_KEY, "1");
    else await secureStorage.removeItem(BIOMETRIC_KEY);
  }, []);

  const authenticateBiometric = useCallback(async () => {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hardware || !enrolled) return false;
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock EdisonPay",
      fallbackLabel: "Use passcode",
      cancelLabel: "Cancel"
    });
    return res.success;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
      biometricEnabled,
      setBiometricEnabled,
      authenticateBiometric
    }),
    [
      session,
      loading,
      signIn,
      signUp,
      signOut,
      biometricEnabled,
      setBiometricEnabled,
      authenticateBiometric
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
