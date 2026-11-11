/**
 * Skrip Pembersihan Manual: processed_syncs (>30 hari) & audit_logs ("sinkronisasi berhasil")
 *
 * Cara menjalankan:
 *   Mode Dry-Run (bawaan, hanya melihat jumlah):
 *     npx tsx scripts/cleanup-sync-logs.ts
 *
 *   Mode Hapus Nyata (wajib pakai --konfirmasi):
 *     npx tsx scripts/cleanup-sync-logs.ts --konfirmasi
 *
 * Aturan keamanan (DATA_RULES.md):
 * - TIDAK PERNAH berjalan otomatis.
 * - Hanya menyentuh koleksi `processed_syncs` dan `audit_logs`.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const isConfirmed = process.argv.includes('--konfirmasi');
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const cutoffDate = new Date(Date.now() - THIRTY_DAYS_MS);

function isOldProcessedSync(data: any): boolean {
  const dateStr = data?.received_at || data?.captured_at;
  if (!dateStr) return false;
  const ts = Date.parse(dateStr);
  return !isNaN(ts) && ts < cutoffDate.getTime();
}

function isRoutineSyncSuccessAudit(data: any): boolean {
  return (
    data?.action === 'SYNC_CHECKLIST_SUCCESS' ||
    (typeof data?.description === 'string' &&
      data.description.includes('Sinkronisasi ceklist berhasil'))
  );
}

async function runPostgres(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const syncRes = await pool.query<{ id: string; data: any }>(
      "SELECT id, data FROM app_records WHERE collection = 'processed_syncs'"
    );
    const oldSyncIds = syncRes.rows.filter((r) => isOldProcessedSync(r.data)).map((r) => r.id);

    const auditRes = await pool.query<{ id: string; data: any }>(
      "SELECT id, data FROM app_records WHERE collection = 'audit_logs'"
    );
    const routineAuditIds = auditRes.rows.filter((r) => isRoutineSyncSuccessAudit(r.data)).map((r) => r.id);

    console.log(`processed_syncs > 30 hari yang akan dihapus : ${oldSyncIds.length} record`);
    console.log(`audit_logs "sinkronisasi berhasil"         : ${routineAuditIds.length} record`);

    if (!isConfirmed) {
      console.log('\n[DRY-RUN] Tidak ada data yang dihapus. Jalankan dengan --konfirmasi untuk menghapus.');
      return;
    }

    if (oldSyncIds.length > 0) {
      await pool.query(
        "DELETE FROM app_records WHERE collection = 'processed_syncs' AND id = ANY($1::text[])",
        [oldSyncIds]
      );
    }
    if (routineAuditIds.length > 0) {
      await pool.query(
        "DELETE FROM app_records WHERE collection = 'audit_logs' AND id = ANY($1::text[])",
        [routineAuditIds]
      );
    }
    console.log('\n[SELESAI] Pembersihan nyata berhasil dijalankan.');
  } finally {
    await pool.end();
  }
}

async function runJsonStore() {
  const storePath = path.resolve(process.cwd(), 'data', 'app_records_store.json');
  if (!fs.existsSync(storePath)) {
    console.log('File data/app_records_store.json tidak ditemukan.');
    return;
  }
  const store: Record<string, Record<string, any>> = JSON.parse(fs.readFileSync(storePath, 'utf-8') || '{}');

  const syncMap = store.processed_syncs || {};
  const oldSyncIds = Object.keys(syncMap).filter((id) => isOldProcessedSync(syncMap[id]));

  const auditMap = store.audit_logs || {};
  const routineAuditIds = Object.keys(auditMap).filter((id) => isRoutineSyncSuccessAudit(auditMap[id]));

  console.log(`processed_syncs > 30 hari yang akan dihapus : ${oldSyncIds.length} record`);
  console.log(`audit_logs "sinkronisasi berhasil"         : ${routineAuditIds.length} record`);

  if (!isConfirmed) {
    console.log('\n[DRY-RUN] Tidak ada data yang dihapus. Jalankan dengan --konfirmasi untuk menghapus.');
    return;
  }

  for (const id of oldSyncIds) delete syncMap[id];
  for (const id of routineAuditIds) delete auditMap[id];
  fs.writeFileSync(storePath, JSON.stringify(store), 'utf-8');
  console.log('\n[SELESAI] Pembersihan nyata berhasil dijalankan.');
}

async function main() {
  console.log(`=== Pembersihan Log Sinkronisasi (${isConfirmed ? 'MODE HAPUS NYATA' : 'MODE DRY-RUN'}) ===`);
  if (process.env.DATABASE_URL) {
    await runPostgres(process.env.DATABASE_URL);
  } else {
    await runJsonStore();
  }
}

main().catch((err) => {
  console.error('Gagal menjalankan skrip pembersihan:', err);
  process.exit(1);
});
