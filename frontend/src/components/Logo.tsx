import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'gold';
  onClick?: () => void;
  compact?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'dark',
  onClick,
  compact = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const titleColor =
    variant === 'gold' || variant === 'light'
      ? 'text-[#FAF6EE]'
      : 'text-[#0C261B]';

  return (
    <div
      id="brand-logo"
      onClick={onClick}
      className={`inline-flex items-center gap-3 sm:gap-4 select-none cursor-pointer transition-transform duration-200 hover:scale-[1.02] ${className}`}
    >
      {/* Brand Hexagonal Honey Emblem */}
      <div className="relative shrink-0 flex items-center justify-center">
        {!imgError ? (
          <img
            src="/images/knozafialogo-removebg-preview.png"
            alt="شعار كنوز العافية"
            onError={() => setImgError(true)}
            className={`object-contain transition-all duration-200 ${
              compact
                ? 'h-12 w-12'
                : 'h-16 w-16 sm:h-20 sm:w-20 lg:h-[90px] lg:w-[90px]'
            }`}
          />
        ) : (
          <div
            className={`relative flex items-center justify-center ${
              compact
                ? 'w-12 h-12'
                : 'w-16 h-16 sm:w-20 sm:h-20 lg:w-[90px] lg:h-[90px]'
            }`}
          >
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full drop-shadow-sm"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="50,4 92,26 92,74 50,96 8,74 8,26"
                stroke="#D19A44"
                strokeWidth="5"
                fill={variant === 'gold' || variant === 'light' ? '#12362C' : '#FAF6F0'}
                strokeLinejoin="round"
              />
              <path
                d="M50,22 C50,22 72,48 72,64 C72,76 62,84 50,84 C38,84 28,76 28,64 C28,48 50,22 50,22 Z"
                stroke="#D19A44"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M50,38 C50,38 60,54 60,63 C60,68 55,72 50,72 C45,72 40,68 40,63 C40,54 50,38 50,38 Z"
                fill="#D19A44"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Brand Name & Tagline Typography Right Beside the Logo */}
      <div className="flex flex-col items-start justify-center leading-none">
        <span
          className={`font-['Cairo'] font-bold tracking-tight ${titleColor} ${
            compact
              ? 'text-lg sm:text-xl'
              : 'text-2xl sm:text-[28px] lg:text-[32px] mb-1.5'
          }`}
        >
          كنوز العافية
        </span>
        <div className="flex items-center gap-1.5 text-[#D19A44] font-['Cairo'] font-semibold text-xs sm:text-sm lg:text-[15px] whitespace-nowrap">
          <span className="w-3.5 sm:w-6 h-[2px] bg-[#D19A44] inline-block rounded-full"></span>
          <span>جودة يمكن التحقق منها</span>
          <span className="w-3.5 sm:w-6 h-[2px] bg-[#D19A44] inline-block rounded-full"></span>
        </div>
      </div>
    </div>
  );
};

