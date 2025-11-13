import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => User | null;
  logout: () => void;
  availableUsers: User[];
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
  const [isLoading, setIsLoading] = useState(false); // No async op on start

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
    <AuthContext.Provider value={{ user, isLoading, login, logout, availableUsers: DUMMY_USERS }}>
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