import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  error?: string | null;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <div
      className={`text-[#C1432E] text-[11px] font-sans flex items-center gap-1 mt-1 animate-fade-in ${className}`}
      role="alert"
    >
      <AlertCircle className="w-3 h-3 shrink-0" />
      <span>{error}</span>
    </div>
  );
};
