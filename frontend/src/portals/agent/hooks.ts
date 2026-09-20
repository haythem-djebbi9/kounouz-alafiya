import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type {
  AgentEventType,
  AgentRequest,
  Assignment,
  AssignmentDetail,
  AssignmentScope,
  CustodyDetail,
  CustodyListItem,
  DashboardData,
  HarvestSource,
  LatLng,
  ReportsData,
  SearchResults,
  WeatherSnapshot,
} from './types';
import { localDayRange } from './utils';

const BASE = '/field-agent';

function dayQuery() {
  const { from, to } = localDayRange();
  return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

// --- Lecture ---------------------------------------------------------------

export function useAgentDashboard() {
  return useQuery({
    queryKey: ['field-agent', 'dashboard'],
    queryFn: () => api.get<DashboardData>(`${BASE}/dashboard?${dayQuery()}`),
    refetchInterval: 60_000,
  });
}

export function useAssignments(scope: AssignmentScope, search = '') {
  return useQuery({
    queryKey: ['field-agent', 'assignments', scope, search],
    queryFn: () =>
      api.get<Assignment[]>(
        `${BASE}/assignments?scope=${scope}&${dayQuery()}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAvailableCollections() {
  return useQuery({
    queryKey: ['field-agent', 'available'],
    queryFn: () => api.get<AgentRequest[]>(`${BASE}/assignments/available`),
  });
}

export function useAssignment(id: string | undefined) {
  return useQuery({
    queryKey: ['field-agent', 'assignment', id],
    queryFn: () => api.get<AssignmentDetail>(`${BASE}/assignments/${id}?${dayQuery()}`),
    enabled: !!id,
  });
}

export function useCustodySamples() {
  return useQuery({
    queryKey: ['field-agent', 'samples'],
    queryFn: () => api.get<CustodyListItem[]>(`${BASE}/samples`),
  });
}

export function useCustody(sampleId: string | undefined) {
  return useQuery({
    queryKey: ['field-agent', 'custody', sampleId],
    queryFn: () => api.get<CustodyDetail>(`${BASE}/samples/${sampleId}`),
    enabled: !!sampleId,
    refetchInterval: 60_000,
  });
}

export function useNextSampleCode() {
  return useQuery({
    queryKey: ['field-agent', 'next-sample-code'],
    queryFn: () => api.get<{ sampleCode: string }>(`${BASE}/samples/next-code`),
  });
}

export function useAgentReports(months: number) {
  return useQuery({
    queryKey: ['field-agent', 'reports', months],
    queryFn: () => api.get<ReportsData>(`${BASE}/reports?months=${months}`),
    placeholderData: keepPreviousData,
  });
}

export function useAgentSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ['field-agent', 'search', term],
    queryFn: () => api.get<SearchResults>(`${BASE}/search?q=${encodeURIComponent(term)}`),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });
}

// --- Écriture --------------------------------------------------------------

function useInvalidateAgent() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['field-agent'] });
}

export function useClaimCollection() {
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: (input: { requestId: string; scheduledDate: string; timeWindowStart?: string; timeWindowEnd?: string }) =>
      api.post<Assignment>(`${BASE}/assignments/claim`, input),
    onSuccess: invalidate,
  });
}

export function useStartAssignment() {
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: (id: string) => api.patch<Assignment>(`${BASE}/assignments/${id}/start`),
    onSuccess: invalidate,
  });
}

export function useRescheduleAssignment(id: string) {
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: (input: { scheduledDate: string; timeWindowStart?: string; timeWindowEnd?: string; reason: string }) =>
      api.patch<Assignment>(`${BASE}/assignments/${id}/reschedule`, input),
    onSuccess: invalidate,
  });
}

export function useUpdateEquipment(id: string) {
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: (checkedEquipment: string[]) =>
      api.patch<Assignment>(`${BASE}/assignments/${id}/equipment`, { checkedEquipment }),
    onSuccess: invalidate,
  });
}

export interface CollectSampleInput {
  honeyType: string;
  quantity: number;
  unit: 'g' | 'kg';
  numberOfSamples: number;
  harvestSource: HarvestSource;
  collectionDate: string;
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  location?: string;
  notes?: string;
  photos: string[];
  weather?: WeatherSnapshot;
}

export function useCollectSample(assignmentId: string) {
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: (input: CollectSampleInput) => api.post<Assignment>(`${BASE}/assignments/${assignmentId}/sample`, input),
    onSuccess: invalidate,
  });
}

export interface RegisterSealInput {
  sealCode?: string;
  photoUrl: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  integrityConfirmed: boolean;
}

export function useRegisterSeal() {
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: ({ sampleId, ...input }: RegisterSealInput & { sampleId: string }) =>
      api.post<CustodyDetail>(`${BASE}/samples/${sampleId}/seal`, input),
    onSuccess: invalidate,
  });
}

export function useCompleteAssignment(id: string) {
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: (input: { producerConfirmed: boolean; notes?: string }) =>
      api.patch<Assignment>(`${BASE}/assignments/${id}/complete`, input),
    onSuccess: invalidate,
  });
}

export interface CustodyEventInput {
  type: AgentEventType;
  occurredAt?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  handlerName?: string;
  note?: string;
  evidenceUrl?: string;
}

export function useAddCustodyEvent(sampleId: string) {
  const invalidate = useInvalidateAgent();
  return useMutation({
    mutationFn: (input: CustodyEventInput) => api.post<CustodyDetail>(`${BASE}/samples/${sampleId}/events`, input),
    onSuccess: invalidate,
  });
}

export function useUploadSamplePhoto() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post<{ url: string }>('/uploads/sample-photo', formData);
    },
  });
}

// --- Capteurs du terminal ---------------------------------------------------

export type GeoState =
  | { status: 'idle' | 'locating' }
  | { status: 'ready'; position: LatLng & { accuracy: number } }
  | { status: 'error'; reason: 'denied' | 'unavailable' | 'unsupported' };

/** Position GPS du terminal, relevée à la demande (jamais en continu). */
export function useGeolocation(auto = false) {
  const [state, setState] = useState<GeoState>({ status: 'idle' });

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', reason: 'unsupported' });
      return;
    }
    setState({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          status: 'ready',
          position: {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy),
          },
        }),
      (err) => setState({ status: 'error', reason: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  };

  useEffect(() => {
    if (auto) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return { state, locate };
}

/**
 * Météo actuelle via Open-Meteo (service public sans clé). Sert d'indication
 * de terrain et d'instantané joint au relevé de collecte.
 */
export function useWeather(position: LatLng | null) {
  const lat = position ? position.latitude.toFixed(2) : null;
  const lng = position ? position.longitude.toFixed(2) : null;
  return useQuery({
    queryKey: ['weather', lat, lng],
    enabled: lat !== null && lng !== null,
    staleTime: 15 * 60_000,
    retry: 1,
    queryFn: async (): Promise<WeatherSnapshot> => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`,
      );
      if (!res.ok) throw new Error('weather');
      const data = await res.json();
      return {
        temperature: Math.round(data.current.temperature_2m),
        humidity: Math.round(data.current.relative_humidity_2m),
        windSpeed: Math.round(data.current.wind_speed_10m),
        code: data.current.weather_code,
      };
    },
  });
}
