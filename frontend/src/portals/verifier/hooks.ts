import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, resolveFileUrl } from '../../lib/api';
import { tokenStorage } from '../../lib/tokenStorage';
import type { VerificationRequestStatus } from '../../lib/api-types';
import type {
  DecisionEvaluation,
  DecisionOutcome,
  DecisionQueueItem,
  LabAnalysisFile,
  LabParameter,
  LabQueueItem,
  PortalAnalysisDetail,
  PortalDashboard,
  PortalDecisionDetail,
  PortalRequestDetail,
  PortalRequestsPage,
  PortalSampleDetail,
  PortalSamplesPage,
  ReferenceHoney,
  ReferenceHoneysPage,
  RequestComment,
  RequestTab,
  ReviewDecision,
  SampleTab,
  SampleTimeline,
} from './types';

const BASE = '/verification-portal';
const KEY = ['verifier'] as const;

/** Sérialise les filtres en query string, en ignorant les valeurs vides. */
function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

/**
 * Invalide tout le portail après une écriture.
 *
 * Les écrans partagent les mêmes dossiers vus sous des angles différents : une
 * décision change la file du laboratoire, les compteurs du tableau de bord et
 * la revue des demandes. Invalider largement évite des vues incohérentes entre
 * deux onglets, au prix de quelques requêtes.
 */
function useInvalidatePortal() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEY });
}

// --- Centre de vérification --------------------------------------------------

export function useVerifierDashboard(months = 6) {
  return useQuery({
    queryKey: [...KEY, 'dashboard', months],
    queryFn: () => api.get<PortalDashboard>(`${BASE}/dashboard${qs({ months })}`),
  });
}

// --- Revue des demandes -------------------------------------------------------

export interface RequestFilters {
  tab?: RequestTab;
  status?: VerificationRequestStatus;
  search?: string;
  governorate?: string;
  honeyType?: string;
  sort?: 'NEWEST' | 'OLDEST' | 'PRODUCER';
  page?: number;
  pageSize?: number;
}

export function useVerifierRequests(filters: RequestFilters) {
  return useQuery({
    queryKey: [...KEY, 'requests', filters],
    queryFn: () => api.get<PortalRequestsPage>(`${BASE}/requests${qs({ ...filters })}`),
    // Garde la page précédente affichée pendant le chargement de la suivante :
    // la pagination ne fait pas clignoter le tableau.
    placeholderData: (previous) => previous,
  });
}

export function useVerifierRequest(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'requests', id],
    queryFn: () => api.get<PortalRequestDetail>(`${BASE}/requests/${id}`),
    enabled: !!id,
  });
}

export function useReviewRequest() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      decision: ReviewDecision;
      message?: string;
      internalNotes?: string;
    }) =>
      api.post<PortalRequestDetail>(`${BASE}/requests/${vars.id}/review`, {
        decision: vars.decision,
        message: vars.message,
        internalNotes: vars.internalNotes,
      }),
    onSuccess: invalidate,
  });
}

export function useAssignRequest() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; assigneeId: string | null }) =>
      api.patch<PortalRequestDetail>(`${BASE}/requests/${vars.id}/assignee`, {
        assigneeId: vars.assigneeId,
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateRequestNotes() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; internalNotes: string }) =>
      api.patch(`${BASE}/requests/${vars.id}/notes`, { internalNotes: vars.internalNotes }),
    onSuccess: invalidate,
  });
}

export function useAddRequestComment() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; body: string }) =>
      api.post<RequestComment>(`${BASE}/requests/${vars.id}/comments`, { body: vars.body }),
    onSuccess: invalidate,
  });
}

export function useDeleteRequestComment() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (commentId: string) => api.delete(`${BASE}/comments/${commentId}`),
    onSuccess: invalidate,
  });
}

// --- Échantillons ---------------------------------------------------------------

export interface SampleFilters {
  tab?: SampleTab;
  search?: string;
  from?: string;
  to?: string;
  sort?: 'NEWEST' | 'OLDEST';
  page?: number;
  pageSize?: number;
}

export function useVerifierSamples(filters: SampleFilters) {
  return useQuery({
    queryKey: [...KEY, 'samples', filters],
    queryFn: () => api.get<PortalSamplesPage>(`${BASE}/samples${qs({ ...filters })}`),
    placeholderData: (previous) => previous,
  });
}

