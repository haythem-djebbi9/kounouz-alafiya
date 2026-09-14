import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { LabAnalysis, LabAnalysisStatus, Laboratory, ReferenceSample } from '../../../lib/api-types';

export function useLaboratories() {
  return useQuery({
    queryKey: ['admin', 'laboratories'],
    queryFn: () => api.get<Laboratory[]>('/laboratories'),
  });
}

export interface CreateLaboratoryInput {
  name: string;
  accreditationNo: string;
  country: string;
  contactInfo: string;
}

export function useCreateLaboratory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLaboratoryInput) => api.post<Laboratory>('/laboratories', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'laboratories'] }),
  });
}

export function useLabAnalyses() {
  return useQuery({
    queryKey: ['admin', 'lab-analyses'],
    queryFn: () => api.get<LabAnalysis[]>('/lab-analyses'),
  });
}

export interface CreateLabAnalysisInput {
  sampleId: string;
  labId: string;
  analysisDate: string;
  reportFileUrl?: string;
  results: Record<string, unknown>;
  status: LabAnalysisStatus;
}

export function useCreateLabAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLabAnalysisInput) => api.post<LabAnalysis>('/lab-analyses', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lab-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'samples'] });
    },
  });
}

export function useReferenceSamples() {
  return useQuery({
    queryKey: ['admin', 'reference-samples'],
    queryFn: () => api.get<ReferenceSample[]>('/reference-samples'),
  });
}

export interface CreateReferenceSampleInput {
  sampleId: string;
  storageLocation: string;
  storageConditions: string;
  retentionPeriod: string;
}

export function useCreateReferenceSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReferenceSampleInput) => api.post<ReferenceSample>('/reference-samples', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reference-samples'] }),
  });
}
