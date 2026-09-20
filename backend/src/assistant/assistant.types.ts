/**
 * Contrat de sortie des assistants (§8 Architecture IA).
 *
 * Chaque réponse distingue les faits (tirés d'enregistrements identifiés),
 * les suggestions (jamais des décisions) et l'inconnu (jamais inventé).
 */
export interface SourceRef {
  entity: string;
  id: string;
  code?: string | null;
}

export interface AssistantFact {
  text: string;
  source?: SourceRef;
}

export interface AssistantResponse {
  kind: string;
  facts: AssistantFact[];
  suggestions: string[];
  unknowns: string[];
  /** Moteur utilisé : règles déterministes en Phase 1. */
  generatedBy: 'rules-v1';
  disclaimer: string;
  generatedAt: string;
}

export const ASSISTANT_DISCLAIMER =
  'Assistance générée par des règles à partir des enregistrements Kounouz. ' +
  "Elle n'a aucune autorité : les décisions restent prises par les personnes habilitées.";

export function response(kind: string, parts: Omit<AssistantResponse, 'kind' | 'generatedBy' | 'disclaimer' | 'generatedAt'>): AssistantResponse {
  return {
    kind,
    ...parts,
    generatedBy: 'rules-v1',
    disclaimer: ASSISTANT_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}
