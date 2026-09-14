import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
    <div className="w-14 h-14 rounded-full bg-[#FAF6EE] border border-[#D49B37]/30 flex items-center justify-center text-[#D49B37] mb-4">
      {icon ?? <Inbox className="w-6 h-6" />}
    </div>
    <p className="font-bold text-[#0C261B] mb-1">{title}</p>
    {description && <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="secondary" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
