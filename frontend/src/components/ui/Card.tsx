import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'premium' | 'glass' | 'gradient';
  hoverEffect?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverEffect = true, children, ...props }, ref) => {
    const variants = {
      default: 'bg-[#1A1C3D]/50 border border-[#00F2FF]/10 rounded-2xl',
      premium: 'card-premium',
      glass: 'glass-panel',
      gradient: 'bg-gradient-to-br from-[#1A1C3D] to-[#3A3F7A] border border-[#00F2FF]/20 rounded-2xl',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'p-6 transition-all duration-300',
          variants[variant],
          hoverEffect && 'hover:translate-y-[-2px] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;