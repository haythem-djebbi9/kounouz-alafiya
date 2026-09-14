import { useQuery } from '@tanstack/react-query';
import { api, API_URL } from '../../../lib/api';
import { tokenStorage } from '../../../lib/tokenStorage';
import type { AntiFraudStats, ByProducerRow, OperationsSummary } from '../../../lib/api-types';

export function useOperationsSummary() {
  return useQuery({
    queryKey: ['admin', 'reports', 'operations'],
    queryFn: () => api.get<OperationsSummary>('/reports/operations'),
  });
}

export function useByProducerReport() {
  return useQuery({
    queryKey: ['admin', 'reports', 'by-producer'],
    queryFn: () => api.get<ByProducerRow[]>('/reports/by-producer'),
  });
}

export function useAntiFraudStats() {
  return useQuery({
    queryKey: ['admin', 'anti-fraud', 'stats'],
    queryFn: () => api.get<AntiFraudStats>('/anti-fraud/stats'),
  });
}

// Les exports (CSV/PDF) sont des téléchargements de fichiers : on ne peut pas
// utiliser une simple balise <a href> car l'API exige un jeton d'authentification.
export async function downloadReport(path: string, filename: string) {
  const accessToken = tokenStorage.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    throw new Error("Échec du téléchargement du rapport.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
