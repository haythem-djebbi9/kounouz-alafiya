import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

/** Champ de recherche à frappe différée : la requête part 300 ms après la dernière touche. */
export const SearchField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  delay?: number;
}> = ({ value, onChange, placeholder, className = '', delay = 300 }) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), delay);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange, delay]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full ps-9 pe-9 min-h-[40px] rounded-xl border border-[#E4DED2] bg-white text-sm text-[#0C261B] placeholder:text-gray-400 focus:outline-none focus:border-[#D49B37] focus:ring-2 focus:ring-[#D49B37]/15"
      />
      {draft && (
        <button
          onClick={() => {
            setDraft('');
            onChange('');
          }}
          aria-label="clear"
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-[#0C261B]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
