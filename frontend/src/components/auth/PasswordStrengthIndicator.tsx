import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthProps> = ({ password }) => {
  if (!password) return null;

  const hasLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const passedCount = [hasLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  let strengthLabel = 'Weak';
  let strengthColor = 'bg-gauge-danger';
  let strengthTextColor = 'text-gauge-danger';
  let width = '25%';

  if (passedCount === 2) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-gauge-alert';
    strengthTextColor = 'text-gauge-alert';
    width = '50%';
  } else if (passedCount === 3) {
    strengthLabel = 'Good';
    strengthColor = 'bg-contour';
    strengthTextColor = 'text-contour';
    width = '75%';
  } else if (passedCount === 4) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-gauge-safe';
    strengthTextColor = 'text-gauge-safe';
    width = '100%';
  }

  return (
    <div className="space-y-2 pt-1 text-xs font-sans">
      {/* Strength Bar */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-chalk-dim">Password security:</span>
        <span className={`font-semibold ${strengthTextColor}`}>{strengthLabel}</span>
      </div>
      <div className="w-full h-1 bg-night border border-hairline overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strengthColor}`}
          style={{ width }}
        />
      </div>

      {/* Rules Checklist */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
        <div className={`flex items-center gap-1.5 ${hasLength ? 'text-gauge-safe' : 'text-chalk-dim'}`}>
          {hasLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>8+ characters</span>
        </div>
        <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-gauge-safe' : 'text-chalk-dim'}`}>
          {hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>1 uppercase letter</span>
        </div>
        <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-gauge-safe' : 'text-chalk-dim'}`}>
          {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>1 number</span>
        </div>
        <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-gauge-safe' : 'text-chalk-dim'}`}>
          {hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>1 special character</span>
        </div>
      </div>
    </div>
  );
};
