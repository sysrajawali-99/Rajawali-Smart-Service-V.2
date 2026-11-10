import fs from 'fs';
import path from 'path';
import https from 'https';

const LIVE_BASE_URL = process.env.LIVE_SYNC_URL || 'https://jtismart.rtisystem.my.id';
const STORE_PATH = path.resolve(process.cwd(), 'data', 'app_records_store.json');

const COLLECTIONS = [
  'projects',
  'users',
  'areas',
  'cleaners',
  'shifts',
  'schedules',
  'checklist_locations',
  'checklist_templates',
  'tasks',
  'complaints',
  'daily_checklists',
  'damage_reports',
  'master_cleaning_programs',
  'special_jobs',
  'klien_checklist_items',
  'klien_checklist_inspections',
  'employee_turnovers',
  'notifications',
  'company_profile',
  'companies',
  'kpi_config',
  'rbac_permissions',
  'audit_logs',
];

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'AIStudio-SyncScript/1.0' } }, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
          }
          try {
            resolve(JSON.parse(raw));
          } catch (e: any) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

export async function syncFromLiveServer() {
  console.log(`[Sync] Menghubungi server live: ${LIVE_BASE_URL}...`);

  let currentStore: Record<string, Record<string, any>> = {};
  if (fs.existsSync(STORE_PATH)) {
    try {
      currentStore = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    } catch {
      currentStore = {};
    }
  }

  const syncSummary: Record<string, number> = {};
  let primaryProjectId = 'proj-1793818532678';

  for (const col of COLLECTIONS) {
    try {
      const endpoint = `${LIVE_BASE_URL}/api/records/${col}`;
      const items = await fetchJson(endpoint);

      if (Array.isArray(items)) {
        const colMap: Record<string, any> = {};
        for (const item of items) {
          const id = item.id || (item as any).moduleId || `${col}-${Math.random().toString(36).slice(2, 8)}`;
          colMap[id] = item;
        }
        currentStore[col] = colMap;
        syncSummary[col] = items.length;

        if (col === 'projects' && items.length > 0) {
          primaryProjectId = items[0].id;
        }
      } else if (items && typeof items === 'object') {
        currentStore[col] = items;
        syncSummary[col] = Object.keys(items).length;
      }
    } catch (err: any) {
      console.warn(`[Sync] Peringatan saat menarik koleksi '${col}':`, err?.message || err);
    }
  }

  // Pastikan akun operasional pengujian (spv, petugas, klien) tersedia jika server live hanya memiliki akun admin
  if (currentStore.users) {
    if (!currentStore.users['usr-spv-1']) {
      currentStore.users['usr-spv-1'] = {
        id: 'usr-spv-1',
        name: 'Hendra Wijaya (SPV Blok M Square)',
        email: 'spv.blokm@cleaningops.com',
        username: 'spv1',
        password: '$2b$10$C1PRnQNDNVZUcbMEF9RQZOx1N1YblZKpc/dh9j/ij8ta491iomica',
        role: 'supervisor',
        assignedProjectIds: [primaryProjectId],
        company_id: 'comp-main',
        companyId: 'comp-main',
        mustChangePassword: false,
      };
      syncSummary.users = (syncSummary.users || 0) + 1;
    }
    if (!currentStore.users['usr-cln-1']) {
      currentStore.users['usr-cln-1'] = {
        id: 'usr-cln-1',
        name: 'Petugas Kebersihan Blok M Square',
        email: 'petugas.blokm@cleaningops.com',
        username: 'petugas1',
        password: '$2b$10$F9lz6/3f8adTmy3cKbrpI.UhuEL2lCb4ZsGVpceODFWoBRXfElxs2',
        role: 'petugas',
        assignedProjectIds: [primaryProjectId],
        company_id: 'comp-main',
        companyId: 'comp-main',
        mustChangePassword: false,
      };
      syncSummary.users = (syncSummary.users || 0) + 1;
    }
    if (!currentStore.users['usr-klien']) {
      currentStore.users['usr-klien'] = {
        id: 'usr-klien',
        name: 'Building Management Blok M Square',
        email: 'klien.blokm@cleaningops.com',
        username: 'klien1',
        password: '$2b$10$wNPqJUAkenuCxRCIwroYGOI6TcLumMjU/NlxtFaKnSHpSBtP.wzkm',
        role: 'klien',
        assignedProjectIds: [primaryProjectId],
        company_id: 'comp-main',
        companyId: 'comp-main',
        mustChangePassword: false,
      };
      syncSummary.users = (syncSummary.users || 0) + 1;
    }

    // Pastikan admin memiliki akses ke primary project
    if (currentStore.users['usr-admin']) {
      currentStore.users['usr-admin'].assignedProjectIds = [primaryProjectId];
    }
  }

  // Tulis ke data/app_records_store.json
  const dataDir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(currentStore, null, 2), 'utf8');
  console.log(`[Sync] Sukses menyimpan data live ke ${STORE_PATH}`);
  console.table(syncSummary);

  return { success: true, summary: syncSummary, primaryProjectId };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncFromLiveServer()
    .then((res) => {
      console.log('Sinkronisasi selesai dengan sukses!', res.summary);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Gagal melakukan sinkronisasi:', err);
      process.exit(1);
    });
}
