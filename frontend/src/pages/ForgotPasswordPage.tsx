import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSubmitted(true);
      if (res.dev_reset_token) {
        setDevToken(res.dev_reset_token);
      }
      toast.success('Password reset instructions sent');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-night text-chalk font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-2.5 h-2.5 bg-cinder mx-auto" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-chalk">
            Reset password
          </h1>
          <p className="text-xs text-chalk-muted">
            Enter your email to receive recovery instructions
          </p>
        </div>

        <div className="bg-panel border border-hairline p-6 space-y-4">
          {submitted ? (
            <div className="space-y-3 text-xs">
              <div className="font-display font-semibold text-sm text-chalk">
                Reset instructions dispatched
              </div>
              <p className="text-chalk-muted leading-relaxed">
                If an account with <strong className="text-chalk">{email}</strong> exists, password reset instructions have been sent.
              </p>

              {devToken && (
                <div className="p-3 bg-night border border-hairline space-y-2 text-xs">
                  <div className="text-[10px] text-chalk-dim">
                    Development reset token:
                  </div>
                  <p className="tabular text-chalk-muted break-all text-[11px] bg-panel p-2 border border-hairline">
                    {devToken}
                  </p>
                  <Link
                    to={`/reset-password?token=${devToken}`}
                    className="block text-center py-2 bg-cinder hover:bg-cinder-hover text-chalk font-medium text-xs transition-colors"
                  >
                    Open password reset screen
                  </Link>
                </div>
              )}

              <div className="pt-2 hairline-t text-center">
                <Link to="/login" className="text-chalk-dim hover:text-chalk underline">
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-chalk-muted mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="runner@domain.com"
                  required
                  className="w-full px-3 py-2 bg-night border border-hairline text-xs text-chalk focus:outline-none focus:border-cinder"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 bg-cinder hover:bg-cinder-hover disabled:opacity-50 text-chalk font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Send reset instructions</span>}
              </button>

              <div className="text-center pt-2 hairline-t text-xs text-chalk-dim">
                Remember password?{' '}
                <Link to="/login" className="text-chalk hover:text-cinder underline">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
