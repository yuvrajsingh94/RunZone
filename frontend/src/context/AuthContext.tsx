import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  loginDemoUser: (role?: UserRole) => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const createDemoUser = (role: UserRole = 'runner'): User => ({
    id: 1,
    email: role === 'admin' ? 'zonecommander@runzone.ai' : 'athlete@runzone.ai',
    username: role === 'admin' ? 'ZoneCommander' : 'ApexRunner',
    full_name: role === 'admin' ? 'Commander Drake' : 'Alex Mercer',
    role: role,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    level: 7,
    xp: 6450,
    total_distance_km: 142.5,
    total_territory_km2: 4.82,
    faction_color: '#3B82F6',
    resting_hr: 52,
    max_hr: 194,
    is_verified: true,
    is_strava_connected: true,
    onboarding_status: 'completed',
    experience_level: 'regular',
    training_goal: 'aerobic_base',
    weekly_frequency: '4_5',
    created_at: new Date().toISOString(),
  });

  useEffect(() => {
    const initAuth = async () => {
      const storedAccessToken = localStorage.getItem('runzone_access_token');
      const storedUser = localStorage.getItem('runzone_user');

      if (storedAccessToken && storedUser && storedAccessToken !== 'demo_access_token_jwt') {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setLoading(false);
          api.getMe().then((fresh) => {
            if (fresh) updateUser(fresh);
          }).catch(() => null);
          return;
        } catch (e) {
          localStorage.removeItem('runzone_access_token');
          localStorage.removeItem('runzone_refresh_token');
          localStorage.removeItem('runzone_user');
        }
      }

      // Immediately provide demo user so the app hydrates instantly (0ms delay)
      const defaultUser = createDemoUser();
      login('demo_access_token_jwt', 'demo_refresh_token_jwt', defaultUser);
      setLoading(false);

      // In background, upgrade to live backend signed JWT
      loginDemoUser('runner');
    };

    initAuth();

    // Listen for unauthorized events from API service
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = (accessToken: string, refreshToken: string, newUser: User) => {
    localStorage.setItem('runzone_access_token', accessToken);
    localStorage.setItem('runzone_refresh_token', refreshToken);
    localStorage.setItem('runzone_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = async () => {
    await api.logout().catch(() => null);
    setUser(null);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('runzone_user', JSON.stringify(updated));
  };

  const loginDemoUser = async (role: UserRole = 'runner') => {
    const demoEmail = role === 'admin' ? 'zonecommander@runzone.ai' : 'athlete@runzone.ai';
    const fallbackUser = createDemoUser(role);

    // If no user yet, hydrate immediately with offline profile
    setUser((current) => current || fallbackUser);

    try {
      const res = await api.login(demoEmail, 'Password123!', true);
      if (res?.access_token) {
        login(res.access_token, res.refresh_token, res.user);
      }
    } catch (e) {
      console.warn('Real backend demo login unavailable, staying on offline fallback', e);
      login('demo_access_token_jwt', 'demo_refresh_token_jwt', fallbackUser);
    }
  };


  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        updateUser,
        loginDemoUser,
        hasRole,
      }}
    >
      {children}
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