export function useVerifierSample(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'samples', id],
    queryFn: () => api.get<PortalSampleDetail>(`${BASE}/samples/${id}`),
    enabled: !!id,
  });
}

export function useSampleCustody(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'samples', id, 'custody'],
    queryFn: () => api.get<SampleTimeline>(`${BASE}/samples/${id}/custody`),
    enabled: !!id,
  });
}

export function useRegisterSample() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (body: {
      requestId: string;
      collectionDate: string;
      collectionMethod: 'KOUNOUZ_VISIT' | 'PRODUCER_DELIVERY';
      quantity: number;
      location?: string;
      photos?: string[];
      notes?: string;
    }) => api.post<PortalSampleDetail>(`${BASE}/samples`, body),
    onSuccess: invalidate,
  });
}

export function useSampleTransition() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      action: 'receive' | 'seal' | 'move-to-laboratory';
      note?: string;
    }) => api.post<PortalSampleDetail>(`${BASE}/samples/${vars.id}/${vars.action}`, { note: vars.note }),
    onSuccess: invalidate,
  });
}

export function useRegisterReferenceSample() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: ({
      sampleId,
      ...body
    }: {
      sampleId: string;
      storageLocation: string;
      storageConditions: string;
      retentionPeriod: string;
      condition?: string;
    }) =>
      api.post<PortalSampleDetail>(`${BASE}/samples/${sampleId}/reference-sample`, {
        ...body,
        condition: body.condition?.trim() || undefined,
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateReferenceSampleStatus() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: ({ sampleId, ...body }: { sampleId: string; status: string; reason: string }) =>
      api.patch<PortalSampleDetail>(`${BASE}/samples/${sampleId}/reference-sample/status`, body),
    onSuccess: invalidate,
  });
}

export function useFlagSampleIssue() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; reason: string }) =>
      api.post<PortalSampleDetail>(`${BASE}/samples/${vars.id}/issue`, { reason: vars.reason }),
    onSuccess: invalidate,
  });
}

// --- Laboratoire ------------------------------------------------------------------

export function useLabParameters() {
  return useQuery({
    queryKey: [...KEY, 'lab', 'parameters'],
    queryFn: () => api.get<LabParameter[]>(`${BASE}/laboratory/parameters`),
    // Référentiel quasi statique : inutile de le retélécharger en boucle.
    staleTime: 60 * 60 * 1000,
  });
}

export function useLabQueue() {
  return useQuery({
    queryKey: [...KEY, 'lab', 'queue'],
    queryFn: () => api.get<LabQueueItem[]>(`${BASE}/laboratory/queue`),
  });
}

export function useAnalysis(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'lab', 'analysis', id],
    queryFn: () => api.get<PortalAnalysisDetail>(`${BASE}/laboratory/analyses/${id}`),
    enabled: !!id,
  });
}

export function useAnalysisBySample(sampleId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'lab', 'by-sample', sampleId],
    queryFn: () => api.get<PortalAnalysisDetail>(`${BASE}/laboratory/by-sample/${sampleId}`),
    enabled: !!sampleId,
    // 404 attendu tant qu'aucune analyse n'est ouverte : ne pas insister.
    retry: false,
  });
}

export function useOpenAnalysis() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (body: {
      sampleId: string;
      labId: string;
      assignedToId?: string;
      expectedCompletion?: string;
    }) => api.post<PortalAnalysisDetail>(`${BASE}/laboratory/analyses`, body),
    onSuccess: invalidate,
  });
}

export function useSaveAnalysisResults() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      results: { parameterKey: string; value?: string; details?: Record<string, unknown> }[];
      analysisDate?: string;
      conclusion?: string;
      internalNotes?: string;
    }) =>
      api.patch<PortalAnalysisDetail>(`${BASE}/laboratory/analyses/${vars.id}/results`, {
        results: vars.results,
        analysisDate: vars.analysisDate,
        conclusion: vars.conclusion,
        internalNotes: vars.internalNotes,
      }),
    onSuccess: invalidate,
  });
}

export function useCompleteAnalysis() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (id: string) => api.post<PortalAnalysisDetail>(`${BASE}/laboratory/analyses/${id}/complete`),
    onSuccess: invalidate,
  });
}

export function useUploadAnalysisFile() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; file: File }) => {
      const form = new FormData();
      form.append('file', vars.file);
      return api.post<LabAnalysisFile>(`${BASE}/laboratory/analyses/${vars.id}/files`, form);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAnalysisFile() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (fileId: string) => api.delete(`${BASE}/laboratory/files/${fileId}`),
    onSuccess: invalidate,
  });
}

