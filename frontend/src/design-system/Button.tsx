import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-[#0C261B] text-white hover:bg-[#143B2B] shadow-md disabled:hover:bg-[#0C261B]',
  secondary: 'bg-[#D49B37] text-white hover:bg-[#C68A28] shadow-md disabled:hover:bg-[#D49B37]',
  outline: 'bg-white text-[#0C261B] border-2 border-[#D49B37] hover:bg-[#FAF6EE] disabled:hover:bg-white',
  ghost: 'bg-transparent text-[#0C261B] hover:bg-[#0C261B]/5 disabled:hover:bg-transparent',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-md disabled:hover:bg-rose-600',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-sm px-3 py-2 gap-1.5 rounded-lg',
  md: 'text-sm sm:text-base px-5 py-3 gap-2 rounded-lg min-h-[44px]',
  lg: 'text-base sm:text-lg px-7 py-3.5 gap-2.5 rounded-xl min-h-[48px]',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};
