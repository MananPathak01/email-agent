import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: any;
  updatedAt?: any;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Set up auth state listener
  useEffect(() => {
    let isMounted = true;
    
    const handleAuthStateChange = async (firebaseUser: User | null) => {
      if (!isMounted) return;
      
      try {
        setLoading(true);
        
        if (firebaseUser) {
          // User is signed in
          const token = await firebaseUser.getIdToken();
          setToken(token);
          
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<AppUser, 'uid'>;
            setUser({ 
              uid: firebaseUser.uid, 
              email: userData.email || firebaseUser.email,
              displayName: userData.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: userData.photoURL || firebaseUser.photoURL || '',
              createdAt: userData.createdAt || serverTimestamp(),
              updatedAt: userData.updatedAt || serverTimestamp()
            });
          } else {
            // Create user document if it doesn't exist
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
          
          // Handle redirect after successful login
          const currentPath = window.location.pathname;
          const isAuthPage = ['/login', '/signup'].includes(currentPath);
          const isOAuthCallback = currentPath === '/oauth/callback';
          const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
          
          if (isAuthPage) {
            sessionStorage.removeItem('redirectAfterLogin');
            // Use a small timeout to ensure the state is updated before redirecting
            setTimeout(() => {
              window.location.href = redirectUrl || '/dashboard';
            }, 100);
          }
          
          // Don't auto-redirect from OAuth callback - let the callback page handle it
          if (isOAuthCallback) {
            // OAuth callback page will handle its own redirect logic
            return;
          }
        } else {
          // User is signed out
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setToken(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Set up the auth state listener
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
    
    // Clean up the listener when the component unmounts
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Email/Password Login
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Signup
  const signup = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile with display name
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user exists in Firestore, if not create
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
          photoURL: result.user.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    await firebaseSignOut(auth);
  };

  // Password Reset
  const sendPasswordResetEmail = async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    signInWithGoogle,
    logout,
    sendPasswordResetEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};