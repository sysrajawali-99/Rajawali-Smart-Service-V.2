import Dexie, { type Table } from 'dexie';

export interface OutboxEntry {
  id: string; // UUID crypto.randomUUID()
  type: 'hourly_slot_update' | 'hourly_slot_batch' | 'task_completion';
  projectId: string;
  locationId?: string;
  locationName?: string;
  checklistId?: string;
  taskId?: string;
  slotHour?: number;
  hourLabel?: string;
  answers: any;
  notes?: string;
  captured_at: string; // ISO 8601 string from device clock
  status: 'pending' | 'syncing' | 'synced' | 'rejected';
  rejectionReason?: string;
  retryCount: number;
  createdAt: number;
}

export interface CachedTemplate {
  id: string;
  projectId?: string;
  category: string;
  name: string;
  description?: string;
  sopInstruction?: string;
  order?: number;
  version?: number;
  isNotesRequired?: boolean;
}

export interface CachedArea {
  id: string;
  projectId?: string;
  name: string;
  code: string;
  floor: string;
  zone: string;
  type: string;
  status: string;
}

export interface CachedLocation {
  id: string;
  projectId: string;
  name: string;
  category: string;
  floor: string;
  code: string;
}

export interface CachedTask {
  id: string;
  projectId?: string;
  areaId: string;
  areaName: string;
  taskDate?: string;
  scheduledTime: string;
  deadlineTime: string;
  status: string;
  checklistArea: any[];
}

export interface CachedDailyChecklist {
  id: string;
  projectId: string;
  locationId: string;
  locationName: string;
  category: string;
  date: string;
  hourlySlots: any[];
}

export class JTISmartDatabase extends Dexie {
  outbox!: Table<OutboxEntry, string>;
  checklistTemplates!: Table<CachedTemplate, string>;
  areas!: Table<CachedArea, string>;
  checklistLocations!: Table<CachedLocation, string>;
  dailyChecklists!: Table<CachedDailyChecklist, string>;
  tasks!: Table<CachedTask, string>;

  constructor() {
    super('JTISmartDB');
    this.version(1).stores({
      outbox: 'id, type, projectId, status, createdAt, captured_at',
      checklistTemplates: 'id, projectId, category, order, version',
      areas: 'id, projectId, code, floor',
      checklistLocations: 'id, projectId, category, floor',
      dailyChecklists: 'id, projectId, locationId, date',
      tasks: 'id, projectId, areaId, status, taskDate',
    });
  }
}

export const offlineDb = new JTISmartDatabase();

/**
 * Cache templates, areas, checklist locations, tasks, and daily checklists in IndexedDB
 */
export async function cacheOfflineData(data: {
  templates?: any[];
  areas?: any[];
  locations?: any[];
  checklists?: any[];
  tasks?: any[];
}) {
  try {
    if (data.templates && data.templates.length > 0) {
      await offlineDb.checklistTemplates.bulkPut(data.templates);
    }
    if (data.areas && data.areas.length > 0) {
      await offlineDb.areas.bulkPut(data.areas);
    }
    if (data.locations && data.locations.length > 0) {
      await offlineDb.checklistLocations.bulkPut(data.locations);
    }
    if (data.checklists && data.checklists.length > 0) {
      await offlineDb.dailyChecklists.bulkPut(data.checklists);
    }
    if (data.tasks && data.tasks.length > 0) {
      await offlineDb.tasks.bulkPut(data.tasks);
    }
  } catch (err) {
    console.warn('[OfflineDB] Error caching data to IndexedDB:', err);
  }
}

/**
 * Save an offline checklist completion to outbox
 */
export async function saveChecklistToOutbox(
  entry: Omit<OutboxEntry, 'id' | 'createdAt' | 'status' | 'retryCount'>
): Promise<string> {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'outbox-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

  const fullEntry: OutboxEntry = {
    ...entry,
    id,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  };

  await offlineDb.outbox.put(fullEntry);

  // Attempt to register background sync if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'sync' in reg) {
        await (reg as any).sync.register('sync-checklist-outbox');
      }
    } catch {}
  }

  return id;
}

/**
 * Retrieve pending outbox items sorted by creation time
 */
export async function getPendingOutboxItems(): Promise<OutboxEntry[]> {
  return offlineDb.outbox
    .where('status')
    .equals('pending')
    .sortBy('createdAt');
}

/**
 * Retrieve summary status of outbox
 */
export async function getOutboxStatus(): Promise<{
  pendingCount: number;
  syncingCount: number;
  rejectedCount: number;
  rejectedItems: OutboxEntry[];
  totalUnsynced: number;
}> {
  const pending = await offlineDb.outbox.where('status').equals('pending').count();
  const syncing = await offlineDb.outbox.where('status').equals('syncing').count();
  const rejectedItems = await offlineDb.outbox.where('status').equals('rejected').toArray();

  return {
    pendingCount: pending,
    syncingCount: syncing,
    rejectedCount: rejectedItems.length,
    rejectedItems,
    totalUnsynced: pending + syncing,
  };
}

/**
 * Remove an item from outbox after successful synchronization
 */
export async function removeOutboxEntry(id: string): Promise<void> {
  await offlineDb.outbox.delete(id);
}

/**
 * Update the status of an outbox item
 */
export async function updateOutboxItemStatus(
  id: string,
  status: 'pending' | 'syncing' | 'synced' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  const item = await offlineDb.outbox.get(id);
  if (item) {
    item.status = status;
    if (rejectionReason) item.rejectionReason = rejectionReason;
    if (status === 'rejected') item.retryCount = (item.retryCount || 0) + 1;
    await offlineDb.outbox.put(item);
  }
}

/**
 * Retry all rejected outbox items
 */
export async function retryRejectedOutboxItems(): Promise<void> {
  const rejected = await offlineDb.outbox.where('status').equals('rejected').toArray();
  for (const item of rejected) {
    item.status = 'pending';
    item.rejectionReason = undefined;
    await offlineDb.outbox.put(item);
  }
}

/**
 * Discard a rejected outbox item
 */
export async function discardOutboxItem(id: string): Promise<void> {
  await offlineDb.outbox.delete(id);
}

/**
 * Clear cached data on user logout
 * CRITICAL RULE: Keeps un-synced outbox entries intact so offline work is not lost!
 */
export async function clearCachedDataOnLogout(): Promise<void> {
  try {
    await offlineDb.checklistTemplates.clear();
    await offlineDb.areas.clear();
    await offlineDb.checklistLocations.clear();
    await offlineDb.dailyChecklists.clear();
    await offlineDb.tasks.clear();
    // Do NOT delete offlineDb.outbox!
  } catch (err) {
    console.warn('[OfflineDB] Notice clearing logout cache:', err);
  }
}
