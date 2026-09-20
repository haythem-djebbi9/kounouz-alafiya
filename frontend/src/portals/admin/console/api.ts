import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, API_URL } from '../../../lib/api';
import { tokenStorage } from '../../../lib/tokenStorage';
import type { Role } from '../../../lib/api-types';

// Données de la console d'administration (/api/admin/*).

const KEY = ['admin-console'] as const;

export function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'ALL') continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

/** Téléchargement authentifié d'un export CSV. */
export async function downloadCsv(path: string, params: Record<string, unknown>, filename: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}${qs(params)}`, {
    headers: { Authorization: `Bearer ${tokenStorage.getAccessToken() ?? ''}` },
  });
  if (!response.ok) throw new Error('export-failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEY });
}

// --- Types partagés -----------------------------------------------------------

export interface Kpi {
  total: number;
  delta: number | null;
}
export interface ShareKpi {
  total: number;
  share: number;
}
export interface PeriodParams {
  from?: string;
  to?: string;
}
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export type Granularity = 'day' | 'week' | 'month';

export interface ActorRef {
  id: string;
  name: string;
  email?: string;
  role: Role;
  producer?: { avatarUrl: string | null } | null;
}

export type AuditStatus = 'SUCCESS' | 'FAILED' | 'WARNING';
export type ActionType =
  | 'SYSTEM'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'GENERATE'
  | 'REJECT'
  | 'VERIFY'
  | 'DELETE'
  | 'CREATE'
  | 'UPDATE';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  actionType?: ActionType;
  entite: string;
  entiteId: string;
  module: string | null;
  details: string | null;
  status: AuditStatus;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: { field?: string; oldValue?: unknown; newValue?: unknown; notes?: string } | null;
  createdAt: string;
  user: ActorRef | null;
}

// --- Tableau de bord ---------------------------------------------------------

export type ScanScope = 'ALL' | 'VALID' | 'SUSPICIOUS';

export type DashboardAlert =
  | { kind: 'COUNTERFEIT'; id: string; code: string; type: AlertType; severity: AlertSeverity; location: string | null; count: number; at: string }
  | { kind: 'BATCH_HOLD'; id: string; code: string; status: string; at: string }
  | { kind: 'LAB_PENDING'; id: string; code: string | null; at: string }
  | { kind: 'INVALID_SCANS'; id: string; count: number; at: string };

export interface DashboardData {
  kpis: {
    producers: Kpi;
    laboratories: Kpi;
    products: Kpi;
    batches: Kpi;
    qrCodes: Kpi;
    verifiedBatches: Kpi & { share: number };
  };
  scansOverTime: { month: string; total: number; valid: number }[];
  verificationStatus: { total: number; items: { key: 'VERIFIED' | 'PENDING' | 'SUSPENDED'; count: number; share: number }[] };
  scanLocations: { total: number; regions: RegionCount[] };
  topProducts: { id: string; nom: string; image: string | null; count: number }[];
  recentActivities: AuditLogEntry[];
  alerts: DashboardAlert[];
  system: {
    users: number;
    activeUsers: number;
    producers: number;
    verificationTeam: number;
    samples: number;
    labResults: number;
    referenceSamples: number;
    storage: { bytes: number; files: number };
  };
}

export interface RegionCount {
  governorate: string;
  count: number;
  share: number;
}

export function useAdminDashboard(months: number, scope: ScanScope) {
  return useQuery({
    queryKey: [...KEY, 'dashboard', months, scope],
    queryFn: () => api.get<DashboardData>(`/admin/dashboard${qs({ months, scope })}`),
    placeholderData: keepPreviousData,
  });
}

export interface SearchResults {
  producers: { id: string; name: string; farmName: string; governorate: string | null; status: string }[];
  users: { id: string; name: string; email: string; role: Role }[];
  batches: { id: string; batchCode: string; honeyType: string; status: string }[];
  qrCodes: { id: string; qrId: string; qrCode: string; status: string; product: { nom: string } }[];
  products: { id: string; nom: string; statut: string }[];
  laboratories: { id: string; name: string; city: string | null; country: string; status: LaboratoryStatus }[];
  alerts: { id: string; alertCode: string; type: AlertType; status: AlertStatus }[];
}

export function useAdminSearch(q: string) {
  return useQuery({
    queryKey: [...KEY, 'search', q],
    queryFn: () => api.get<SearchResults>(`/admin/search${qs({ q })}`),
    enabled: q.trim().length >= 2,
    staleTime: 30000,
  });
}

// --- Utilisateurs --------------------------------------------------------------

export type StaffRole = 'ADMIN' | 'VERIFICATION_TEAM' | 'FIELD_AGENT';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  phone: string | null;
  location: string | null;
  lastLoginAt: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  organization: string | null;
  displayLocation: string | null;
  avatarUrl: string | null;
  producer: { id: string; farmName: string; governorate: string | null; status: string } | null;
}

export interface UsersQuery {
  page: number;
  pageSize: number;
  search?: string;
  role?: Role | 'ALL';
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  lastLogin?: string;
  sort?: string;
}

export interface UsersPage extends Paged<AdminUser> {
  stats: Record<'ALL' | Role, Kpi>;
}

export function useAdminUsers(query: UsersQuery) {
  return useQuery({
    queryKey: [...KEY, 'users', query],
    queryFn: () => api.get<UsersPage>(`/admin/users${qs({ ...query })}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'user', id],
    queryFn: () => api.get<AdminUser & { recentActivity: AuditLogEntry[]; activityCount: number }>(`/admin/users/${id}`),
    enabled: !!id,
  });
}

