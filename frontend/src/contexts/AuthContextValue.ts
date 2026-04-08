import { createContext } from 'react';
import { type User } from '../types/api';

export interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  loginWithPhone: (phone: string, otp: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<{ demo_otp?: string }>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
