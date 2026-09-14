import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({ padded = true, bordered = true, className = '', children, ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm ${bordered ? 'border border-[#EAE1D2]' : ''} ${padded ? 'p-4 sm:p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', children, ...props }) => (
  <h3 className={`text-lg font-bold text-[#0C261B] ${className}`} {...props}>
    {children}
  </h3>
);