export interface UserInput {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  phone?: string;
  location?: string;
}

export function useCreateUser() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input: UserInput) => api.post<AdminUser>('/admin/users', input), onSuccess: invalidate });
}

export function useUpdateUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; role?: StaffRole; phone?: string; location?: string }) =>
      api.patch<AdminUser>(`/admin/users/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useSetUserStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch<AdminUser>(`/admin/users/${id}/status`, { isActive }),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => api.post<void>(`/admin/users/${id}/reset-password`, { password }),
    onSuccess: invalidate,
  });
}

// --- Producteurs ---------------------------------------------------------------

export type ProducerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface ProducersOverview {
  kpis: {
    total: Kpi;
    active: ShareKpi;
    pending: ShareKpi;
    suspended: ShareKpi;
    rejected: ShareKpi;
    regions: number;
  };
  byRegion: { governorate: string; count: number }[];
  unknownRegion: number;
  byStatus: { key: ProducerStatus; count: number; share: number }[];
  newProducers: { count: number; delta: number | null; buckets: { from: string; count: number }[] };
  avgVerificationDays: { value: number | null; sample: number; delta: number | null };
}

export interface AdminProducer {
  id: string;
  userId: string;
  name: string;
  farmName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  governorate: string | null;
  location: string;
  status: ProducerStatus;
  isVerified: boolean;
  accountActive: boolean;
  lastLoginAt: string | null;
  honeyTypes: string[];
  verification: { status: 'VERIFIED' | 'IN_REVIEW' | 'ISSUE' | 'NONE'; date: string | null };
  batches: number;
  products: number;
  createdAt: string;
}

export interface ProducersQuery {
  page: number;
  pageSize: number;
  search?: string;
  region?: string;
  status?: ProducerStatus | 'ALL';
  honeyType?: string;
  verification?: string;
}

export function useProducersOverview() {
  return useQuery({
    queryKey: [...KEY, 'producers', 'overview'],
    queryFn: () => api.get<ProducersOverview>('/admin/producers/overview'),
  });
}

export function useAdminProducers(query: ProducersQuery) {
  return useQuery({
    queryKey: [...KEY, 'producers', 'list', query],
    queryFn: () => api.get<Paged<AdminProducer> & { honeyTypes: string[] }>(`/admin/producers${qs({ ...query })}`),
    placeholderData: keepPreviousData,
  });
}

export interface ProducerInput {
  name: string;
  email: string;
  password: string;
  farmName: string;
  governorate: string;
  phone?: string;
  status?: 'PENDING' | 'ACTIVE';
}

export function useCreateProducer() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input: ProducerInput) => api.post('/admin/producers', input), onSuccess: invalidate });
}

export function useSetProducerStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: ProducerStatus; note?: string }) =>
      api.patch(`/admin/producers/${id}/status`, { status, note }),
    onSuccess: invalidate,
  });
}

// --- Laboratoires ----------------------------------------------------------------

export type LaboratoryStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface Accreditation {
  id: string;
  name: string;
  issuingBody: string | null;
  certificateNumber: string | null;
  validUntil: string | null;
  state: 'VALID' | 'EXPIRED';
}

export interface AdminLaboratory {
  id: string;
  name: string;
  tagline: string | null;
  accreditationNo: string;
  country: string;
  countryCode: string | null;
  city: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  contactName: string | null;
  notes: string | null;
  status: LaboratoryStatus;
  createdAt: string;
  updatedAt: string;
  accreditations: Accreditation[];
  samplesAnalyzed?: number;
}

export interface LaboratoriesPage extends Paged<AdminLaboratory> {
  kpis: { total: Kpi; active: ShareKpi; pending: ShareKpi; suspended: ShareKpi; countries: string[] };
  filters: { countries: string[]; accreditations: string[] };
}

export interface LaboratoryDetail extends AdminLaboratory {
  stats: {
    months: number;
    samples: { value: number; delta: number | null };
    batches: { value: number; delta: number | null };
    verified: { value: number; rate: number; delta: number | null };
    avgTurnaroundDays: { value: number | null; delta: number | null };
  };
  recentActivity: (AuditLogEntry & { user: ActorRef | null })[];
}

export interface LaboratoriesQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: LaboratoryStatus | 'ALL';
  country?: string;
  accreditation?: string;
}

export function useAdminLaboratories(query: LaboratoriesQuery) {
  return useQuery({
    queryKey: [...KEY, 'laboratories', query],
    queryFn: () => api.get<LaboratoriesPage>(`/admin/laboratories${qs({ ...query })}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminLaboratory(id: string | null, months: number) {
  return useQuery({
    queryKey: [...KEY, 'laboratory', id, months],
    queryFn: () => api.get<LaboratoryDetail>(`/admin/laboratories/${id}${qs({ months })}`),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

export type LaboratoryInput = Partial<
  Pick<AdminLaboratory, 'name' | 'country' | 'city' | 'address' | 'email' | 'phone' | 'website' | 'tagline' | 'contactName' | 'notes'>
> & { accreditationNo?: string; status?: 'PENDING' | 'ACTIVE' };

export function useCreateLaboratory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: LaboratoryInput) => api.post<AdminLaboratory>('/admin/laboratories', input),
    onSuccess: invalidate,
  });
}

