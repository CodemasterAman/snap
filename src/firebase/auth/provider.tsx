'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth, UserContext } from '@/firebase/provider';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, [auth]);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
