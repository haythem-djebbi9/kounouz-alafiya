import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, API_URL } from '../../lib/api';
import { tokenStorage } from '../../lib/tokenStorage';
import type {
  BatchBucket,
  BatchDetail,
  BatchesPage,
  BatchStatus,
  BatchTimelineEntry,
  EligibleVerification,
  PackagingDetail,
  PackagingQueueItem,
  PackagingStatus,
  ProductDocumentFile,
  ProductQueueItem,
  BatchProduct,
  QrCodeDetail,
  QrCodeStatus,
  QrCodesPage,
  QrGeneration,
  QrOptions,
  QrQueueItem,
} from './types';

// Chaîne commerciale : lot vérifié → emballage → produit → QR (§13 à §17).
// Les hooks du moteur de vérification vivent dans ./hooks ; on partage la même
// clé de cache pour qu'une écriture ici rafraîchisse aussi les écrans amont.

const BASE = '/verification-portal';
const KEY = ['verifier'] as const;

function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

function useInvalidatePortal() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEY });
}

// --- Lots vérifiés (B01 / B04) ------------------------------------------------

export interface BatchFilters {
  bucket?: BatchBucket;
  search?: string;
  honeyType?: string;
  governorate?: string;
  from?: string;
  to?: string;
  sort?: 'NEWEST' | 'OLDEST';
  page?: number;
  pageSize?: number;
}

export function useVerifiedBatches(filters: BatchFilters) {
  return useQuery({
    queryKey: [...KEY, 'batches', filters],
    queryFn: () => api.get<BatchesPage>(`${BASE}/batches${qs({ ...filters })}`),
    placeholderData: (previous) => previous,
  });
}

export function useBatch(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'batches', id],
    queryFn: () => api.get<BatchDetail>(`${BASE}/batches/${id}`),
    enabled: !!id,
  });
}

export function useBatchTimeline(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'batches', id, 'timeline'],
    queryFn: () => api.get<BatchTimelineEntry[]>(`${BASE}/batches/${id}/timeline`),
    enabled: !!id,
  });
}

export function useEligibleVerifications() {
  return useQuery({
    queryKey: [...KEY, 'batches', 'eligible'],
    queryFn: () => api.get<EligibleVerification[]>(`${BASE}/batches/eligible-verifications`),
  });
}

export function useCreateBatch() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (body: {
      verificationId: string;
      quantityKg: number;
      productionDate: string;
      origin?: string;
      harvestSeason?: string;
      expiryDate?: string;
      bestBefore?: string;
      notes?: string;
    }) => api.post<BatchDetail>(`${BASE}/batches`, body),
    onSuccess: invalidate,
  });
}

export function useAdvanceBatch() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; status: BatchStatus }) =>
      api.post<BatchDetail>(`${BASE}/batches/${vars.id}/advance`, { status: vars.status }),
    onSuccess: invalidate,
  });
}

export function useHoldBatch() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; status: 'SUSPENDED' | 'RECALLED'; reason: string }) =>
      api.post<BatchDetail>(`${BASE}/batches/${vars.id}/hold`, {
        status: vars.status,
        reason: vars.reason,
      }),
    onSuccess: invalidate,
  });
}

export function useReleaseBatch() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (id: string) => api.post<BatchDetail>(`${BASE}/batches/${id}/release`),
    onSuccess: invalidate,
  });
}

// --- Emballage (B02) -----------------------------------------------------------

export function usePackagingQueue() {
  return useQuery({
    queryKey: [...KEY, 'packaging', 'queue'],
    queryFn: () => api.get<PackagingQueueItem[]>(`${BASE}/packaging/queue`),
  });
}

export function usePackaging(batchId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'packaging', batchId],
    queryFn: () => api.get<PackagingDetail>(`${BASE}/packaging/by-batch/${batchId}`),
    enabled: !!batchId,
    // 404 attendu tant que le dossier d'emballage n'est pas ouvert.
    retry: false,
  });
}

export function useSavePackaging() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: ({
      batchId,
      ...body
    }: {
      batchId: string;
      packageType: string;
      size: string;
      productionDate: string;
      packagingLine?: string;
      unitsPlanned?: number;
      expiryDate?: string;
      notes?: string;
    }) => api.put<PackagingDetail>(`${BASE}/packaging/by-batch/${batchId}`, body),
    onSuccess: invalidate,
  });
}

export function useSavePackagingUnit() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: ({
      batchId,
      unitId,
      ...body
    }: {
      batchId: string;
      unitId?: string;
      unitSize: string;
      quantity: number;
      packagingDate?: string;
      expiryDate?: string;
      status?: PackagingStatus;
    }) =>
      unitId
        ? api.patch<PackagingDetail>(`${BASE}/packaging/units/${unitId}`, body)
        : api.post<PackagingDetail>(`${BASE}/packaging/by-batch/${batchId}/units`, body),
    onSuccess: invalidate,
  });
}

export function useDeletePackagingUnit() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (unitId: string) => api.delete(`${BASE}/packaging/units/${unitId}`),
    onSuccess: invalidate,
  });
}

export function useCompletePackaging() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (batchId: string) =>
      api.post<PackagingDetail>(`${BASE}/packaging/by-batch/${batchId}/complete`),
    onSuccess: invalidate,
  });
}

// --- Produits (B03) --------------------------------------------------------------

export function useProductQueue() {
  return useQuery({
    queryKey: [...KEY, 'products', 'queue'],
    queryFn: () => api.get<ProductQueueItem[]>(`${BASE}/products/queue`),
  });
}

export function useBatchProducts(batchId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'products', 'by-batch', batchId],
    queryFn: () => api.get<BatchProduct[]>(`${BASE}/products/by-batch/${batchId}`),
    enabled: !!batchId,
  });
}

