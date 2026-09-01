import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { PasswordStrengthIndicator } from '../components/auth/PasswordStrengthIndicator';
import { FieldError } from '../components/common/FieldError';
import { validatePasswordField, validateRequired } from '../utils/validation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) setToken(urlToken);
  }, [searchParams]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const tokenErr = validateRequired(token, 'Reset token');
    if (tokenErr) {
      newErrors.token = tokenErr;
    }

    const passwordErr = validatePasswordField(newPassword, true);
    if (passwordErr) {
      newErrors.newPassword = passwordErr;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm new password is required';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({
        token: token.trim(),
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      setSuccess(true);
      toast.success('Password updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Password reset failed. The token may be expired.');
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
        <div className="text-center space-y-1.5">
          <div className="w-2.5 h-2.5 bg-cinder mx-auto" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-chalk">
            Set new password
          </h1>
          <p className="text-xs text-chalk-muted">
            Create a secure password for your athlete account
          </p>
        </div>

        <div className="bg-panel border border-hairline p-6 space-y-4 shadow-2xl">
          {success ? (
            <div className="space-y-3 text-center text-xs">
              <div className="font-display font-semibold text-sm text-chalk">
                Password updated
              </div>
              <p className="text-chalk-muted leading-relaxed">
                Your password has been changed. You can now sign in with your new credentials.
              </p>
              <Link
                to="/login"
                className="block w-full py-2.5 bg-cinder hover:bg-cinder-hover text-chalk font-medium text-xs transition-colors text-center"
              >
                Sign in now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-chalk-muted mb-1">
                  Reset token
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => handleFieldChange('token', e.target.value, setToken)}
                  placeholder="Paste reset token"
                  className={`w-full px-3 py-2 bg-night text-xs text-chalk tabular focus:outline-none transition-colors border ${
                    errors.token
                      ? 'border-[#C1432E] focus:border-[#C1432E]'
                      : 'border-hairline focus:border-cinder'
                  }`}
                />
                <FieldError error={errors.token} />
              </div>

              <div>
                <label className="block text-xs font-medium text-chalk-muted mb-1">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => handleFieldChange('newPassword', e.target.value, setNewPassword)}
                  className={`w-full px-3 py-2 bg-night text-xs text-chalk focus:outline-none transition-colors border ${
                    errors.newPassword
                      ? 'border-[#C1432E] focus:border-[#C1432E]'
                      : 'border-hairline focus:border-cinder'
                  }`}
                />
                <FieldError error={errors.newPassword} />
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <div>
                <label className="block text-xs font-medium text-chalk-muted mb-1">
                  Confirm new password
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
                className="w-full py-2.5 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk font-medium text-xs transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Update password</span>}
              </button>

              <div className="text-center pt-2 hairline-t text-xs text-chalk-dim">
                <Link to="/login" className="text-chalk hover:text-cinder underline">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
