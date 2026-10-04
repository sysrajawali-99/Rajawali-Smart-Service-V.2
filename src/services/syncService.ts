import {
  offlineDb,
  getPendingOutboxItems,
  updateOutboxItemStatus,
  removeOutboxEntry,
  getOutboxStatus,
  type OutboxEntry,
} from './offlineDb';
import { getAuthHeaders } from './apiService';

export type SyncState = 'offline' | 'pending' | 'syncing' | 'synced' | 'rejected';

export interface SyncStatusInfo {
  state: SyncState;
  isOnline: boolean;
  pendingCount: number;
  syncingCount: number;
  rejectedCount: number;
  rejectedItems: OutboxEntry[];
  lastSyncedAt: string | null;
}

type SyncStatusListener = (status: SyncStatusInfo) => void;

class SyncService {
  private isSyncing = false;
  private listeners: Set<SyncStatusListener> = new Set();
  private lastSyncedAt: string | null = null;
  private intervalTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notify();
        this.triggerSync();
      });

      window.addEventListener('offline', () => {
        this.notify();
      });

      window.addEventListener('pwa:trigger-sync', () => {
        this.triggerSync();
      });

      // Periodic check every 60 seconds
      this.intervalTimer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.triggerSync();
        }
      }, 60000);
    }
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    this.getStatus().then((status) => listener(status));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notify() {
    const status = await this.getStatus();
    this.listeners.forEach((fn) => fn(status));
  }

  public async getStatus(): Promise<SyncStatusInfo> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const outbox = await getOutboxStatus();

    let state: SyncState = 'synced';
    if (!isOnline) {
      state = 'offline';
    } else if (this.isSyncing) {
      state = 'syncing';
    } else if (outbox.rejectedCount > 0) {
      state = 'rejected';
    } else if (outbox.pendingCount > 0) {
      state = 'pending';
    }

    return {
      state,
      isOnline,
      pendingCount: outbox.pendingCount,
      syncingCount: outbox.syncingCount,
      rejectedCount: outbox.rejectedCount,
      rejectedItems: outbox.rejectedItems,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  /**
   * Main idempotent sync loop
   */
  public async triggerSync(): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notify();
      return;
    }

    if (this.isSyncing) {
      return;
    }

    const pending = await getPendingOutboxItems();
    if (pending.length === 0) {
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.notify();

    try {
      for (const item of pending) {
        // Double check network state
        if (!navigator.onLine) {
          break;
        }

        await updateOutboxItemStatus(item.id, 'syncing');
        this.notify();

        try {
          const res = await fetch('/api/sync/checklist', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              outboxId: item.id,
              type: item.type,
              projectId: item.projectId,
              locationId: item.locationId,
              checklistId: item.checklistId,
              taskId: item.taskId,
              slotHour: item.slotHour,
              hourLabel: item.hourLabel,
              answers: item.answers,
              notes: item.notes,
              captured_at: item.captured_at,
            }),
          });

          if (res.ok || res.status === 409) {
            // 200 OK or 409 Conflict (idempotent duplicate already committed)
            await removeOutboxEntry(item.id);
            this.lastSyncedAt = new Date().toISOString();
          } else if (res.status === 400 || res.status === 403 || res.status === 422) {
            // Data rejected by server validation or authorization
            const errorData = await res.json().catch(() => ({}));
            const reason = errorData.error || errorData.message || `Ditolak server (kode ${res.status})`;
            await updateOutboxItemStatus(item.id, 'rejected', reason);
          } else {
            // Transient 5xx error: return to pending and stop loop
            await updateOutboxItemStatus(item.id, 'pending');
            break;
          }
        } catch (err: any) {
          // Network failure: return to pending and abort
          console.warn('[SyncService] Network drop during sync:', err);
          await updateOutboxItemStatus(item.id, 'pending');
          break;
        }
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const syncService = new SyncService();
