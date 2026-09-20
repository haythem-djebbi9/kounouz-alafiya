import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ items, className }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={`divide-y divide-[#EAE1D2] border border-[#EAE1D2] rounded-xl overflow-hidden bg-white ${className ?? ''}`}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id}>
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-start text-sm font-bold text-[#0C261B] hover:bg-[#FAF6EE] transition-colors"
              aria-expanded={isOpen}
            >
              <span>{item.title}</span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{item.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
