// eslint-disable-next-line react-refresh/only-export-components
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { usersApi, type UserProfile } from '../utils/apiClient';

// ── Context shape ────────────────────────────────────────────────────────────

export interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  connectUser: (address: string) => Promise<void>;
  updateProfile: (data: { username?: string; avatar?: string }) => Promise<void>;
  disconnectUser: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const connectUser = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await usersApi.connect(address);
      setUser(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect user';
      setError(message);
      console.error('UserContext connectUser error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: { username?: string; avatar?: string }) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const updated = await usersApi.updateProfile(user.address, data);
      setUser(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      console.error('UserContext updateProfile error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const disconnectUser = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, error, connectUser, updateProfile, disconnectUser }}>
      {children}
    </UserContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}