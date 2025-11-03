'use client';
import {
  FirebaseProvider,
  initializeFirebase,
} from '.';
import { firebaseConfig } from './config';
import { AuthProvider } from './auth/provider';

const services = initializeFirebase(firebaseConfig);

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseProvider value={services}>
      <AuthProvider>{children}</AuthProvider>
    </FirebaseProvider>
  );
}
