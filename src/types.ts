export type UserRole =
  | 'super_admin'
  | 'admin_perusahaan'
  | 'admin'
  | 'supervisor'
  | 'petugas'
  | 'klien';

export type CompanyStatus = 'aktif' | 'ditangguhkan' | 'diarsipkan';

export interface Company {
  id: string;
  nama: string;
  slug: string;
  logo?: string;
  warna?: string;
  status: CompanyStatus;
  createdAt: string;
  updatedAt?: string;
}

export type ViewMode = 'split' | 'web' | 'mobile';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'pending_qc';

export type AreaCleanlinessStatus = 'clean' | 'in_progress' | 'needs_cleaning' | 'inspected';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface AreaMaterialItem {
  id: string;
  name: string;
  category?: 'lantai' | 'dinding' | 'kaca' | 'sanitair' | 'metal' | 'furniture' | 'lainnya';
  notes?: string;
}

export interface Area {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId?: string;
  name: string;
  code: string;
  building: string;
  floor: string;
  zone: string;
  type: 'toilet' | 'lobby' | 'office' | 'pantry' | 'corridor' | 'outdoor' | 'parking' | 'escalator' | 'lift' | 'atrium' | 'other';
  status: AreaCleanlinessStatus;
  cleanerId: string;
  cleanerName: string;
  lastCleaned?: string;
  nextScheduled?: string;
  targetDurationMinutes: number;
  materials?: string[]; // e.g. ['Trap Besi', 'Bordes Stainless', 'Karet Railing', 'Kaca']
  materialNotes?: string; // Catatan spesifikasi/instruksi perawatan material
  description?: string;
}

export type AttendanceStatusCode = 'H' | 'I' | 'S' | 'A' | 'L' | '-';

export interface Cleaner {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId?: string;
  projectLocationId?: string;
  role?: string;
  nik: string;
  name: string;
  photoUrl: string;
  phone: string;
  shiftId: string;
  shiftName: string;
  shift?: string;
  assignedAreas: string[]; // Area IDs
  status: 'active' | 'on_break' | 'off';
  rating: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  isClockedIn: boolean;
  clockInTime?: string;
  attendance?: Record<number, AttendanceStatusCode>; // Tanggal 1 - 31 (H, I, S, A, L, -)
  attendanceByMonth?: Record<string, Record<number, AttendanceStatusCode>>; // Periode YYYY-MM
  workPlotting?: string; // Plotingan lokasi kerja manual (e.g. "Toilet Lt. 2 & Pantry Barat")
  workPlottingUpdatedAt?: string; // Waktu update terakhir plotingan (e.g. "14:30 WIB")
}

export interface ShiftPlottingAllocation {
  id: string;
  areaName: string; // Lokasi / Posisi Area Plotingan (e.g. "Toilet Pria & Wanita Lt. 1", "Lobby Utama & Receptionist")
  taskDescription: string; // Uraian Tugas / Deskripsi Pekerjaan (e.g. "Sanitasi kloset, mopping lantai, restock sabun & tissue")
  personnelQuota?: number; // Kuota / Target Jumlah Petugas (e.g. 1, 2)
  priority?: 'rutin' | 'intensif' | 'periodic'; // Level prioritas
}

export interface Shift {
  id: string;
  company_id?: string;
  companyId?: string;
  name: string;
  code: string;
  startTime: string; // e.g. "07:00"
  endTime: string;   // e.g. "15:00"
  color: string;
  personnelCount: number;
  description: string;
  workHoursDuration?: number; // e.g. 8
  durationText?: string;      // e.g. "8 Jam"
  plottingAllocations?: ShiftPlottingAllocation[];
}

export interface CleaningSchedule {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId?: string;
  title: string;
  areaId: string;
  areaName: string;
  cleanerId: string;
  cleanerName: string;
  frequency: 'harian' | 'mingguan' | 'bulanan';
  timeSlot: string;
  shiftId: string;
  checklistTemplates: string[];
  isActive: boolean;
}

export interface SupplyUsage {
  supplyId: string;
  supplyName: string;
  amountUsed: number;
  unit: string;
}

export interface TaskChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export type ChecklistItem = TaskChecklistItem;

