import React from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * Rendu du contenu d'un article, saisi dans la console avec une mise en forme
 * minimale et sans HTML (rien n'est injecté tel quel dans la page) :
 *   paragraphes séparés par une ligne vide, « ## » intertitre, « - » liste,
 *   « > » encadré, **gras**.
 */
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-bold text-[#0C261B]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

export const ArticleBody: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
  const blocks = content
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={`space-y-4 text-base leading-8 text-[#2E3F38] ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim());
        if (block.startsWith('## ')) {
          return (
            <h3 key={i} className="pt-2 text-lg sm:text-xl font-extrabold text-[#0C261B] leading-snug">
              {inline(block.slice(3))}
            </h3>
          );
        }
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="space-y-2 ps-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-3 w-1.5 h-1.5 rounded-full bg-[#D49B37] shrink-0" />
                  <span>{inline(l.slice(2))}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.startsWith('> ')) {
          return (
            <aside key={i} className="flex gap-3 rounded-2xl bg-[#FBF4E6] border border-[#EBD7AE] px-4 py-3.5 text-[#5B4A2A] font-semibold leading-7">
              <Lightbulb className="w-5 h-5 text-[#C68A28] shrink-0 mt-1" />
              <span>{inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '))}</span>
            </aside>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
