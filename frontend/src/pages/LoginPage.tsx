import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('athlete@runzone.ai');
  const [password, setPassword] = useState('Password123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, loginDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email.trim(), password, rememberMe);
      login(res.access_token, res.refresh_token, res.user);
      toast.success(`Signed in as ${res.user.username}`);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: 'runner' | 'admin' = 'runner') => {
    loginDemoUser(role);
    toast.success(`Signed in as ${role === 'admin' ? 'ZoneCommander (Admin)' : 'ApexRunner (Athlete)'}`);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-night text-chalk font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-2.5 h-2.5 bg-cinder mx-auto" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-chalk">
            Sign in to RunZone
          </h1>
          <p className="text-xs text-chalk-muted">
            Geospatial territory engine & physiological fatigue control
          </p>
        </div>

        {/* Panel Form Card */}
        <div className="bg-panel border border-hairline p-6 space-y-4">
          {error && (
            <div className="p-3 bg-night border border-hairline text-xs text-cinder leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-xs text-chalk placeholder-chalk-dim focus:outline-none focus:border-cinder"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-chalk-muted">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[11px] text-chalk-dim hover:text-chalk underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-night border border-hairline text-xs text-chalk pr-8 focus:outline-none focus:border-cinder"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-chalk-dim hover:text-chalk"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center text-xs text-chalk-muted pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="bg-night border-hairline text-cinder focus:ring-0"
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk font-medium text-xs transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Sign in</span>}
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="pt-3 hairline-t space-y-1.5">
            <div className="text-[10px] text-chalk-dim text-center mb-1 font-sans">
              Instant demo access
            </div>
            <button
              onClick={() => handleQuickDemo('runner')}
              className="w-full py-1.5 bg-night hover:bg-panel-light text-chalk text-xs border border-hairline transition-colors"
            >
              Athlete demo (ApexRunner)
            </button>
            <button
              onClick={() => handleQuickDemo('admin')}
              className="w-full py-1.5 bg-night hover:bg-panel-light text-chalk-muted hover:text-chalk text-xs border border-hairline transition-colors"
            >
              Admin mode (ZoneCommander)
            </button>
          </div>

          <div className="text-center text-xs text-chalk-dim pt-1">
            New athlete?{' '}
            <Link to="/register" className="text-chalk hover:text-cinder underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
