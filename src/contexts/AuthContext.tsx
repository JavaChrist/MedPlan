import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // MODE DEMO - utilisateur factice pour tester sans Firebase
  const demoUser = {
    uid: 'demo-user',
    email: 'demo@example.com',
    displayName: 'Utilisateur Demo',
    emailVerified: true,
    metadata: {
      creationTime: '2024-01-01T00:00:00.000Z',
      lastSignInTime: new Date().toISOString()
    }
  } as User;

  const login = async (email: string, password: string) => {
    // Mode demo - simule une connexion réussie
    if (email === 'demo@example.com' && password === 'demo123') {
      setCurrentUser(demoUser);
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    setCurrentUser({ ...result.user, displayName } as User);
  };

  const logout = async () => {
    setCurrentUser(null);
    await signOut(auth);
  };

  useEffect(() => {
    // MODE DEMO - connecte automatiquement l'utilisateur demo
    setCurrentUser(demoUser);
    setLoading(false);

    /* Configuration Firebase normale (décommentez quand Firebase est configuré)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
    */
  }, []);

  const value: AuthContextType = {
    currentUser,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 