export function useBatchProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'products', id],
    queryFn: () => api.get<BatchProduct>(`${BASE}/products/${id}`),
    enabled: !!id,
  });
}

export interface ProductInput {
  categorieId: string;
  nom: string;
  description?: string;
  prix: number;
  stock?: number;
  netWeightG?: number;
  ingredients?: string;
  storageInstructions?: string;
  shelfLife?: string;
  tags?: string[];
  images?: string[];
  gamme?: string;
}

export function useSaveProduct() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id?: string; batchId?: string; input: ProductInput }) =>
      vars.id
        ? api.patch<BatchProduct>(`${BASE}/products/${vars.id}`, vars.input)
        : api.post<BatchProduct>(`${BASE}/products`, { ...vars.input, batchId: vars.batchId }),
    onSuccess: invalidate,
  });
}

export function useAddProductVariant() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: ({ productId, ...body }: { productId: string; packageSize: string; price: number; stock?: number }) =>
      api.post<BatchProduct>(`${BASE}/products/${productId}/variants`, body),
    onSuccess: invalidate,
  });
}

export function useUpdateProductVariant() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: ({
      variantId,
      ...body
    }: {
      variantId: string;
      price?: number;
      stock?: number;
      status?: 'ACTIVE' | 'INACTIVE';
    }) => api.patch<BatchProduct>(`${BASE}/products/variants/${variantId}`, body),
    onSuccess: invalidate,
  });
}

export function useActivateProduct() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (id: string) => api.post<BatchProduct>(`${BASE}/products/${id}/activate`),
    onSuccess: invalidate,
  });
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post<{ url: string }>(`${BASE}/products/image`, form);
    },
  });
}

export function useUploadProductDocument() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { id: string; file: File; type?: string }) => {
      const form = new FormData();
      form.append('file', vars.file);
      form.append('type', vars.type ?? 'OTHER');
      return api.post<ProductDocumentFile>(`${BASE}/products/${vars.id}/documents`, form);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteProductDocument() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (documentId: string) => api.delete(`${BASE}/products/documents/${documentId}`),
    onSuccess: invalidate,
  });
}

// --- QR (Q01 / Q02) ----------------------------------------------------------------

export function useQrQueue() {
  return useQuery({
    queryKey: [...KEY, 'qr', 'queue'],
    queryFn: () => api.get<QrQueueItem[]>(`${BASE}/qr/queue`),
  });
}

export interface QrFilters {
  search?: string;
  productId?: string;
  batchId?: string;
  status?: QrCodeStatus;
  scanned?: boolean;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function useQrCodes(filters: QrFilters) {
  return useQuery({
    queryKey: [...KEY, 'qr', 'codes', filters],
    queryFn: () => api.get<QrCodesPage>(`${BASE}/qr/codes${qs({ ...filters })}`),
    placeholderData: (previous) => previous,
  });
}

export function useQrCode(qrId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'qr', 'code', qrId],
    queryFn: () => api.get<QrCodeDetail>(`${BASE}/qr/codes/${qrId}`),
    enabled: !!qrId,
  });
}

export function useQrGenerations(batchId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'qr', 'generations', batchId],
    queryFn: () => api.get<QrGeneration[]>(`${BASE}/qr/generations/by-batch/${batchId}`),
    enabled: !!batchId,
  });
}

export function useGenerateQrCodes() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (body: {
      productId: string;
      quantity: number;
      qrType: string;
      qrFormat: string;
      destinationUrl?: string;
      language: string;
      template: string;
      options?: QrOptions;
    }) => api.post<QrGeneration>(`${BASE}/qr/generate`, body),
    onSuccess: invalidate,
  });
}

export function useSetQrStatus() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (vars: { qrId: string; status: QrCodeStatus }) =>
      api.post<QrCodeDetail>(
        `${BASE}/qr/codes/${vars.qrId}/${vars.status === 'ACTIVE' ? 'activate' : 'deactivate'}`,
      ),
    onSuccess: invalidate,
  });
}

export function useBulkDeactivateQr() {
  const invalidate = useInvalidatePortal();
  return useMutation({
    mutationFn: (qrIds: string[]) =>
      api.post<{ updated: number }>(`${BASE}/qr/codes/bulk-deactivate`, { qrIds }),
    onSuccess: invalidate,
  });
}

/**
 * URL de l'image PNG d'un QR.
 *
 * Servie par une route authentifiée : à utiliser via `fetch` puis blob, ou
 * dans un contexte où le jeton accompagne la requête. Pour un simple aperçu,
 * préférer `useQrImage`.
 */
export function qrImagePath(qrId: string): string {
  return `${API_URL}/verification-portal/qr/codes/${qrId}/image`;
}

/**
 * Charge l'image d'un QR en objet URL.
 *
 * L'image est derrière l'authentification : une balise `img` pointant
 * directement sur l'URL enverrait une requête sans jeton et afficherait une
 * image cassée.
 */
export function useQrImage(qrId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'qr', 'image', qrId],
    enabled: !!qrId,
    staleTime: Infinity,
    queryFn: async () => {
      const response = await fetch(qrImagePath(qrId as string), {
        headers: { Authorization: `Bearer ${tokenStorage.getAccessToken() ?? ''}` },
      });
      if (!response.ok) throw new Error('qr-image-failed');
      return URL.createObjectURL(await response.blob());
    },
  });
}

/** Télécharge l'export CSV d'une campagne (numéro de série + URL publique). */
export async function downloadQrGeneration(generationId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/verification-portal/qr/generations/${generationId}/export`,
    { headers: { Authorization: `Bearer ${tokenStorage.getAccessToken() ?? ''}` } },
  );
  if (!response.ok) throw new Error('export-failed');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `qr-${generationId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
