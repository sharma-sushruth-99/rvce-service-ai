import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => User | null; // Kept for potential future use or debugging
  logout: () => void;
}

// Dummy user data based on the provided SQL seed.
const DUMMY_USERS: User[] = [
    { id: 1, fullName: 'Asha Kumar', email: 'asha.kumar@example.com' },
    { id: 2, fullName: 'Rahul Singh', email: 'rahul.singh@example.com' },
    { id: 3, fullName: 'Demo Admin', email: 'admin@example.com' },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This simulates an active session for "Rahul Singh" as requested.
    const demoUser = DUMMY_USERS.find(u => u.email === 'rahul.singh@example.com');
    if (demoUser) {
      setUser(demoUser);
    }
    setIsLoading(false);
  }, []);

  const login = (email: string): User | null => {
    const foundUser = DUMMY_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      setUser(foundUser);
      return foundUser;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
