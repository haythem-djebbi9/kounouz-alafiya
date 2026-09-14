import React from 'react';
import { Check, X } from 'lucide-react';

export type TimelineStepState = 'done' | 'current' | 'pending' | 'error';

export interface TimelineStep {
  label: string;
  description?: string;
  date?: string;
  state: TimelineStepState;
}

const DOT_CLASSES: Record<TimelineStepState, string> = {
  done: 'bg-[#0C261B] border-[#0C261B] text-white',
  current: 'bg-[#D49B37] border-[#D49B37] text-white ring-4 ring-[#D49B37]/25',
  pending: 'bg-white border-gray-300 text-gray-300',
  error: 'bg-rose-600 border-rose-600 text-white',
};

const LINE_CLASSES: Record<TimelineStepState, string> = {
  done: 'border-[#0C261B]',
  current: 'border-[#D49B37]',
  pending: 'border-gray-200',
  error: 'border-rose-600',
};

export const Timeline: React.FC<{ steps: TimelineStep[]; className?: string }> = ({ steps, className = '' }) => {
  return (
    <ol className={className}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <li
            key={idx}
            className={`relative ps-8 ${isLast ? '' : `pb-7 border-s-2 ${LINE_CLASSES[step.state]}`}`}
          >
            <span
              className={`absolute top-0 -start-[9px] w-4 h-4 rounded-full border-2 flex items-center justify-center ${DOT_CLASSES[step.state]}`}
            >
              {step.state === 'done' && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
              {step.state === 'error' && <X className="w-2.5 h-2.5" strokeWidth={3} />}
            </span>
            <p className={`font-bold text-sm ${step.state === 'pending' ? 'text-gray-400' : 'text-[#0C261B]'}`}>
              {step.label}
            </p>
            {step.description && (
              <p className={`text-xs mt-0.5 ${step.state === 'pending' ? 'text-gray-300' : 'text-gray-500'}`}>
                {step.description}
              </p>
            )}
            {step.date && <p className="text-[11px] text-gray-400 mt-0.5">{step.date}</p>}
          </li>
        );
      })}
    </ol>
  );
};
