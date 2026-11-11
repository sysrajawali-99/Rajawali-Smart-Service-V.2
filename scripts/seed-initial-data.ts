/**
 * Skrip Seed Manual & Idempoten (scripts/seed-initial-data.ts)
 *
 * Cara menjalankan secara manual:
 *   npx tsx scripts/seed-initial-data.ts
 *
 * Aturan keamanan (DATA_RULES.md):
 * - TIDAK PERNAH dijalankan otomatis oleh aplikasi atau server.
 * - Hanya mengisi koleksi yang benar-benar kosong (totalRecords === 0).
 * - Aman dijalankan berulang kali (idempoten): koleksi yang sudah berisi data akan dilewati.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import {
  INITIAL_PROJECTS,
  INITIAL_USERS,
  DEFAULT_RBAC_PERMISSIONS,
  INITIAL_AREAS,
  INITIAL_CLEANERS,
  INITIAL_SHIFTS,
  INITIAL_SCHEDULES,
  INITIAL_CHECKLIST_LOCATIONS,
  INITIAL_CHECKLIST_TEMPLATES,
  INITIAL_DAILY_CHECKLISTS,
  INITIAL_TASKS,
  INITIAL_INSPECTIONS,
  INITIAL_COMPLAINTS,
  INITIAL_DAMAGE_REPORTS,
  INITIAL_SPECIAL_JOBS,
  INITIAL_MASTER_PROGRAMS,
  INITIAL_EMPLOYEE_TURNOVERS,
  INITIAL_KLIEN_CHECKLIST_ITEMS,
  INITIAL_KLIEN_CHECKLIST_INSPECTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from '../src/data/initialData';

const SEED_MAP: Record<string, any[]> = {
  projects: INITIAL_PROJECTS,
  users: INITIAL_USERS,
  rbac_permissions: DEFAULT_RBAC_PERMISSIONS,
  areas: INITIAL_AREAS,
  cleaners: INITIAL_CLEANERS,
  shifts: INITIAL_SHIFTS,
  schedules: INITIAL_SCHEDULES,
  checklist_locations: INITIAL_CHECKLIST_LOCATIONS,
  checklist_templates: INITIAL_CHECKLIST_TEMPLATES,
  daily_checklists: INITIAL_DAILY_CHECKLISTS,
  tasks: INITIAL_TASKS,
  inspections: INITIAL_INSPECTIONS,
  complaints: INITIAL_COMPLAINTS,
  damage_reports: INITIAL_DAMAGE_REPORTS,
  special_jobs: INITIAL_SPECIAL_JOBS,
  master_programs: INITIAL_MASTER_PROGRAMS,
  employee_turnovers: INITIAL_EMPLOYEE_TURNOVERS,
  klien_checklist_items: INITIAL_KLIEN_CHECKLIST_ITEMS,
  klien_checklist_inspections: INITIAL_KLIEN_CHECKLIST_INSPECTIONS,
  notifications: INITIAL_NOTIFICATIONS,
  audit_logs: INITIAL_AUDIT_LOGS,
};

function getRecordId(item: any): string {
  return String(item?.id || item?.moduleId || item?.key || '');
}

async function seedPostgres(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_records (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (collection, id)
      )
    `);

    for (const [collection, items] of Object.entries(SEED_MAP)) {
      if (!items || items.length === 0) continue;

      const countRes = await pool.query<{ total: string }>(
        'SELECT COUNT(*)::text AS total FROM app_records WHERE collection = $1',
        [collection]
      );
      const totalRecords = parseInt(countRes.rows[0]?.total || '0', 10);

      if (totalRecords > 0) {
        console.log(`[SKIP] ${collection}: sudah ada ${totalRecords} data.`);
        continue;
      }

      for (const item of items) {
        const id = getRecordId(item);
        if (!id) continue;
        await pool.query(
          `INSERT INTO app_records (collection, id, data, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (collection, id) DO NOTHING`,
          [collection, id, JSON.stringify(item)]
        );
      }
      console.log(`[SEEDED] ${collection}: berhasil mengisi ${items.length} data awal.`);
    }
  } finally {
    await pool.end();
  }
}

async function seedJsonStore() {
  const storePath = path.resolve(process.cwd(), 'data', 'app_records_store.json');
  fs.mkdirSync(path.dirname(storePath), { recursive: true });

  let store: Record<string, Record<string, any>> = {};
  if (fs.existsSync(storePath)) {
    const raw = fs.readFileSync(storePath, 'utf-8');
    store = raw ? JSON.parse(raw) : {};
  }

  let changed = false;
  for (const [collection, items] of Object.entries(SEED_MAP)) {
    if (!items || items.length === 0) continue;
    const existing = store[collection] || {};
    const totalRecords = Object.keys(existing).length;

    if (totalRecords > 0) {
      console.log(`[SKIP] ${collection}: sudah ada ${totalRecords} data.`);
      continue;
    }

    store[collection] = {};
    for (const item of items) {
      const id = getRecordId(item);
      if (!id) continue;
      store[collection][id] = item;
    }
    changed = true;
    console.log(`[SEEDED] ${collection}: berhasil mengisi ${items.length} data awal.`);
  }

  if (changed) {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
  }
}

async function main() {
  console.log('=== Memulai Seed Manual (Hanya Koleksi Kosong) ===');
  if (process.env.DATABASE_URL) {
    console.log('Mode: PostgreSQL (DATABASE_URL)');
    await seedPostgres(process.env.DATABASE_URL);
  } else {
    console.log('Mode: File JSON Lokal (data/app_records_store.json)');
    await seedJsonStore();
  }
  console.log('=== Selesai ===');
}

main().catch((err) => {
  console.error('Gagal menjalankan seed:', err);
  process.exit(1);
});
