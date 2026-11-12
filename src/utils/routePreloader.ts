/**
 * Intelligent background preloader for route components
 * Eliminates bundle download latency when switching tabs/menus
 */

const preloadedCache = new Set<string>();

const loaders: Record<string, () => Promise<any>> = {
  dashboard: () => import('../components/web/DashboardView'),
  ceklist: () => import('../components/web/CeklistAreaView'),
  area: () => import('../components/web/AreaCleaningView'),
  activity: () => import('../components/web/CleaningActivityView'),
  inspeksi: () => import('../components/web/InspeksiControlView'),
  report: () => import('../components/web/LaporanReportView'),
  petugas: () => import('../components/web/PetugasView'),
  shift: () => import('../components/web/ShiftView'),
  jadwal: () => import('../components/web/JadwalCleaningView'),
  kerusakan: () => import('../components/web/DamageReportView'),
  'damage-report': () => import('../components/web/DamageReportView'),
  proyek: () => import('../components/web/LokasiProyekView'),
  'daily-activity': () => import('../components/web/DailyActivityView'),
  'weekly-activity': () => import('../components/web/WeeklyActivityView'),
  'monthly-activity': () => import('../components/web/MonthlyActivityView'),
  'special-job': () => import('../components/web/SpecialJobView'),
  'master-program': () => import('../components/web/MasterCleaningProgramView'),
  mcp: () => import('../components/web/MasterCleaningProgramView'),
  complaint: () => import('../components/web/ComplaintView'),
  'klien-mode': () => import('../components/web/klien/KlienModeView'),
  'klien-manpower': () => import('../components/web/klien/KlienModeView'),
  'klien-checklist': () => import('../components/web/klien/KlienModeView'),
  'klien-kerusakan': () => import('../components/web/klien/KlienModeView'),
  'klien-activity': () => import('../components/web/klien/KlienModeView'),
  'klien-keluhan': () => import('../components/web/klien/KlienModeView'),
  perusahaan: () => import('../components/web/CompanyManagementView'),
  companies: () => import('../components/web/CompanyManagementView'),
  pengaturan: () => import('../components/web/PengaturanView'),
};

/**
 * Preload a specific route chunk on hover, touch, or focus
 */
export function preloadComponent(tab: string): void {
  const norm = tab.toLowerCase().trim();
  if (preloadedCache.has(norm)) return;
  const loader = loaders[norm];
  if (loader) {
    preloadedCache.add(norm);
    loader().catch(() => {
      preloadedCache.delete(norm);
    });
  }
}

/**
 * Preloads all primary application views in background idle intervals
 */
export function preloadAllViews(): void {
  const priorityTabs = [
    'dashboard',
    'ceklist',
    'activity',
    'inspeksi',
    'complaint',
    'daily-activity',
    'report',
    'petugas',
    'shift',
    'jadwal',
    'kerusakan',
    'area',
    'weekly-activity',
    'monthly-activity',
    'special-job',
    'master-program',
    'klien-mode',
    'pengaturan',
    'perusahaan',
  ];

  priorityTabs.forEach((tab, index) => {
    setTimeout(() => {
      preloadComponent(tab);
    }, 400 + index * 80);
  });
}