export function useUpdateLaboratory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: LaboratoryInput & { id: string }) => api.patch<AdminLaboratory>(`/admin/laboratories/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useSetLaboratoryStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: LaboratoryStatus; note?: string }) =>
      api.patch(`/admin/laboratories/${id}/status`, { status, note }),
    onSuccess: invalidate,
  });
}

export function useAddAccreditation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ labId, ...input }: { labId: string; name: string; issuingBody?: string; certificateNumber?: string; validUntil?: string }) =>
      api.post<Accreditation>(`/admin/laboratories/${labId}/accreditations`, input),
    onSuccess: invalidate,
  });
}

export function useRemoveAccreditation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ labId, id }: { labId: string; id: string }) => api.delete(`/admin/laboratories/${labId}/accreditations/${id}`),
    onSuccess: invalidate,
  });
}

// --- Journal d'audit ----------------------------------------------------------------

export interface AuditQuery extends PeriodParams {
  page: number;
  pageSize: number;
  search?: string;
  module?: string;
  actionType?: ActionType | 'ALL';
  userId?: string;
  status?: AuditStatus | 'ALL';
  entityId?: string;
}

export interface AuditStats {
  period: { from: string; to: string };
  totalLogs: Kpi;
  activeUsers: Kpi;
  securityAlerts: Kpi;
  uptime: { seconds: number; since: string };
  filters: { modules: string[]; users: { id: string; name: string; role: Role }[]; actionTypes: ActionType[] };
}

export function useAuditLogs(query: AuditQuery) {
  return useQuery({
    queryKey: [...KEY, 'audit', query],
    queryFn: () => api.get<Paged<AuditLogEntry>>(`/admin/audit-logs${qs({ ...query })}`),
    placeholderData: keepPreviousData,
  });
}

export function useAuditStats(period: PeriodParams) {
  return useQuery({
    queryKey: [...KEY, 'audit-stats', period],
    queryFn: () => api.get<AuditStats>(`/admin/audit-logs/stats${qs({ ...period })}`),
    placeholderData: keepPreviousData,
  });
}

export function useAuditLog(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'audit-log', id],
    queryFn: () => api.get<AuditLogEntry & { trailCount: number }>(`/admin/audit-logs/${id}`),
    enabled: !!id,
  });
}

// --- Analyse des scans --------------------------------------------------------------

export type ScanResult = 'VALID' | 'SUSPICIOUS' | 'INVALID';
export type DeviceKey = 'MOBILE' | 'DESKTOP' | 'TABLET' | 'OTHER';

export interface CountryCount {
  code: string | null;
  name: string | null;
  lat: number | null;
  lng: number | null;
  count: number;
  notValid: number;
  share: number;
}

export interface ScanAnalytics {
  period: { from: string; to: string; granularity: Granularity };
  kpis: {
    totalScans: Kpi;
    uniqueScanners: Kpi;
    validScans: Kpi & { share: number };
    suspiciousScans: Kpi & { share: number };
    countries: Kpi;
  };
  resultBreakdown: { total: number; valid: number; suspicious: number; invalid: number };
  overTime: { date: string; total: number; valid: number; notValid: number }[];
  devices: { key: DeviceKey; count: number; share: number }[];
  countries: CountryCount[];
  regions: RegionCount[];
  topProducts: { id: string; nom: string; image: string | null; count: number; notValid: number; scanners: number }[];
  topBatches: { id: string; batchCode: string; honeyType: string; status: string; count: number; notValid: number; scannedCodes: number }[];
  recentScans: {
    id: string;
    scannedAt: string;
    location: string | null;
    countryCode: string | null;
    governorate: string | null;
    deviceType: DeviceKey | null;
    result: ScanResult;
    product: { id: string; nom: string } | null;
    qrCode: string | null;
    scannerType: 'NEW' | 'RETURNING';
  }[];
  flow: { byHour: { hour: number; count: number }[]; byWeekday: { weekday: number; count: number }[] };
  journey: { buckets: { key: string; scanners: number }[]; scanners: number; newScanners: number; repeatShare: number };
  insights: { newScannerShare: number; avgScansPerScanner: number; scanGrowth: number | null; trustedShare: number };
}

export function useScanAnalytics(period: PeriodParams) {
  return useQuery({
    queryKey: [...KEY, 'scans', period],
    queryFn: () => api.get<ScanAnalytics>(`/admin/analytics/scans${qs({ ...period })}`),
    placeholderData: keepPreviousData,
  });
}

// --- Alertes anti-contrefaçon ---------------------------------------------------------

export type AlertType = 'SUSPECTED_DUPLICATE' | 'UNUSUAL_LOCATION' | 'INVALID_QR' | 'TAMPERED_LABEL' | 'BULK_SCAN';
export type AlertStatus = 'OPEN' | 'INVESTIGATING' | 'CONFIRMED' | 'RESOLVED' | 'DISMISSED';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CounterfeitAlert {
  id: string;
  alertCode: string;
  type: AlertType;
  status: AlertStatus;
  severity: AlertSeverity;
  scannedIdentifier: string | null;
  location: string | null;
  country: string | null;
  countryCode: string | null;
  deviceInfo: string | null;
  deviceType: DeviceKey | null;
  ipAddress: string | null;
  scanCount: number;
  details: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  lastSeenAt: string;
  createdAt: string;
  qrCode: { id: string; qrId: string; qrCode: string; serialNumber: string | null; status: string } | null;
  product: { id: string; nom: string; images: string[] } | null;
  batch: { id: string; batchCode: string; status: string; honeyType: string } | null;
  resolvedBy: { id: string; name: string } | null;
}

export interface AlertDetail extends CounterfeitAlert {
  relatedScans: {
    id: string;
    scannedAt: string;
    location: string | null;
    countryCode: string | null;
    deviceInfo: string | null;
    deviceType: DeviceKey | null;
    ipAddress: string | null;
    result: ScanResult;
  }[];
  relatedAlerts: { id: string; alertCode: string; type: AlertType; status: AlertStatus; createdAt: string }[];
  trail: (AuditLogEntry & { user: { id: string; name: string } | null })[];
}

export interface AlertStats {
  period: { from: string; to: string; granularity: Granularity };
  kpis: {
    total: Kpi;
    duplicates: Kpi;
    unusualLocations: Kpi;
    invalidOrTampered: Kpi;
    resolved: Kpi;
    open: number;
  };
  overTime: { date: string; total: number; duplicates: number; resolved: number }[];
  byType: { type: AlertType; count: number; share: number }[];
  byCountry: { code: string | null; name: string | null; lat: number | null; lng: number | null; count: number; open: number; risk: 'HIGH' | 'MEDIUM' | 'LOW' }[];
  filters: { products: { id: string; nom: string }[] };
}

export interface AlertsQuery extends PeriodParams {
  page: number;
  pageSize: number;
  search?: string;
  type?: AlertType | 'ALL';
  status?: AlertStatus | 'ALL';
  severity?: AlertSeverity | 'ALL';
  countryCode?: string;
  productId?: string;
}

export function useAlerts(query: AlertsQuery) {
  return useQuery({
    queryKey: [...KEY, 'alerts', query],
    queryFn: () => api.get<Paged<CounterfeitAlert>>(`/admin/alerts${qs({ ...query })}`),
    placeholderData: keepPreviousData,
  });
}

export function useAlertStats(period: PeriodParams) {
  return useQuery({
    queryKey: [...KEY, 'alert-stats', period],
    queryFn: () => api.get<AlertStats>(`/admin/alerts/stats${qs({ ...period })}`),
    placeholderData: keepPreviousData,
  });
}

export function useAlert(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'alert', id],
    queryFn: () => api.get<AlertDetail>(`/admin/alerts/${id}`),
    enabled: !!id,
  });
}

export function useUpdateAlert() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: AlertStatus; note?: string }) =>
      api.patch<CounterfeitAlert>(`/admin/alerts/${id}`, { status, note }),
    onSuccess: invalidate,
  });
}

// --- Vérification & activité commerciale ------------------------------------------------

export interface BusinessAnalytics {
  period: { from: string; to: string; granularity: Granularity };
  kpis: {
    verifiedBatches: Kpi;
    totalScans: Kpi;
    uniqueConsumers: Kpi;
    totalSales: Kpi;
    orders: Kpi;
    fraudAttempts: Kpi;
    verificationRate: { total: number; deltaPoints: number | null; decided: number };
  };
  series: { date: string; scans: number; sales: number; verifications: number }[];
  categories: { total: number; items: { key: string; count: number; share: number }[] };
  topHoneyTypes: { honeyType: string; verifiedBatches: number; scans: number; revenue: number }[];
  regions: RegionCount[];
  origins: CountryCount[];
  funnel: { key: 'TOTAL_SCANS' | 'VALID_SCANS' | 'VERIFIED_PRODUCTS' | 'ORDERS'; count: number; share: number }[];
  recentVerifications: {
    id: string;
    code: string | null;
    status: 'VERIFIED' | 'NOT_VERIFIED';
    verifiedAt: string;
    honeyType: string;
    batchCode: string | null;
    batchId: string | null;
    producer: { id: string; name: string };
    governorate: string | null;
  }[];
  salesByChannel: { channel: string; orders: number; revenue: number; share: number }[];
  topProducers: { id: string; name: string; farmName: string; revenue: number; units: number; verifiedBatches: number }[];
  trends: { month: string; scans: number; sales: number; verifications: number }[];
  insights: {
    scanGrowth: number | null;
    consumersGrowth: number | null;
    scanToPurchaseRate: number;
    scanToPurchaseDeltaPoints: number | null;
    fraudChange: number | null;
    averageOrderValue: number;
  };
}

export function useBusinessAnalytics(period: PeriodParams) {
  return useQuery({
    queryKey: [...KEY, 'business', period],
    queryFn: () => api.get<BusinessAnalytics>(`/admin/analytics/business${qs({ ...period })}`),
    placeholderData: keepPreviousData,
  });
}
