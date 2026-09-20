import React from 'react';
import { useTranslation } from 'react-i18next';
import { CircleHelp, Lightbulb, ListChecks, Loader2, Sparkles } from 'lucide-react';
import { type AssistantEndpoint, useAssistant } from '../lib/assistant';
import { ApiError } from '../lib/api';

/**
 * Panneau d'assistance réutilisable : un bouton, puis la réponse structurée
 * (faits sourcés, suggestions, inconnues) et son avertissement. Rien n'est
 * appelé tant que l'utilisateur ne le demande pas.
 */
export const AssistantPanel: React.FC<{
  endpoint: AssistantEndpoint;
  body?: Record<string, string>;
  title?: string;
  className?: string;
}> = ({ endpoint, body = {}, title, className = '' }) => {
  const { t } = useTranslation('common');
  const assistant = useAssistant(endpoint);
  const data = assistant.data;

  return (
    <section className={`rounded-xl border border-[#EAE1D2] bg-[#FCFAF5] p-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#0C261B]">
          <Sparkles className="w-4 h-4 text-[#D49B37]" />
          {title ?? t('assistant.title')}
        </h3>
        <button
          type="button"
          onClick={() => assistant.mutate(body)}
          disabled={assistant.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D49B37] px-2.5 py-1 text-xs font-bold text-[#8A5A12] hover:bg-[#FDF6E7] disabled:opacity-60"
        >
          {assistant.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {data ? t('assistant.refresh') : t('assistant.run')}
        </button>
      </div>

      {assistant.isError && (
        <p className="mt-2 text-xs text-[#B42323]">
          {assistant.error instanceof ApiError ? assistant.error.message : t('assistant.error')}
        </p>
      )}

      {data && (
        <div className="mt-3 space-y-3 text-xs">
          {data.facts.length > 0 && (
            <Block icon={<ListChecks className="w-3.5 h-3.5" />} label={t('assistant.facts')}>
              {data.facts.map((fact, i) => (
                <li key={i}>
                  {fact.text}
                  {fact.source?.code && <span className="ms-1 font-mono text-[10px] text-gray-400">[{fact.source.code}]</span>}
                </li>
              ))}
            </Block>
          )}
          {data.suggestions.length > 0 && (
            <Block icon={<Lightbulb className="w-3.5 h-3.5" />} label={t('assistant.suggestions')}>
              {data.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </Block>
          )}
          {data.unknowns.length > 0 && (
            <Block icon={<CircleHelp className="w-3.5 h-3.5" />} label={t('assistant.unknowns')}>
              {data.unknowns.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </Block>
          )}
          <p className="text-[10px] text-gray-400 border-t border-[#EAE1D2] pt-2">{data.disclaimer}</p>
        </div>
      )}
    </section>
  );
};

const Block: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <div>
    <p className="flex items-center gap-1 font-bold text-[#0C261B] mb-1">
      {icon}
      {label}
    </p>
    <ul className="list-disc ps-5 space-y-0.5 text-gray-700">{children}</ul>
  </div>
);
