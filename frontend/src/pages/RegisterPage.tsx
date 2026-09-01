import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PasswordStrengthIndicator } from '../components/auth/PasswordStrengthIndicator';
import { FieldError } from '../components/common/FieldError';
import { validateEmailField, validatePasswordField, validateRequired } from '../utils/validation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const usernameErr = validateRequired(username, 'Athlete username');
    if (usernameErr) {
      newErrors.username = usernameErr;
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    const emailErr = validateEmailField(email);
    if (emailErr) {
      newErrors.email = emailErr;
    }

    const passwordErr = validatePasswordField(password, true);
    if (passwordErr) {
      newErrors.password = passwordErr;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
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
      toast.error(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
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
        <div className="bg-panel border border-hairline p-6 space-y-4 shadow-2xl">
          <form onSubmit={handleRegister} noValidate className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Full name <span className="text-chalk-dim text-[10px]">(optional)</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full px-3 py-2 bg-night border border-hairline text-xs text-chalk placeholder-chalk-dim focus:outline-none focus:border-cinder transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Athlete username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleFieldChange('username', e.target.value, setUsername)}
                placeholder="apex_runner"
                className={`w-full px-3 py-2 bg-night text-xs text-chalk placeholder-chalk-dim focus:outline-none transition-colors border ${
                  errors.username
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.username} />
            </div>

            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleFieldChange('email', e.target.value, setEmail)}
                placeholder="runner@domain.com"
                className={`w-full px-3 py-2 bg-night text-xs text-chalk placeholder-chalk-dim focus:outline-none transition-colors border ${
                  errors.email
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.email} />
            </div>

            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => handleFieldChange('password', e.target.value, setPassword)}
                className={`w-full px-3 py-2 bg-night text-xs text-chalk focus:outline-none transition-colors border ${
                  errors.password
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.password} />
              <PasswordStrengthIndicator password={password} />
            </div>

            <div>
              <label className="block text-xs font-medium text-chalk-muted mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value, setConfirmPassword)}
                className={`w-full px-3 py-2 bg-night text-xs text-chalk focus:outline-none transition-colors border ${
                  errors.confirmPassword
                    ? 'border-[#C1432E] focus:border-[#C1432E]'
                    : 'border-hairline focus:border-cinder'
                }`}
              />
              <FieldError error={errors.confirmPassword} />
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