// --- Décision ------------------------------------------------------------------------

export function useDecisionQueue() {
  return useQuery({
    queryKey: [...KEY, 'decisions', 'queue'],
    queryFn: () => api.get<DecisionQueueItem[]>(`${BASE}/decisions/queue`),
  });
}

export function useDecision(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'decisions', id],
    queryFn: () => api.get<PortalDecisionDetail>(`${BASE}/decisions/${id}`),
    enabled: !!id,
  });
}

export function useOpenDecision() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (analysisId: string) =>
      api.post<PortalDecisionDetail>(`${BASE}/decisions/open/${analysisId}`),
    onSuccess: invalidate,
  });
}

export function useSaveDecisionDraft() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; comments?: string; evaluation?: DecisionEvaluation }) =>
      api.patch<PortalDecisionDetail>(`${BASE}/decisions/${vars.id}/draft`, {
        comments: vars.comments,
        evaluation: vars.evaluation,
      }),
    onSuccess: invalidate,
  });
}

export function useConfirmDecision() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      outcome: DecisionOutcome;
      comments?: string;
      evaluation?: DecisionEvaluation;
    }) =>
      api.post<PortalDecisionDetail>(`${BASE}/decisions/${vars.id}/confirm`, {
        outcome: vars.outcome,
        comments: vars.comments,
        evaluation: vars.evaluation,
      }),
    onSuccess: invalidate,
  });
}

// --- Étalons --------------------------------------------------------------------------

export interface ReferenceHoneyFilters {
  search?: string;
  honeyType?: string;
  region?: string;
  harvestSeason?: string;
  isActive?: boolean;
  sort?: 'NEWEST' | 'OLDEST' | 'CODE';
  page?: number;
  pageSize?: number;
}

export function useReferenceHoneys(filters: ReferenceHoneyFilters) {
  return useQuery({
    queryKey: [...KEY, 'reference-honeys', filters],
    queryFn: () => api.get<ReferenceHoneysPage>(`${BASE}/reference-honeys${qs({ ...filters })}`),
    placeholderData: (previous) => previous,
  });
}

export function useReferenceHoney(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'reference-honeys', id],
    queryFn: () => api.get<ReferenceHoney>(`${BASE}/reference-honeys/${id}`),
    enabled: !!id,
  });
}

export type ReferenceHoneyInput = {
  honeyType: string;
  region: string;
  harvestSeason: string;
  collectionDate?: string;
  color?: string;
  texture?: string;
  floralSource?: string;
  notes?: string;
  photos?: string[];
};

export function useSaveReferenceHoney() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id?: string; input: ReferenceHoneyInput }) =>
      vars.id
        ? api.patch<ReferenceHoney>(`${BASE}/reference-honeys/${vars.id}`, vars.input)
        : api.post<ReferenceHoney>(`${BASE}/reference-honeys`, vars.input),
    onSuccess: invalidate,
  });
}

export function useSetReferenceHoneyActive() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; isActive: boolean }) =>
      api.post<ReferenceHoney>(
        `${BASE}/reference-honeys/${vars.id}/${vars.isActive ? 'activate' : 'deactivate'}`,
      ),
    onSuccess: invalidate,
  });
}

export function useUploadReferencePhoto() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<{ url: string }>(`${BASE}/reference-honeys/photo`, form);
    },
  });
}

/**
 * Télécharge un fichier interne (bulletin, document produit).
 *
 * Les pièces ne sont jamais publiques : la route métier, soumise aux droits de
 * l'utilisateur, renvoie une URL signée à durée limitée, et c'est elle qu'on
 * récupère en blob pour déclencher l'enregistrement.
 */
async function downloadSignedFile(endpoint: string, fallbackName: string): Promise<void> {
  const { url, fileName } = await api.get<{ url: string; fileName: string }>(endpoint);
  const response = await fetch(resolveFileUrl(url));
  if (!response.ok) throw new Error('download-failed');

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function downloadAnalysisFile(file: LabAnalysisFile): Promise<void> {
  return downloadSignedFile(`${BASE}/laboratory/files/${file.id}/download`, file.fileName);
}

export function downloadProductDocument(document: { id: string; fileName: string }): Promise<void> {
  return downloadSignedFile(`${BASE}/products/documents/${document.id}/download`, document.fileName);
}
