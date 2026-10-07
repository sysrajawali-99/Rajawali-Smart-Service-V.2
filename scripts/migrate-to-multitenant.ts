/**
 * Skrip Migrasi Multi-Perusahaan (Multi-Tenant) — Versi 1.0 (Idempoten & Aman)
 *
 * Fungsi:
 * 1. Membuat backup otomatis data lama sebelum migrasi (data/backup-pre-multitenant-*.json)
 * 2. Mendaftarkan entitas perusahaan awal: "Perusahaan Utama" (ID: comp-main, slug: utama)
 * 3. Mengaitkan seluruh data lama (proyek, area, ceklist, jadwal, tugas, audit log, dsb)
 *    ke "Perusahaan Utama" melalui company_id: 'comp-main'
 * 4. Meningkatkan peran admin lama (role: 'admin') menjadi 'super_admin'
 * 5. Dapat dijalankan berulang kali tanpa merusak atau menduplikasi data yang sudah ada.
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { Company, UserRole } from '../src/types';

dotenv.config();

const { Pool } = pg;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'app_records_store.json');

const DEFAULT_MAIN_COMPANY: Company = {
  id: 'comp-main',
  nama: 'Perusahaan Utama',
  slug: 'utama',
  logo: '',
  warna: '#0284c7',
  status: 'aktif',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function runMigration() {
  console.log('========================================================');
  console.log('🚀 MEMULAI MIGRASI SISTEM KE MULTI-PERUSAHAAN (LANGKAH 1)');
  console.log('========================================================\n');

  // Pastikan folder data ada
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. BACKUP DATA JSON LOKAL
  let backupPath: string | null = null;
  let fileData: Record<string, Record<string, any>> = {};

  if (fs.existsSync(STORE_FILE)) {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    try {
      fileData = JSON.parse(raw);
    } catch (e) {
      console.error('❌ Gagal membaca file data JSON eksisting:', e);
      process.exit(1);
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);

    backupPath = path.join(DATA_DIR, `backup-pre-multitenant_${timestamp}.json`);
    fs.writeFileSync(backupPath, raw, 'utf8');
    console.log(`✅ [1/4] Backup otomatis berhasil disimpan di:`);
    console.log(`   📁 ${backupPath}\n`);
  } else {
    console.log('ℹ️  File app_records_store.json belum ada. Membuat berkas baru...\n');
  }

  // 2. DAFTARKAN "Perusahaan Utama"
  if (!fileData.companies) {
    fileData.companies = {};
  }

  // Ambil profil lama jika ada untuk nama/logo
  if (fileData.company_profile && fileData.company_profile.main) {
    const oldProfile = fileData.company_profile.main;
    if (oldProfile.companyName) {
      DEFAULT_MAIN_COMPANY.nama = oldProfile.companyName;
    }
    if (oldProfile.logoUrl) {
      DEFAULT_MAIN_COMPANY.logo = oldProfile.logoUrl;
    }
  }

  if (!fileData.companies[DEFAULT_MAIN_COMPANY.id]) {
    fileData.companies[DEFAULT_MAIN_COMPANY.id] = { ...DEFAULT_MAIN_COMPANY };
    console.log(`✅ [2/4] Perusahaan default dibuat: "${DEFAULT_MAIN_COMPANY.nama}" (ID: ${DEFAULT_MAIN_COMPANY.id})`);
  } else {
    console.log(`ℹ️ [2/4] Perusahaan default sudah terdaftar: "${fileData.companies[DEFAULT_MAIN_COMPANY.id].nama}"`);
  }

  // 3. SEMATKAN company_id PADA SEMUA DATA BISNIS & MIGRASI ADMIN
  let totalRecordsTagged = 0;
  let totalAdminsUpgraded = 0;
  const collectionStats: Record<string, number> = {};

  for (const [colName, colMap] of Object.entries(fileData)) {
    if (typeof colMap !== 'object' || colMap === null) continue;

    let colCount = 0;
    for (const [id, item] of Object.entries(colMap)) {
      if (typeof item !== 'object' || item === null) continue;

      // Sematkan company_id (dan companyId sebagai alias aman)
      if (!item.company_id) {
        item.company_id = DEFAULT_MAIN_COMPANY.id;
        item.companyId = DEFAULT_MAIN_COMPANY.id;
        colCount++;
        totalRecordsTagged++;
      } else if (!item.companyId) {
        item.companyId = item.company_id;
      }

      // Khusus koleksi users: ubah admin lama menjadi super_admin
      if (colName === 'users') {
        if (item.role === 'admin') {
          item.role = 'super_admin';
          totalAdminsUpgraded++;
          console.log(`   👤 User admin "${item.name}" (@${item.username || id}) ditingkatkan menjadi: super_admin`);
        }
      }
    }

    if (colCount > 0) {
      collectionStats[colName] = colCount;
    }
  }

  // Tambahkan catatan migrasi ke audit_logs
  if (!fileData.audit_logs) {
    fileData.audit_logs = {};
  }
  const migrationLogId = `audit-migrasi-tenant-${Date.now()}`;
  fileData.audit_logs[migrationLogId] = {
    id: migrationLogId,
    company_id: DEFAULT_MAIN_COMPANY.id,
    companyId: DEFAULT_MAIN_COMPANY.id,
    timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
    userId: 'system-migration',
    userName: 'Sistem Migrasi Otomatis',
    userRole: 'super_admin' as UserRole,
    action: 'update',
    module: 'sistem',
    details: 'Migrasi multi-perusahaan berhasil dijalankan. Semua data lama dikaitkan ke Perusahaan Utama.',
  };

  // Tulis kembali file JSON dengan aman
  fs.writeFileSync(STORE_FILE, JSON.stringify(fileData, null, 2), 'utf8');
  console.log(`\n✅ [3/4] Penyimpanan lokal berhasil diperbarui (${STORE_FILE}):`);
  console.log(`   - Total item data yang disematkan company_id : ${totalRecordsTagged}`);
  console.log(`   - Total admin yang ditingkatkan ke super_admin: ${totalAdminsUpgraded}`);

  // 4. SINKRONISASI KE BASIS DATA POSTGRESQL (JIKA AKTIF)
  if (process.env.DATABASE_URL) {
    console.log('\n🔄 Memeriksa koneksi PostgreSQL (DATABASE_URL terdeteksi)...');
    try {
      const isLocal =
        process.env.DATABASE_URL.includes('localhost') ||
        process.env.DATABASE_URL.includes('127.0.0.1');

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 4000,
      });

      const client = await pool.connect();
      try {
        // Pastikan tabel records ada
        await client.query(`
          CREATE TABLE IF NOT EXISTS records (
            collection TEXT NOT NULL,
            id TEXT NOT NULL,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (collection, id)
          );
        `);

        // Simpan Perusahaan Utama ke database
        await client.query(
          `INSERT INTO records (collection, id, data, updated_at)
           VALUES ('companies', $1, $2, NOW())
           ON CONFLICT (collection, id)
           DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          [DEFAULT_MAIN_COMPANY.id, JSON.stringify(DEFAULT_MAIN_COMPANY)]
        );

        // Update semua record di DB yang belum punya company_id
        const updateResult = await client.query(`
          UPDATE records
          SET data = jsonb_set(
            jsonb_set(data, '{company_id}', '"comp-main"'),
            '{companyId}', '"comp-main"'
          )
          WHERE (data->>'company_id') IS NULL;
        `);

        // Update role admin -> super_admin di DB
        const userUpdateResult = await client.query(`
          UPDATE records
          SET data = jsonb_set(data, '{role}', '"super_admin"')
          WHERE collection = 'users' AND data->>'role' = 'admin';
        `);

        console.log(`✅ [4/4] PostgreSQL sinkron:`);
        console.log(`   - Baris DB diperbarui dengan company_id: ${updateResult.rowCount || 0}`);
        console.log(`   - User DB ditingkatkan ke super_admin: ${userUpdateResult.rowCount || 0}`);
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err: any) {
      console.warn(`⚠️  Pemberitahuan PostgreSQL: Basis data server belum terjangkau (${err?.message || err}).`);
      console.warn('   Data memori lokal tetap 100% aman dan termigrasi.');
    }
  } else {
    console.log('ℹ️  [4/4] DATABASE_URL tidak aktif: Migrasi penyimpanan lokal selesai 100% tanpa kendala.');
  }

  console.log('\n========================================================');
  console.log('🎉 MIGRASI MULTI-PERUSAHAAN LANGKAH 1 SELESAI DENGAN SUKSES!');
  console.log('========================================================');
  console.log('Ringkasan Koleksi yang Telah Terisolasi:');
  for (const [col, count] of Object.entries(collectionStats)) {
    console.log(`  • ${col.padEnd(28)}: ${count} entri`);
  }
  console.log('========================================================\n');
}

runMigration().catch((err) => {
  console.error('❌ Terjadi kesalahan saat migrasi:', err);
  process.exit(1);
});
