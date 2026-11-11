/**
 * Skrip Audit Read-Only (Dry-Run): Cek URL Gambar Mengandung "?token="
 *
 * Cara menjalankan:
 *   npx tsx scripts/audit-token-urls.ts
 *
 * Aturan keamanan (DATA_RULES.md):
 * - HANYA MEMBACA database / file JSON (tidak mengubah atau menghapus apa pun).
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const TARGET_FIELDS = new Set([
  'logo',
  'logoUrl',
  'photoBefore',
  'photoProgress',
  'photoResolved',
  'photoAfter',
  'photoUrl',
  'imageUrl',
  'avatar',
]);

function scanObjectForTokenUrls(obj: any, foundFields: Set<string>) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) scanObjectForTokenUrls(item, foundFields);
    return;
  }
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && val.includes('?token=')) {
      if (TARGET_FIELDS.has(key) || val.includes('/uploads/')) {
        foundFields.add(key);
      }
    } else if (val && typeof val === 'object') {
      scanObjectForTokenUrls(val, foundFields);
    }
  }
}

async function auditPostgres(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const res = await pool.query<{ collection: string; id: string; data: any }>(
      'SELECT collection, id, data FROM app_records'
    );
    const summary: Record<string, number> = {};
    let totalMatched = 0;

    for (const row of res.rows) {
      const fields = new Set<string>();
      scanObjectForTokenUrls(row.data, fields);
      if (fields.size > 0) {
        totalMatched++;
        summary[row.collection] = (summary[row.collection] || 0) + 1;
      }
    }

    console.log(`Total record diperiksa: ${res.rows.length}`);
    console.log(`Total record mengandung "?token=": ${totalMatched}`);
    if (totalMatched > 0) {
      console.log('Rincian per koleksi:', summary);
    }
  } finally {
    await pool.end();
  }
}

async function auditJsonStore() {
  const storePath = path.resolve(process.cwd(), 'data', 'app_records_store.json');
  if (!fs.existsSync(storePath)) {
    console.log('File data/app_records_store.json tidak ditemukan.');
    return;
  }
  const store: Record<string, Record<string, any>> = JSON.parse(fs.readFileSync(storePath, 'utf-8') || '{}');
  const summary: Record<string, number> = {};
  let totalChecked = 0;
  let totalMatched = 0;

  for (const [collection, records] of Object.entries(store)) {
    if (!records || typeof records !== 'object') continue;
    for (const data of Object.values(records)) {
      totalChecked++;
      const fields = new Set<string>();
      scanObjectForTokenUrls(data, fields);
      if (fields.size > 0) {
        totalMatched++;
        summary[collection] = (summary[collection] || 0) + 1;
      }
    }
  }

  console.log(`Total record diperiksa: ${totalChecked}`);
  console.log(`Total record mengandung "?token=": ${totalMatched}`);
  if (totalMatched > 0) {
    console.log('Rincian per koleksi:', summary);
  }
}

async function main() {
  console.log('=== Audit Read-Only (Dry-Run) URL "?token=" ===');
  if (process.env.DATABASE_URL) {
    console.log('Sumber: PostgreSQL (DATABASE_URL)');
    await auditPostgres(process.env.DATABASE_URL);
  } else {
    console.log('Sumber: File JSON Lokal (data/app_records_store.json)');
    await auditJsonStore();
  }
  console.log('=== Selesai (Tidak ada data yang diubah) ===');
}

main().catch((err) => {
  console.error('Gagal menjalankan audit:', err);
  process.exit(1);
});
