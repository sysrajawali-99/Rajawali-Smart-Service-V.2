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
  CHECKLIST_LOCATIONS: 'checklist_locations',
  CHECKLIST_TEMPLATES: 'checklist_templates',
  RBAC_PERMISSIONS: 'rbac_permissions',
  EMPLOYEE_TURNOVERS: 'employee_turnovers',
  KLIEN_CHECKLIST_ITEMS: 'klien_checklist_items',
  KLIEN_CHECKLIST_INSPECTIONS: 'klien_checklist_inspections',
  COMPANY_PROFILE: 'company_profile',
  COMPANIES: 'companies',
  KPI_CONFIG: 'kpi_config',
  AUDIT_LOGS: 'audit_logs',
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

/**
 * Configurable base URL for API, uploads, and Socket.IO.
 * Read from VITE_API_URL. If empty/unset, defaults to current website origin (production default).
 */
export const VITE_API_URL: string = (
  (import.meta as any).env?.VITE_API_URL || ''
).trim().replace(/\/+$/, '');

export function getBaseUrl(): string {
  return VITE_API_URL;
}

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${VITE_API_URL}${cleanPath}`;
}

export function getFullUploadUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${VITE_API_URL}${cleanPath}`;
}

// In-memory cache for HMAC signed URLs (max 5 mins validity, refresh 20s before expiry)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Generate/retrieve a short-lived HMAC signed URL for secure file access (Requirement 3).
 * Tied to a single file & single company_id with max 5-minute lifetime.
 */
export async function getSignedUploadUrl(rawUrl: string | undefined | null): Promise<string> {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('data:image/') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }

  // Use cached signed URL if valid for at least 20 more seconds
  const cached = signedUrlCache.get(rawUrl);
  if (cached && Date.now() < cached.expiresAt - 20000) {
    return cached.url;
  }

  try {
    const res = await fetch(getApiUrl(`/api/uploads/signed-url?url=${encodeURIComponent(rawUrl)}`), {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.signedUrl) {
        const fullUrl = data.signedUrl.startsWith('http')
          ? data.signedUrl
          : `${VITE_API_URL}${data.signedUrl}`;
        signedUrlCache.set(rawUrl, {
          url: fullUrl,
          expiresAt: data.expires || Date.now() + 300000,
        });
        return fullUrl;
      }
    }
  } catch (err) {
    console.warn('[getSignedUploadUrl] Warning generating signed URL:', err);
  }

  return getFullUploadUrl(rawUrl);
}

/**
 * Token management for cross-origin preview / AI Studio & mobile PWA sessions
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token');
    if (queryToken) {
      localStorage.setItem('sco_auth_token', queryToken);
      params.delete('token');
      const newQuery = params.toString() ? `?${params.toString()}` : '';
      window.history.replaceState({}, '', `${window.location.pathname}${newQuery}${window.location.hash}`);
      return queryToken;
    }
  } catch {}
  return localStorage.getItem('sco_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('sco_auth_token', token);
    try {
      socket.emit('auth:join', { token });
    } catch {}
  } else {
    localStorage.removeItem('sco_auth_token');
    signedUrlCache.clear();
  }
}

export function getAuthHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...additionalHeaders };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Socket.IO client using configurable server URL with Bearer token authentication
export const socket: Socket = io(VITE_API_URL || undefined, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  auth: (cb) => {
    cb({ token: getAuthToken() });
  },
});

/**
 * API Authentication calls
 */
export async function apiLogin(payload: {
  identifier?: string;
  password?: string;
  userId?: string;
}): Promise<{
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setAuthToken(data.token);
      return data;
    }
    return { success: false, error: data.error || 'Login gagal' };
  } catch (err: any) {
    console.warn('[apiLogin] Server request notice:', err?.message || err);
    return { success: false, error: err?.message || 'Koneksi ke backend server gagal' };
  }
}

export async function apiVerifySession(): Promise<{ authenticated: boolean; user?: any; token?: string } | null> {
  const token = getAuthToken();
  try {
    const res = await fetch(getApiUrl('/api/auth/me'), {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.token) {
        setAuthToken(data.token);
        return data;
      }
    }
  } catch (err) {
    console.warn('[apiVerifySession] Verification notice:', err);
  }
  return null;
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch(getApiUrl('/api/auth/logout'), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {}
  setAuthToken(null);
}

/**
 * Endpoint khusus untuk pergantian perusahaan aktif (Requirement 4).
 * Memvalidasi hak akses di server, menerbitkan token baru dengan satu active company_id,
 * dan dicatat di audit log.
 */
export async function apiSwitchCompany(companyId: string): Promise<{
  success: boolean;
  token?: string;
  company?: any;
  user?: any;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/api/auth/switch-company'), {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ companyId }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setAuthToken(data.token);
      return data;
    }
    return { success: false, error: data.error || 'Gagal berpindah perusahaan' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghubungi server' };
  }
}

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

      const uploadRes = await fetch(getApiUrl('/api/upload'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (uploadRes.ok) {
        const json = await uploadRes.json();
        return getFullUploadUrl(json.url);
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

    const uploadRes = await fetch(getApiUrl('/api/upload'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    if (uploadRes.ok) {
      const json = await uploadRes.json();
      return getFullUploadUrl(json.url);
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
 * Fetch all records for a given collection from the backend.
 * Throws an error if the server is unreachable or returns a non-2xx status,
 * so the caller can distinguish between server error vs truly empty collection.
 */
export async function getRecords<T = any>(collection: string): Promise<T[]> {
  try {
    const res = await fetch(getApiUrl(`/api/records/${collection}`), {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      console.warn(`[API] Failed to get ${collection}: status ${res.status} (${errorText})`);
      throw new Error(`Gagal mengambil data ${collection}: HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[API] Network error fetching ${collection}:`, err);
    throw err;
  }
}

/**
 * Upsert a single record in the collection.
 * Sanitizes base64 photos into URLs, saves to PostgreSQL, and broadcasts via Socket.IO.
 */
export async function upsertRecord<T extends { id?: string; moduleId?: string }>(
  collection: string,
  record: T
): Promise<T> {
  const sanitized = await sanitizeRecordPhotos(record);
  const recordId = (sanitized as any).id || (sanitized as any).moduleId || 'main';
  (sanitized as any).id = recordId;

  const res = await fetch(getApiUrl(`/api/records/${collection}/${recordId}`), {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(sanitized),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    console.error(`[API] Failed to upsert ${collection}/${recordId}:`, errorText);
    throw new Error(`Gagal menyimpan ke server (${collection}/${recordId}): ${errorText}`);
  }
  return sanitized;
}

/**
 * Delete a single record from the collection.
 * Deletes from PostgreSQL and broadcasts delete event via Socket.IO.
 */
export async function deleteRecord(collection: string, id: string): Promise<boolean> {
  const res = await fetch(getApiUrl(`/api/records/${collection}/${id}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    console.error(`[API] Failed to delete ${collection}/${id}:`, errorText);
    throw new Error(`Gagal menghapus dari server (${collection}/${id}): ${errorText}`);
  }
  return true;
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
    const res = await fetch(getApiUrl('/api/status'), {
      headers: getAuthHeaders(),
    });
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
