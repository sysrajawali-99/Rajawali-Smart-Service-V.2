export type UserRole = 'admin' | 'supervisor' | 'petugas' | 'klien';

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
  projectId?: string;
  nik: string;
  name: string;
  photoUrl: string;
  phone: string;
  shiftId: string;
  shiftName: string;
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
  durationMinutes?: number;
  checklistArea: TaskChecklistItem[];
  suppliesUsed: SupplyUsage[];
  remarks?: string;
  photoBefore?: string;
  photoProgress?: string; // Foto saat progress pengerjaan
  photoAfter?: string;
  qcScore?: number;
  qcStatus?: 'approved' | 'rejected' | 'pending';
  qcNotes?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  exportedToMonthlyReport?: boolean;
  monthlyOrderNo?: number; // Nomor urut pekerjaan di laporan bulanan
  monthlyReportExportDate?: string;
}

export interface QCInspection {
  id: string;
  projectId?: string;
  taskId: string;
  areaName: string;
  cleanerName: string;
  inspectorName: string;
  inspectedAt: string;
  score: number; // 0 - 100
  status: 'passed' | 'failed' | 'needs_rework';
  criteriaScores: {
    floor: number; // 0-20
    glassAndMirrors: number; // 0-20
    odorAndAir: number; // 0-20
    wasteManagement: number; // 0-20
    suppliesCompleteness: number; // 0-20
  };
  notes: string;
  photoProof?: string;
}

export interface Complaint {
  id: string;
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
  resolvedAt?: string;
  assignedCleanerId?: string;
  assignedCleanerName?: string;
  photoBefore?: string;
  photoResolved?: string;
  resolutionNotes?: string;
  slaMinutes: number;
  slaDeadline: string;
}

export interface ProjectLocation {
  id: string;
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
  name: string;
  email: string;
  role: UserRole;
  assignedProjectIds: string[]; // Projects this user is allowed to access
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
  projectId: string;
  name: string;
  category: ChecklistLocationCategory;
  floor: string;
  code: string;
  itemIds?: string[];
}

export interface ChecklistTemplateItem {
  id: string;
  category: ChecklistLocationCategory | 'all';
  name: string;
  description?: string;
  isDefault?: boolean;
  order?: number;
}

export type HourlyCheckItemStatus = 'clean' | 'issue' | 'not_checked' | 'dirty' | 'broken';

export interface HourlyCheckItemEntry {
  itemId: string;
  itemName: string;
  status: HourlyCheckItemStatus;
  notes?: string;
}

export interface HourlyChecklistSlot {
  hour: number; // 0..23 (00.00 to 24.00)
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
  projectId: string;
  locationId: string;
  locationName: string;
  category: ChecklistLocationCategory;
  date: string; // "YYYY-MM-DD" e.g. "2026-09-13"
  hourlySlots: HourlyChecklistSlot[]; // 24 slots (hour 0..23)
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'warning' | 'info' | 'success' | 'urgent';
  targetRole: UserRole[];
  read: boolean;
  taskId?: string;
  projectId?: string;
}

export type OfflineSyncActionType =
  | 'checklist_item_update'
  | 'checklist_batch_hour'
  | 'checklist_quick_fill'
  | 'slot_inspector_update'
  | 'task_completion';

export interface OfflineSyncEntry {
  id: string;
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
  projectId: string; // ID Proyek / Site (dipisahkan sesuai lokasi kerja user / klien)
  workDescription: string; // Uraian pekerjaan detail
  workMethod: string; // Metode pekerjaan, SOP, alat & chemical
  location: string; // Lokasi kerja spesifik di dalam site
  category: 'daily' | 'periodic' | 'deep_clean' | 'special_treatment';
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