export interface CleaningTask {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId?: string;
  areaId: string;
  areaName: string;
  buildingFloor: string;
  cleanerId: string;
  cleanerName: string;
  shift: string;
  scheduledTime: string;
  deadlineTime: string;
  status: TaskStatus;
  workDescription?: string; // Uraian pekerjaan detail
  taskDate?: string; // Tanggal pengerjaan (e.g. "13/09/2026")
  monthPeriod?: string; // Periode bulan (e.g. "2026-09")
  startTime?: string;
  completedTime?: string;
  completedAt?: string;
  zone?: string;
  durationMinutes?: number;
  checklistArea: TaskChecklistItem[];
  suppliesUsed: SupplyUsage[];
  remarks?: string;
  photoBefore?: string;
  photoProgress?: string; // Foto saat progress pengerjaan
  photoAfter?: string;
  photoProof?: string;
  photoBeforeTimestamp?: string;
  photoProgressTimestamp?: string;
  photoProofTimestamp?: string;
  qcScore?: number;
  qcStatus?: 'approved' | 'rejected' | 'pending';
  qcNotes?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  // Verifikasi / Approval berjenjang Controller / Pengawas
  controllerApprovalStatus?: 'approved' | 'rejected' | 'pending';
  controllerApprovedBy?: string;
  controllerApprovedAt?: string;
  controllerRejectionReason?: string;
  exportedToMonthlyReport?: boolean;
  monthlyOrderNo?: number; // Nomor urut pekerjaan di laporan bulanan
  monthlyReportExportDate?: string;
}


export interface QCAuditParameterResult {
  parameterName: string;
  scale: number; // 1 - 5
  category: string; // e.g. "Sangat Bersih", "Bersih", etc.
  weight: number; // 25, 20, 15
  weightedScore: number; // (scale / 5) * weight
}

export interface QCInspection {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId?: string;
  taskId: string;
  areaName: string;
  cleanerName: string;
  inspectorName: string;
  inspectedAt: string;
  score: number; // 0 - 100
  status: 'passed' | 'failed' | 'needs_rework';
  criteriaScores?: {
    floor: number; // 0-20
    glassAndMirrors: number; // 0-20
    odorAndAir: number; // 0-20
    wasteManagement: number; // 0-20
    suppliesCompleteness: number; // 0-20
  };
  auditParameters?: {
    supplies?: QCAuditParameterResult;
    sanitationAndOdor?: QCAuditParameterResult;
    surfaceFloor?: QCAuditParameterResult;
    wasteManagement?: QCAuditParameterResult;
    detailEsthetics?: QCAuditParameterResult;
  };
  qualityScale?: number; // 1 - 5 (Sangat Kotor s/d Sangat Bersih)
  qualityCategory?: string; // e.g. "Bersih"
  sessionWeight?: number; // bobot pekerjaan dalam sesi (e.g. 25%)
  sessionContribution?: number; // kontribusi skor terhadap total sesi
  notes: string;
  recommendations?: string[];
  photoProof?: string;
  photoBefore?: string; // Dokumentasi visual kerja sebelum pengerjaan
  photoProgress?: string; // Dokumentasi visual saat proses pengerjaan
  photoAfter?: string; // Dokumentasi visual setelah pengerjaan selesai
  inspectionSource?: 'weekly' | 'monthly' | 'special_job' | 'complaint' | 'task' | 'other';
  evaluatedInputSummary?: string;
}

