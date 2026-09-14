import React from 'react';

type Tone = 'green' | 'gold' | 'gray' | 'red' | 'blue';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: React.ReactNode;
}

const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  gold: 'bg-[#FBF1DE] text-[#9C6B12] border-[#D49B37]/50',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'gray', icon, className = '', children, ...props }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
};
