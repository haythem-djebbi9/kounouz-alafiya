import type { SampleStatus } from '../../lib/api-types';

export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type CollectionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type AssignmentScope = 'TODAY' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ALL';
export type HarvestSource = 'PRODUCTION_HIVES' | 'STORAGE' | 'EXTRACTION' | 'PACKAGED_STOCK';

export const HARVEST_SOURCES: HarvestSource[] = ['PRODUCTION_HIVES', 'STORAGE', 'EXTRACTION', 'PACKAGED_STOCK'];

export type CustodyEventType =
  | 'REGISTERED'
  | 'COLLECTED'
  | 'SEALED'
  | 'RELEASED_FOR_TRANSPORT'
  | 'IN_TRANSIT'
  | 'LOCATION_UPDATE'
  | 'RECEIVED'
  | 'SENT_TO_LAB'
  | 'IN_LABORATORY'
  | 'ANALYSIS_COMPLETED'
  | 'RESULT_ADDED'
  | 'ISSUE';

export type AgentEventType = 'RELEASED_FOR_TRANSPORT' | 'IN_TRANSIT' | 'LOCATION_UPDATE' | 'ISSUE';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface AgentProducer {
  id: string;
  userId: string;
  name: string;
  farmName: string;
  location: string;
  description: string | null;
  phone: string | null;
  avatarUrl: string | null;
  governorate: string | null;
  farmGovernorate: string | null;
  farmDelegation: string | null;
  farmAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  hivesCount: number | null;
  farmPhotos: string[];
  mainFlora: string[];
  activityType: string | null;
  isVerified: boolean;
  user: { email: string };
}

export interface AgentRequest {
  id: string;
  requestCode: string | null;
  honeyType: string;
  description: string | null;
  collectionLocation: string;
  quantity: string;
  status: string;
  governorate: string | null;
  delegation: string | null;
  latitude: number | null;
  longitude: number | null;
  hivesCount: number | null;
  beekeepingMethod: string | null;
  hiveType: string | null;
  floralOrigin: string | null;
  productionSeason: string | null;
  batchNumber: string | null;
  preferredCollectionMethod: 'KOUNOUZ_VISIT' | 'PRODUCER_DELIVERY' | null;
  producer: AgentProducer;
  updatedAt?: string;
}

export interface SealSummary {
  id: string;
  sealCode: string;
  sealedAt: string;
  status: 'INTACT' | 'BROKEN';
  photoUrl: string | null;
}

export interface SampleSummary {
  id: string;
  sampleCode: string | null;
  status: SampleStatus;
  collectionDate: string;
  quantity: string;
  honeyType: string | null;
  numberOfSamples: number;
  photos: string[];
  seal: SealSummary | null;
}

export interface Assignment {
  id: string;
  assignmentCode: string;
  requestId: string;
  agentId: string;
  scheduledDate: string;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  priority: CollectionPriority;
  status: AssignmentStatus;
  expectedQuantityGrams: number;
  numberOfSamples: number;
  harvestSource: HarvestSource | null;
  specialInstructions: string | null;
  notes: string | null;
  requiredEquipment: string[];
  checkedEquipment: string[];
  rescheduleCount: number;
  rescheduleReason: string | null;
  producerConfirmed: boolean;
  startedAt: string | null;
  completedAt: string | null;
  sampleId: string | null;
  createdAt: string;
  updatedAt: string;
  request: AgentRequest;
  sample: SampleSummary | null;
  createdBy: { id: string; name: string } | null;
  coordinates: LatLng | null;
  isOverdue: boolean;
}

export interface AssignmentDetail extends Assignment {
  navigation: { index: number | null; total: number; previousId: string | null; nextId: string | null };
}

export interface DashboardData {
  range: { from: string; to: string };
  stats: { today: number; completed: number; inProgress: number; upcoming: number; overdue: number };
  assignments: Assignment[];
  samplesInCustody: (SampleSummary & { request: { honeyType: string; producer: { name: string } } })[];
}

export interface CustodyEvent {
  id: string;
  sampleId: string;
  type: CustodyEventType;
  occurredAt: string;
  userId: string | null;
  note: string | null;
  evidenceUrl: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  handlerName: string | null;
  user: { id: string; name: string; role: string } | null;
}

export interface CustodyDetail {
  id: string;
  sampleCode: string | null;
  status: SampleStatus;
  collectionDate: string;
  location: string;
  quantity: string;
  photos: string[];
  honeyType: string | null;
  numberOfSamples: number;
  harvestSource: HarvestSource | null;
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
  notes: string | null;
  issueReason: string | null;
  weather: WeatherSnapshot | null;
  request: AgentRequest;
  collectedBy: { id: string; name: string };
  seal: (SealSummary & { latitude: number | null; longitude: number | null; notes: string | null }) | null;
  assignment: { id: string; assignmentCode: string; scheduledDate: string; status: AssignmentStatus } | null;
  steps: { type: CustodyEventType; event: CustodyEvent | null }[];
  events: CustodyEvent[];
  issues: CustodyEvent[];
  currentLocation: (LatLng & { location: string | null; at: string }) | null;
  route: (LatLng & { type: CustodyEventType; at: string })[];
  destination: LatLng & { name: string };
  allowedEvents: AgentEventType[];
}

export interface CustodyListItem {
  id: string;
  sampleCode: string | null;
  status: SampleStatus;
  collectionDate: string;
  location: string;
  quantity: string;
  honeyType: string | null;
  photos: string[];
  request: { id: string; requestCode: string | null; honeyType: string; producer: { name: string; farmName: string } };
  seal: { sealCode: string; status: string } | null;
  assignment: { id: string; assignmentCode: string } | null;
  lastEvent: { type: CustodyEventType; occurredAt: string; location: string | null } | null;
}

export interface WeatherSnapshot {
  temperature: number;
  humidity: number;
  windSpeed: number;
  code: number;
}

export interface ReportsData {
  period: { from: string; to: string; months: number };
  totals: {
    assignments: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
    samples: number;
    sealed: number;
    issues: number;
    quantityKg: number;
    averageDurationMinutes: number | null;
    onTimeRate: number | null;
  };
  monthly: { month: string; assignments: number; completed: number; samples: number }[];
  byHoneyType: { label: string; count: number }[];
  bySampleStatus: { label: string; count: number }[];
  byRegion: { label: string; count: number }[];
}

export interface SearchResults {
  assignments: {
    id: string;
    assignmentCode: string;
    status: AssignmentStatus;
    scheduledDate: string;
    request: { honeyType: string; collectionLocation: string; producer: { name: string } };
  }[];
  samples: {
    id: string;
    sampleCode: string | null;
    status: SampleStatus;
    seal: { sealCode: string } | null;
    request: { honeyType: string; producer: { name: string } };
  }[];
}
