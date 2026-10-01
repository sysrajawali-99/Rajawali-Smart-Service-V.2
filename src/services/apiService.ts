import { io, Socket } from 'socket.io-client';
import {
  CleaningTask,
  Complaint,
  FacilityDamageReport,
  SpecialJobItem,
  MasterCleaningProgramItem,
  DailyAreaChecklist,
  Area,
  Cleaner,
  Shift,
  CleaningSchedule,
  QCInspection,
  AppNotification,
  ProjectLocation,
  AppUser,
  EmployeeTurnoverRecord,
  KlienChecklistItem,
  KlienChecklistInspection,
  CompanyProfile,
  DashboardKpiVisibilityConfig,
} from '../types';

/**
 * Standard collection identifiers for the VPS PostgreSQL backend
 */
export const COLLECTIONS = {
  TASKS: 'tasks',
  COMPLAINTS: 'complaints',
  DAMAGE_REPORTS: 'damage_reports',
  SPECIAL_JOBS: 'special_jobs',
  MASTER_PROGRAMS: 'master_cleaning_programs',
  DAILY_CHECKLISTS: 'daily_checklists',
  AREAS: 'areas',
  CLEANERS: 'cleaners',
  SHIFTS: 'shifts',
  SCHEDULES: 'schedules',
  INSPECTIONS: 'inspections',
  NOTIFICATIONS: 'notifications',
  PROJECTS: 'projects',
  USERS: 'users',
  EMPLOYEE_TURNOVERS: 'employee_turnovers',
  KLIEN_CHECKLIST_ITEMS: 'klien_checklist_items',
  KLIEN_CHECKLIST_INSPECTIONS: 'klien_checklist_inspections',
  COMPANY_PROFILE: 'company_profile',
  KPI_CONFIG: 'kpi_config',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS] | string;

export interface RecordChangeEvent<T = any> {
  action: 'upsert' | 'delete';
  collection: string;
  id: string;
  data?: T;
  isDeleted?: boolean;
  timestamp: string;
}

export interface BackendStatus {
  isConfigured: boolean;
  isConnected: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'SYNCING' | 'ERROR';
  lastSyncedAt: string | null;
  database: string;
  totalRecords: number;
}

// Socket.IO client using same origin as the frontend website
export const socket: Socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

/**
 * Uploads a photo to /api/upload via multipart FormData.
 * If the input is already a non-data URL (e.g. /uploads/... or http://...), it returns it as is.
 * Never stores raw base64 data in the database.
 */
export async function uploadPhoto(fileOrBlobOrDataUrl: File | Blob | string): Promise<string> {
  if (!fileOrBlobOrDataUrl) return '';

  if (typeof fileOrBlobOrDataUrl === 'string') {
    // If already uploaded or remote URL, no need to re-upload
    if (!fileOrBlobOrDataUrl.startsWith('data:image/')) {
      return fileOrBlobOrDataUrl;
    }

    try {
      // Convert data URL to Blob
      const res = await fetch(fileOrBlobOrDataUrl);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `capture-${Date.now()}.${ext}`, { type: blob.type });

      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.ok) {
        const json = await uploadRes.json();
        return json.url;
      }
      console.warn('[uploadPhoto] Upload response not ok:', uploadRes.statusText);
    } catch (err) {
      console.warn('[uploadPhoto] Failed to upload base64 to server:', err);
    }
    return fileOrBlobOrDataUrl;
  }

  // Input is File or Blob
  try {
    const formData = new FormData();
    const fileName = (fileOrBlobOrDataUrl as File).name || `photo-${Date.now()}.jpg`;
    formData.append('file', fileOrBlobOrDataUrl, fileName);

    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (uploadRes.ok) {
      const json = await uploadRes.json();
      return json.url;
    }
  } catch (err) {
    console.warn('[uploadPhoto] Error uploading File/Blob:', err);
  }

  return '';
}

/**
 * Automatically inspects any record and ensures any base64 photo strings
 * are converted into /uploads/ URLs before storing in PostgreSQL.
 */
export async function sanitizeRecordPhotos<T extends Record<string, any>>(record: T): Promise<T> {
  if (!record || typeof record !== 'object') return record;
  const clone: Record<string, any> = { ...record };

  const photoKeys = [
    'photoBefore',
    'photoProgress',
    'photoAfter',
    'photoProof',
    'photoUrl',
    'avatarUrl',
    'companyLogo',
  ];

  for (const key of photoKeys) {
    if (typeof clone[key] === 'string' && clone[key].startsWith('data:image/')) {
      clone[key] = await uploadPhoto(clone[key]);
    }
  }

  if (Array.isArray(clone.photoUrls)) {
    clone.photoUrls = await Promise.all(
      clone.photoUrls.map(async (url: any) =>
        typeof url === 'string' && url.startsWith('data:image/') ? await uploadPhoto(url) : url
      )
    );
  }

  return clone as T;
}

/**
 * Fetch all records for a given collection from the backend
 */
