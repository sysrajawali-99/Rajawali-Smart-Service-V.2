import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const MEMORY_STORE_FILE = path.resolve(process.cwd(), 'data', 'app_records_store.json');

async function runCompanyIdRepair() {
  console.log('====================================================');
  console.log('SKRIP PERBAIKAN DATA AMAN: COMPANY_ID UNTUK DATA LAMA');
  console.log('====================================================');

  // 1. Backup Otomatis
  if (fs.existsSync(MEMORY_STORE_FILE)) {
    const backupDir = path.resolve(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_before_company_repair_${timestamp}.json`);
    fs.copyFileSync(MEMORY_STORE_FILE, backupFile);
    console.log(`[1/3] Backup otomatis berhasil disimpan di: ${backupFile}`);
  } else {
    console.log(`[1/3] File penyimpanan disk lokal (${MEMORY_STORE_FILE}) belum ada.`);
  }

  // 2. Periksa dan perbaiki file JSON lokal secara idempoten
  let localRepairedCount = 0;
  let totalLocalChecked = 0;

  if (fs.existsSync(MEMORY_STORE_FILE)) {
    try {
      const raw = fs.readFileSync(MEMORY_STORE_FILE, 'utf8');
      const store = JSON.parse(raw);

      for (const [colName, items] of Object.entries(store)) {
        if (items && typeof items === 'object') {
          for (const [id, rec] of Object.entries(items as Record<string, any>)) {
            totalLocalChecked++;
            if (rec && typeof rec === 'object') {
              const hasComp = rec.company_id || rec.companyId;
              if (!hasComp) {
                rec.company_id = 'comp-main';
                rec.companyId = 'comp-main';
                localRepairedCount++;
              }
            }
          }
        }
      }

      fs.writeFileSync(MEMORY_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
      console.log(`[2/3] Selesai memeriksa file lokal: ${totalLocalChecked} data diperiksa, ${localRepairedCount} data lama berhasil diberi company_id 'comp-main' tanpa menghapus apa pun.`);
    } catch (e) {
      console.error('[2/3] Gagal memproses file lokal:', e);
    }
  }

  // 3. Periksa dan perbaiki PostgreSQL jika DATABASE_URL ada
  if (process.env.DATABASE_URL) {
    console.log('[3/3] Menghubungkan ke PostgreSQL...');
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });

      const res = await pool.query(`
        UPDATE records
        SET data = jsonb_set(
          jsonb_set(data, '{company_id}', '"comp-main"'),
          '{companyId}', '"comp-main"'
        )
        WHERE (data->>'company_id' IS NULL OR data->>'company_id' = '')
          AND (data->>'companyId' IS NULL OR data->>'companyId' = '')
      `);

      console.log(`[3/3] PostgreSQL berhasil diperbarui: ${res.rowCount || 0} baris data lama diberi company_id 'comp-main'.`);
      await pool.end();
    } catch (pgErr: any) {
      console.warn('[3/3] Catatan PostgreSQL:', pgErr.message || pgErr);
    }
  } else {
    console.log('[3/3] DATABASE_URL tidak disetel. Selesai memproses penyimpanan lokal.');
  }

  console.log('====================================================');
  console.log('STATUS: Perbaikan data company_id selesai dengan aman.');
  console.log('====================================================');
}

runCompanyIdRepair().catch((err) => {
  console.error('Fatal error during repair:', err);
  process.exit(1);
});
