import React from 'react';

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({ label, error, hint, required, children }) => (
  <label className="block">
    <span className="block text-sm font-bold text-[#0C261B] mb-1.5">
      {label}
      {required && <span className="text-rose-600 ms-1">*</span>}
    </span>
    {children}
    {hint && !error && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    {error && <span className="block text-xs font-semibold text-rose-600 mt-1">{error}</span>}
  </label>
);

const baseInputClass =
  'w-full px-4 py-3 text-sm sm:text-base text-[#0C261B] bg-white border-2 rounded-lg outline-none transition-colors min-h-[44px] placeholder:text-gray-400';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, required, className = '', ...props }) => (
  <FieldWrapper label={label} error={error} hint={hint} required={required}>
    <input
      required={required}
      className={`${baseInputClass} ${error ? 'border-rose-400 focus:border-rose-500' : 'border-[#EAE1D2] focus:border-[#D49B37]'} ${className}`}
      {...props}
    />
  </FieldWrapper>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, hint, required, className = '', ...props }) => (
  <FieldWrapper label={label} error={error} hint={hint} required={required}>
    <textarea
      required={required}
      rows={4}
      className={`${baseInputClass} resize-none ${error ? 'border-rose-400 focus:border-rose-500' : 'border-[#EAE1D2] focus:border-[#D49B37]'} ${className}`}
      {...props}
    />
  </FieldWrapper>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, hint, required, className = '', children, ...props }) => (
  <FieldWrapper label={label} error={error} hint={hint} required={required}>
    <select
      required={required}
      className={`${baseInputClass} ${error ? 'border-rose-400 focus:border-rose-500' : 'border-[#EAE1D2] focus:border-[#D49B37]'} ${className}`}
      {...props}
    >
      {children}
    </select>
  </FieldWrapper>
);