export async function getRecords<T = any>(collection: string): Promise<T[]> {
  try {
    const res = await fetch(`/api/records/${collection}`);
    if (!res.ok) {
      console.warn(`[API] Failed to get ${collection}: status ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[API] Network error fetching ${collection}:`, err);
    return [];
  }
}

/**
 * Upsert a single record in the collection.
 * Sanitizes base64 photos into URLs, saves to PostgreSQL, and broadcasts via Socket.IO.
 */
export async function upsertRecord<T extends { id: string }>(
  collection: string,
  record: T
): Promise<T> {
  try {
    const sanitized = await sanitizeRecordPhotos(record);
    const res = await fetch(`/api/records/${collection}/${record.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized),
    });

    if (!res.ok) {
      console.warn(`[API] Failed to upsert ${collection}/${record.id}:`, res.statusText);
    }
    return sanitized;
  } catch (err) {
    console.warn(`[API] Network error upserting ${collection}/${record.id}:`, err);
    return record;
  }
}

/**
 * Delete a single record from the collection.
 * Deletes from PostgreSQL and broadcasts delete event via Socket.IO.
 */
export async function deleteRecord(collection: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/records/${collection}/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn(`[API] Network error deleting ${collection}/${id}:`, err);
    return false;
  }
}

/**
 * Subscribes to real-time changes across collections from Socket.IO
 */
export function onRecordChange(handler: (event: RecordChangeEvent) => void): () => void {
  socket.on('record:change', handler);
  return () => {
    socket.off('record:change', handler);
  };
}

/**
 * Subscribes to Socket.IO reconnection events to trigger automatic pull
 */
export function onServerReconnect(handler: () => void): () => void {
  socket.on('connect', handler);
  return () => {
    socket.off('connect', handler);
  };
}

/**
 * Check server status and PostgreSQL connectivity
 */
export async function fetchServerStatus(): Promise<{
  status: string;
  database: string;
  totalRecords: number;
  socketClients: number;
} | null> {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // server unreachable
  }
  return null;
}

// =========================================================================
// Drop-in compatibility adapters for existing components
// =========================================================================

export const isSupabaseConfigured = (): boolean => true;

export async function fetchSupabaseTasks(): Promise<CleaningTask[] | null> {
  const records = await getRecords<CleaningTask>(COLLECTIONS.TASKS);
  return records.length > 0 ? records : null;
}

export async function upsertSupabaseTask(task: CleaningTask): Promise<void> {
  await upsertRecord(COLLECTIONS.TASKS, task);
}

export async function fetchSupabaseComplaints(): Promise<Complaint[] | null> {
  const records = await getRecords<Complaint>(COLLECTIONS.COMPLAINTS);
  return records.length > 0 ? records : null;
}

export async function upsertSupabaseComplaint(complaint: Complaint): Promise<void> {
  await upsertRecord(COLLECTIONS.COMPLAINTS, complaint);
}

export async function fetchSupabaseDamageReports(): Promise<FacilityDamageReport[] | null> {
  const records = await getRecords<FacilityDamageReport>(COLLECTIONS.DAMAGE_REPORTS);
  return records.length > 0 ? records : null;
}

export async function upsertSupabaseDamageReport(report: FacilityDamageReport): Promise<void> {
  await upsertRecord(COLLECTIONS.DAMAGE_REPORTS, report);
}

export async function fetchSupabaseSpecialJobs(): Promise<SpecialJobItem[] | null> {
  const records = await getRecords<SpecialJobItem>(COLLECTIONS.SPECIAL_JOBS);
  return records.length > 0 ? records : null;
}

export async function upsertSupabaseSpecialJob(job: SpecialJobItem): Promise<void> {
  await upsertRecord(COLLECTIONS.SPECIAL_JOBS, job);
}

export function subscribeToSupabaseRealtime(handlers: {
  onStatusChange?: (status: string) => void;
  onTaskChange?: (payload: any) => void;
  onComplaintChange?: (payload: any) => void;
  onDamageChange?: (payload: any) => void;
  onSpecialJobChange?: (payload: any) => void;
}): () => void {
  const unsubscribe = onRecordChange((event) => {
    const eventType = event.action === 'upsert' ? (event.isDeleted ? 'DELETE' : 'UPDATE') : 'DELETE';
    const payload = {
      eventType: event.action === 'delete' ? 'DELETE' : 'UPDATE',
      new: event.data,
      old: { id: event.id },
    };

    if (event.collection === COLLECTIONS.TASKS && handlers.onTaskChange) {
      handlers.onTaskChange(payload);
    } else if (event.collection === COLLECTIONS.COMPLAINTS && handlers.onComplaintChange) {
      handlers.onComplaintChange(payload);
    } else if (event.collection === COLLECTIONS.DAMAGE_REPORTS && handlers.onDamageChange) {
      handlers.onDamageChange(payload);
    } else if (event.collection === COLLECTIONS.SPECIAL_JOBS && handlers.onSpecialJobChange) {
      handlers.onSpecialJobChange(payload);
    }
  });

  const onConnect = () => {
    if (handlers.onStatusChange) handlers.onStatusChange('CONNECTED');
  };

  const onDisconnect = () => {
    if (handlers.onStatusChange) handlers.onStatusChange('DISCONNECTED');
  };

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);

  if (socket.connected) {
    onConnect();
  }

  return () => {
    unsubscribe();
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
  };
}
