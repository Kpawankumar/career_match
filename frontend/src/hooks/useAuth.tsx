import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'applicant' | 'hr' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string, role?: 'applicant' | 'hr' | 'admin', token?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isFirstLogin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    // Check if user is already logged in (replace with your auth logic)
    const checkAuth = async () => {
      try {
        // Replace with your authentication check
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        if (savedToken) {
          setToken(savedToken);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, role?: 'applicant' | 'hr' | 'admin', token?: string) => {
    try {
      // Decode JWT and extract uid
      let userId = undefined;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.uid; // Always use the string UID
        } catch (e) {
          console.error('Failed to decode JWT:', e);
        }
      }
      if (!userId) {
        throw new Error('No UID found in token. Cannot login.');
      }
      // Create user object from backend response
      const userData: User = {
        id: userId, // Always string UID
        name: email.split('@')[0], // Extract name from email or get from backend
        email: email,
        role: role || 'applicant'
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      if (token) {
        setToken(token);
        localStorage.setItem('token', token);
      }
      // Set first login status
      const storedFirstLoginStatus = localStorage.getItem('isFirstLogin');
      setIsFirstLogin(storedFirstLoginStatus === null || storedFirstLoginStatus === 'true');
    } catch (error) {
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsFirstLogin(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isFirstLogin');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    token,
    login,
    logout,
    loading,
    isFirstLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};