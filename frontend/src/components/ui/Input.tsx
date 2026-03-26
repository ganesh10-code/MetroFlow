import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'premium';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon: Icon, variant = 'default', type, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7D7DBE] ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {Icon && (
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7DBE] transition-all duration-200 group-focus-within:text-[#00F2FF]" />
          )}
          <input
            type={type}
            className={cn(
              'w-full rounded-xl text-[#E6E9FF] text-sm transition-all duration-200 outline-none placeholder:text-[#7D7DBE]/50',
              variant === 'premium'
                ? 'input-premium'
                : 'bg-[#1A1C3D]/60 border border-[#00F2FF]/15 focus:border-[#00F2FF] focus:ring-1 focus:ring-[#00F2FF]/20 py-3 px-4',
              Icon && 'pl-11',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[10px] font-bold text-red-500 ml-1 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-red-500" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;