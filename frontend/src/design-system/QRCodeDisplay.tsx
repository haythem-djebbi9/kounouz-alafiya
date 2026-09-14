import React from 'react';
import { API_URL } from '../lib/api';

interface QRCodeDisplayProps {
  qrId: string;
  code: string;
  size?: number;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ qrId, code, size = 180, className = '' }) => {
  const verifyPath = `/verify/${qrId}`;

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <div className="p-3 bg-white rounded-xl border-2 border-[#D49B37] shadow-sm">
        <img
          src={`${API_URL}/verify/${qrId}/image`}
          alt={`رمز QR ${code}`}
          width={size}
          height={size}
          style={{ width: size, height: size }}
        />
      </div>
      <span className="font-mono text-xs font-bold text-[#0C261B] tracking-wide">{code}</span>
      <a
        href={verifyPath}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-semibold text-[#D49B37] hover:text-[#C68A28] underline underline-offset-2"
      >
        فتح صفحة التحقق
      </a>
    </div>
  );
};
