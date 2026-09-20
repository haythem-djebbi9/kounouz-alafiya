import { useMutation } from '@tanstack/react-query';
import { api } from './api';

/**
 * Assistants de la plateforme (§Architecture IA, Phase 1).
 *
 * Réponses produites par des règles déterministes à partir des
 * enregistrements : faits sourcés, suggestions, inconnues. Ils n'ont aucune
 * autorité et ne modifient rien.
 */
export interface AssistantFact {
  text: string;
  source?: { entity: string; id: string; code?: string | null };
}

export interface AssistantResponse {
  kind: string;
  facts: AssistantFact[];
  suggestions: string[];
  unknowns: string[];
  generatedBy: string;
  disclaimer: string;
  generatedAt: string;
}

export type AssistantEndpoint =
  | 'verification/case-summary'
  | 'verification/missing-evidence'
  | 'producer/status-explanation'
  | 'admin/analytics-summary'
  | 'anti-counterfeit/explain-alert';

export function useAssistant(endpoint: AssistantEndpoint) {
  return useMutation({
    mutationFn: (body: Record<string, string> = {}) => api.post<AssistantResponse>(`/ai/${endpoint}`, body),
  });
}
