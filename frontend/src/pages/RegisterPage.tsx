import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PasswordStrengthIndicator } from '../components/auth/PasswordStrengthIndicator';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        email: email.trim(),
        username: username.trim(),
        full_name: fullName.trim() || undefined,
        password,
      });

      login(res.access_token, res.refresh_token, res.user);
      toast.success(`Welcome to RunZone, ${res.user.username}`);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please review fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-night text-chalk font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-2.5 h-2.5 bg-cinder mx-auto" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-chalk">
            Create athlete account
          </h1>
          <p className="text-xs text-chalk-muted">
            Join the live territory map and calibrate your fatigue gauge
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-panel border border-hairline p-6 space-y-4">
          {error && (
            <div className="p-3 bg-night border border-hairline text-xs text-cinder leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full px-3 py-2 bg-night border border-hairline text-xs text-chalk placeholder-chalk-dim focus:outline-none focus:border-cinder"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Athlete username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="apex_runner"
                className="w-full px-3 py-2 bg-night border border-hairline text-xs text-chalk placeholder-chalk-dim focus:outline-none focus:border-cinder"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="runner@domain.com"
                className="w-full px-3 py-2 bg-night border border-hairline text-xs text-chalk placeholder-chalk-dim focus:outline-none focus:border-cinder"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-xs text-chalk focus:outline-none focus:border-cinder"
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-night border border-hairline text-xs text-chalk focus:outline-none focus:border-cinder"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk font-medium text-xs transition-colors flex items-center justify-center gap-2 mt-3"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Create account</span>}
            </button>
          </form>

          <div className="text-center text-xs text-chalk-dim pt-2 hairline-t">
            Already have an account?{' '}
            <Link to="/login" className="text-chalk hover:text-cinder underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