export interface ComplaintExtensionRequest {
  id: string;
  requestedHours: number; // Durasi waktu tambahan dalam hitungan jam
  reason: string; // Alasan pengajuan tambahan waktu
  requestedBy: string; // Nama pemohon / petugas yang sedang menangani
  requestedAt: string; // Waktu pengajuan
  status: 'pending' | 'approved' | 'rejected';
  revisedHours?: number; // Durasi revisi yang disetujui pembuat tiket (dalam jam)
  reviewedBy?: string; // Pembuat tiket / pihak yang meninjau
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface Complaint {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId?: string;
  ticketNumber: string;
  reporterName: string;
  reporterRole: string;
  areaId: string;
  areaName: string;
  floor: string;
  category: string;
  description: string;
  priority: PriorityLevel;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  startedAt?: string;
  resolvedAt?: string;
  assignedCleanerId?: string;
  assignedCleanerName?: string;
  photoBefore?: string;
  photoProgress?: string;
  photoResolved?: string;
  resolutionNotes?: string;
  slaHours: number; // Durasi SLA dalam hitungan jam
  slaMinutes: number; // Durasi SLA dalam hitungan menit
  slaDeadline: string; // Teks representasi deadline
  deadlineTimestamp: number; // Unix epoch milliseconds untuk penghitungan Countdown waktu nyata
  extensionRequest?: ComplaintExtensionRequest;
}

export interface ProjectLocation {
  id: string;
  company_id?: string;
  companyId?: string;
  code: string;
  name: string;
  address: string;
  city: string;
  totalFloors: number;
  managerName: string;
  clientName: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AppUser {
  id: string;
  company_id?: string;
  companyId?: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  assignedProjectIds: string[]; // Projects this user is allowed to access
  phone?: string;
  createdAt?: string;
  mustChangePassword?: boolean;
}

export interface RoleModulePermission {
  moduleId: string;
  moduleName: string;
  category: string;
  admin: boolean;
  supervisor: boolean;
  petugas: boolean;
  klien: boolean;
  super_admin?: boolean;
  admin_perusahaan?: boolean;
}

export type ChecklistLocationCategory =
  | 'toilet'
  | 'public_area'
  | 'koridor'
  | 'musholla'
  | 'lift'
  | 'pantry'
  | 'custom';

export interface ChecklistLocation {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId: string;
  name: string;
  category: ChecklistLocationCategory;
  floor: string;
  code: string;
  itemIds?: string[];
}

export interface ChecklistTemplateItem {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId?: string; // Spesifik per gedung / proyek atau global jika undefined
  category: ChecklistLocationCategory | 'all';
  name: string;
  description?: string;
  sopInstruction?: string; // Instruksi Standar Operasional Prosedur (SOP) pengerjaan
  isDefault?: boolean;
  order?: number;
}


export type HourlyCheckItemStatus = 'clean' | 'issue' | 'not_checked' | 'dirty' | 'broken';

export interface HourlyCheckItemEntry {
  itemId: string;
  company_id?: string;
  companyId?: string;
  itemName: string;
  status: HourlyCheckItemStatus;
  notes?: string;
}

export interface HourlyChecklistSlot {
  hour: number; // 0..23 (00.00 to 24.00)
  company_id?: string;
  companyId?: string;
  hourLabel: string; // e.g. "00.00 - 01.00", "01.00 - 02.00", ... "23.00 - 24.00"
  status: 'clean' | 'has_issue' | 'pending';
  checkedBy?: string;
  checkedAt?: string;
  items: HourlyCheckItemEntry[];
  notes?: string;
  supervisorVerified?: boolean;
  supervisorName?: string;
}

export interface DailyAreaChecklist {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId: string;
  locationId: string;
  locationName: string;
  category: ChecklistLocationCategory;
  date: string; // "YYYY-MM-DD" e.g. "2026-09-13"
  hourlySlots: HourlyChecklistSlot[]; // 24 slots (hour 0..23)
}

export interface AppNotification {
  id: string;
  company_id?: string;
  companyId?: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'warning' | 'info' | 'success' | 'urgent';
  targetRole: UserRole[];
  read: boolean;
  taskId?: string;
  projectId?: string;
  isNewComplaint?: boolean;
  complaintId?: string;
}

export type OfflineSyncActionType =
  | 'checklist_item_update'
  | 'checklist_batch_hour'
  | 'checklist_quick_fill'
  | 'slot_inspector_update'
  | 'task_completion';

export interface OfflineSyncEntry {
  id: string;
  company_id?: string;
  companyId?: string;
  type: OfflineSyncActionType;
  title: string;
  description: string;
  timestamp: string;
  locationName?: string;
  cleanerName?: string;
  status: 'pending' | 'synced' | 'failed';
  payload?: any;
}

export type ProgramDayStatus = 'none' | 'planned' | 'in_progress' | 'done' | 'rescheduled';

export type ProgramFrequencyCode = 'D' | 'W' | 'M';

export interface MasterCleaningProgramItem {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId: string; // ID Proyek / Site (dipisahkan sesuai lokasi kerja user / klien)
  workDescription: string; // Uraian pekerjaan detail
  workMethod: string; // Metode pekerjaan, SOP, alat & chemical
  location: string; // Lokasi kerja spesifik di dalam site
  category?: 'daily' | 'weekly' | 'monthly' | 'periodic' | 'deep_clean' | 'special_treatment';
  frequency: ProgramFrequencyCode | 'harian' | 'mingguan' | 'dua_mingguan' | 'bulanan' | 'berkala' | string;
  picName: string; // Petugas / PIC penanggung jawab
  month: number; // 1 - 12
  year: number; // e.g. 2026
  days: Record<number, ProgramDayStatus>; // Tanggal 1 s/d 31
  targetDurationMinutes?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DamageCategory =
  | 'sanitair'
  | 'elektrikal'
  | 'mekanikal'
  | 'sipil_arsitektur'
  | 'furniture_interior'
  | 'eskalator_lift'
  | 'alat_kerja'
  | 'lainnya';

export type DamageSeverity = 'ringan' | 'sedang' | 'berat' | 'kritis';

export type DamageReportStatus =
  | 'dilaporkan'
  | 'dalam_penanganan'
  | 'menunggu_sparepart'
  | 'selesai'
  | 'ditolak';

export interface FacilityDamageReport {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId?: string;
  ticketNo: string; // e.g. "DMG-2026-001"
  itemName: string; // Nama Barang / Fasilitas Rusak
  category: DamageCategory;
  areaId?: string;
  locationName: string; // Lokasi / Ruangan (e.g. "Toilet Zona A Pria", "Eskalator A", "Lobby Utama")
  floor: string; // e.g. "Lantai GF", "Lantai 1", "Lantai 2"
  zone?: string; // e.g. "Zona A Sanitair", "Sirkulasi Vertikal"
  damageLevel: DamageSeverity; // ringan | sedang | berat | kritis
  chronology: string; // Kronologi kejadian & rincian kerusakan
  impact: string; // Dampak kerusakan terhadap kenyamanan/keamanan operasional
  actionTaken: string; // Tindakan awal / darurat yang sudah diambil petugas
  status: DamageReportStatus; // dilaporkan | dalam_penanganan | menunggu_sparepart | selesai | ditolak
  reportDate: string; // e.g. "2026-09-15"
  reportTime?: string; // e.g. "08:30 WIB"
  reporterName: string; // Nama Pelapor (Petugas / Pengawas)
  reporterRole?: string; // e.g. "Petugas Kebersihan", "Supervisor Operasional"
  reporterPhone?: string; // e.g. "0812-3456-7890"
  targetDepartment: string; // e.g. "Building Management & Engineering (MEP)", "General Affair / Pengadaan", "Vendor Eskalator"
  photoBefore?: string; // URL / Base64 foto kerusakan
  photoAfter?: string; // URL / Base64 foto perbaikan selesai
  repairedDate?: string; // Tanggal perbaikan selesai
  repairedTime?: string; // Waktu perbaikan selesai
  technicianName?: string; // Nama teknisi / pic penanganan
  technicianNotes?: string; // Catatan teknisi / tindakan perbaikan permanen
  costEstimate?: number; // Estimasi biaya perbaikan / penggantian sparepart (Rp)
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardKpiVisibilityConfig {
  kpiSummaryCards: boolean; // Kartu Ringkasan Metrik Utama (4 Kartu)
  kpiWorkLifecycle: boolean; // KPI Status Pekerjaan (Direncanakan, Diproses, Diselesaikan)
  kpiQualityScore: boolean; // KPI Nilai Kualitas & Audit QC (Skor 0-100, Grade Kualitas)
  kpiChecklistCompliance: boolean; // KPI Kepatuhan Ceklist 24 Jam & Pemantauan SLA
  kpiDamageReports: boolean; // KPI Kerusakan Fasilitas & Pemeliharaan Aset
  areaRealtimeStatus: boolean; // Pemantauan Status Kebersihan Area per Lantai
  quickActions: boolean; // Panel Aksi Cepat Operasional
  checklist24QuickView: boolean; // Widget Ringkasan Ceklist 24 Jam
  liveActivityFeed: boolean; // Live Feed Aktivitas & Dokumentasi Before-After
}

export const DEFAULT_KPI_VISIBILITY_OFF: DashboardKpiVisibilityConfig = {
  kpiSummaryCards: false,
  kpiWorkLifecycle: false,
  kpiQualityScore: false,
  kpiChecklistCompliance: false,
  kpiDamageReports: false,
  areaRealtimeStatus: false,
  quickActions: false,
  checklist24QuickView: false,
  liveActivityFeed: false,
};

export interface CompanyProfile {
  companyName: string;
  tagline: string;
  documentHeaderTitle: string; // Baris kedua / Subjudul Kop Surat
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string; // Base64 data URL atau link gambar logo
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'PT RAJAWALI TALENTA INDONESIA',
  tagline: 'Cleaning Operations & Facility Management System',
  documentHeaderTitle: 'MANAJEMEN OPERASIONAL KEBERSIHAN & FASILITAS GEDUNG',
  address: 'Gedung Office Tower Lt. 8, Jl. Jend. Sudirman No. 45',
  city: 'Jakarta Selatan 12190',
  phone: '021-5558901 / 0812-3456-7890',
  email: 'rajawalitalentaindonesia@gmail.com',
  website: 'www.rajawali-smart.co.id',
  logoUrl: '',
};

export type AuditActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'verify_approve'
  | 'verify_reject'
  | 'bulk_delete'
  | 'login'
  | 'export';

export interface AuditLogEntry {
  id: string;
  company_id?: string;
  companyId?: string;
  timestamp: string; // ISO format or formatted WIB
  userId: string;
  userName: string;
  userRole: UserRole;
  projectId?: string;
  projectName?: string;
  action: AuditActionType;
  module: string; // 'ceklist' | 'task' | 'inspeksi' | 'pengaturan' | 'complaint' | 'area' | 'petugas'
  entityId?: string;
  entityName?: string;
  details: string; // Deskripsi perubahan: Siapa mengubah apa dan kapan
  previousState?: string;
  newState?: string;
}

// ==================== KLIEN MODE INTERFACES ====================

export interface EmployeeTurnoverRecord {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId: string;
  cleanerId?: string;
  cleanerName: string;
  nik: string;
  role: string;
  shiftName: string;
  resignDate: string; // YYYY-MM-DD
  reason: string;
  replacementStatus: 'replaced' | 'recruiting' | 'pending';
  replacementCleanerName?: string;
  notes?: string;
  createdAt: string;
}

export type KlienChecklistCategory = 'toilet' | 'public_area' | 'parking';

export interface KlienChecklistItem {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId: string;
  category: KlienChecklistCategory;
  name: string;
  standard: string;
  order: number;
}

export interface KlienChecklistInspection {
  id: string;
  company_id?: string;
  companyId?: string;
  projectId: string;
  category: KlienChecklistCategory;
  areaLocation: string;
  inspectionDate: string; // YYYY-MM-DD
  inspectionTime: string; // HH:mm WIB
  shiftName: string;
  inspectorName: string;
  checkedItemIds: string[];
  totalItems: number;
  scorePercent: number;
  conditionStatus: 'clean' | 'fair' | 'dirty';
  notes?: string;
  photoUrl?: string;
  timestamp: string;
}

export type SpecialJobSourceType = 'supervisor_request' | 'weekly_activity' | 'monthly_activity';

export type SpecialJobStatus = 'requested' | 'in_progress' | 'completed';

export interface SpecialJobItem {
  id: string;
  company_id?: string;
  companyId?: string;
  ticketNo: string; // e.g. "SPJ-2026-001"
  projectId: string;
  title: string; // Nama / Uraian Pekerjaan Special Job
  workDescription?: string; // Alias for title / deskripsi pekerjaan
  workMethod: string; // Metode Pengerjaan, SOP, Alat & Chemical
  location: string; // Lokasi / Area Kerja
  floor: string; // Lantai / Zona
  sourceType: SpecialJobSourceType; // By Request Supervisor | Dari Weekly Activity | Dari Monthly Activity
  sourceProgramId?: string; // ID program asli jika diambil dari Weekly/Monthly Activity
  requestedBy: string; // Nama User / Supervisor yang me-request
  requestedByRole: string; // Role pemohon (e.g. "Supervisor Operasional")
  requestReason: string; // Instruksi / Alasan Request dari Supervisor
  assignedPicName: string; // Petugas / Tim Pelaksana
  shiftName: string; // Shift pelaksanaan
  priority: 'normal' | 'high' | 'urgent';
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // e.g. "09:00 - 11:00 WIB"
  targetDurationMinutes: number;
  status: SpecialJobStatus;
  notes?: string;
  photoBefore?: string;
  photoProgress?: string;
  photoAfter?: string;
  startedAt?: string;
  completedAt?: string;
  verifiedBySupervisor?: boolean;
  verifiedByName?: string;
  createdAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  userRole?: string;
  role?: string;
  projectId?: string;
  company_id?: string;
  companyId?: string;
  createdAt?: string;
}

export interface PhotoRecord {
  id: string;
  url: string;
  filename: string;
  size?: number;
  mimetype?: string;
  uploadedBy?: string;
  company_id?: string;
  companyId?: string;
  projectId?: string;
  createdAt?: string;
}



