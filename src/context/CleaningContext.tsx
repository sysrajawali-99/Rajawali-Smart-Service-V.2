import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import {
  UserRole,
  ViewMode,
  Area,
  Cleaner,
  Shift,
  CleaningSchedule,
  CleaningTask,
  TaskStatus,
  QCInspection,
  Complaint,
  ComplaintExtensionRequest,
  PriorityLevel,
  AppNotification,
  TaskChecklistItem,
  SupplyUsage,
  ProjectLocation,
  AppUser,
  RoleModulePermission,
  ChecklistLocation,
  ChecklistLocationCategory,
  ChecklistTemplateItem,
  DailyAreaChecklist,
  HourlyCheckItemStatus,
  HourlyCheckItemEntry,
  OfflineSyncEntry,
  MasterCleaningProgramItem,
  ProgramDayStatus,
  AttendanceStatusCode,
  FacilityDamageReport,
  DamageReportStatus,
  DashboardKpiVisibilityConfig,
  DEFAULT_KPI_VISIBILITY_OFF,
  CompanyProfile,
  DEFAULT_COMPANY_PROFILE,
  AuditLogEntry,
  EmployeeTurnoverRecord,
  KlienChecklistItem,
  KlienChecklistInspection,
  SpecialJobItem,
  Company,
  isSuperAdminRole,
  UploadedWorkScheduleDocument,
  UploadedWorkScheduleEntry,
  UploadedMcpDocument,
  UploadedMcpRow,
  McpChecklistResultRecord,
  McpChecklistStatus,
} from '../types';
import { calculateShiftDuration } from '../utils/shiftUtils';
import { normalizeFrequencyCode, getNextProgramDayStatus } from '../utils/mcpUtils';
import { makeMcpChecklistRecordId, TodayScheduledMcpItem } from '../utils/mcpChecklist';

function normalizeLokasiProyekKey(name: string): string {
  return (
    String(name ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'default'
  );
}

const CORE_COLLECTIONS: string[] = [
  COLLECTIONS.PROJECTS,
  COLLECTIONS.USERS,
  COLLECTIONS.COMPANIES,
  COLLECTIONS.COMPANY_PROFILE,
  COLLECTIONS.KPI_CONFIG,
  COLLECTIONS.RBAC_PERMISSIONS,
  COLLECTIONS.AREAS,
  COLLECTIONS.CLEANERS,
  COLLECTIONS.SHIFTS,
  COLLECTIONS.TASKS,
  COLLECTIONS.COMPLAINTS,
  COLLECTIONS.DAMAGE_REPORTS,
  COLLECTIONS.SPECIAL_JOBS,
  COLLECTIONS.CHECKLIST_LOCATIONS,
  COLLECTIONS.CHECKLIST_TEMPLATES,
  COLLECTIONS.DAILY_CHECKLISTS,
  COLLECTIONS.INSPECTIONS,
  COLLECTIONS.MASTER_PROGRAMS,
];

const MENU_COLLECTION_MAP: Record<string, string[]> = {
  jadwal: [COLLECTIONS.SCHEDULES, COLLECTIONS.UPLOADED_WORK_SCHEDULES],
  ceklist: [COLLECTIONS.UPLOADED_MCP, COLLECTIONS.MCP_CHECKLIST_RESULTS],
  'master-program': [COLLECTIONS.MASTER_PROGRAMS, COLLECTIONS.UPLOADED_MCP, COLLECTIONS.MCP_CHECKLIST_RESULTS],
  mcp: [COLLECTIONS.MASTER_PROGRAMS, COLLECTIONS.UPLOADED_MCP, COLLECTIONS.MCP_CHECKLIST_RESULTS],
  pengaturan: [COLLECTIONS.AUDIT_LOGS],
  'klien-mode': [COLLECTIONS.UPLOADED_WORK_SCHEDULES, COLLECTIONS.EMPLOYEE_TURNOVERS, COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS],
  'klien-manpower': [COLLECTIONS.UPLOADED_WORK_SCHEDULES, COLLECTIONS.EMPLOYEE_TURNOVERS, COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS],
  'klien-checklist': [COLLECTIONS.KLIEN_CHECKLIST_ITEMS, COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS, COLLECTIONS.UPLOADED_MCP, COLLECTIONS.MCP_CHECKLIST_RESULTS],
  'klien-kerusakan': [COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS],
  'klien-activity': [COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS],
  'klien-keluhan': [COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS],
};
import {
  INITIAL_AREAS,
  INITIAL_CLEANERS,
  INITIAL_SHIFTS,
  INITIAL_SCHEDULES,
  INITIAL_TASKS,
  INITIAL_INSPECTIONS,
  INITIAL_COMPLAINTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PROJECTS,
  INITIAL_USERS,
  DEFAULT_RBAC_PERMISSIONS,
  INITIAL_CHECKLIST_TEMPLATES,
  INITIAL_CHECKLIST_LOCATIONS,
  INITIAL_DAILY_CHECKLISTS,
  INITIAL_MASTER_PROGRAMS,
  INITIAL_DAMAGE_REPORTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EMPLOYEE_TURNOVERS,
  INITIAL_KLIEN_CHECKLIST_ITEMS,
  DEFAULT_KLIEN_CHECKLIST_TEMPLATES,
  INITIAL_KLIEN_CHECKLIST_INSPECTIONS,
  INITIAL_SPECIAL_JOBS,
  generate24HourSlots,
} from '../data/initialData';

import {
  ensureCompleteSlotItems,
  findMatchingSlotItem,
  getNextChecklistStatus,
} from '../utils/checklistHelper';
import confetti from 'canvas-confetti';
import {
  COLLECTIONS,
  getRecords,
  upsertRecord,
  deleteRecord,
  deleteCollectionRecords,
  onRecordChange,
  onServerReconnect,
  fetchServerStatus,
  socket,
  apiLogin,
  apiLogout,
  apiVerifySession,
  apiUpdateCompanyStatus,
  apiUpdateCompany,
  getAuthToken,
  getAuthHeaders,
  setAuthToken,
} from '../services/apiService';
import {
  offlineDb,
  cacheOfflineData,
  saveChecklistToOutbox,
  clearCachedDataOnLogout,
} from '../services/offlineDb';
import { syncService } from '../services/syncService';
import { autoSyncPwaIconsFromLogo, PwaIconItem } from '../utils/pwaIconGenerator';
import { triggerTopNotification } from '../components/common/TopNotificationPopup';

interface CleaningContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMobileMenu: () => void;
  activeCleanerId: string;
  setActiveCleanerId: (id: string) => void;
  activeCleaner: Cleaner;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Supabase Realtime Sync
  supabaseStatus: {
    isConfigured: boolean;
    status: string;
    lastSyncedAt: string | null;
  };
  syncToSupabase: () => Promise<void>;
  pullAllDataFromServer: (forceFullPull?: boolean) => Promise<void>;
  ensureCollectionsLoaded: (collections: string[]) => Promise<void>;
  syncFromLiveVps: () => Promise<{ success: boolean; message: string; summary?: any }>;
  isInitialLoading: boolean;

  // Connection & Offline Queue
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  offlineQueue: OfflineSyncEntry[];
  syncOfflineData: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Project Location Management & User Access Restrictions
  projects: ProjectLocation[];
  allProjects: ProjectLocation[];
  activeProjectId: string;
  activeProject: ProjectLocation;
  setActiveProjectId: (id: string) => void;
  addProject: (proj: Omit<ProjectLocation, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, updates: Partial<ProjectLocation>) => void;
  deleteProject: (id: string) => void;
  assignShiftsToProject: (projectId: string, shiftIds: string[]) => void;
  getProjectShifts: (projectId?: string) => Shift[];

  // Users & Project Assignments
  users: AppUser[];
  activeUserId: string;
  setActiveUserId: (id: string) => void;
  currentUser: AppUser;
  addUser: (user: Omit<AppUser, 'id'>) => AppUser;
  updateUser: (userId: string, updates: Partial<AppUser>) => void;
  deleteUser: (userId: string) => { success: boolean; message?: string };
  updateUserProjectAssignment: (userId: string, projectIds: string[]) => void;
  allowedProjects: ProjectLocation[];

  // Multi-Company Management (Super Admin)
  companies: Company[];
  addCompany: (comp: Omit<Company, 'id' | 'createdAt'>) => Promise<Company>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string, typedConfirmName: string) => Promise<{ success: boolean; message?: string }>;

  // Area Checklist (24 Hours & Master Data)
  checklistLocations: ChecklistLocation[];
  addChecklistLocation: (loc: Omit<ChecklistLocation, 'id'>) => void;
  updateChecklistLocation: (id: string, updates: Partial<ChecklistLocation>) => void;
  deleteChecklistLocation: (id: string) => void;

  checklistTemplates: ChecklistTemplateItem[];
  addChecklistTemplate: (tpl: Omit<ChecklistTemplateItem, 'id'>) => void;
  updateChecklistTemplate: (id: string, updates: Partial<ChecklistTemplateItem>) => void;
  deleteChecklistTemplate: (id: string) => void;

  dailyChecklists: DailyAreaChecklist[];
  toggleHourlySlotCell: (
    dailyChecklistId: string,
    hour: number,
    itemKeyOrId: string,
    forcedStatus?: HourlyCheckItemStatus
  ) => void;
  updateHourlySlotItem: (
    dailyChecklistId: string,
    hour: number,
    itemId: string,
    status: HourlyCheckItemStatus,
    notes?: string
  ) => void;
  batchUpdateHourStatus: (
    dailyChecklistId: string,
    hour: number,
    status: HourlyCheckItemStatus,
    checkedBy: string
  ) => void;
  updateSlotInspector: (
    dailyChecklistId: string,
    hour: number,
    checkedBy: string,
    supervisorVerified?: boolean
  ) => void;
  fillDailyChecklistClean: (
    dailyChecklistId: string,
    startHourOrHours: number | number[],
    endHourOrCheckedBy?: number | string,
    checkedBy?: string
  ) => void;
  addManualItemToDailyChecklist: (dailyChecklistId: string, itemName: string) => void;
  getOrCreateDailyChecklist: (projectId: string, locationId: string, date: string) => DailyAreaChecklist;
  ensureDailyChecklist: (projectId: string, locationId: string, date: string) => void;
  selectedChecklistLocationId: string | null;
  setSelectedChecklistLocationId: (id: string | null) => void;
  createChecklistFromArea: (area: Area) => ChecklistLocation;
  createChecklistsFromAreas: (areasToCreate: Area[]) => { createdCount: number; existingCount: number };

  // Master Cleaning Program (dipisahkan sesuai lokasi kerja user / klien)
  masterPrograms: MasterCleaningProgramItem[];
  allMasterPrograms: MasterCleaningProgramItem[];
  addMasterProgram: (item: Omit<MasterCleaningProgramItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMasterProgram: (idOrItem: string | MasterCleaningProgramItem, updates?: Partial<MasterCleaningProgramItem>) => void;
  deleteMasterProgram: (id: string) => void;
  toggleMasterProgramDay: (programId: string, day: number, forcedStatus?: ProgramDayStatus) => void;
  batchSetMasterProgramDays: (programId: string, days: number[], status: ProgramDayStatus) => void;
  duplicateMasterProgram: (id: string) => void;

  // Facility Damage Reports (Laporan Kerusakan Barang / Fasilitas)
  damageReports: FacilityDamageReport[];
  allDamageReports: FacilityDamageReport[];
  addDamageReport: (report: Omit<FacilityDamageReport, 'id' | 'ticketNo' | 'createdAt'>) => void;
  updateDamageReport: (id: string, updates: Partial<FacilityDamageReport>) => void;
  deleteDamageReport: (id: string) => void;
  resolveDamageReport: (
    id: string,
    resolutionPayload: {
      technicianNotes?: string;
      photoAfter?: string;
      technicianName?: string;
      costEstimate?: number;
    }
  ) => void;

  // Data (Filtered by active project location)
  areas: Area[];
  cleaners: Cleaner[];
  shifts: Shift[];
  schedules: CleaningSchedule[];
  uploadedWorkSchedules: UploadedWorkScheduleDocument[];
  uploadedMcpPrograms: UploadedMcpDocument[];
  mcpChecklistResults: McpChecklistResultRecord[];
  tasks: CleaningTask[];
  inspections: QCInspection[];
  complaints: Complaint[];
  notifications: AppNotification[];

  // All unfiltered data
  allAreas: Area[];
  allTasks: CleaningTask[];

  // Actions
  toggleTaskChecklist: (taskId: string, checklistId: string) => void;
  updateTaskMeta: (
    taskId: string,
    updates: Partial<
      Pick<
        CleaningTask,
        | 'shift'
        | 'areaId'
        | 'areaName'
        | 'buildingFloor'
        | 'taskDate'
        | 'monthPeriod'
        | 'cleanerId'
        | 'cleanerName'
        | 'scheduledTime'
        | 'deadlineTime'
      >
    >
  ) => void;
  addTaskChecklistItem: (taskId: string, label: string) => void;
  addCleaningTask: (payload: Omit<CleaningTask, 'id'>) => void;
  updateTaskSupply: (taskId: string, supplyId: string, amount: number) => void;
  updateTaskRemark: (taskId: string, remarks: string) => void;
  updateTaskPhotos: (taskId: string, before?: string, progress?: string, after?: string) => void;
  exportTaskToMonthlyReport: (taskId: string, targetMonth?: string) => void;
  removeTaskFromMonthlyReport: (taskId: string) => void;
  bulkExportToMonthlyReport: (taskIds: string[], targetMonth?: string) => void;
  exportTasksToMonthlyReport: (taskIds: string[], targetMonth?: string) => void;
  updateTaskWorkDescription: (taskId: string, description: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  submitTaskCompletion: (
    taskId: string,
    payload: {
      checklistArea: TaskChecklistItem[];
      suppliesUsed?: SupplyUsage[];
      remarks: string;
      photoBefore: string;
      photoProgress?: string;
      photoAfter: string;
    }
  ) => void;
  submitQCInspection: (
    payload: {
      taskId: string;
      areaName?: string;
      cleanerName?: string;
      score: number;
      status: 'passed' | 'failed' | 'needs_rework';
      criteriaScores?: {
        floor: number;
        glassAndMirrors: number;
        odorAndAir: number;
        wasteManagement: number;
        suppliesCompleteness: number;
      };
      auditParameters?: QCInspection['auditParameters'];
      qualityScale?: number;
      qualityCategory?: string;
      sessionWeight?: number;
      sessionContribution?: number;
      notes: string;
      recommendations?: string[];
      photoProof?: string;
      photoBefore?: string;
      photoProgress?: string;
      photoAfter?: string;
      inspectionSource?: 'weekly' | 'monthly' | 'special_job' | 'complaint' | 'task' | 'other';
      evaluatedInputSummary?: string;
    }
  ) => void;
  submitNewComplaint: (
    payload: {
      reporterName: string;
      reporterRole: string;
      areaId?: string;
      areaName?: string;
      floor?: string;
      category?: string;
      description: string;
      priority?: PriorityLevel;
      slaHours?: number;
      photoBefore?: string;
    }
  ) => void;
  startHandlingComplaint: (complaintId: string) => void;
  requestComplaintExtension: (complaintId: string, hours: number, reason: string) => void;
  respondToComplaintExtension: (
    complaintId: string,
    action: 'approve' | 'revise' | 'reject',
    revisedHours?: number,
    reviewNotes?: string
  ) => void;
  resolveComplaint: (
    complaintId: string,
    resolutionNotes: string,
    photoProgress?: string,
    photoResolved?: string
  ) => void;
  addArea: (newArea: Omit<Area, 'id'>) => void;
  updateArea: (id: string, updates: Partial<Area>) => void;
  deleteArea: (id: string) => void;
  addCleaner: (newCleaner: Omit<Cleaner, 'id'>) => void;
  updateCleaner: (id: string, updates: Partial<Cleaner>) => void;
  deleteCleaner: (id: string) => void;
  updateCleanerAttendance: (cleanerId: string, day: number, status: AttendanceStatusCode, monthPeriod?: string) => void;
  batchSetCleanerAttendance: (cleanerId: string, days: Record<number, AttendanceStatusCode>, monthPeriod?: string) => void;
  addShift: (newShift: Omit<Shift, 'id'>) => void;
  updateShift: (id: string, updates: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  toggleClockInOut: (cleanerId: string) => void;
  dismissNotification: (id: string) => void;
  acknowledgeComplaintNotifications: () => void;
  clearAllNotifications: () => void;
  triggerDeadlinePushNotification: () => void;
  resetToInitialData: () => void;

  // Dashboard KPI Visibility Settings (Dapat dikonfigurasi melalui Pengaturan & Master Data)
  kpiConfig: DashboardKpiVisibilityConfig;
  updateKpiConfig: (newConfig: DashboardKpiVisibilityConfig) => void;
  resetKpiConfig: () => void;
  toggleKpiWidget: (key: keyof DashboardKpiVisibilityConfig) => void;

  // Multi-Company Active State
  currentCompany?: Company;

  // Authentication & Session
  isAuthenticated: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  instantLogin: (userId: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;

  // System Reload Feature
  reloadSystemData: () => Promise<void>;
  isReloading: boolean;

  // Role-Based Access Control (RBAC) Matrix
  rbacPermissions: RoleModulePermission[];
  updateRbacPermission: (moduleId: string, role: UserRole, allowed: boolean) => void;
  resetRbacPermissions: () => void;
  hasAccess: (role: UserRole, moduleId: string) => boolean;

  // Delete helpers
  deleteSchedule: (id: string) => void;
  deleteComplaint: (id: string) => void;

  // Upload Jadwal Kerja (Roster Bulanan Excel)
  saveUploadedWorkSchedule: (payload: {
    bulan: number;
    tahun: number;
    daysCount: number;
    fileName?: string;
    entries: UploadedWorkScheduleEntry[];
  }) => Promise<UploadedWorkScheduleDocument>;
  syncUploadedScheduleToCleaners: (
    doc: UploadedWorkScheduleDocument,
    referenceDay?: number
  ) => Promise<{ syncedCount: number; createdCount: number; updatedCount: number }>;
  deleteUploadedWorkSchedule: (id: string) => Promise<void>;

  // Upload MCP (Master Cleaning Program Bulanan Excel)
  saveUploadedMcpProgram: (payload: {
    lokasi_proyek: string;
    bulan: number;
    tahun: number;
    daysCount: number;
    dayCodes?: Record<number, string>;
    sheetNames?: string[];
    fileName?: string;
    rows: UploadedMcpRow[];
  }) => Promise<UploadedMcpDocument>;
  updateUploadedMcpCell: (
    docId: string,
    rowKey: string,
    tanggal: number,
    newValue: string
  ) => Promise<void>;
  updateUploadedMcpRows: (
    docId: string,
    nextRows: UploadedMcpRow[]
  ) => Promise<UploadedMcpDocument | undefined>;
  deleteUploadedMcpProgram: (id: string) => Promise<void>;

  // Ceklist Kebersihan Area (Otomatis dari MCP Hari Ini)
  saveMcpChecklistResults: (payload: {
    date: string;
    bulan: number;
    tahun: number;
    tanggal: number;
    entries: Array<{
      item: TodayScheduledMcpItem;
      status: McpChecklistStatus;
    }>;
  }) => Promise<McpChecklistResultRecord[]>;

  // Pengaturan Data Perusahaan & Kop Surat Dokumen PDF
  companyProfile: CompanyProfile;
  updateCompanyProfile: (updates: Partial<CompanyProfile>, targetCompanyId?: string) => void;
  resetCompanyProfile: () => void;
  isPwaIconsRegenerating: boolean;
  regeneratePwaIcons: (customLogo?: string) => Promise<PwaIconItem[]>;

  // Hapus Data Masal per Sub Menu (Khusus Super Admin)
  bulkDeleteSubmenuData: (
    submenuKey: string,
    scope: 'active_project' | 'all'
  ) => Promise<{ count: number; label: string }>;

  // Verifikasi / Approval Berjenjang Controller
  verifyTaskApproval: (
    taskId: string,
    action: 'approved' | 'rejected',
    notes?: string
  ) => void;

  // Audit Trail Multi-Proyek
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => void;
  clearAuditLogs: () => void;

  // Real-time Overdue Monitoring Check
  checkOverdueAreasAndTasks: () => { overdueTasksCount: number; overdueChecklistsCount: number };

  // ==================== KLIEN MODE ====================
  employeeTurnovers: EmployeeTurnoverRecord[];
  addEmployeeTurnover: (record: Omit<EmployeeTurnoverRecord, 'id' | 'createdAt'>) => void;
  deleteEmployeeTurnover: (id: string) => void;

  klienChecklistItems: KlienChecklistItem[];
  addKlienChecklistItem: (item: Omit<KlienChecklistItem, 'id'>) => void;
  updateKlienChecklistItem: (id: string, updates: Partial<KlienChecklistItem>) => void;
  deleteKlienChecklistItem: (id: string) => void;
  resetKlienChecklistItems: () => void;

  klienChecklistInspections: KlienChecklistInspection[];
  submitKlienChecklistInspection: (insp: Omit<KlienChecklistInspection, 'id' | 'timestamp'>) => void;
  deleteKlienChecklistInspection: (id: string) => void;

  // Special Jobs (By Request Supervisor & Diambil dari Weekly/Monthly Activity)
  specialJobs: SpecialJobItem[];
  allSpecialJobs: SpecialJobItem[];
  addSpecialJob: (job: Omit<SpecialJobItem, 'id' | 'ticketNo' | 'createdAt'>) => SpecialJobItem;
  updateSpecialJob: (id: string, updates: Partial<SpecialJobItem>) => void;
  deleteSpecialJob: (id: string) => void;
}


export function normalizeAuditLog(raw: any): AuditLogEntry {
  if (!raw) return raw;
  let detailsText = '';
  if (typeof raw.details === 'string' && raw.details.trim()) {
    detailsText = raw.details;
  } else if (typeof raw.description === 'string' && raw.description.trim()) {
    detailsText = raw.description;
  } else if (raw.details && typeof raw.details === 'object') {
    if (raw.details.outboxId) {
      const reasonPart = raw.details.flagReason ? ` - Alasan: ${raw.details.flagReason}` : '';
      detailsText = `${raw.description || 'Sinkronisasi Ceklist'} (ID: ${raw.details.outboxId}${raw.details.flagged ? ', Ditandai Tinjau' : ''}${reasonPart})`;
    } else if (raw.details.taskId) {
      detailsText = `${raw.description || 'Notifikasi Tugas'} (ID Tugas: ${raw.details.taskId})`;
    } else {
      try {
        detailsText = JSON.stringify(raw.details);
      } catch {
        detailsText = String(raw.details);
      }
    }
  } else {
    detailsText = raw.description || '-';
  }

  return {
    ...raw,
    userName: (typeof raw.userName === 'string' && raw.userName.trim()) ? raw.userName : (raw.user_name || 'Sistem'),
    userRole: (typeof raw.userRole === 'string' && raw.userRole.trim()) ? raw.userRole : (raw.user_role || 'system'),
    timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
    details: detailsText,
  };
}

const CleaningContext = createContext<CleaningContextType | undefined>(undefined);

export const CleaningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Roles & View mode
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('sco_role') as UserRole) || 'super_admin';
  });
  const [viewMode, setViewMode] = useState<ViewMode>('web');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const [activeCleanerId, setActiveCleanerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedChecklistLocationId, setSelectedChecklistLocationId] = useState<string | null>(null);

  // Error notification helper for server operations
  const notifyServerError = (actionDesc: string, err?: any) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const notif: AppNotification = {
      id: `notif-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: '⚠️ Gagal Menyimpan ke Database Server',
      message: `${actionDesc}: ${err?.message || 'Koneksi ke backend bermasalah'}.`,
      timestamp: nowStr,
      type: 'urgent',
      targetRole: ['super_admin', 'admin', 'supervisor', 'petugas', 'klien'],
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Dashboard KPI Visibility Configuration
  const [kpiConfig, setKpiConfig] = useState<DashboardKpiVisibilityConfig>(() => {
    try {
      const saved = localStorage.getItem('jti_kpi_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return DEFAULT_KPI_VISIBILITY_OFF;
  });

  const updateKpiConfig = (newConfig: DashboardKpiVisibilityConfig) => {
    setKpiConfig(newConfig);
    try {
      localStorage.setItem('jti_kpi_config', JSON.stringify(newConfig));
    } catch {}
    upsertRecord(COLLECTIONS.KPI_CONFIG, { ...newConfig, id: 'main' }).catch((err) =>
      notifyServerError('pengaturan KPI', err)
    );
  };

  const resetKpiConfig = () => {
    setKpiConfig(DEFAULT_KPI_VISIBILITY_OFF);
    try {
      localStorage.removeItem('jti_kpi_config');
    } catch {}
    upsertRecord(COLLECTIONS.KPI_CONFIG, { ...DEFAULT_KPI_VISIBILITY_OFF, id: 'main' }).catch((err) =>
      notifyServerError('reset konfigurasi KPI', err)
    );
  };

  const toggleKpiWidget = (key: keyof DashboardKpiVisibilityConfig) => {
    const updated = { ...kpiConfig, [key]: !kpiConfig[key] };
    updateKpiConfig(updated);
  };

  // Pengaturan Data Perusahaan & Kop Surat Laporan PDF / Login Page
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem('jti_company_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return DEFAULT_COMPANY_PROFILE;
  });

  const updateCompanyProfile = (updates: Partial<CompanyProfile>, targetCompanyId?: string) => {
    setCompanyProfile((prev) => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('jti_company_profile', JSON.stringify(updated));
      } catch {}
      upsertRecord(COLLECTIONS.COMPANY_PROFILE, { ...updated, id: 'main' }).catch((err) =>
        notifyServerError('profil perusahaan', err)
      );
      return updated;
    });

    const compId = targetCompanyId || 'comp-main';
    if (compId) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === compId
            ? {
                ...c,
                logo: updates.logoUrl !== undefined ? updates.logoUrl : c.logo,
                nama: updates.companyName !== undefined ? updates.companyName : c.nama,
                tagline: updates.tagline !== undefined ? updates.tagline : c.tagline,
                documentHeaderTitle: updates.documentHeaderTitle !== undefined ? updates.documentHeaderTitle : c.documentHeaderTitle,
                address: updates.address !== undefined ? updates.address : c.address,
                city: updates.city !== undefined ? updates.city : c.city,
                phone: updates.phone !== undefined ? updates.phone : c.phone,
                email: updates.email !== undefined ? updates.email : c.email,
                website: updates.website !== undefined ? updates.website : c.website,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    }
  };

  const resetCompanyProfile = () => {
    setCompanyProfile(DEFAULT_COMPANY_PROFILE);
    try {
      localStorage.removeItem('jti_company_profile');
    } catch {}
    upsertRecord(COLLECTIONS.COMPANY_PROFILE, { ...DEFAULT_COMPANY_PROFILE, id: 'main' }).catch((err) =>
      notifyServerError('reset profil perusahaan', err)
    );
  };

  // --------------------------------------------------------------------------
  // Sistem Deteksi Perubahan Logo & Auto-Regenerasi 11 Ikon PWA Standar
  // --------------------------------------------------------------------------
  const [isPwaIconsRegenerating, setIsPwaIconsRegenerating] = useState<boolean>(false);
  const lastProcessedLogoUrlRef = useRef<string | undefined>(undefined);
  const isSyncingPwaIconsRef = useRef<boolean>(false);

  const regeneratePwaIcons = async (customLogo?: string): Promise<PwaIconItem[]> => {
    const targetLogo = customLogo !== undefined ? customLogo : companyProfile?.logoUrl;
    setIsPwaIconsRegenerating(true);
    isSyncingPwaIconsRef.current = true;
    try {
      const result = await autoSyncPwaIconsFromLogo(
        targetLogo,
        '#0284c7',
        companyProfile?.companyName
      );
      lastProcessedLogoUrlRef.current = targetLogo?.trim() || '';
      return result;
    } finally {
      setIsPwaIconsRegenerating(false);
      isSyncingPwaIconsRef.current = false;
    }
  };

  // Deteksi Otomatis: Saat companyProfile.logoUrl diperbarui, sistem langsung
  // memicu regenerasi atau pemetaan ulang ke-11 ikon PWA secara otomatis tanpa interaksi manual.
  useEffect(() => {
    const currentLogo = companyProfile?.logoUrl?.trim() || '';

    // Inisialisasi awal (mount pertama)
    if (lastProcessedLogoUrlRef.current === undefined) {
      lastProcessedLogoUrlRef.current = currentLogo;

      // Jika profil sudah memiliki custom logo, pastikan 11 ikon PWA terpetakan di penyimpanan lokal
      if (currentLogo) {
        const savedIcons = localStorage.getItem('jti_pwa_icons');
        let needsInitialSync = true;
        if (savedIcons) {
          try {
            const parsed = JSON.parse(savedIcons);
            if (Array.isArray(parsed) && parsed.length === 11) {
              needsInitialSync = false;
            }
          } catch {}
        }

        if (needsInitialSync && !isSyncingPwaIconsRef.current) {
          isSyncingPwaIconsRef.current = true;
          setIsPwaIconsRegenerating(true);
          autoSyncPwaIconsFromLogo(
            currentLogo,
            '#0284c7',
            companyProfile?.companyName
          )
            .catch((err) => console.warn('[PWA Auto-Sync Initial] Notice:', err))
            .finally(() => {
              isSyncingPwaIconsRef.current = false;
              setIsPwaIconsRegenerating(false);
            });
        }
      }
      return;
    }

    // Deteksi jika companyProfile.logoUrl mengalami perubahan nilai
    if (lastProcessedLogoUrlRef.current !== currentLogo) {
      // Verifikasi apakah logo saat ini bukan dataUrl yang baru saja dihasilkan favicon generator untuk mencegah perulangan rekursif
      const savedIcons = localStorage.getItem('jti_pwa_icons');
      let isAlreadyMapped = false;
      if (savedIcons && currentLogo.startsWith('data:')) {
        try {
          const parsed = JSON.parse(savedIcons);
          if (Array.isArray(parsed) && parsed.some((p: any) => p.path === currentLogo || p.dataUrl === currentLogo)) {
            isAlreadyMapped = true;
          }
        } catch {}
      }

      lastProcessedLogoUrlRef.current = currentLogo;

      if (!isAlreadyMapped && !isSyncingPwaIconsRef.current) {
        isSyncingPwaIconsRef.current = true;
        setIsPwaIconsRegenerating(true);
        console.log('[CleaningContext] Terdeteksi pembaruan companyProfile.logoUrl. Memulai regenerasi otomatis 11 ikon PWA...');

        autoSyncPwaIconsFromLogo(
          currentLogo,
          '#0284c7',
          companyProfile?.companyName
        )
          .then((newIcons) => {
            console.log(`[CleaningContext] Sukses: Ke-11 ikon PWA otomatis diregenerasi dan disinkronkan (${newIcons.length} varian).`);
          })
          .catch((err) => {
            console.warn('[CleaningContext] Peringatan saat regenerasi otomatis ikon PWA:', err);
          })
          .finally(() => {
            isSyncingPwaIconsRef.current = false;
            setIsPwaIconsRegenerating(false);
          });
      }
    }
  }, [companyProfile?.logoUrl, companyProfile?.companyName]);

  // 2. Offline Mode & Auto Sync Management
  const [isOnline, setIsOnlineState] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const addOfflineQueueEntry = (entry: Omit<OfflineSyncEntry, 'id' | 'timestamp' | 'status'>) => {
    const newEntry: OfflineSyncEntry = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      status: 'pending',
      ...entry,
    };
    setOfflineQueue((prev) => [newEntry, ...prev]);
  };

  const syncOfflineData = async () => {
    if (offlineQueue.length === 0 || isSyncing) return;
    setIsSyncing(true);

    // Realistic sync animation delay
    await new Promise((res) => setTimeout(res, 800));

    const count = offlineQueue.length;
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    setOfflineQueue([]);
    setLastSyncedAt(nowTime);
    localStorage.setItem('sco_last_synced', nowTime);
    setIsSyncing(false);

    // Add push notification for supervisor / admin / cleaner
    const syncNotif: AppNotification = {
      id: `notif-sync-${Date.now()}`,
      title: '✅ Sinkronisasi Data Offline Berhasil',
      message: `${count} catatan ceklis sementara telah berhasil disinkronkan ke basis data server.`,
      timestamp: nowTime,
      type: 'success',
      targetRole: ['petugas', 'supervisor', 'super_admin', 'admin'],
      read: false,
    };
    setNotifications((prev) => [syncNotif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, syncNotif).catch(() => {});
  };

  const setIsOnline = (online: boolean) => {
    setIsOnlineState(online);
    if (online && offlineQueue.length > 0) {
      syncOfflineData();
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineState(true);
      if (offlineQueue.length > 0) {
        syncOfflineData();
      }
    };
    const handleOffline = () => {
      setIsOnlineState(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue.length]);

  // 3. Project Locations
  const [projects, setProjects] = useState<ProjectLocation[]>(INITIAL_PROJECTS);

  // 3b. Multi-Company Management (Super Admin)
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: 'comp-main',
      nama: 'Smart Cleaning Operations',
      slug: 'utama',
      logo: '',
      warna: '#0284c7',
      status: 'aktif',
      createdAt: new Date().toISOString(),
    },
  ]);

  const addCompany = async (comp: Omit<Company, 'id' | 'createdAt'>): Promise<Company> => {
    const id = `comp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newComp: Company = {
      ...comp,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCompanies((prev) => [newComp, ...prev]);
    try {
      await upsertRecord(COLLECTIONS.COMPANIES, newComp);
    } catch (err) {
      notifyServerError('menambah perusahaan', err);
    }
    return newComp;
  };

  const updateCompany = async (id: string, updates: Partial<Company>): Promise<void> => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c))
    );
    const existing = companies.find((c) => c.id === id);
    const merged: Company = existing
      ? { ...existing, ...updates, updatedAt: new Date().toISOString() }
      : ({
          id,
          nama: updates.nama || id,
          slug: updates.slug || id,
          status: updates.status || 'aktif',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...updates,
        } as Company);

    if (updates.status) {
      try {
        const res = await apiUpdateCompanyStatus(id, updates.status);
        if (!res.success && res.error) {
          console.warn('[updateCompany] apiUpdateCompanyStatus notice:', res.error);
        }
      } catch (e) {
        console.warn('[updateCompany] apiUpdateCompanyStatus error:', e);
      }
    }

    try {
      const res = await apiUpdateCompany(id, merged);
      if (!res.success) {
        await upsertRecord(COLLECTIONS.COMPANIES, merged);
      }
    } catch (err) {
      try {
        await upsertRecord(COLLECTIONS.COMPANIES, merged);
      } catch (upsertErr) {
        notifyServerError('memperbarui perusahaan', upsertErr);
      }
    }
  };

  const deleteCompany = async (
    id: string,
    typedConfirmName: string
  ): Promise<{ success: boolean; message?: string }> => {
    const target = companies.find((c) => c.id === id);
    if (!target) {
      return { success: false, message: 'Perusahaan tidak ditemukan.' };
    }
    if (id === 'comp-main') {
      return { success: false, message: 'Perusahaan Utama (comp-main) tidak dapat dihapus.' };
    }
    if (typedConfirmName.trim() !== target.nama.trim()) {
      return {
        success: false,
        message: `Konfirmasi gagal. Anda harus mengetik nama perusahaan "${target.nama}" dengan persis untuk menghapus perusahaan ini.`,
      };
    }
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteRecord(COLLECTIONS.COMPANIES, id);
      return { success: true, message: `Perusahaan "${target.nama}" berhasil dihapus secara permanen.` };
    } catch (err: any) {
      notifyServerError('menghapus perusahaan', err);
      return { success: false, message: err?.message || 'Gagal menghapus perusahaan di server.' };
    }
  };

  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => {
    const saved = localStorage.getItem('sco_active_project_id');
    return saved || '';
  });

  // 3. Users & Project Assignments
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);

  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return localStorage.getItem('sco_active_user_id') || 'usr-admin';
  });

  // Determine current user
  const currentUser =
    users.find((u) => u.id === activeUserId) ||
    users.find((u) => u.role === userRole) ||
    users[0];

  // Active Company Determination based on authenticated user
  const userCompanyId = currentUser?.companyId || (currentUser as any)?.company_id || 'comp-main';
  const userCompanyIdRef = useRef<string>(userCompanyId);
  userCompanyIdRef.current = userCompanyId;
  const currentCompany = companies.find((c) => c.id === userCompanyId);

  // Dynamic Company Profile: Reflects the active logged-in user's company branding
  const effectiveCompanyProfile: CompanyProfile = useMemo(() => {
    if (currentCompany) {
      return {
        ...companyProfile,
        companyName: currentCompany.nama || companyProfile.companyName,
        logoUrl: currentCompany.logo || (currentCompany as any).logoUrl || companyProfile.logoUrl,
        address: (currentCompany as any).address || (currentCompany as any).alamat || companyProfile.address,
        city: (currentCompany as any).city || companyProfile.city,
        phone: (currentCompany as any).phone || (currentCompany as any).telepon || companyProfile.phone,
        email: (currentCompany as any).email || companyProfile.email,
        website: (currentCompany as any).website || companyProfile.website,
        tagline: (currentCompany as any).tagline || companyProfile.tagline,
        documentHeaderTitle: (currentCompany as any).documentHeaderTitle || companyProfile.documentHeaderTitle,
      };
    }
    return companyProfile;
  }, [currentCompany, companyProfile]);

  // Synchronize document favicon, tab title, and PWA icon event whenever effective company profile changes
  useEffect(() => {
    if (effectiveCompanyProfile?.logoUrl) {
      window.dispatchEvent(
        new CustomEvent('pwa-icons-updated', {
          detail: {
            icon: effectiveCompanyProfile.logoUrl,
            name: effectiveCompanyProfile.companyName,
          },
        })
      );
    }
  }, [effectiveCompanyProfile?.logoUrl, effectiveCompanyProfile?.companyName]);

  const isSuper = isSuperAdminRole(userRole);
  const isAdminOrSuper =
    isSuper ||
    userRole === 'admin_perusahaan' ||
    userRole === 'service_manager';

  const companyScopedProjects = useMemo(() => {
    if (isSuper) return projects;
    return projects.filter((p) => {
      const pCompId = p.companyId || p.company_id || 'comp-main';
      return pCompId === userCompanyId;
    });
  }, [isSuper, projects, userCompanyId]);

  const defaultProjectId = companyScopedProjects[0]?.id || '';

  const allowedProjects = useMemo(() => {
    if (isAdminOrSuper) return companyScopedProjects;
    const userProjs = currentUser?.assignedProjectIds;
    if (Array.isArray(userProjs) && userProjs.length > 0) {
      return companyScopedProjects.filter((p) => userProjs.includes(p.id));
    }
    return companyScopedProjects;
  }, [isAdminOrSuper, companyScopedProjects, currentUser?.assignedProjectIds]);

  // If activeProjectId is not in allowedProjects, automatically select first allowed (or '' when empty)
  const safeActiveProjectId = useMemo(() => {
    if (allowedProjects.some((p) => p.id === activeProjectId)) {
      return activeProjectId;
    }
    return allowedProjects[0]?.id || defaultProjectId;
  }, [allowedProjects, activeProjectId, defaultProjectId]);

  // Synchronize state and localStorage if safeActiveProjectId diverged
  useEffect(() => {
    if (safeActiveProjectId !== activeProjectId) {
      setActiveProjectIdState(safeActiveProjectId);
      if (safeActiveProjectId) {
        localStorage.setItem('sco_active_project_id', safeActiveProjectId);
      } else {
        localStorage.removeItem('sco_active_project_id');
      }
    }
  }, [safeActiveProjectId, activeProjectId]);

  const setActiveProjectId = (id: string) => {
    if (!id || isAdminOrSuper || allowedProjects.some((p) => p.id === id)) {
      setActiveProjectIdState(id);
      if (id) {
        localStorage.setItem('sco_active_project_id', id);
      } else {
        localStorage.removeItem('sco_active_project_id');
      }
    }
  };

  const EMPTY_PROJECT_PLACEHOLDER: ProjectLocation = {
    id: '',
    code: '-',
    name: 'Belum Ada Proyek',
    address: '',
    city: '',
    totalFloors: 0,
    managerName: '-',
    clientName: '-',
    status: 'active',
    createdAt: '',
  };

  const activeProject =
    allowedProjects.find((p) => p.id === safeActiveProjectId) ||
    companyScopedProjects.find((p) => p.id === safeActiveProjectId) ||
    allowedProjects[0] ||
    companyScopedProjects[0] ||
    EMPTY_PROJECT_PLACEHOLDER;

  const visibleProjects = isAdminOrSuper ? companyScopedProjects : allowedProjects;

  // 4. Checklist Master & 24-Hour Checklist Data
  const [checklistLocations, setChecklistLocations] = useState<ChecklistLocation[]>(INITIAL_CHECKLIST_LOCATIONS);
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplateItem[]>(INITIAL_CHECKLIST_TEMPLATES);
  const [dailyChecklists, setDailyChecklists] = useState<DailyAreaChecklist[]>(() =>
    INITIAL_DAILY_CHECKLISTS.map((d) => ({
      ...d,
      hourlySlots: (d.hourlySlots || []).map((slot) => ({
        ...slot,
        items: ensureCompleteSlotItems(slot.items, d.category || 'toilet', INITIAL_CHECKLIST_TEMPLATES),
      })),
    }))
  );

  // 5. Core Operational Data
  const [areas, setAreas] = useState<Area[]>(INITIAL_AREAS);
  const [cleaners, setCleaners] = useState<Cleaner[]>(INITIAL_CLEANERS);
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [schedules, setSchedules] = useState<CleaningSchedule[]>(INITIAL_SCHEDULES);
  const [uploadedWorkSchedules, setUploadedWorkSchedules] = useState<UploadedWorkScheduleDocument[]>([]);
  const [uploadedMcpPrograms, setUploadedMcpPrograms] = useState<UploadedMcpDocument[]>([]);
  const [mcpChecklistResults, setMcpChecklistResults] = useState<McpChecklistResultRecord[]>([]);
  const [tasks, setTasks] = useState<CleaningTask[]>(INITIAL_TASKS);
  const [inspections, setInspections] = useState<QCInspection[]>(INITIAL_INSPECTIONS);
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [masterPrograms, setMasterPrograms] = useState<MasterCleaningProgramItem[]>(() =>
    INITIAL_MASTER_PROGRAMS.map((p) => ({
      ...p,
      frequency: normalizeFrequencyCode(p.frequency),
    }))
  );
  const [damageReports, setDamageReports] = useState<FacilityDamageReport[]>(INITIAL_DAMAGE_REPORTS);

  // Klien Mode States (Turnover, Custom Checklist Items, Inspections)
  const [employeeTurnovers, setEmployeeTurnovers] = useState<EmployeeTurnoverRecord[]>(INITIAL_EMPLOYEE_TURNOVERS);
  const [klienChecklistItems, setKlienChecklistItems] = useState<KlienChecklistItem[]>(INITIAL_KLIEN_CHECKLIST_ITEMS);
  const [klienChecklistInspections, setKlienChecklistInspections] = useState<KlienChecklistInspection[]>(INITIAL_KLIEN_CHECKLIST_INSPECTIONS);
  const [specialJobs, setSpecialJobs] = useState<SpecialJobItem[]>(INITIAL_SPECIAL_JOBS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => INITIAL_AUDIT_LOGS.map(normalizeAuditLog));
  const [rbacPermissions, setRbacPermissions] = useState<RoleModulePermission[]>(DEFAULT_RBAC_PERMISSIONS);

  // ==================== VPS POSTGRESQL & SOCKET.IO REALTIME SYNC ====================
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConfigured: boolean;
    status: string;
    lastSyncedAt: string | null;
  }>({
    isConfigured: true,
    status: socket.connected ? 'CONNECTED' : 'CONNECTING',
    lastSyncedAt: null,
  });

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);

  // Refs for synchronization and delta pulls (Tahap C)
  const initialSyncDone = useRef<boolean>(false);
  const checklistSnapshotRef = useRef<Map<string, string>>(new Map());
  const dirtyChecklistIdsRef = useRef<Set<string>>(new Set());
  const dailyChecklistsRef = useRef<DailyAreaChecklist[]>(dailyChecklists);
  const cleanersRef = useRef<Cleaner[]>(cleaners);
  const cleanerWriteQueueRef = useRef<Map<string, Promise<void>>>(new Map());
  const projectsRef = useRef<ProjectLocation[]>(projects);
  const projectWriteQueueRef = useRef<Map<string, Promise<void>>>(new Map());
  const lastPullAtRef = useRef<Record<string, string>>({});
  const lastCollectionSyncMsRef = useRef<Record<string, number>>({});
  const loadedCollectionsRef = useRef<Set<string>>(new Set());
  const inFlightCollectionsRef = useRef<Map<string, Promise<void>>>(new Map());
  const lastVisibilitySyncMsRef = useRef<number>(0);
  const lastDisconnectTimeRef = useRef<number | null>(null);

  useEffect(() => {
    dailyChecklistsRef.current = dailyChecklists;
  }, [dailyChecklists]);

  useEffect(() => {
    cleanersRef.current = cleaners;
  }, [cleaners]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const syncCleanerRev = (saved: Cleaner) => {
    if (!saved?.id || !saved._rev) return;
    cleanersRef.current = cleanersRef.current.map((c) =>
      c.id === saved.id ? { ...c, _rev: saved._rev } : c
    );
    setCleaners((prev) =>
      prev.map((c) => (c.id === saved.id ? { ...c, _rev: saved._rev } : c))
    );
  };

  const syncProjectRev = (saved: ProjectLocation) => {
    if (!saved?.id || !saved._rev) return;
    projectsRef.current = projectsRef.current.map((p) =>
      p.id === saved.id ? { ...p, _rev: saved._rev } : p
    );
    setProjects((prev) =>
      prev.map((p) => (p.id === saved.id ? { ...p, _rev: saved._rev } : p))
    );
  };

  const enqueueCleanerWrite = (
    cleanerId: string,
    actionLabel: string,
    mergeWithBase: (base: Cleaner) => Cleaner
  ) => {
    const prevChain = cleanerWriteQueueRef.current.get(cleanerId) || Promise.resolve();
    const nextChain = prevChain
      .catch(() => {})
      .then(async () => {
        const currentLocal = cleanersRef.current.find((c) => c.id === cleanerId);
        if (!currentLocal) return;
        const payload = mergeWithBase(currentLocal);
        try {
          const saved = await upsertRecord(COLLECTIONS.CLEANERS, payload);
          syncCleanerRev(saved);
        } catch (err: any) {
          if (err?.status === 409 && err?.current) {
            const serverCurrent = err.current as Cleaner;
            const merged = mergeWithBase(serverCurrent);
            merged._rev = serverCurrent._rev;
            merged._baseRev = serverCurrent._rev;
            cleanersRef.current = cleanersRef.current.map((c) =>
              c.id === cleanerId ? merged : c
            );
            setCleaners((prev) => prev.map((c) => (c.id === cleanerId ? merged : c)));
            try {
              const savedRetry = await upsertRecord(COLLECTIONS.CLEANERS, merged);
              syncCleanerRev(savedRetry);
              return;
            } catch (retryErr) {
              notifyServerError(actionLabel, retryErr);
              return;
            }
          }
          notifyServerError(actionLabel, err);
        }
      });
    cleanerWriteQueueRef.current.set(cleanerId, nextChain);
  };

  const enqueueProjectWrite = (
    projectId: string,
    actionLabel: string,
    mergeWithBase: (base: ProjectLocation) => ProjectLocation
  ) => {
    const prevChain = projectWriteQueueRef.current.get(projectId) || Promise.resolve();
    const nextChain = prevChain
      .catch(() => {})
      .then(async () => {
        const currentLocal = projectsRef.current.find((p) => p.id === projectId);
        if (!currentLocal) return;
        const payload = mergeWithBase(currentLocal);
        try {
          const saved = await upsertRecord(COLLECTIONS.PROJECTS, payload);
          syncProjectRev(saved);
        } catch (err: any) {
          if (err?.status === 409 && err?.current) {
            const serverCurrent = err.current as ProjectLocation;
            const merged = mergeWithBase(serverCurrent);
            merged._rev = serverCurrent._rev;
            merged._baseRev = serverCurrent._rev;
            projectsRef.current = projectsRef.current.map((p) =>
              p.id === projectId ? merged : p
            );
            setProjects((prev) => prev.map((p) => (p.id === projectId ? merged : p)));
            try {
              const savedRetry = await upsertRecord(COLLECTIONS.PROJECTS, merged);
              syncProjectRev(savedRetry);
              return;
            } catch (retryErr) {
              notifyServerError(actionLabel, retryErr);
              return;
            }
          }
          notifyServerError(actionLabel, err);
        }
      });
    projectWriteQueueRef.current.set(projectId, nextChain);
  };

  // Floating brief toast notification for conflicts
  const showToast = (message: string) => {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('sco-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sco-toast-container';
      container.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'bg-slate-900/95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 backdrop-blur-sm pointer-events-auto flex items-center gap-2';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 300ms ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Helper upsert with 409 conflict resolution: merge current from server with local changes, retry once
  const upsertWithConflictResolution = async <T extends { id?: string; moduleId?: string; _rev?: string; _baseRev?: string }>(
    collection: string,
    localItem: T,
    stateSetter?: React.Dispatch<React.SetStateAction<any>>
  ): Promise<T> => {
    try {
      return await upsertRecord(collection, localItem);
    } catch (err: any) {
      if (err?.status === 409 && err.current) {
        const serverCurrent = err.current;
        // Gabungkan current dari server dengan perubahan lokal (field lokal menang, revisi pakai serverCurrent._rev)
        const merged: T = {
          ...serverCurrent,
          ...localItem,
          _rev: serverCurrent._rev,
          _baseRev: serverCurrent._rev,
        };
        if (stateSetter) {
          stateSetter((prev: any[]) => {
            if (!Array.isArray(prev)) return prev;
            const id = (merged as any).id || (merged as any).moduleId;
            const idx = prev.findIndex((item) => ((item as any).id || (item as any).moduleId) === id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = merged;
              return next;
            }
            return [...prev, merged];
          });
        }
        showToast('Data diperbarui perangkat lain');
        return await upsertRecord(collection, merged);
      }
      throw err;
    }
  };

  // Helper to merge delta items by id (ganti bila id sama, tambah bila baru)
  const mergeCollectionById = <T extends { id?: string; moduleId?: string }>(
    prev: T[],
    incoming: T[]
  ): T[] => {
    if (!incoming || incoming.length === 0) return prev;
    const incomingMap = new Map<string, T>();
    for (const item of incoming) {
      const id = (item as any).id || (item as any).moduleId;
      if (id) incomingMap.set(id, item);
    }
    const updated = prev.map((item) => {
      const id = (item as any).id || (item as any).moduleId;
      if (id && incomingMap.has(id)) {
        const inItem = incomingMap.get(id)!;
        incomingMap.delete(id);
        return { ...item, ...inItem };
      }
      return item;
    });
    return [...updated, ...Array.from(incomingMap.values())];
  };

  const applyDeltaCollection = <T extends { id?: string; moduleId?: string }>(
    remoteItems: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    if (!remoteItems || remoteItems.length === 0) return;
    setter((prev) => mergeCollectionById(prev, remoteItems));
  };

  // Helper to load remote collection or seed once if empty on server
  const loadOrSeedCollection = async <T extends { id?: string; moduleId?: string }>(
    collection: string,
    remoteItems: T[],
    seedItems: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    if (remoteItems.length > 0) {
      setter(remoteItems);
    } else if (seedItems && seedItems.length > 0) {
      console.debug(`[Seed] Koleksi '${collection}' kosong di server. Menyemai ${seedItems.length} data awal...`);
      setter(seedItems);
      for (const item of seedItems) {
        try {
          await upsertRecord(collection, item);
        } catch (e) {
          console.warn(`[Seed Error] Gagal menyemai item ${collection}:`, e);
        }
      }
    }
  };

  const applyCollectionData = async (
    col: string,
    items: any[],
    isFullReplace: boolean
  ) => {
    if (isFullReplace) {
      switch (col) {
        case COLLECTIONS.COMPANIES:
          if (items.length > 0) setCompanies(items);
          break;
        case COLLECTIONS.PROJECTS:
          setProjects(items);
          break;
        case COLLECTIONS.USERS:
          setUsers(items.length > 0 ? items : INITIAL_USERS);
          break;
        case COLLECTIONS.RBAC_PERMISSIONS:
          await loadOrSeedCollection(COLLECTIONS.RBAC_PERMISSIONS, items, DEFAULT_RBAC_PERMISSIONS, setRbacPermissions);
          break;
        case COLLECTIONS.AREAS:
          setAreas(items);
          break;
        case COLLECTIONS.CLEANERS:
          setCleaners(items);
          break;
        case COLLECTIONS.SHIFTS:
          setShifts(items);
          break;
        case COLLECTIONS.SCHEDULES:
          setSchedules(items);
          break;
        case COLLECTIONS.UPLOADED_WORK_SCHEDULES:
          setUploadedWorkSchedules(items);
          break;
        case COLLECTIONS.CHECKLIST_LOCATIONS:
          setChecklistLocations(items);
          break;
        case COLLECTIONS.CHECKLIST_TEMPLATES:
          await loadOrSeedCollection(COLLECTIONS.CHECKLIST_TEMPLATES, items, INITIAL_CHECKLIST_TEMPLATES, setChecklistTemplates);
          break;
        case COLLECTIONS.DAILY_CHECKLISTS: {
          const serverChecklistMap = new Map(items.map((c: DailyAreaChecklist) => [c.id, c]));
          setDailyChecklists((prevLocal) => {
            const merged: DailyAreaChecklist[] = [];
            for (const rem of items as DailyAreaChecklist[]) {
              if (dirtyChecklistIdsRef.current.has(rem.id)) {
                const dirty = prevLocal.find((d) => d.id === rem.id);
                if (dirty) {
                  merged.push(dirty);
                  continue;
                }
              }
              merged.push(rem);
            }
            for (const dirtyId of dirtyChecklistIdsRef.current) {
              if (!serverChecklistMap.has(dirtyId)) {
                const dirtyDoc = prevLocal.find((d) => d.id === dirtyId);
                if (dirtyDoc) merged.push(dirtyDoc);
              }
            }
            checklistSnapshotRef.current.clear();
            for (const item of merged) {
              if (!dirtyChecklistIdsRef.current.has(item.id)) {
                checklistSnapshotRef.current.set(item.id, JSON.stringify(item));
              }
            }
            return merged;
          });
          break;
        }
        case COLLECTIONS.TASKS:
          setTasks(items);
          break;
        case COLLECTIONS.INSPECTIONS:
          setInspections(items);
          break;
        case COLLECTIONS.COMPLAINTS:
          setComplaints(items);
          break;
        case COLLECTIONS.DAMAGE_REPORTS:
          setDamageReports(items);
          break;
        case COLLECTIONS.SPECIAL_JOBS:
          setSpecialJobs(items);
          break;
        case COLLECTIONS.MASTER_PROGRAMS:
          setMasterPrograms(
            items.map((p: any) => ({
              ...p,
              frequency: normalizeFrequencyCode(p.frequency),
            }))
          );
          break;
        case COLLECTIONS.UPLOADED_MCP:
          setUploadedMcpPrograms(items);
          break;
        case COLLECTIONS.MCP_CHECKLIST_RESULTS:
          setMcpChecklistResults(items);
          break;
        case COLLECTIONS.EMPLOYEE_TURNOVERS:
          setEmployeeTurnovers(items);
          break;
        case COLLECTIONS.KLIEN_CHECKLIST_ITEMS:
          setKlienChecklistItems(items);
          break;
        case COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS:
          setKlienChecklistInspections(items);
          break;
        case COLLECTIONS.NOTIFICATIONS:
          setNotifications(items);
          break;
        case COLLECTIONS.AUDIT_LOGS:
          setAuditLogs(items.map(normalizeAuditLog));
          break;
        case COLLECTIONS.COMPANY_PROFILE:
          if (items.length > 0) {
            setCompanyProfile(items[0]);
            try {
              localStorage.setItem('jti_company_profile', JSON.stringify(items[0]));
            } catch {}
          } else {
            setCompanyProfile(DEFAULT_COMPANY_PROFILE);
            try {
              localStorage.removeItem('jti_company_profile');
            } catch {}
          }
          break;
        case COLLECTIONS.KPI_CONFIG:
          if (items.length > 0) {
            setKpiConfig(items[0]);
            try {
              localStorage.setItem('jti_kpi_config', JSON.stringify(items[0]));
            } catch {}
          } else {
            setKpiConfig(DEFAULT_KPI_VISIBILITY_OFF);
            try {
              localStorage.removeItem('jti_kpi_config');
            } catch {}
          }
          break;
      }
    } else {
      if (!items || items.length === 0) return;
      switch (col) {
        case COLLECTIONS.COMPANIES: applyDeltaCollection(items, setCompanies); break;
        case COLLECTIONS.PROJECTS: applyDeltaCollection(items, setProjects); break;
        case COLLECTIONS.USERS: applyDeltaCollection(items, setUsers); break;
        case COLLECTIONS.RBAC_PERMISSIONS: applyDeltaCollection(items, setRbacPermissions); break;
        case COLLECTIONS.AREAS: applyDeltaCollection(items, setAreas); break;
        case COLLECTIONS.CLEANERS: applyDeltaCollection(items, setCleaners); break;
        case COLLECTIONS.SHIFTS: applyDeltaCollection(items, setShifts); break;
        case COLLECTIONS.SCHEDULES: applyDeltaCollection(items, setSchedules); break;
        case COLLECTIONS.UPLOADED_WORK_SCHEDULES: applyDeltaCollection(items, setUploadedWorkSchedules); break;
        case COLLECTIONS.CHECKLIST_LOCATIONS: applyDeltaCollection(items, setChecklistLocations); break;
        case COLLECTIONS.CHECKLIST_TEMPLATES: applyDeltaCollection(items, setChecklistTemplates); break;
        case COLLECTIONS.TASKS: applyDeltaCollection(items, setTasks); break;
        case COLLECTIONS.INSPECTIONS: applyDeltaCollection(items, setInspections); break;
        case COLLECTIONS.COMPLAINTS: applyDeltaCollection(items, setComplaints); break;
        case COLLECTIONS.DAMAGE_REPORTS: applyDeltaCollection(items, setDamageReports); break;
        case COLLECTIONS.SPECIAL_JOBS: applyDeltaCollection(items, setSpecialJobs); break;
        case COLLECTIONS.MASTER_PROGRAMS:
          applyDeltaCollection(
            items.map((p: any) => ({ ...p, frequency: normalizeFrequencyCode(p.frequency) })),
            setMasterPrograms
          );
          break;
        case COLLECTIONS.UPLOADED_MCP: applyDeltaCollection(items, setUploadedMcpPrograms); break;
        case COLLECTIONS.MCP_CHECKLIST_RESULTS: applyDeltaCollection(items, setMcpChecklistResults); break;
        case COLLECTIONS.EMPLOYEE_TURNOVERS: applyDeltaCollection(items, setEmployeeTurnovers); break;
        case COLLECTIONS.KLIEN_CHECKLIST_ITEMS: applyDeltaCollection(items, setKlienChecklistItems); break;
        case COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS: applyDeltaCollection(items, setKlienChecklistInspections); break;
        case COLLECTIONS.NOTIFICATIONS: applyDeltaCollection(items, setNotifications); break;
        case COLLECTIONS.AUDIT_LOGS: applyDeltaCollection(items.map(normalizeAuditLog), setAuditLogs); break;
        case COLLECTIONS.DAILY_CHECKLISTS: {
          const incomingMap = new Map((items as DailyAreaChecklist[]).map((c) => [c.id, c]));
          setDailyChecklists((prevLocal) => {
            const updated = prevLocal.map((localDoc) => {
              if (!incomingMap.has(localDoc.id)) return localDoc;
              if (dirtyChecklistIdsRef.current.has(localDoc.id)) return localDoc;
              const inDoc = incomingMap.get(localDoc.id)!;
              incomingMap.delete(localDoc.id);

              const mergedSlots = (inDoc.hourlySlots || []).map((inSlot) => {
                const localSlot = localDoc.hourlySlots?.find((ls) => ls.hour === inSlot.hour);
                if (!localSlot) return inSlot;
                const inHasItems = Array.isArray(inSlot.items) && inSlot.items.length > 0;
                const localHasItems = Array.isArray(localSlot.items) && localSlot.items.length > 0;
                if (!inHasItems && localHasItems) {
                  return { ...inSlot, items: localSlot.items, status: localSlot.status };
                }
                return inSlot;
              });

              const mergedDoc: DailyAreaChecklist = {
                ...localDoc,
                ...inDoc,
                hourlySlots: mergedSlots.length > 0 ? mergedSlots : inDoc.hourlySlots || localDoc.hourlySlots,
              };
              checklistSnapshotRef.current.set(localDoc.id, JSON.stringify(mergedDoc));
              return mergedDoc;
            });

            for (const newDoc of incomingMap.values()) {
              checklistSnapshotRef.current.set(newDoc.id, JSON.stringify(newDoc));
              updated.push(newDoc);
            }
            return updated;
          });
          break;
        }
        case COLLECTIONS.COMPANY_PROFILE:
          setCompanyProfile(items[0]);
          try {
            localStorage.setItem('jti_company_profile', JSON.stringify(items[0]));
          } catch {}
          break;
        case COLLECTIONS.KPI_CONFIG:
          setKpiConfig(items[0]);
          try {
            localStorage.setItem('jti_kpi_config', JSON.stringify(items[0]));
          } catch {}
          break;
      }
    }
  };

  // Fetch specific collections with in-flight deduplication and accurate ?since= tracking
  const pullCollections = async (collectionsToPull: string[], forceFullPull = false) => {
    const uniqueCols = Array.from(new Set(collectionsToPull)).filter(Boolean);
    if (uniqueCols.length === 0) return;

    try {
      setSupabaseStatus((prev) => ({ ...prev, status: 'SYNCING' }));
      const offlineSnapshot: Record<string, any[]> = {};

      await Promise.all(
        uniqueCols.map(async (col) => {
          const existingInFlight = inFlightCollectionsRef.current.get(col);
          if (existingInFlight) {
            await existingInFlight;
            return;
          }

          const task = (async () => {
            const isColFull = forceFullPull || !loadedCollectionsRef.current.has(col);
            const since = isColFull ? undefined : lastPullAtRef.current[col];
            const pullStartedSafeIso = new Date(Date.now() - 2000).toISOString();

            const items = await getRecords<any>(col, since);
            loadedCollectionsRef.current.add(col);
            lastCollectionSyncMsRef.current[col] = Date.now();

            if (items && items.length > 0) {
              const revs = items.map((it: any) => it._rev).filter(Boolean);
              if (revs.length > 0) {
                const maxRev = revs.reduce((a: string, b: string) => (new Date(a) > new Date(b) ? a : b));
                const currentLast = lastPullAtRef.current[col];
                if (!currentLast || new Date(maxRev) > new Date(currentLast)) {
                  lastPullAtRef.current[col] = maxRev;
                }
              } else if (!lastPullAtRef.current[col]) {
                lastPullAtRef.current[col] = pullStartedSafeIso;
              }
            } else if (!lastPullAtRef.current[col]) {
              lastPullAtRef.current[col] = pullStartedSafeIso;
            }

            if (isColFull) {
              offlineSnapshot[col] = items;
            }
            await applyCollectionData(col, items, isColFull);
          })().finally(() => {
            if (inFlightCollectionsRef.current.get(col) === task) {
              inFlightCollectionsRef.current.delete(col);
            }
          });

          inFlightCollectionsRef.current.set(col, task);
          await task;
        })
      );

      if (uniqueCols.some((c) => CORE_COLLECTIONS.includes(c))) {
        initialSyncDone.current = true;
      }

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setSupabaseStatus({
        isConfigured: true,
        status: 'CONNECTED',
        lastSyncedAt: nowStr,
      });
      setIsInitialLoading(false);

      if (
        offlineSnapshot[COLLECTIONS.CHECKLIST_TEMPLATES] ||
        offlineSnapshot[COLLECTIONS.AREAS] ||
        offlineSnapshot[COLLECTIONS.CHECKLIST_LOCATIONS] ||
        offlineSnapshot[COLLECTIONS.DAILY_CHECKLISTS] ||
        offlineSnapshot[COLLECTIONS.TASKS]
      ) {
        cacheOfflineData({
          templates: offlineSnapshot[COLLECTIONS.CHECKLIST_TEMPLATES]?.length
            ? offlineSnapshot[COLLECTIONS.CHECKLIST_TEMPLATES]
            : INITIAL_CHECKLIST_TEMPLATES,
          areas: offlineSnapshot[COLLECTIONS.AREAS] || [],
          locations: offlineSnapshot[COLLECTIONS.CHECKLIST_LOCATIONS] || [],
          checklists: offlineSnapshot[COLLECTIONS.DAILY_CHECKLISTS] || [],
          tasks: offlineSnapshot[COLLECTIONS.TASKS] || [],
        }).catch(() => {});
      }

      if (initialSyncDone.current) {
        syncService.triggerSync().catch(() => {});
      }
    } catch (err) {
      console.warn('[Auto-Pull] Gagal mengambil data dari server:', err);
      setSupabaseStatus((prev) => ({ ...prev, status: 'ERROR' }));
      setIsInitialLoading(false);
    }
  };

  // Ensure lazy/on-demand collections are loaded once, then refreshed silently via ?since= if stale
  const ensureCollectionsLoaded = async (collections: string[]) => {
    if (!isAuthenticatedRef.current) return;
    const uniqueCols = Array.from(new Set(collections)).filter(Boolean);
    if (uniqueCols.length === 0) return;

    const now = Date.now();
    const missingCols = uniqueCols.filter((c) => !loadedCollectionsRef.current.has(c));
    const staleCols = uniqueCols.filter(
      (c) =>
        loadedCollectionsRef.current.has(c) &&
        now - (lastCollectionSyncMsRef.current[c] || 0) > 15000
    );

    if (missingCols.length > 0) {
      await pullCollections(missingCols, true).catch(() => {});
    }
    if (staleCols.length > 0) {
      await pullCollections(staleCols, false).catch(() => {});
    }
  };

  const ensureTabCollections = (tab: string) => {
    if (!isAuthenticatedRef.current) return;
    const menuCols = MENU_COLLECTION_MAP[tab];
    if (menuCols && menuCols.length > 0) {
      ensureCollectionsLoaded(menuCols).catch(() => {});
    }
  };

  // Pull core + currently visited collections (full pull only when requested, delta ?since= otherwise)
  const pullAllDataFromServer = async (forceFullPull = false) => {
    if (!isAuthenticatedRef.current) {
      if (!forceFullPull) return;
      await pullCollections([COLLECTIONS.COMPANY_PROFILE], true);
      return;
    }

    if (forceFullPull || loadedCollectionsRef.current.size === 0) {
      const targetCols = Array.from(
        new Set([...CORE_COLLECTIONS, ...Array.from(loadedCollectionsRef.current)])
      );
      await pullCollections(targetCols, forceFullPull);
    } else {
      await pullCollections(Array.from(loadedCollectionsRef.current), false);
    }
  };

  // Manual push sync to server
  const syncToSupabase = async () => {
    try {
      setSupabaseStatus((prev) => ({ ...prev, status: 'SYNCING' }));
      for (const p of projects) await upsertRecord(COLLECTIONS.PROJECTS, p);
      for (const u of users) await upsertRecord(COLLECTIONS.USERS, u);
      for (const a of areas) await upsertRecord(COLLECTIONS.AREAS, a);
      for (const c of cleaners) await upsertRecord(COLLECTIONS.CLEANERS, c);
      for (const s of shifts) await upsertRecord(COLLECTIONS.SHIFTS, s);
      for (const sch of schedules) await upsertRecord(COLLECTIONS.SCHEDULES, sch);
      for (const cl of checklistLocations) await upsertRecord(COLLECTIONS.CHECKLIST_LOCATIONS, cl);
      for (const ct of checklistTemplates) await upsertRecord(COLLECTIONS.CHECKLIST_TEMPLATES, ct);
      for (const t of tasks) await upsertRecord(COLLECTIONS.TASKS, t);
      for (const comp of complaints) await upsertRecord(COLLECTIONS.COMPLAINTS, comp);
      for (const d of damageReports) await upsertRecord(COLLECTIONS.DAMAGE_REPORTS, d);
      for (const sp of specialJobs) await upsertRecord(COLLECTIONS.SPECIAL_JOBS, sp);
      for (const m of masterPrograms) await upsertRecord(COLLECTIONS.MASTER_PROGRAMS, m);
      for (const chk of dailyChecklists) {
        await upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, chk);
        checklistSnapshotRef.current.set(chk.id, JSON.stringify(chk));
      }
      dirtyChecklistIdsRef.current.clear();

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setSupabaseStatus({
        isConfigured: true,
        status: 'CONNECTED',
        lastSyncedAt: nowStr,
      });
    } catch (e) {
      console.warn('[Server Sync Error]', e);
      setSupabaseStatus((prev) => ({ ...prev, status: 'ERROR' }));
    }
  };

  // Point A & D: Debounced effect to push changed dailyChecklists to server
  useEffect(() => {
    if (!initialSyncDone.current) return;

    const changedChecklists: DailyAreaChecklist[] = [];
    for (const item of dailyChecklists) {
      const currentJson = JSON.stringify(item);
      const snapshotJson = checklistSnapshotRef.current.get(item.id);
      if (snapshotJson !== currentJson) {
        changedChecklists.push(item);
        dirtyChecklistIdsRef.current.add(item.id);
      }
    }

    if (changedChecklists.length === 0) return;

    const timer = setTimeout(async () => {
      for (const checklist of changedChecklists) {
        console.debug('[Sync] Mengirim update daily_checklist ke server:', checklist.id);
        try {
          const saved = await upsertWithConflictResolution(COLLECTIONS.DAILY_CHECKLISTS, checklist, setDailyChecklists);
          checklistSnapshotRef.current.set(checklist.id, JSON.stringify(saved || checklist));
          dirtyChecklistIdsRef.current.delete(checklist.id);
        } catch (err) {
          console.warn('[Sync] Gagal upsert daily_checklist ke server:', checklist.id, err);
          dirtyChecklistIdsRef.current.add(checklist.id);
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [dailyChecklists]);

  useEffect(() => {
    let isMounted = true;

    // 1. Pull saat Socket.IO reconnect: hanya untuk koleksi yang sudah pernah dimuat
    const unsubscribeReconnect = onServerReconnect(async () => {
      if (!isMounted || !isAuthenticatedRef.current) return;
      const now = Date.now();
      const disconnectDuration = lastDisconnectTimeRef.current ? now - lastDisconnectTimeRef.current : 0;
      lastDisconnectTimeRef.current = null;

      setSupabaseStatus((prev) => ({
        ...prev,
        status: 'CONNECTED',
        lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      }));

      if (loadedCollectionsRef.current.size > 0) {
        const isLongDisconnect = disconnectDuration > 2 * 60 * 1000;
        await pullAllDataFromServer(isLongDisconnect);
      }

      if (dirtyChecklistIdsRef.current.size > 0) {
        for (const dirtyId of Array.from(dirtyChecklistIdsRef.current)) {
          const item = dailyChecklistsRef.current.find((c) => c.id === dirtyId);
          if (item) {
            console.debug('[Sync] Mencoba kirim ulang daily_checklist saat reconnect:', dirtyId);
            try {
              const saved = await upsertWithConflictResolution(COLLECTIONS.DAILY_CHECKLISTS, item, setDailyChecklists);
              checklistSnapshotRef.current.set(item.id, JSON.stringify(saved || item));
              dirtyChecklistIdsRef.current.delete(item.id);
            } catch (err) {
              console.warn('[Sync] Gagal kirim ulang saat reconnect:', dirtyId, err);
            }
          }
        }
      }
    });

    // 2. Auto-pull saat tab kembali aktif (throttled 20 detik, delta ?since= hanya untuk koleksi yang dimuat)
    const handleVisibilityOrFocus = () => {
      if (!isMounted || !isAuthenticatedRef.current) return;
      if (document.visibilityState !== 'visible') return;
      if (loadedCollectionsRef.current.size === 0) return;

      const now = Date.now();
      if (now - lastVisibilitySyncMsRef.current < 20000) return;
      lastVisibilitySyncMsRef.current = now;
      pullAllDataFromServer(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 3. Periodic background polling setiap 30 detik memakai ?since= untuk koleksi yang sudah dimuat
    const deltaPollInterval = setInterval(() => {
      if (!isMounted || !isAuthenticatedRef.current) return;
      if (document.visibilityState !== 'visible') return;
      if (loadedCollectionsRef.current.size === 0) return;
      pullAllDataFromServer(false);
    }, 30000);

    // 5. Real-time updates without page refresh via Socket.IO
    const unsubscribeChanges = onRecordChange((evt) => {
      if (!isMounted) return;
      const { collection, id, data, isDeleted, action, projectId: evtProjectId } = evt;

      if (action === 'bulk_delete') {
        const keepOtherProject = <T extends { projectId?: string }>(items: T[]) =>
          evtProjectId ? items.filter((item) => item.projectId && item.projectId !== evtProjectId) : [];

        switch (collection) {
          case COLLECTIONS.PROJECTS:
            setProjects([]);
            break;
          case COLLECTIONS.RBAC_PERMISSIONS:
            setRbacPermissions(DEFAULT_RBAC_PERMISSIONS);
            break;
          case COLLECTIONS.AREAS:
            setAreas((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.CLEANERS:
            setCleaners((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.SHIFTS:
            setShifts((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.SCHEDULES:
            setSchedules((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.UPLOADED_WORK_SCHEDULES:
            setUploadedWorkSchedules((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.CHECKLIST_LOCATIONS:
            setChecklistLocations((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.CHECKLIST_TEMPLATES:
            setChecklistTemplates([]);
            break;
          case COLLECTIONS.DAILY_CHECKLISTS:
            setDailyChecklists((prev) => {
              const remaining = evtProjectId ? prev.filter((dc) => dc.projectId !== evtProjectId) : [];
              const remainingIds = new Set(remaining.map((dc) => dc.id));
              for (const k of Array.from(checklistSnapshotRef.current.keys())) {
                if (!remainingIds.has(k)) checklistSnapshotRef.current.delete(k);
              }
              for (const k of Array.from(dirtyChecklistIdsRef.current)) {
                if (!remainingIds.has(k)) dirtyChecklistIdsRef.current.delete(k);
              }
              return remaining;
            });
            break;
          case COLLECTIONS.TASKS:
            setTasks((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.INSPECTIONS:
            setInspections((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.COMPLAINTS:
            setComplaints((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.DAMAGE_REPORTS:
            setDamageReports((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.SPECIAL_JOBS:
            setSpecialJobs((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.MASTER_PROGRAMS:
            setMasterPrograms((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.UPLOADED_MCP:
            setUploadedMcpPrograms((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.MCP_CHECKLIST_RESULTS:
            setMcpChecklistResults((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.EMPLOYEE_TURNOVERS:
            setEmployeeTurnovers((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.KLIEN_CHECKLIST_ITEMS:
            setKlienChecklistItems((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS:
            setKlienChecklistInspections((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.NOTIFICATIONS:
            setNotifications((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.AUDIT_LOGS:
            setAuditLogs((prev) => keepOtherProject(prev));
            break;
          case COLLECTIONS.COMPANY_PROFILE:
            setCompanyProfile(DEFAULT_COMPANY_PROFILE);
            try { localStorage.removeItem('jti_company_profile'); } catch {}
            break;
          case COLLECTIONS.KPI_CONFIG:
            setKpiConfig(DEFAULT_KPI_VISIBILITY_OFF);
            try { localStorage.removeItem('jti_kpi_config'); } catch {}
            break;
        }
        return;
      }

      if (action === 'delete' || isDeleted) {
        switch (collection) {
          case COLLECTIONS.PROJECTS: setProjects((prev) => prev.filter((p) => p.id !== id)); break;
          case COLLECTIONS.USERS: setUsers((prev) => prev.filter((u) => u.id !== id)); break;
          case COLLECTIONS.RBAC_PERMISSIONS: setRbacPermissions((prev) => prev.filter((p) => p.moduleId !== id)); break;
          case COLLECTIONS.AREAS: setAreas((prev) => prev.filter((a) => a.id !== id)); break;
          case COLLECTIONS.CLEANERS: setCleaners((prev) => prev.filter((c) => c.id !== id)); break;
          case COLLECTIONS.SHIFTS: setShifts((prev) => prev.filter((s) => s.id !== id)); break;
          case COLLECTIONS.SCHEDULES: setSchedules((prev) => prev.filter((s) => s.id !== id)); break;
          case COLLECTIONS.UPLOADED_WORK_SCHEDULES: setUploadedWorkSchedules((prev) => prev.filter((u) => u.id !== id)); break;
          case COLLECTIONS.CHECKLIST_LOCATIONS: setChecklistLocations((prev) => prev.filter((l) => l.id !== id)); break;
          case COLLECTIONS.CHECKLIST_TEMPLATES: setChecklistTemplates((prev) => prev.filter((t) => t.id !== id)); break;
          case COLLECTIONS.DAILY_CHECKLISTS:
            checklistSnapshotRef.current.delete(id);
            dirtyChecklistIdsRef.current.delete(id);
            setDailyChecklists((prev) => prev.filter((dc) => dc.id !== id));
            break;
          case COLLECTIONS.TASKS: setTasks((prev) => prev.filter((t) => t.id !== id)); break;
          case COLLECTIONS.INSPECTIONS: setInspections((prev) => prev.filter((i) => i.id !== id)); break;
          case COLLECTIONS.COMPLAINTS: setComplaints((prev) => prev.filter((c) => c.id !== id)); break;
          case COLLECTIONS.DAMAGE_REPORTS: setDamageReports((prev) => prev.filter((d) => d.id !== id)); break;
          case COLLECTIONS.SPECIAL_JOBS: setSpecialJobs((prev) => prev.filter((s) => s.id !== id)); break;
          case COLLECTIONS.MASTER_PROGRAMS: setMasterPrograms((prev) => prev.filter((m) => m.id !== id)); break;
          case COLLECTIONS.UPLOADED_MCP: setUploadedMcpPrograms((prev) => prev.filter((m) => m.id !== id)); break;
          case COLLECTIONS.MCP_CHECKLIST_RESULTS: setMcpChecklistResults((prev) => prev.filter((m) => m.id !== id)); break;
          case COLLECTIONS.EMPLOYEE_TURNOVERS: setEmployeeTurnovers((prev) => prev.filter((e) => e.id !== id)); break;
          case COLLECTIONS.KLIEN_CHECKLIST_ITEMS: setKlienChecklistItems((prev) => prev.filter((k) => k.id !== id)); break;
          case COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS: setKlienChecklistInspections((prev) => prev.filter((k) => k.id !== id)); break;
          case COLLECTIONS.NOTIFICATIONS: setNotifications((prev) => prev.filter((n) => n.id !== id)); break;
          case COLLECTIONS.AUDIT_LOGS: setAuditLogs((prev) => prev.filter((a) => a.id !== id)); break;
          case COLLECTIONS.COMPANIES: setCompanies((prev) => prev.filter((c) => c.id !== id)); break;
          case COLLECTIONS.COMPANY_PROFILE:
            setCompanyProfile(DEFAULT_COMPANY_PROFILE);
            try { localStorage.removeItem('jti_company_profile'); } catch {}
            break;
        }
        return;
      }

      if (data) {
        switch (collection) {
          case COLLECTIONS.PROJECTS:
            setProjects((prev) => {
              const idx = prev.findIndex((p) => p.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.USERS:
            setUsers((prev) => {
              const idx = prev.findIndex((u) => u.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.RBAC_PERMISSIONS:
            setRbacPermissions((prev) => {
              const idx = prev.findIndex((p) => p.moduleId === (data.moduleId || id));
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.AREAS:
            setAreas((prev) => {
              const idx = prev.findIndex((a) => a.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.CLEANERS:
            setCleaners((prev) => {
              const idx = prev.findIndex((c) => c.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.SHIFTS:
            setShifts((prev) => {
              const idx = prev.findIndex((s) => s.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.SCHEDULES:
            setSchedules((prev) => {
              const idx = prev.findIndex((s) => s.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.UPLOADED_WORK_SCHEDULES:
            setUploadedWorkSchedules((prev) => {
              const idx = prev.findIndex((u) => u.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.UPLOADED_MCP:
            setUploadedMcpPrograms((prev) => {
              const idx = prev.findIndex((u) => u.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.MCP_CHECKLIST_RESULTS:
            setMcpChecklistResults((prev) => {
              const idx = prev.findIndex((u) => u.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.CHECKLIST_LOCATIONS:
            setChecklistLocations((prev) => {
              const idx = prev.findIndex((l) => l.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.CHECKLIST_TEMPLATES:
            setChecklistTemplates((prev) => {
              const idx = prev.findIndex((t) => t.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.DAILY_CHECKLISTS: {
            setDailyChecklists((prev) => {
              const idx = prev.findIndex((dc) => dc.id === id);
              if (idx >= 0) {
                const localDoc = prev[idx];
                const incomingDoc = data as DailyAreaChecklist;
                // Merge hourlySlots so remote socket broadcast doesn't clobber populated local slot items
                const mergedSlots = (incomingDoc.hourlySlots || []).map((inSlot) => {
                  const localSlot = localDoc.hourlySlots?.find((ls) => ls.hour === inSlot.hour);
                  if (!localSlot) return inSlot;
                  const inHasItems = Array.isArray(inSlot.items) && inSlot.items.length > 0;
                  const localHasItems = Array.isArray(localSlot.items) && localSlot.items.length > 0;
                  if (!inHasItems && localHasItems) {
                    return { ...inSlot, items: localSlot.items, status: localSlot.status };
                  }
                  return inSlot;
                });
                const mergedDoc: DailyAreaChecklist = {
                  ...localDoc,
                  ...incomingDoc,
                  hourlySlots: mergedSlots.length > 0 ? mergedSlots : incomingDoc.hourlySlots || localDoc.hourlySlots,
                };
                checklistSnapshotRef.current.set(id, JSON.stringify(mergedDoc));
                dirtyChecklistIdsRef.current.delete(id);
                const next = [...prev];
                next[idx] = mergedDoc;
                return next;
              }
              checklistSnapshotRef.current.set(id, JSON.stringify(data));
              dirtyChecklistIdsRef.current.delete(id);
              return [...prev, data];
            });
            break;
          }
          case COLLECTIONS.TASKS:
            setTasks((prev) => {
              const idx = prev.findIndex((t) => t.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.INSPECTIONS:
            setInspections((prev) => {
              const idx = prev.findIndex((i) => i.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.COMPLAINTS:
            setComplaints((prev) => {
              const idx = prev.findIndex((c) => c.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.DAMAGE_REPORTS:
            setDamageReports((prev) => {
              const idx = prev.findIndex((d) => d.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.SPECIAL_JOBS:
            setSpecialJobs((prev) => {
              const idx = prev.findIndex((s) => s.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.MASTER_PROGRAMS:
            setMasterPrograms((prev) => {
              const idx = prev.findIndex((m) => m.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.EMPLOYEE_TURNOVERS:
            setEmployeeTurnovers((prev) => {
              const idx = prev.findIndex((e) => e.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.KLIEN_CHECKLIST_ITEMS:
            setKlienChecklistItems((prev) => {
              const idx = prev.findIndex((k) => k.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
          case COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS:
            setKlienChecklistInspections((prev) => {
              const idx = prev.findIndex((k) => k.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.NOTIFICATIONS:
            setNotifications((prev) => {
              const idx = prev.findIndex((n) => n.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.AUDIT_LOGS:
            setAuditLogs((prev) => {
              const cleanData = normalizeAuditLog(data);
              const idx = prev.findIndex((a) => a.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...cleanData }; return next; }
              return [cleanData, ...prev];
            });
            break;
          case COLLECTIONS.COMPANY_PROFILE:
            setCompanyProfile(data);
            try {
              localStorage.setItem('jti_company_profile', JSON.stringify(data));
            } catch {}
            break;
          case COLLECTIONS.COMPANIES:
            setCompanies((prev) => {
              const idx = prev.findIndex((c) => c.id === id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], ...data };
                return next;
              }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.KPI_CONFIG:
            setKpiConfig(data);
            try {
              localStorage.setItem('jti_kpi_config', JSON.stringify(data));
            } catch {}
            break;
        }
      }
    });

    const onCompanyLogoUpdated = (payload: { id: string; logoUrl: string }) => {
      if (!isMounted || !payload?.id) return;
      setCompanies((prev) =>
        prev.map((c) => (c.id === payload.id ? { ...c, logo: payload.logoUrl } : c))
      );
      if (payload.id === 'comp-main' || payload.id === userCompanyIdRef.current) {
        setCompanyProfile((prev) => ({ ...prev, logoUrl: payload.logoUrl }));
        try {
          const saved = localStorage.getItem('jti_company_profile');
          if (saved) {
            const parsed = JSON.parse(saved);
            localStorage.setItem('jti_company_profile', JSON.stringify({ ...parsed, logoUrl: payload.logoUrl }));
          }
        } catch {}
        window.dispatchEvent(
          new CustomEvent('pwa-icons-updated', { detail: { icon: payload.logoUrl } })
        );
      }
    };

    const onCompanyProfileUpdated = (prof: any) => {
      if (!isMounted || !prof) return;
      setCompanyProfile(prof);
      try {
        localStorage.setItem('jti_company_profile', JSON.stringify(prof));
      } catch {}
    };

    socket.on('company:logo_updated', onCompanyLogoUpdated);
    socket.on('company_profile:update', onCompanyProfileUpdated);

    const onSocketDisconnect = () => {
      if (!isMounted) return;
      lastDisconnectTimeRef.current = Date.now();
      setSupabaseStatus((prev) => ({ ...prev, status: 'DISCONNECTED' }));
    };

    socket.on('disconnect', onSocketDisconnect);

    return () => {
      isMounted = false;
      unsubscribeReconnect();
      unsubscribeChanges();
      socket.off('company:logo_updated', onCompanyLogoUpdated);
      socket.off('company_profile:update', onCompanyProfileUpdated);
      socket.off('disconnect', onSocketDisconnect);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(deltaPollInterval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('sco_role', userRole);
  }, [userRole]);
  useEffect(() => {
    localStorage.setItem('sco_active_user_id', activeUserId);
  }, [activeUserId]);

  const addAuditLog = (
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>
  ) => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const timestampStr = `${dateFormatted}, ${timeFormatted} WIB`;

    const newLog: AuditLogEntry = normalizeAuditLog({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: timestampStr,
      userId: currentUser?.id || 'usr-system',
      userName: currentUser?.name || 'Administrator',
      userRole: userRole,
      projectId: entry.projectId || safeActiveProjectId,
      projectName: entry.projectName || activeProject?.name || 'Gedung Operasional',
      action: entry.action,
      module: entry.module,
      entityId: entry.entityId,
      entityName: entry.entityName,
      details: entry.details,
      previousState: entry.previousState,
      newState: entry.newState,
    });

    setAuditLogs((prev) => [newLog, ...prev]);
    upsertRecord(COLLECTIONS.AUDIT_LOGS, newLog).catch(() => {});
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
    deleteCollectionRecords(COLLECTIONS.AUDIT_LOGS).catch((err) =>
      notifyServerError('menghapus log audit', err)
    );
  };

  // Controller Verification / Approval for Tasks
  const verifyTaskApproval = (
    taskId: string,
    action: 'approved' | 'rejected',
    notes?: string
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const verifierName = currentUser?.name || 'Pengawas/Controller';

    const existingTask = tasks.find((t) => t.id === taskId);
    const prevApprovalStatus = existingTask?.controllerApprovalStatus || 'pending';
    const affectedTask: CleaningTask | undefined = existingTask
      ? {
          ...existingTask,
          status: action === 'approved' ? 'completed' : 'in_progress',
          controllerApprovalStatus: action,
          controllerApprovedBy: verifierName,
          controllerApprovedAt: nowStr,
          controllerRejectionReason: action === 'rejected' ? notes : undefined,
          remarks:
            action === 'rejected' && notes
              ? `[Catatan Controller: ${notes}] ${existingTask.remarks || ''}`
              : existingTask.remarks,
        }
      : undefined;

    if (affectedTask) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? affectedTask : t)));
      upsertRecord(COLLECTIONS.TASKS, affectedTask).catch((err) =>
        notifyServerError('verifikasi approval tugas', err)
      );
    }

    // Kirim notifikasi hasil approval ke petugas
    const notif: AppNotification = {
      id: `notif-appr-${Date.now()}`,
      title: action === 'approved' ? '✅ Tugas Disetujui Controller' : '⚠️ Tugas Ditolak oleh Controller',
      message: action === 'approved'
        ? `Laporan pengerjaan "${affectedTask?.areaName || 'Area'}" telah diverifikasi & DISETUJUI oleh Controller ${verifierName}.`
        : `Laporan pengerjaan "${affectedTask?.areaName || 'Area'}" DITOLAK oleh Controller ${verifierName}. Alasan: "${notes || 'Pekerjaan belum memenuhi standar'}". Segera lakukan perbaikan!`,
      timestamp: nowStr,
      type: action === 'approved' ? 'success' : 'warning',
      targetRole: ['petugas', 'super_admin', 'admin', 'supervisor'],
      read: false,
      taskId: taskId,
      projectId: affectedTask?.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});

    if (action === 'approved') {
      triggerTopNotification({
        category: 'qc_approved',
        title: 'Inspeksi QC Disetujui!',
        message: `Laporan pengerjaan "${affectedTask?.areaName || 'Area'}" telah diverifikasi & DISETUJUI oleh Controller ${verifierName}.`,
        targetTab: 'inspeksi',
        metaId: taskId,
        projectName: activeProject?.name,
      });
    }

    // Catat Audit Trail
    addAuditLog({
      action: action === 'approved' ? 'verify_approve' : 'verify_reject',
      module: 'inspeksi',
      entityId: taskId,
      entityName: affectedTask?.areaName || 'Tugas Area Kebersihan',
      projectId: affectedTask?.projectId || safeActiveProjectId,
      projectName: activeProject?.name,
      details: action === 'approved'
        ? `Controller ${verifierName} MENYETUJUI laporan tugas (${affectedTask?.areaName || taskId}). Catatan: "${notes || '-'}"`
        : `Controller ${verifierName} MENOLAK laporan tugas (${affectedTask?.areaName || taskId}) dan meminta perbaikan. Alasan: "${notes || '-'}"`,
      previousState: prevApprovalStatus,
      newState: action,
    });
  };

  // Real-time Check for Overdue Checklist & Tasks
  const checkOverdueAreasAndTasks = (): { overdueTasksCount: number; overdueChecklistsCount: number } => {
    const now = new Date();
    const currentHour = now.getHours();
    const nowStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    let overdueChecklistsCount = 0;
    let overdueTasksCount = 0;

    // Periksa Checklist 24 jam yang belum dicek melewati jadwal
    dailyChecklists.forEach((d) => {
      d.hourlySlots.forEach((slot) => {
        if (slot.hour < currentHour && slot.status === 'pending') {
          overdueChecklistsCount++;
        }
      });
    });

    // Periksa Tugas yang belum selesai melewati deadline
    tasks.forEach((t) => {
      if (t.status === 'in_progress' || t.status === 'pending') {
        const deadlineHour = parseInt(t.deadlineTime?.split(':')[0] || '24', 10);
        if (deadlineHour <= currentHour) {
          overdueTasksCount++;
        }
      }
    });

    // Buat notifikasi peringatan jika ada area terlambat
    if (overdueChecklistsCount > 0 || overdueTasksCount > 0) {
      const alertNotif: AppNotification = {
        id: `notif-overdue-${Date.now()}`,
        title: '⚠️ Peringatan: Area Melewati Jadwal Cek!',
        message: `Terdeteksi ${overdueChecklistsCount} slot checklist area dan ${overdueTasksCount} jadwal tugas belum diselesaikan melewati waktu yang ditentukan.`,
        timestamp: nowStr,
        type: 'warning',
        targetRole: ['super_admin', 'admin', 'supervisor', 'petugas'],
        read: false,
        projectId: safeActiveProjectId,
      };
      setNotifications((prev) => [alertNotif, ...prev]);
    }

    return { overdueTasksCount, overdueChecklistsCount };
  };

  // Jalankan pengecekan overdue otomatis secara berkala (real-time interval)
  useEffect(() => {
    // Initial check after mount
    const timer = setTimeout(() => {
      const now = new Date();
      const currentHour = now.getHours();
      // Count pending slots in previous hours
      let pendingCount = 0;
      dailyChecklists.forEach((d) => {
        d.hourlySlots.forEach((slot) => {
          if (slot.hour < currentHour && slot.status === 'pending') {
            pendingCount++;
          }
        });
      });

      if (pendingCount > 0) {
        const notif: AppNotification = {
          id: `notif-overdue-init-${Date.now()}`,
          title: `⚠️ Real-Time Alert: ${pendingCount} Jadwal Ceklist Terlewat!`,
          message: `Terdapat ${pendingCount} slot inspeksi checklist yang belum diisi oleh petugas melewati batas jam jadwal. Segera tindak lanjuti!`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
          type: 'warning',
          targetRole: ['super_admin', 'admin', 'supervisor'],
          read: false,
          projectId: safeActiveProjectId,
        };
        setNotifications((prev) => {
          // Prevent exact duplicate notifications
          if (prev.some((n) => n.title.includes('Jadwal Ceklist Terlewat'))) return prev;
          return [notif, ...prev];
        });
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, []);


  // Authentication & Session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('sco_auth_state');
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('sco_auth_token');
    return saved === 'true' || hasToken;
  });
  const isAuthenticatedRef = useRef<boolean>(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;
  const authCoreLoadedRef = useRef<boolean>(false);

  // Verify existing token once on mount (without triggering duplicate pulls)
  useEffect(() => {
    const existingToken = getAuthToken();
    if (existingToken) {
      apiVerifySession()
        .then((res) => {
          if (res && res.authenticated && res.user) {
            setIsAuthenticated(true);
            localStorage.setItem('sco_auth_state', 'true');
            if (res.user.id) {
              setActiveUserId(res.user.id);
              localStorage.setItem('sco_active_user_id', res.user.id);
            }
            if (res.user.role) {
              setUserRole(res.user.role);
              localStorage.setItem('sco_role', res.user.role);
            }
          }
        })
        .catch(() => {});
    } else if (!isAuthenticatedRef.current) {
      // Unauthenticated login screen: only load lightweight company branding
      pullCollections([COLLECTIONS.COMPANY_PROFILE], true).catch(() => {});
    }
  }, []);

  // Single entry point for initial core data load after login / authenticated session restore
  useEffect(() => {
    if (!isAuthenticated) {
      authCoreLoadedRef.current = false;
      return;
    }
    if (!authCoreLoadedRef.current) {
      authCoreLoadedRef.current = true;
      pullCollections(CORE_COLLECTIONS, true).catch(() => {});
    }
  }, [isAuthenticated]);

  // On-demand lazy collection loading per active menu tab
  useEffect(() => {
    if (!isAuthenticated) return;
    ensureTabCollections(activeTab);
  }, [isAuthenticated, activeTab]);

  const login = async (identifier: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Harap masukkan Username/Email dan Password.' };
    }

    // 1. Coba autentikasi ke server backend secara autoritatif
    try {
      const apiRes = await apiLogin({ identifier: cleanId, password: cleanPass });
      if (apiRes && apiRes.success && apiRes.user) {
        setIsAuthenticated(true);
        setActiveUserId(apiRes.user.id);
        setUserRole(apiRes.user.role);

        // Update local users array with the authentic user info from backend
        setUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === apiRes.user.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...apiRes.user };
            return next;
          }
          return [...prev, apiRes.user];
        });

        const userProjs = apiRes.user.assignedProjectIds || [];
        const isUserAdmin =
          isSuperAdminRole(apiRes.user.role) ||
          apiRes.user.role === 'admin_perusahaan' ||
          apiRes.user.role === 'service_manager';
        const loginCompId = apiRes.user.companyId || (apiRes.user as any).company_id || 'comp-main';
        const compProjects = isSuperAdminRole(apiRes.user.role)
          ? projects
          : projects.filter((p) => (p.companyId || p.company_id || 'comp-main') === loginCompId);

        let nextProjId = '';
        if (isUserAdmin) {
          nextProjId = compProjects[0]?.id || '';
        } else if (userProjs.length > 0) {
          const allowedMatch = compProjects.find((p) => userProjs.includes(p.id));
          nextProjId = allowedMatch?.id || '';
        } else {
          nextProjId = compProjects[0]?.id || '';
        }

        setActiveProjectIdState(nextProjId);
        if (nextProjId) {
          localStorage.setItem('sco_active_project_id', nextProjId);
        } else {
          localStorage.removeItem('sco_active_project_id');
        }

        localStorage.setItem('sco_auth_state', 'true');
        localStorage.setItem('sco_active_user_id', apiRes.user.id);
        localStorage.setItem('sco_role', apiRes.user.role);

        if (apiRes.user.role === 'klien') {
          setActiveTab('klien-mode');
        } else {
          setActiveTab('dashboard');
        }

        return { success: true };
      } else if (apiRes && !apiRes.success && apiRes.error) {
        return { success: false, message: apiRes.error || 'Email atau kata sandi salah' };
      }
    } catch {
      // Backend offline / network issue: lanjutkan verifikasi lokal fallback
    }

    // 2. Fallback verifikasi lokal jika server sedang tidak dapat dijangkau
    const matchedUser = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        ((cleanId === 'admin' || cleanId === 'superadmin' || cleanId === 'administrator') &&
          (isSuperAdminRole(u.role) || u.id === 'usr-admin'))
    );

    if (!matchedUser) {
      return { success: false, message: 'Username, email, atau kata sandi tidak sesuai.' };
    }

    // Cek status perusahaan pengguna: jika ditangguhkan / diarsipkan, tolak dengan pesan umum
    const uCompId = matchedUser.companyId || (matchedUser as any).company_id || 'comp-main';
    if (!isSuperAdminRole(matchedUser.role)) {
      const userComp = companies.find((c) => c.id === uCompId);
      if (userComp && (userComp.status === 'ditangguhkan' || userComp.status === 'diarsipkan')) {
        return { success: false, message: 'Username, email, atau kata sandi tidak sesuai.' };
      }
    }

    const defaultRolePass =
      isSuperAdminRole(matchedUser.role) || matchedUser.id === 'usr-admin'
        ? 'admin123'
        : matchedUser.role === 'supervisor'
        ? 'spv123'
        : matchedUser.role === 'petugas'
        ? 'petugas123'
        : 'klien123';

    const isPassValid =
      matchedUser.password === cleanPass ||
      cleanPass === defaultRolePass ||
      (isSuperAdminRole(matchedUser.role) &&
        (cleanPass === 'admin' || cleanPass === 'superadmin'));

    if (!isPassValid) {
      return { success: false, message: 'Username, email, atau kata sandi tidak sesuai.' };
    }

    setIsAuthenticated(true);
    setActiveUserId(matchedUser.id);
    setUserRole(matchedUser.role);

    const userProjs = matchedUser.assignedProjectIds || [];
    const isUserAdmin =
      isSuperAdminRole(matchedUser.role) ||
      matchedUser.role === 'admin_perusahaan' ||
      matchedUser.role === 'service_manager';
    const compProjects = isSuperAdminRole(matchedUser.role)
      ? projects
      : projects.filter((p) => (p.companyId || p.company_id || 'comp-main') === uCompId);

    let nextProjId = '';
    if (isUserAdmin) {
      nextProjId = compProjects[0]?.id || '';
    } else if (userProjs.length > 0) {
      const allowedMatch = compProjects.find((p) => userProjs.includes(p.id));
      nextProjId = allowedMatch?.id || '';
    } else {
      nextProjId = compProjects[0]?.id || '';
    }

    setActiveProjectIdState(nextProjId);
    if (nextProjId) {
      localStorage.setItem('sco_active_project_id', nextProjId);
    } else {
      localStorage.removeItem('sco_active_project_id');
    }

    localStorage.setItem('sco_auth_state', 'true');
    localStorage.setItem('sco_active_user_id', matchedUser.id);
    localStorage.setItem('sco_role', matchedUser.role);

    // Kirim request login ke backend di latar belakang jika tersedia
    apiLogin({ identifier: cleanId, password: cleanPass })
      .then((res) => {
        if (res?.success) pullCollections(CORE_COLLECTIONS, true).catch(() => {});
      })
      .catch(() => {});

    if (matchedUser.role === 'klien') {
      setActiveTab('klien-mode');
    } else {
      setActiveTab('dashboard');
    }

    return { success: true };
  };

  const instantLogin = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const apiRes = await apiLogin({ userId });
      if (apiRes && apiRes.success && apiRes.user) {
        setIsAuthenticated(true);
        setActiveUserId(apiRes.user.id);
        setUserRole(apiRes.user.role);

        setUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === apiRes.user.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...apiRes.user };
            return next;
          }
          return [...prev, apiRes.user];
        });

        const userProjs = apiRes.user.assignedProjectIds || [];
        const isUserAdmin =
          isSuperAdminRole(apiRes.user.role) ||
          apiRes.user.role === 'admin_perusahaan' ||
          apiRes.user.role === 'service_manager';
        const loginCompId = apiRes.user.companyId || (apiRes.user as any).company_id || 'comp-main';
        const compProjects = isSuperAdminRole(apiRes.user.role)
          ? projects
          : projects.filter((p) => (p.companyId || p.company_id || 'comp-main') === loginCompId);

        let nextProjId = '';
        if (isUserAdmin) {
          nextProjId = compProjects[0]?.id || '';
        } else if (userProjs.length > 0) {
          const allowedMatch = compProjects.find((p) => userProjs.includes(p.id));
          nextProjId = allowedMatch?.id || '';
        } else {
          nextProjId = compProjects[0]?.id || '';
        }

        setActiveProjectIdState(nextProjId);
        if (nextProjId) {
          localStorage.setItem('sco_active_project_id', nextProjId);
        } else {
          localStorage.removeItem('sco_active_project_id');
        }

        localStorage.setItem('sco_auth_state', 'true');
        localStorage.setItem('sco_active_user_id', apiRes.user.id);
        localStorage.setItem('sco_role', apiRes.user.role);

        if (apiRes.user.role === 'klien') {
          setActiveTab('klien-mode');
        } else {
          setActiveTab('dashboard');
        }

        return { success: true };
      }
    } catch {}

    const matchedUser = users.find((u) => u.id === userId);
    if (!matchedUser) {
      return { success: false, message: 'Akun pengguna tidak ditemukan.' };
    }

    setIsAuthenticated(true);
    setActiveUserId(matchedUser.id);
    setUserRole(matchedUser.role);

    const userProjs = matchedUser.assignedProjectIds || [];
    const isUserAdmin =
      isSuperAdminRole(matchedUser.role) ||
      matchedUser.role === 'admin_perusahaan' ||
      matchedUser.role === 'service_manager';
    const uCompId = matchedUser.companyId || (matchedUser as any).company_id || 'comp-main';
    const compProjects = isSuperAdminRole(matchedUser.role)
      ? projects
      : projects.filter((p) => (p.companyId || p.company_id || 'comp-main') === uCompId);

    let nextProjId = '';
    if (isUserAdmin) {
      nextProjId = compProjects[0]?.id || '';
    } else if (userProjs.length > 0) {
      const allowedMatch = compProjects.find((p) => userProjs.includes(p.id));
      nextProjId = allowedMatch?.id || '';
    } else {
      nextProjId = compProjects[0]?.id || '';
    }

    setActiveProjectIdState(nextProjId);
    if (nextProjId) {
      localStorage.setItem('sco_active_project_id', nextProjId);
    } else {
      localStorage.removeItem('sco_active_project_id');
    }

    localStorage.setItem('sco_auth_state', 'true');
    localStorage.setItem('sco_active_user_id', matchedUser.id);
    localStorage.setItem('sco_role', matchedUser.role);

    // Call backend API login asynchronously to retrieve and persist Bearer token
    apiLogin({ userId })
      .then((res) => {
        if (res?.success) pullCollections(CORE_COLLECTIONS, true).catch(() => {});
      })
      .catch((err) => {
        console.warn('[Instant Login Token] Backend token issuance notice:', err);
      });

    if (matchedUser.role === 'klien') {
      setActiveTab('klien-mode');
    } else {
      setActiveTab('dashboard');
    }

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    authCoreLoadedRef.current = false;
    initialSyncDone.current = false;
    loadedCollectionsRef.current.clear();
    lastPullAtRef.current = {};
    lastCollectionSyncMsRef.current = {};
    inFlightCollectionsRef.current.clear();
    localStorage.removeItem('sco_auth_state');
    localStorage.removeItem('sco_auth_token');
    setAuthToken(null);
    clearCachedDataOnLogout().catch(() => {});
    apiLogout().catch(() => {});
    setActiveTab('dashboard');
  };

  const updateRbacPermission = (moduleId: string, role: UserRole, allowed: boolean) => {
    if (isSuperAdminRole(role)) return; // Super admin always has full access
    const existing = rbacPermissions.find((p) => p.moduleId === moduleId);
    const updatedPerm: RoleModulePermission | undefined = existing ? { ...existing, [role]: allowed } : undefined;
    setRbacPermissions((prev) =>
      prev.map((perm) => (perm.moduleId === moduleId ? { ...perm, [role]: allowed } : perm))
    );
    if (updatedPerm) {
      upsertRecord(COLLECTIONS.RBAC_PERMISSIONS, updatedPerm).catch((err) =>
        notifyServerError('memperbarui hak akses RBAC', err)
      );
    }
  };

  const resetRbacPermissions = () => {
    setRbacPermissions(DEFAULT_RBAC_PERMISSIONS);
    for (const perm of DEFAULT_RBAC_PERMISSIONS) {
      upsertRecord(COLLECTIONS.RBAC_PERMISSIONS, perm).catch((err) =>
        notifyServerError('reset hak akses RBAC', err)
      );
    }
  };

  const hasAccess = (role: UserRole, moduleId: string): boolean => {
    // Menu manajemen perusahaan untuk Super Administrator (super_admin dan admin adalah sama)
    if (moduleId === 'perusahaan' || moduleId === 'companies') {
      return isSuperAdminRole(role);
    }
    // Peruntukan Klien: HANYA bisa membuka KLIEN MODE (dan sub-tab klien), seluruh menu lainnya ditutup
    if (role === 'klien') {
      return moduleId === 'klien-mode' || moduleId.startsWith('klien-');
    }
    if (
      isSuperAdminRole(role) ||
      role === 'admin_perusahaan' ||
      role === 'service_manager'
    ) {
      return true;
    }
    const perm = rbacPermissions.find((p) => p.moduleId === moduleId);
    if (!perm) return true; // Default allow if not configured
    if (role === 'team_leader') {
      return perm['team_leader'] !== undefined ? Boolean(perm['team_leader']) : Boolean(perm['supervisor']);
    }
    return Boolean(perm[role]);
  };

  // System Reload Feature
  const [isReloading, setIsReloading] = useState<boolean>(false);

  const reloadSystemData = async () => {
    setIsReloading(true);
    let serverSuccess = false;

    try {
      await pullAllDataFromServer();
      serverSuccess = true;
    } catch (err) {
      console.warn('[Sync] Server tidak terjangkau saat reloadSystemData:', err);
    }

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const reloadNotif: AppNotification = {
      id: `notif-reload-${Date.now()}`,
      title: serverSuccess ? '🔄 Data Sistem & Server Berhasil Dimuat Ulang' : '⚠️ Server Tidak Terjangkau',
      message: serverSuccess
        ? `Seluruh data operasional, tiket, dan ceklist telah disegarkan dari database server per ${nowTime}.`
        : `Server tidak terjangkau. Menggunakan data memori saat ini per ${nowTime}.`,
      timestamp: nowTime,
      type: serverSuccess ? 'info' : 'warning',
      targetRole: ['super_admin', 'admin', 'supervisor', 'petugas', 'klien'],
      read: false,
    };
    setNotifications((prev) => [reloadNotif, ...prev]);
    setIsReloading(false);
  };

  // Delete helpers for Schedule and Complaint
  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    deleteRecord(COLLECTIONS.SCHEDULES, id).catch((err) => notifyServerError('menghapus jadwal', err));
  };

  const deleteComplaint = (id: string) => {
    setComplaints((prev) => prev.filter((c) => c.id !== id));
    deleteRecord(COLLECTIONS.COMPLAINTS, id).catch((err) => notifyServerError('menghapus komplain', err));
  };

  const syncUploadedScheduleToCleaners = async (
    doc: UploadedWorkScheduleDocument,
    referenceDay?: number
  ): Promise<{ syncedCount: number; createdCount: number; updatedCount: number }> => {
    const projectKey = doc.projectId || safeActiveProjectId || defaultProjectId || 'global';
    const activeProj = projects.find((p) => p.id === projectKey);
    const compId = doc.company_id || doc.companyId || activeProj?.company_id || activeProj?.companyId || currentCompany?.id || 'comp-main';
    const hasExplicitShiftIds = Array.isArray(activeProj?.shiftIds) && activeProj.shiftIds.length > 0;
    const projectShifts = hasExplicitShiftIds
      ? shifts.filter(
          (s) =>
            activeProj!.shiftIds!.includes(s.id) ||
            s.projectId === projectKey ||
            (s.projectIds && s.projectIds.includes(projectKey))
        )
      : shifts.filter(
          (s) =>
            (!s.projectId && (!s.projectIds || s.projectIds.length === 0)) ||
            s.projectId === projectKey ||
            s.projectIds?.includes(projectKey)
        );
    const {
      buildRowsFromEntries,
      resolveRowOperationalShift,
      resolveShift1AndShift2,
    } = await import('../utils/workScheduleExcel');
    const { shift1, shift2 } = resolveShift1AndShift2(projectShifts.length > 0 ? projectShifts : shifts);

    const { rows, daysCount } = buildRowsFromEntries(doc.entries || []);
    const effectiveDaysCount = doc.daysCount || daysCount;
    const now = new Date();
    const fallbackDay =
      now.getMonth() + 1 === doc.bulan && now.getFullYear() === doc.tahun
        ? Math.min(now.getDate(), effectiveDaysCount)
        : 1;
    const refDay = referenceDay && referenceDay >= 1 ? Math.min(referenceDay, effectiveDaysCount) : fallbackDay;
    const nowTimeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const seenNames = new Set<string>();
    const newCleanersToPersist: Cleaner[] = [];
    const updatedCleanerPatches: Array<{ id: string; patch: Partial<Cleaner> }> = [];
    let createdCount = 0;
    let updatedCount = 0;

    // Build next snapshot against cleanersRef.current
    const workingList = [...cleanersRef.current];

    rows.forEach((row, idx) => {
      const cleanName = (row.nama || '').trim();
      if (!cleanName || row.isSlotKosong || cleanName.toUpperCase() === 'SLOT KOSONG') {
        return;
      }
      const normKey = cleanName.toLowerCase();
      if (seenNames.has(normKey)) return;
      seenNames.add(normKey);

      const cleanArea = row.area && row.area !== '-' ? row.area.trim() : '';
      const shiftInfo = resolveRowOperationalShift(row, effectiveDaysCount, refDay);
      const targetShift = shiftInfo.effectiveShiftCode === 'S' ? shift2 : shift1;

      const existingIdx = workingList.findIndex(
        (c) =>
          (c.projectId || defaultProjectId || 'global') === projectKey &&
          c.name.trim().toLowerCase() === normKey
      );

      if (existingIdx >= 0) {
        const existing = workingList[existingIdx];
        const patch: Partial<Cleaner> = {
          name: cleanName,
          workPlotting: cleanArea || existing.workPlotting || '',
          workPlottingUpdatedAt: nowTimeStr,
          shiftId: targetShift.id,
          shiftName: targetShift.name,
        };
        workingList[existingIdx] = { ...existing, ...patch };
        updatedCleanerPatches.push({ id: existing.id, patch });
        updatedCount++;
      } else {
        const newId = `cln-${Date.now()}-${idx}`;
        const created: Cleaner = {
          id: newId,
          projectId: projectKey,
          company_id: compId,
          companyId: compId,
          nik: '',
          name: cleanName,
          phone: '',
          photoUrl: '',
          shiftId: targetShift.id,
          shiftName: targetShift.name,
          assignedAreas: [],
          status: 'active',
          rating: 5,
          tasksCompletedToday: 0,
          totalTasksToday: 0,
          isClockedIn: false,
          attendance: {},
          attendanceByMonth: {},
          workPlotting: cleanArea,
          workPlottingUpdatedAt: nowTimeStr,
        };
        workingList.push(created);
        newCleanersToPersist.push(created);
        createdCount++;
      }
    });

    cleanersRef.current = workingList;
    setCleaners(workingList);

    // Persist updates and new cleaners cleanly to backend
    for (const { id, patch } of updatedCleanerPatches) {
      enqueueCleanerWrite(id, 'menyinkronkan petugas dari jadwal kerja', (base) => ({
        ...base,
        ...patch,
      }));
    }

    for (const item of newCleanersToPersist) {
      const writePromise = upsertRecord(COLLECTIONS.CLEANERS, item)
        .then((saved) => syncCleanerRev(saved))
        .catch((err) => notifyServerError('menambah petugas hasil sinkron jadwal', err));
      cleanerWriteQueueRef.current.set(item.id, writePromise);
    }

    return {
      syncedCount: createdCount + updatedCount,
      createdCount,
      updatedCount,
    };
  };

  const saveUploadedWorkSchedule = async (payload: {
    bulan: number;
    tahun: number;
    daysCount: number;
    fileName?: string;
    entries: UploadedWorkScheduleEntry[];
  }): Promise<UploadedWorkScheduleDocument> => {
    const projectKey = safeActiveProjectId || defaultProjectId || 'global';
    const docId = `${projectKey}_${payload.tahun}_${String(payload.bulan).padStart(2, '0')}`;
    const existing = uploadedWorkSchedules.find((d) => d.id === docId);
    const activeProj = projects.find((p) => p.id === projectKey);
    const compId = activeProj?.company_id || activeProj?.companyId || currentCompany?.id || 'comp-main';

    const doc: UploadedWorkScheduleDocument = {
      id: docId,
      projectId: projectKey,
      company_id: compId,
      companyId: compId,
      bulan: payload.bulan,
      tahun: payload.tahun,
      daysCount: payload.daysCount,
      fileName: payload.fileName,
      entries: payload.entries,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Administrator',
      ...(existing?._rev ? { _rev: existing._rev, _baseRev: existing._rev } : {}),
    };

    setUploadedWorkSchedules((prev) => {
      const idx = prev.findIndex((item) => item.id === docId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = doc;
        return next;
      }
      return [...prev, doc];
    });

    try {
      const saved = await upsertWithConflictResolution(
        COLLECTIONS.UPLOADED_WORK_SCHEDULES,
        doc,
        setUploadedWorkSchedules
      );
      setUploadedWorkSchedules((prev) => {
        const idx = prev.findIndex((item) => item.id === docId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      await syncUploadedScheduleToCleaners(saved);
      return saved;
    } catch (err) {
      notifyServerError('menyimpan jadwal kerja upload', err);
      throw err;
    }
  };

  const deleteUploadedWorkSchedule = async (id: string): Promise<void> => {
    setUploadedWorkSchedules((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteRecord(COLLECTIONS.UPLOADED_WORK_SCHEDULES, id);
    } catch (err) {
      notifyServerError('menghapus jadwal kerja upload', err);
      throw err;
    }
  };

  const saveUploadedMcpProgram = async (payload: {
    lokasi_proyek: string;
    bulan: number;
    tahun: number;
    daysCount: number;
    dayCodes?: Record<number, string>;
    sheetNames?: string[];
    fileName?: string;
    rows: UploadedMcpRow[];
  }): Promise<UploadedMcpDocument> => {
    const projectKey = safeActiveProjectId || defaultProjectId || 'global';
    const cleanLokasi = payload.lokasi_proyek.trim() || 'Default';
    const locSlug = normalizeLokasiProyekKey(cleanLokasi);
    const docId = `${projectKey}_${locSlug}_${payload.tahun}_${String(payload.bulan).padStart(2, '0')}`;
    const existing = uploadedMcpPrograms.find((d) => d.id === docId);
    const activeProj = projects.find((p) => p.id === projectKey);
    const compId = activeProj?.company_id || activeProj?.companyId || currentCompany?.id || 'comp-main';

    const normalizedRows: UploadedMcpRow[] = payload.rows.map((r, idx) => ({
      rowId: r.rowId || `mcp-row-${idx + 1}`,
      lokasi_proyek: cleanLokasi,
      bulan: payload.bulan,
      tahun: payload.tahun,
      lokasi_kerja: r.lokasi_kerja,
      area_pekerjaan: r.area_pekerjaan,
      jenis_pekerjaan: r.jenis_pekerjaan,
      frq: r.frq || '',
      urutan: r.urutan ?? idx + 1,
      jadwal: r.jadwal,
      ...(r.sheet ? { sheet: r.sheet } : {}),
      ...(r.needsManualCheck ? { needsManualCheck: true } : {}),
      ...(r.isAddedManually ? { isAddedManually: true } : {}),
    }));

    const doc: UploadedMcpDocument = {
      id: docId,
      projectId: projectKey,
      company_id: compId,
      companyId: compId,
      lokasi_proyek: cleanLokasi,
      bulan: payload.bulan,
      tahun: payload.tahun,
      daysCount: payload.daysCount,
      ...(payload.dayCodes && Object.keys(payload.dayCodes).length > 0
        ? { dayCodes: payload.dayCodes }
        : {}),
      sheetNames: payload.sheetNames,
      fileName: payload.fileName,
      rows: normalizedRows,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Administrator',
      ...(existing?._rev ? { _rev: existing._rev, _baseRev: existing._rev } : {}),
    };

    setUploadedMcpPrograms((prev) => {
      const idx = prev.findIndex((item) => item.id === docId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = doc;
        return next;
      }
      return [...prev, doc];
    });

    try {
      const saved = await upsertWithConflictResolution(
        COLLECTIONS.UPLOADED_MCP,
        doc,
        setUploadedMcpPrograms
      );
      setUploadedMcpPrograms((prev) => {
        const idx = prev.findIndex((item) => item.id === docId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      return saved;
    } catch (err) {
      notifyServerError('menyimpan upload MCP', err);
      throw err;
    }
  };

  const updateUploadedMcpCell = async (
    docId: string,
    rowKey: string,
    tanggal: number,
    newValue: string
  ): Promise<void> => {
    const existing = uploadedMcpPrograms.find((d) => d.id === docId);
    if (!existing) return;

    const trimmedVal = newValue.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '');
    const updatedRows = (existing.rows || []).map((row, idx) => {
      const key = row.rowId || `idx-${row.urutan ?? idx + 1}`;
      if (key !== rowKey && row.rowId !== rowKey && String(row.urutan) !== rowKey) {
        return row;
      }
      const nextJadwal = (row.jadwal || []).filter((c) => c.tanggal !== tanggal);
      if (trimmedVal !== '') {
        nextJadwal.push({ tanggal, nilai_asli: trimmedVal });
        nextJadwal.sort((a, b) => a.tanggal - b.tanggal);
      }
      return {
        ...row,
        rowId: row.rowId || `mcp-row-${row.urutan ?? idx + 1}`,
        jadwal: nextJadwal,
        ...(trimmedVal !== '' ? { needsManualCheck: false } : {}),
      };
    });

    const updatedDoc: UploadedMcpDocument = {
      ...existing,
      rows: updatedRows,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Administrator',
      ...(existing._rev ? { _rev: existing._rev, _baseRev: existing._rev } : {}),
    };

    setUploadedMcpPrograms((prev) =>
      prev.map((item) => (item.id === docId ? updatedDoc : item))
    );

    try {
      const saved = await upsertWithConflictResolution(
        COLLECTIONS.UPLOADED_MCP,
        updatedDoc,
        setUploadedMcpPrograms
      );
      setUploadedMcpPrograms((prev) =>
        prev.map((item) => (item.id === docId ? saved : item))
      );
    } catch (err) {
      notifyServerError('memperbarui sel MCP', err);
      throw err;
    }
  };

  const updateUploadedMcpRows = async (
    docId: string,
    nextRows: UploadedMcpRow[]
  ): Promise<UploadedMcpDocument | undefined> => {
    const existing = uploadedMcpPrograms.find((d) => d.id === docId);
    if (!existing) return undefined;

    const updatedDoc: UploadedMcpDocument = {
      ...existing,
      rows: nextRows,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Administrator',
      ...(existing._rev ? { _rev: existing._rev, _baseRev: existing._rev } : {}),
    };

    setUploadedMcpPrograms((prev) =>
      prev.map((item) => (item.id === docId ? updatedDoc : item))
    );

    try {
      const saved = await upsertWithConflictResolution(
        COLLECTIONS.UPLOADED_MCP,
        updatedDoc,
        setUploadedMcpPrograms
      );
      setUploadedMcpPrograms((prev) =>
        prev.map((item) => (item.id === docId ? saved : item))
      );
      return saved;
    } catch (err) {
      notifyServerError('memperbarui daftar pekerjaan MCP', err);
      throw err;
    }
  };

  const deleteUploadedMcpProgram = async (id: string): Promise<void> => {
    setUploadedMcpPrograms((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteRecord(COLLECTIONS.UPLOADED_MCP, id);
    } catch (err) {
      notifyServerError('menghapus upload MCP', err);
      throw err;
    }
  };

  const saveMcpChecklistResults = async (payload: {
    date: string;
    bulan: number;
    tahun: number;
    tanggal: number;
    entries: Array<{
      item: TodayScheduledMcpItem;
      status: McpChecklistStatus;
    }>;
  }): Promise<McpChecklistResultRecord[]> => {
    if (!payload.entries || payload.entries.length === 0) return [];
    const projectKey = safeActiveProjectId || defaultProjectId || 'global';
    const activeProj = projects.find((p) => p.id === projectKey);
    const compId = activeProj?.company_id || activeProj?.companyId || currentCompany?.id || 'comp-main';
    const checkedAt = new Date().toISOString();
    const checkedBy = currentUser?.name || 'Petugas';

    const recordsToSave: McpChecklistResultRecord[] = payload.entries.map(({ item, status }) => {
      const recId = makeMcpChecklistRecordId(projectKey, payload.date, item);
      const existing = mcpChecklistResults.find((r) => r.id === recId);
      return {
        id: recId,
        projectId: projectKey,
        company_id: compId,
        companyId: compId,
        date: payload.date,
        bulan: payload.bulan,
        tahun: payload.tahun,
        tanggal: payload.tanggal,
        areaKey: item.areaKey,
        lokasi_kerja: item.lokasi_kerja,
        docId: item.docId,
        rowId: item.rowId,
        area_pekerjaan: item.area_pekerjaan,
        jenis_pekerjaan: item.jenis_pekerjaan,
        frq: item.frq,
        status,
        checkedAt,
        checkedBy,
        ...(existing?._rev ? { _rev: existing._rev, _baseRev: existing._rev } : {}),
      };
    });

    setMcpChecklistResults((prev) => {
      const next = [...prev];
      for (const rec of recordsToSave) {
        const idx = next.findIndex((r) => r.id === rec.id);
        if (idx >= 0) {
          next[idx] = rec;
        } else {
          next.push(rec);
        }
      }
      return next;
    });

    try {
      const savedList = await Promise.all(
        recordsToSave.map((rec) =>
          upsertWithConflictResolution(
            COLLECTIONS.MCP_CHECKLIST_RESULTS,
            rec,
            setMcpChecklistResults
          )
        )
      );
      setMcpChecklistResults((prev) => {
        const next = [...prev];
        for (const saved of savedList) {
          const idx = next.findIndex((r) => r.id === saved.id);
          if (idx >= 0) {
            next[idx] = saved;
          } else {
            next.push(saved);
          }
        }
        return next;
      });
      return savedList;
    } catch (err) {
      notifyServerError('menyimpan ceklist kebersihan MCP', err);
      throw err;
    }
  };

  // Project Location CRUD
  const addProject = (proj: Omit<ProjectLocation, 'id' | 'createdAt'>) => {
    const id = `proj-${Date.now()}`;
    const createdAt = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const targetCompanyId = proj.companyId || proj.company_id || userCompanyId || 'comp-main';
    const newProj: ProjectLocation = {
      ...proj,
      companyId: targetCompanyId,
      company_id: targetCompanyId,
      id,
      createdAt,
    };
    projectsRef.current = [...projectsRef.current, newProj];
    setProjects((prev) => [...prev, newProj]);
    upsertRecord(COLLECTIONS.PROJECTS, newProj)
      .then((saved) => syncProjectRev(saved))
      .catch((err) => notifyServerError('menambah proyek', err));

    // Give super admin access automatically (both super_admin and admin)
    const updatedAdmins = users
      .filter((u) => isSuperAdminRole(u.role))
      .map((u) => ({ ...u, assignedProjectIds: Array.from(new Set([...(u.assignedProjectIds || []), id])) }));
    setUsers((prev) =>
      prev.map((u) =>
        isSuperAdminRole(u.role)
          ? { ...u, assignedProjectIds: Array.from(new Set([...(u.assignedProjectIds || []), id])) }
          : u
      )
    );
    updatedAdmins.forEach((adminUser) => {
      upsertRecord(COLLECTIONS.USERS, adminUser).catch((e) => notifyServerError('memperbarui akses admin', e));
    });
  };

  const updateProject = (id: string, updates: Partial<ProjectLocation>) => {
    const normalizedUpdates: Partial<ProjectLocation> = { ...updates };
    if (updates.companyId !== undefined || updates.company_id !== undefined) {
      const nextCompanyId = updates.companyId || updates.company_id || 'comp-main';
      normalizedUpdates.companyId = nextCompanyId;
      normalizedUpdates.company_id = nextCompanyId;
    }
    projectsRef.current = projectsRef.current.map((p) => (p.id === id ? { ...p, ...normalizedUpdates } : p));
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...normalizedUpdates } : p)));
    enqueueProjectWrite(id, 'memperbarui proyek', (base) => ({
      ...base,
      ...normalizedUpdates,
    }));
  };

  const deleteProject = (id: string) => {
    const remaining = projectsRef.current.filter((p) => p.id !== id);
    projectsRef.current = remaining;
    setProjects(remaining);
    deleteRecord(COLLECTIONS.PROJECTS, id).catch((err) => notifyServerError('menghapus proyek', err));
    if (safeActiveProjectId === id) {
      setActiveProjectId(remaining[0]?.id || '');
    }
  };

  const assignShiftsToProject = (projectId: string, shiftIds: string[]) => {
    updateProject(projectId, { shiftIds });
    const targetProj = projects.find((p) => p.id === projectId);
    addAuditLog({
      action: 'update',
      module: 'pengaturan',
      details: `Memperbarui konfigurasi shift untuk proyek ${targetProj?.name || projectId} (${shiftIds.length} shift aktif diterapkan)`,
      projectId,
    });
  };

  const getProjectShifts = (targetProjectId?: string): Shift[] => {
    const pId = targetProjectId || safeActiveProjectId;
    const proj = projects.find((p) => p.id === pId);
    if (proj && Array.isArray(proj.shiftIds) && proj.shiftIds.length > 0) {
      const filtered = shifts.filter(
        (s) => proj.shiftIds!.includes(s.id) || s.projectId === pId || (s.projectIds && s.projectIds.includes(pId))
      );
      if (filtered.length > 0) return filtered;
    }
    // Jika belum dibatasi atau shift yang ditentukan tidak ditemukan, kembalikan shift yang relevan
    return shifts.filter((s) => !s.projectId || s.projectId === pId);
  };

  const updateUserProjectAssignment = (userId: string, projectIds: string[]) => {
    let updatedUser: AppUser | undefined;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedUser = { ...u, assignedProjectIds: projectIds };
          return updatedUser;
        }
        return u;
      })
    );
    if (updatedUser) {
      upsertRecord(COLLECTIONS.USERS, updatedUser).catch((err) => notifyServerError('memperbarui hak akses proyek pengguna', err));
    }
  };

  const addUser = (userData: Omit<AppUser, 'id'>): AppUser => {
    const newId = `usr-${userData.role.substring(0, 3)}-${Date.now()}`;
    const newUser: AppUser = {
      ...userData,
      id: newId,
      assignedProjectIds: userData.assignedProjectIds || [],
      createdAt:
        userData.createdAt ||
        new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    };
    setUsers((prev) => [...prev, newUser]);
    upsertRecord(COLLECTIONS.USERS, newUser).catch((err) => notifyServerError('menambah pengguna', err));

    // If added user is a petugas, provision corresponding cleaner profile if not exists
    if (userData.role === 'petugas') {
      const existingCleaner = cleaners.find(
        (c) => c.name.toLowerCase() === userData.name.toLowerCase()
      );
      if (!existingCleaner) {
        const firstProjId =
          (userData.assignedProjectIds && userData.assignedProjectIds[0]) || safeActiveProjectId;
        const newCleanerId = `cln-${Date.now()}`;
        const newNik = `CLN-${new Date().getFullYear()}-${String(cleaners.length + 1).padStart(3, '0')}`;
        const firstShift = shifts[0];
        const newCleanerItem: Cleaner = {
          id: newCleanerId,
          projectId: firstProjId,
          nik: newNik,
          name: userData.name,
          phone: userData.phone || '',
          photoUrl: '',
          shiftId: firstShift?.id || '',
          shiftName: firstShift ? `${firstShift.name} (${firstShift.startTime} - ${firstShift.endTime})` : '-',
          assignedAreas: [],
          status: 'active',
          rating: 5,
          tasksCompletedToday: 0,
          totalTasksToday: 0,
          isClockedIn: false,
        };
        setCleaners((prev) => [...prev, newCleanerItem]);
        upsertRecord(COLLECTIONS.CLEANERS, newCleanerItem).catch((err) => notifyServerError('menambah petugas', err));
      }
    }

    return newUser;
  };

  const updateUser = (userId: string, updates: Partial<AppUser>) => {
    const target = users.find((u) => u.id === userId);
    if (
      target &&
      isSuperAdminRole(target.role) &&
      updates.role &&
      !isSuperAdminRole(updates.role)
    ) {
      const remainingSuperAdmins = users.filter(
        (u) => isSuperAdminRole(u.role) && u.id !== userId
      );
      if (remainingSuperAdmins.length === 0) {
        notifyServerError(
          'menurunkan peran Super Admin',
          new Error('Aplikasi menolak menurunkan Super Admin terakhir. Harus ada setidaknya satu Super Administrator aktif.')
        );
        return;
      }
    }

    const updatedUser = target ? { ...target, ...updates } : undefined;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
    if (updatedUser) {
      upsertRecord(COLLECTIONS.USERS, updatedUser).catch((err) => notifyServerError('memperbarui pengguna', err));
    }
  };

  const deleteUser = (userId: string): { success: boolean; message?: string } => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }
    if (isSuperAdminRole(target.role)) {
      const remainingSuperAdmins = users.filter(
        (u) => isSuperAdminRole(u.role) && u.id !== userId
      );
      if (remainingSuperAdmins.length === 0) {
        return {
          success: false,
          message: 'Aplikasi menolak menghapus Super Admin terakhir. Harus ada setidaknya satu Super Administrator aktif.',
        };
      }
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    deleteRecord(COLLECTIONS.USERS, userId).catch((err) => notifyServerError('menghapus pengguna', err));

    // If deleting current active user, fallback safely to an active super admin
    if (activeUserId === userId) {
      const fallback = users.find((u) => isSuperAdminRole(u.role) && u.id !== userId) || users.find((u) => u.id !== userId);
      if (fallback) {
        setActiveUserId(fallback.id);
        setUserRole(fallback.role);
      }
    }

    return { success: true, message: `Akun ${target.name} (${target.role}) berhasil dihapus.` };
  };

  // Checklist Master & Daily Methods
  const addChecklistLocation = (loc: Omit<ChecklistLocation, 'id'>) => {
    const id = `cloc-${Date.now()}`;
    const newLoc: ChecklistLocation = { ...loc, id, projectId: loc.projectId || safeActiveProjectId };
    setChecklistLocations((prev) => [...prev, newLoc]);
    upsertRecord(COLLECTIONS.CHECKLIST_LOCATIONS, newLoc).catch((err) => notifyServerError('menambah lokasi ceklis', err));
  };

  const updateChecklistLocation = (id: string, updates: Partial<ChecklistLocation>) => {
    let updatedLoc: ChecklistLocation | undefined;
    setChecklistLocations((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          updatedLoc = { ...l, ...updates };
          return updatedLoc;
        }
        return l;
      })
    );
    if (updatedLoc) {
      upsertRecord(COLLECTIONS.CHECKLIST_LOCATIONS, updatedLoc).catch((err) => notifyServerError('memperbarui lokasi ceklis', err));
    }
  };

  const deleteChecklistLocation = (id: string) => {
    setChecklistLocations((prev) => prev.filter((l) => l.id !== id));
    deleteRecord(COLLECTIONS.CHECKLIST_LOCATIONS, id).catch((err) => notifyServerError('menghapus lokasi ceklis', err));
  };

  const mapAreaTypeToChecklistCategory = (type: Area['type'], name: string): ChecklistLocationCategory => {
    const combined = `${name} ${type || ''}`.toLowerCase();
    if (type === 'toilet' || combined.includes('toilet') || combined.includes('wc') || combined.includes('urinoir') || combined.includes('kamar mandi') || combined.includes('kloset')) {
      return 'toilet';
    }
    if (type === 'corridor' || combined.includes('koridor') || combined.includes('hallway') || combined.includes('selasar') || combined.includes('tangga')) {
      return 'koridor';
    }
    if (type === 'pantry' || combined.includes('pantry') || combined.includes('dapur') || combined.includes('food court') || combined.includes('pujasera') || combined.includes('kantin')) {
      return 'pantry';
    }
    if (type === 'lift' || type === 'escalator' || combined.includes('lift') || combined.includes('eskalator') || combined.includes('elevator')) {
      return 'lift';
    }
    if (combined.includes('musholla') || combined.includes('masjid') || combined.includes('mushola') || combined.includes('tempat wudhu')) {
      return 'musholla';
    }
    return 'public_area';
  };

  const createChecklistFromArea = (area: Area): ChecklistLocation => {
    const targetProjectId = area.projectId || safeActiveProjectId;

    // Check if matching checklist location already exists
    const existing = checklistLocations.find(
      (l) =>
        (l.projectId || '') === targetProjectId &&
        (l.areaId === area.id ||
          l.name.trim().toLowerCase() === area.name.trim().toLowerCase() ||
          (l.code && area.code && l.code.trim().toUpperCase() === area.code.trim().toUpperCase()))
    );

    if (existing) {
      return existing;
    }

    const category = mapAreaTypeToChecklistCategory(area.type, area.name);
    const id = `cloc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newLoc: ChecklistLocation = {
      id,
      areaId: area.id,
      projectId: targetProjectId,
      name: area.name,
      floor: area.floor || 'Lantai 1',
      code: area.code || `CHK-${Math.floor(100 + Math.random() * 900)}`,
      category,
    };

    setChecklistLocations((prev) => [...prev, newLoc]);
    upsertRecord(COLLECTIONS.CHECKLIST_LOCATIONS, newLoc).catch((err) =>
      notifyServerError('menambah lokasi ceklis dari area kerja', err)
    );

    const today = new Date().toISOString().split('T')[0];
    ensureDailyChecklist(newLoc.projectId, newLoc.id, today);

    addAuditLog({
      action: 'create',
      module: 'ceklist',
      entityId: id,
      entityName: newLoc.name,
      details: `Integrasi Ceklist Area otomatis dari Lokasi Kerja "${area.name}" (${area.floor}) - Kategori: ${category}`,
    });

    return newLoc;
  };

  const createChecklistsFromAreas = (areasToCreate: Area[]): { createdCount: number; existingCount: number } => {
    let createdCount = 0;
    let existingCount = 0;
    const newLocs: ChecklistLocation[] = [];
    const today = new Date().toISOString().split('T')[0];
    const currentLocs = [...checklistLocations];

    for (const area of areasToCreate) {
      const targetProjectId = area.projectId || safeActiveProjectId;
      const alreadyExists = currentLocs.some(
        (l) =>
          (l.projectId || '') === targetProjectId &&
          (l.areaId === area.id ||
            l.name.trim().toLowerCase() === area.name.trim().toLowerCase() ||
            (l.code && area.code && l.code.trim().toUpperCase() === area.code.trim().toUpperCase()))
      );

      if (alreadyExists) {
        existingCount++;
      } else {
        const category = mapAreaTypeToChecklistCategory(area.type, area.name);
        const id = `cloc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}-${createdCount}`;
        const newLoc: ChecklistLocation = {
          id,
          areaId: area.id,
          projectId: targetProjectId,
          name: area.name,
          floor: area.floor || 'Lantai 1',
          code: area.code || `CHK-${Math.floor(100 + Math.random() * 900)}`,
          category,
        };
        currentLocs.push(newLoc);
        newLocs.push(newLoc);
        createdCount++;
      }
    }

    if (newLocs.length > 0) {
      setChecklistLocations((prev) => [...prev, ...newLocs]);
      newLocs.forEach((loc) => {
        upsertRecord(COLLECTIONS.CHECKLIST_LOCATIONS, loc).catch(() => {});
        ensureDailyChecklist(loc.projectId, loc.id, today);
      });
      addAuditLog({
        action: 'create',
        module: 'ceklist',
        details: `Batch integrasi ${newLocs.length} ceklist area dari Pemetaan Lokasi Kerja`,
      });
    }

    return { createdCount, existingCount };
  };

  const addChecklistTemplate = (tpl: Omit<ChecklistTemplateItem, 'id'>) => {
    const id = `tpl-custom-${Date.now()}`;
    const newTpl: ChecklistTemplateItem = { ...tpl, id };
    setChecklistTemplates((prev) => [...prev, newTpl]);
    upsertRecord(COLLECTIONS.CHECKLIST_TEMPLATES, newTpl).catch((err) => notifyServerError('menambah template SOP', err));
    addAuditLog({
      action: 'create',
      module: 'pengaturan',
      entityId: id,
      entityName: tpl.name,
      details: `Menambah SOP Checklist baru: "${tpl.name}" [Kategori: ${tpl.category}]`,
    });
  };

  const updateChecklistTemplate = (id: string, updates: Partial<ChecklistTemplateItem>) => {
    let updatedTpl: ChecklistTemplateItem | undefined;
    setChecklistTemplates((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          updatedTpl = { ...t, ...updates };
          return updatedTpl;
        }
        return t;
      })
    );
    if (updatedTpl) {
      upsertRecord(COLLECTIONS.CHECKLIST_TEMPLATES, updatedTpl).catch((err) => notifyServerError('memperbarui template SOP', err));
    }
    addAuditLog({
      action: 'update',
      module: 'pengaturan',
      entityId: id,
      entityName: updates.name || id,
      details: `Memperbarui SOP Checklist: ${updates.name || updates.sopInstruction || id}`,
    });
  };

  const deleteChecklistTemplate = (id: string) => {
    const target = checklistTemplates.find((t) => t.id === id);
    setChecklistTemplates((prev) => prev.filter((t) => t.id !== id));
    deleteRecord(COLLECTIONS.CHECKLIST_TEMPLATES, id).catch((err) => notifyServerError('menghapus template SOP', err));
    addAuditLog({
      action: 'delete',
      module: 'pengaturan',
      entityId: id,
      entityName: target?.name || id,
      details: `Menghapus item SOP Checklist: "${target?.name || id}"`,
    });
  };



  const toggleHourlySlotCell = (
    dailyChecklistId: string,
    hour: number,
    itemKeyOrId: string,
    forcedStatus?: HourlyCheckItemStatus
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    let affectedItemName = itemKeyOrId;
    let locationName = '';
    let updatedDailyToPersist: DailyAreaChecklist | null = null;
    let updatedItemsForSync: HourlyCheckItemEntry[] = [];

    setDailyChecklists((prev) => {
      const targetIndex = prev.findIndex((d) => d.id === dailyChecklistId);
      let targetDaily: DailyAreaChecklist;

      if (targetIndex === -1) {
        let pId = safeActiveProjectId;
        let locId = '';
        let dt = new Date().toISOString().split('T')[0];
        if (dailyChecklistId.startsWith('dchk-')) {
          const rest = dailyChecklistId.slice(5);
          const foundLoc = checklistLocations.find((l) => rest.includes(l.id));
          if (foundLoc) {
            locId = foundLoc.id;
            pId = foundLoc.projectId || safeActiveProjectId;
          }
          if (rest.length >= 10) {
            dt = rest.slice(-10);
          }
        }
        targetDaily = buildDailyChecklistObject(pId, locId, dt);
        targetDaily.id = dailyChecklistId;
      } else {
        targetDaily = prev[targetIndex];
      }

      locationName = targetDaily.locationName;
      const location = checklistLocations.find((l) => l.id === targetDaily.locationId);
      const category = targetDaily.category || location?.category || 'toilet';

      const baseSlots =
        targetDaily.hourlySlots && targetDaily.hourlySlots.length > 0
          ? targetDaily.hourlySlots
          : generate24HourSlots(category, checklistTemplates, 'empty');

      const updatedSlots = baseSlots.map((slot) => {
        if (slot.hour !== hour) return slot;

        // 1. Ensure all standard items exist for category without losing existing entries
        const currentItems = ensureCompleteSlotItems(slot.items || [], category, checklistTemplates);

        // 2. Deterministically find item by id, standard key, or name
        let itemTargetIndex = currentItems.findIndex(
          (it) => it.itemId === itemKeyOrId || it.itemId.toLowerCase() === itemKeyOrId.toLowerCase()
        );

        if (itemTargetIndex === -1) {
          const matched = findMatchingSlotItem(currentItems, itemKeyOrId);
          if (matched) {
            itemTargetIndex = currentItems.findIndex((it) => it.itemId === matched.itemId);
          }
        }

        let updatedItems: HourlyCheckItemEntry[];

        if (itemTargetIndex !== -1) {
          const targetItem = currentItems[itemTargetIndex];
          affectedItemName = targetItem.itemName;
          const nextStatus = forcedStatus !== undefined ? forcedStatus : getNextChecklistStatus(targetItem.status);
          updatedItems = currentItems.map((item, idx) =>
            idx === itemTargetIndex ? { ...item, status: nextStatus } : item
          );
        } else {
          // New custom item
          const nextStatus = forcedStatus !== undefined ? forcedStatus : 'clean';
          const newItem: HourlyCheckItemEntry = {
            itemId: itemKeyOrId.startsWith('tpl-') ? itemKeyOrId : `item-${itemKeyOrId}`,
            itemName: itemKeyOrId,
            status: nextStatus,
          };
          updatedItems = [...currentItems, newItem];
        }

        const hasIssue = updatedItems.some(
          (i) => i.status === 'issue' || i.status === 'dirty' || i.status === 'broken'
        );
        const allClean =
          updatedItems.length > 0 &&
          updatedItems.every((i) => i.status === 'clean' || i.status === 'available' || i.status === 'tersedia');
        const slotStatus: 'clean' | 'has_issue' | 'pending' = hasIssue ? 'has_issue' : allClean ? 'clean' : 'pending';

        return {
          ...slot,
          items: updatedItems,
          status: slotStatus,
          checkedAt: slot.checkedAt || nowStr,
          checkedBy:
            slot.checkedBy ||
            (currentUser?.name?.split(' ')[0]
              ? `${currentUser.name.split(' ')[0]} (Petugas)`
              : 'Petugas'),
        };
      });

      const updatedTargetSlot = updatedSlots.find((s) => s.hour === hour);
      if (updatedTargetSlot) {
        updatedItemsForSync = updatedTargetSlot.items;
      }

      const updatedDaily: DailyAreaChecklist = { ...targetDaily, hourlySlots: updatedSlots };
      updatedDailyToPersist = updatedDaily;

      if (targetIndex === -1) {
        return [...prev, updatedDaily];
      } else {
        const nextList = [...prev];
        nextList[targetIndex] = updatedDaily;
        return nextList;
      }
    });

    if (updatedDailyToPersist) {
      checklistSnapshotRef.current.set(dailyChecklistId, JSON.stringify(updatedDailyToPersist));
      dirtyChecklistIdsRef.current.delete(dailyChecklistId);
      upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, updatedDailyToPersist).catch((err) => {
        console.warn('Failed to upsert daily checklist directly:', err);
      });
    }

    // Save to Dexie outbox with real updated answers
    saveChecklistToOutbox({
      type: 'hourly_slot_update',
      projectId: safeActiveProjectId,
      checklistId: dailyChecklistId,
      locationName,
      slotHour: hour,
      answers: updatedItemsForSync,
      captured_at: new Date().toISOString(),
    }).catch(() => {});

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncService.triggerSync().catch(() => {});
    }

    // If offline, save in offline queue for auto-sync when connection returns
    if (!isOnline) {
      addOfflineQueueEntry({
        type: 'checklist_item_update',
        title: `Ceklist Jam ${hour}:00 - ${affectedItemName}`,
        description: `Tersimpan di perangkat lokal (offline) di ${locationName || 'Area'}`,
        locationName,
        cleanerName: currentUser?.name || 'Petugas',
      });
    }
  };

  const updateHourlySlotItem = (
    dailyChecklistId: string,
    hour: number,
    itemId: string,
    status: HourlyCheckItemStatus,
    notes?: string
  ) => {
    toggleHourlySlotCell(dailyChecklistId, hour, itemId, status);
  };

  const batchUpdateHourStatus = (
    dailyChecklistId: string,
    hour: number,
    status: HourlyCheckItemStatus,
    checkedBy: string
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    let locationName = '';
    let updatedDailyToPersist: DailyAreaChecklist | null = null;
    let updatedItemsForSync: HourlyCheckItemEntry[] = [];

    setDailyChecklists((prev) => {
      const targetIndex = prev.findIndex((d) => d.id === dailyChecklistId);
      let targetDaily: DailyAreaChecklist;

      if (targetIndex === -1) {
        let pId = safeActiveProjectId;
        let locId = '';
        let dt = new Date().toISOString().split('T')[0];
        if (dailyChecklistId.startsWith('dchk-')) {
          const rest = dailyChecklistId.slice(5);
          const foundLoc = checklistLocations.find((l) => rest.includes(l.id));
          if (foundLoc) {
            locId = foundLoc.id;
            pId = foundLoc.projectId || safeActiveProjectId;
          }
          if (rest.length >= 10) {
            dt = rest.slice(-10);
          }
        }
        targetDaily = buildDailyChecklistObject(pId, locId, dt);
        targetDaily.id = dailyChecklistId;
      } else {
        targetDaily = prev[targetIndex];
      }

      locationName = targetDaily.locationName;
      const location = checklistLocations.find((l) => l.id === targetDaily.locationId);
      const category = targetDaily.category || location?.category || 'toilet';

      const baseSlots =
        targetDaily.hourlySlots && targetDaily.hourlySlots.length > 0
          ? targetDaily.hourlySlots
          : generate24HourSlots(category, checklistTemplates, 'empty');

      const updatedSlots = baseSlots.map((slot) => {
        if (slot.hour !== hour) return slot;
        const currentItems = ensureCompleteSlotItems(slot.items || [], category, checklistTemplates);
        const updatedItems = currentItems.map((item) => ({ ...item, status }));
        const slotStatus: 'clean' | 'has_issue' | 'pending' =
          status === 'clean' || status === 'available' || status === 'tersedia'
            ? 'clean'
            : status === 'issue' || status === 'dirty' || status === 'broken'
            ? 'has_issue'
            : 'pending';
        return {
          ...slot,
          items: updatedItems,
          status: slotStatus,
          checkedBy,
          checkedAt: nowStr,
        };
      });

      const updatedTargetSlot = updatedSlots.find((s) => s.hour === hour);
      if (updatedTargetSlot) {
        updatedItemsForSync = updatedTargetSlot.items;
      }

      const updatedDaily: DailyAreaChecklist = { ...targetDaily, hourlySlots: updatedSlots };
      updatedDailyToPersist = updatedDaily;

      if (targetIndex === -1) {
        return [...prev, updatedDaily];
      } else {
        const nextList = [...prev];
        nextList[targetIndex] = updatedDaily;
        return nextList;
      }
    });

    if (updatedDailyToPersist) {
      checklistSnapshotRef.current.set(dailyChecklistId, JSON.stringify(updatedDailyToPersist));
      dirtyChecklistIdsRef.current.delete(dailyChecklistId);
      upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, updatedDailyToPersist).catch((err) => {
        console.warn('Failed to direct upsert daily checklist:', err);
      });
    }

    // Save batch update to Dexie outbox with actual updated items
    saveChecklistToOutbox({
      type: 'hourly_slot_batch',
      projectId: safeActiveProjectId,
      checklistId: dailyChecklistId,
      locationName,
      slotHour: hour,
      answers: updatedItemsForSync,
      captured_at: new Date().toISOString(),
    }).catch(() => {});

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncService.triggerSync().catch(() => {});
    }

    if (!isOnline) {
      addOfflineQueueEntry({
        type: 'checklist_batch_hour',
        title: `Ceklist Jam ${hour}:00 (${status === 'clean' ? 'Bersih' : 'Temuan'})`,
        description: `Semua item jam ${hour}:00 diperbarui secara offline`,
        locationName,
        cleanerName: checkedBy,
      });
    }
  };

  const updateSlotInspector = (
    dailyChecklistId: string,
    hour: number,
    checkedBy: string,
    supervisorVerified?: boolean
  ) => {
    let updatedDailyToPersist: DailyAreaChecklist | null = null;
    setDailyChecklists((prev) => {
      const targetIndex = prev.findIndex((d) => d.id === dailyChecklistId);
      if (targetIndex === -1) return prev;
      const targetDaily = prev[targetIndex];
      const updatedSlots = targetDaily.hourlySlots.map((slot) => {
        if (slot.hour !== hour) return slot;
        return {
          ...slot,
          checkedBy,
          ...(supervisorVerified !== undefined ? { supervisorVerified } : {}),
        };
      });
      const updatedDaily = { ...targetDaily, hourlySlots: updatedSlots };
      updatedDailyToPersist = updatedDaily;
      const nextList = [...prev];
      nextList[targetIndex] = updatedDaily;
      return nextList;
    });

    if (updatedDailyToPersist) {
      checklistSnapshotRef.current.set(dailyChecklistId, JSON.stringify(updatedDailyToPersist));
      dirtyChecklistIdsRef.current.delete(dailyChecklistId);
      upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, updatedDailyToPersist).catch(() => {});
    }
  };

  const fillDailyChecklistClean = (
    dailyChecklistId: string,
    startHourOrHours: number | number[],
    endHourOrCheckedBy?: number | string,
    checkedByArg?: string
  ) => {
    let targetHours: number[] = [];
    let checkedBy = currentUser?.name || 'Petugas';

    if (Array.isArray(startHourOrHours)) {
      targetHours = startHourOrHours;
      if (typeof endHourOrCheckedBy === 'string') {
        checkedBy = endHourOrCheckedBy;
      } else if (checkedByArg) {
        checkedBy = checkedByArg;
      }
    } else {
      const startH = startHourOrHours;
      const endH = typeof endHourOrCheckedBy === 'number' ? endHourOrCheckedBy : 24;
      if (checkedByArg) checkedBy = checkedByArg;
      for (let h = startH; h <= endH; h++) {
        targetHours.push(h);
      }
    }

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    let locationName = '';
    let updatedDailyToPersist: DailyAreaChecklist | null = null;

    setDailyChecklists((prev) => {
      const targetIndex = prev.findIndex((d) => d.id === dailyChecklistId);
      let targetDaily: DailyAreaChecklist;

      if (targetIndex === -1) {
        let pId = safeActiveProjectId;
        let locId = '';
        let dt = new Date().toISOString().split('T')[0];
        if (dailyChecklistId.startsWith('dchk-')) {
          const rest = dailyChecklistId.slice(5);
          const foundLoc = checklistLocations.find((l) => rest.includes(l.id));
          if (foundLoc) {
            locId = foundLoc.id;
            pId = foundLoc.projectId || safeActiveProjectId;
          }
          if (rest.length >= 10) {
            dt = rest.slice(-10);
          }
        }
        targetDaily = buildDailyChecklistObject(pId, locId, dt);
        targetDaily.id = dailyChecklistId;
      } else {
        targetDaily = prev[targetIndex];
      }

      locationName = targetDaily.locationName;
      const location = checklistLocations.find((l) => l.id === targetDaily.locationId);
      const category = targetDaily.category || location?.category || 'toilet';

      const baseSlots =
        targetDaily.hourlySlots && targetDaily.hourlySlots.length > 0
          ? targetDaily.hourlySlots
          : generate24HourSlots(category, checklistTemplates, 'empty');

      const updatedSlots = baseSlots.map((slot) => {
        if (!targetHours.includes(slot.hour)) return slot;
        const currentItems = ensureCompleteSlotItems(slot.items || [], category, checklistTemplates);
        const updatedItems = currentItems.map((it) => ({
          ...it,
          status: 'clean' as HourlyCheckItemStatus,
        }));
        return {
          ...slot,
          status: 'clean' as const,
          checkedBy,
          checkedAt: nowStr,
          supervisorVerified: true,
          supervisorName: checkedBy,
          items: updatedItems,
        };
      });

      const updatedDaily: DailyAreaChecklist = { ...targetDaily, hourlySlots: updatedSlots };
      updatedDailyToPersist = updatedDaily;

      if (targetIndex === -1) {
        return [...prev, updatedDaily];
      } else {
        const nextList = [...prev];
        nextList[targetIndex] = updatedDaily;
        return nextList;
      }
    });

    if (updatedDailyToPersist) {
      checklistSnapshotRef.current.set(dailyChecklistId, JSON.stringify(updatedDailyToPersist));
      dirtyChecklistIdsRef.current.delete(dailyChecklistId);
      upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, updatedDailyToPersist).catch(() => {});
    }

    if (!isOnline) {
      addOfflineQueueEntry({
        type: 'checklist_quick_fill',
        title: `Isi Cepat Bersih (${targetHours.length} Jam Shift)`,
        description: `Pengisian serentak status bersih secara offline di ${locationName || 'Area'}`,
        locationName,
        cleanerName: checkedBy,
      });
    }
  };

  const addManualItemToDailyChecklist = (dailyChecklistId: string, itemName: string) => {
    const newItemId = `item-man-${Date.now()}`;
    let updatedDailyToPersist: DailyAreaChecklist | null = null;
    setDailyChecklists((prev) => {
      const targetIndex = prev.findIndex((d) => d.id === dailyChecklistId);
      if (targetIndex === -1) return prev;
      const targetDaily = prev[targetIndex];
      const updatedSlots = targetDaily.hourlySlots.map((slot) => ({
        ...slot,
        items: [...slot.items, { itemId: newItemId, itemName, status: 'not_checked' as HourlyCheckItemStatus }],
      }));
      const updatedDaily = { ...targetDaily, hourlySlots: updatedSlots };
      updatedDailyToPersist = updatedDaily;
      const nextList = [...prev];
      nextList[targetIndex] = updatedDaily;
      return nextList;
    });

    if (updatedDailyToPersist) {
      checklistSnapshotRef.current.set(dailyChecklistId, JSON.stringify(updatedDailyToPersist));
      dirtyChecklistIdsRef.current.delete(dailyChecklistId);
      upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, updatedDailyToPersist).catch(() => {});
    }
  };

  const buildDailyChecklistObject = (projectId: string, locationId: string, date: string): DailyAreaChecklist => {
    const location = checklistLocations.find((l) => l.id === locationId);
    const category = location?.category || 'toilet';
    return {
      id: `dchk-${projectId}-${locationId}-${date}`,
      projectId,
      locationId,
      locationName: location?.name || 'Area',
      category,
      date,
      hourlySlots: generate24HourSlots(category, checklistTemplates, 'empty').map((slot) => ({
        ...slot,
        items: ensureCompleteSlotItems(slot.items, category, checklistTemplates),
      })),
    };
  };

  const ensureDailyChecklist = (projectId: string, locationId: string, date: string) => {
    let created: DailyAreaChecklist | null = null;
    setDailyChecklists((prev) => {
      const existing = prev.find(
        (d) => d.projectId === projectId && d.locationId === locationId && d.date === date
      );
      if (existing) return prev;
      const newDaily = buildDailyChecklistObject(projectId, locationId, date);
      created = newDaily;
      return [...prev, newDaily];
    });

    if (created) {
      const toSave = created as DailyAreaChecklist;
      checklistSnapshotRef.current.set(toSave.id, JSON.stringify(toSave));
      dirtyChecklistIdsRef.current.delete(toSave.id);
      upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, toSave).catch(() => {});
    }
  };

  const getOrCreateDailyChecklist = (projectId: string, locationId: string, date: string): DailyAreaChecklist => {
    const existing = dailyChecklists.find(
      (d) => d.projectId === projectId && d.locationId === locationId && d.date === date
    );
    if (existing) return existing;
    return buildDailyChecklistObject(projectId, locationId, date);
  };

  // Filter operational data by the active project location (strictly isolate locations)
  const filteredAreas = areas.filter((a) => (a.projectId || defaultProjectId) === safeActiveProjectId);
  const filteredCleaners = cleaners.filter((c) => (c.projectId || defaultProjectId) === safeActiveProjectId);
  const filteredSchedules = schedules.filter((s) => (s.projectId || defaultProjectId) === safeActiveProjectId);
  const filteredUploadedWorkSchedules = uploadedWorkSchedules.filter(
    (s) => (s.projectId || defaultProjectId) === safeActiveProjectId
  );
  const filteredUploadedMcpPrograms = uploadedMcpPrograms.filter(
    (m) => (m.projectId || defaultProjectId) === safeActiveProjectId
  );
  const filteredMcpChecklistResults = mcpChecklistResults.filter(
    (r) => (r.projectId || defaultProjectId) === safeActiveProjectId
  );
  const filteredTasks = tasks.filter((t) => (t.projectId || defaultProjectId) === safeActiveProjectId);
  const filteredInspections = inspections.filter((i) => (i.projectId || defaultProjectId) === safeActiveProjectId);
  const filteredComplaints = complaints.filter((c) => (c.projectId || defaultProjectId) === safeActiveProjectId);
  const filteredChecklistLocations = checklistLocations.filter(
    (cl) => (cl.projectId || defaultProjectId) === safeActiveProjectId
  );
  const filteredDailyChecklists = dailyChecklists.filter(
    (d) => (d.projectId || defaultProjectId) === safeActiveProjectId
  );
  const filteredMasterPrograms = masterPrograms.filter(
    (m) => (m.projectId || defaultProjectId) === safeActiveProjectId
  );
  const filteredDamageReports = damageReports.filter(
    (r) => (r.projectId || defaultProjectId) === safeActiveProjectId
  );

  // Klien Mode Filtered Data by Active Project
  const filteredTurnovers = employeeTurnovers.filter(
    (to) => (to.projectId || defaultProjectId) === safeActiveProjectId
  );
  const filteredKlienChecklistItems = klienChecklistItems.filter(
    (item) => (item.projectId || defaultProjectId) === safeActiveProjectId
  );
  const filteredKlienChecklistInspections = klienChecklistInspections.filter(
    (insp) => (insp.projectId || defaultProjectId) === safeActiveProjectId
  );
  const filteredSpecialJobs = specialJobs.filter(
    (job) => (job.projectId || defaultProjectId) === safeActiveProjectId
  );

  const addSpecialJob = (job: Omit<SpecialJobItem, 'id' | 'ticketNo' | 'createdAt'>): SpecialJobItem => {
    const now = new Date();
    const ticketNo = `SPJ-${now.getFullYear()}-${String(specialJobs.length + 1).padStart(3, '0')}`;
    const newJob: SpecialJobItem = {
      ...job,
      id: `spj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticketNo,
      projectId: job.projectId || safeActiveProjectId,
      createdAt: now.toISOString(),
    };
    setSpecialJobs((prev) => [newJob, ...prev]);
    upsertRecord(COLLECTIONS.SPECIAL_JOBS, newJob);

    const nowStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const sourceLabel =
      job.sourceType === 'weekly_activity'
        ? 'Weekly Activity'
        : job.sourceType === 'monthly_activity'
        ? 'Monthly Activity'
        : 'By Request Supervisor';
    const notif: AppNotification = {
      id: `notif-spj-${Date.now()}`,
      title: `✨ Special Job Baru (${sourceLabel}): ${ticketNo}`,
      message: `${job.requestedBy} menugaskan Special Job "${job.title}" di ${job.location} kepada ${job.assignedPicName}.`,
      timestamp: nowStr,
      type: job.priority === 'urgent' ? 'urgent' : 'info',
      targetRole: ['super_admin', 'admin', 'supervisor', 'petugas', 'klien'],
      read: false,
      projectId: job.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});

    return newJob;
  };

  const updateSpecialJob = (id: string, updates: Partial<SpecialJobItem>) => {
    const existing = specialJobs.find((j) => j.id === id);
    const updated = existing ? { ...existing, ...updates } : undefined;
    setSpecialJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...updates } : j))
    );
    if (updated) {
      upsertRecord(COLLECTIONS.SPECIAL_JOBS, updated).catch((err) =>
        notifyServerError('memperbarui special job', err)
      );
    }
  };

  const deleteSpecialJob = (id: string) => {
    setSpecialJobs((prev) => prev.filter((j) => j.id !== id));
    deleteRecord(COLLECTIONS.SPECIAL_JOBS, id).catch((err) =>
      notifyServerError('menghapus special job', err)
    );
  };

  const addEmployeeTurnover = (record: Omit<EmployeeTurnoverRecord, 'id' | 'createdAt'>) => {
    const newRecord: EmployeeTurnoverRecord = {
      ...record,
      id: `to-${Date.now()}`,
      projectId: record.projectId || safeActiveProjectId,
      createdAt: new Date().toISOString(),
    };
    setEmployeeTurnovers((prev) => [newRecord, ...prev]);
    upsertRecord(COLLECTIONS.EMPLOYEE_TURNOVERS, newRecord).catch((err) => notifyServerError('menambah pergantian karyawan', err));
  };

  const deleteEmployeeTurnover = (id: string) => {
    setEmployeeTurnovers((prev) => prev.filter((r) => r.id !== id));
    deleteRecord(COLLECTIONS.EMPLOYEE_TURNOVERS, id).catch((err) => notifyServerError('menghapus pergantian karyawan', err));
  };

  const addKlienChecklistItem = (item: Omit<KlienChecklistItem, 'id'>) => {
    const newItem: KlienChecklistItem = {
      ...item,
      id: `kci-${Date.now()}`,
      projectId: item.projectId || safeActiveProjectId,
    };
    setKlienChecklistItems((prev) => [...prev, newItem]);
    upsertRecord(COLLECTIONS.KLIEN_CHECKLIST_ITEMS, newItem).catch((err) => notifyServerError('menambah item checklist klien', err));
  };

  const updateKlienChecklistItem = (id: string, updates: Partial<KlienChecklistItem>) => {
    let updatedItem: KlienChecklistItem | undefined;
    setKlienChecklistItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedItem = { ...item, ...updates };
          return updatedItem;
        }
        return item;
      })
    );
    if (updatedItem) {
      upsertRecord(COLLECTIONS.KLIEN_CHECKLIST_ITEMS, updatedItem).catch((err) => notifyServerError('memperbarui item checklist klien', err));
    }
  };

  const deleteKlienChecklistItem = (id: string) => {
    setKlienChecklistItems((prev) => prev.filter((item) => item.id !== id));
    deleteRecord(COLLECTIONS.KLIEN_CHECKLIST_ITEMS, id).catch((err) => notifyServerError('menghapus item checklist klien', err));
  };

  const resetKlienChecklistItems = () => {
    if (!safeActiveProjectId) return;
    const defaults: KlienChecklistItem[] = DEFAULT_KLIEN_CHECKLIST_TEMPLATES.map((item) => ({
      ...item,
      id: `${item.id}-${safeActiveProjectId}`,
      projectId: safeActiveProjectId,
    }));
    const oldItems = klienChecklistItems.filter((item) => (item.projectId || '') === safeActiveProjectId);
    setKlienChecklistItems((prev) => [
      ...prev.filter((item) => (item.projectId || '') !== safeActiveProjectId),
      ...defaults,
    ]);
    oldItems.forEach((item) => {
      deleteRecord(COLLECTIONS.KLIEN_CHECKLIST_ITEMS, item.id).catch(() => {});
    });
    defaults.forEach((item) => {
      upsertRecord(COLLECTIONS.KLIEN_CHECKLIST_ITEMS, item).catch(() => {});
    });
  };

  const submitKlienChecklistInspection = (
    insp: Omit<KlienChecklistInspection, 'id' | 'timestamp'>
  ) => {
    const newInsp: KlienChecklistInspection = {
      ...insp,
      id: `kci-insp-${Date.now()}`,
      projectId: insp.projectId || safeActiveProjectId,
      timestamp: new Date().toISOString(),
    };
    setKlienChecklistInspections((prev) => [newInsp, ...prev]);
    upsertRecord(COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS, newInsp).catch((err) => notifyServerError('menyimpan inspeksi klien', err));
  };

  const deleteKlienChecklistInspection = (id: string) => {
    setKlienChecklistInspections((prev) => prev.filter((i) => i.id !== id));
    deleteRecord(COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS, id).catch((err) => notifyServerError('menghapus inspeksi klien', err));
  };

  // Global areas/tasks filtered by user's company and assigned projects for non-admin
  const accessibleAllAreas = useMemo(() => {
    const companyAreas = isSuper
      ? areas
      : areas.filter((a) => (a.companyId || a.company_id || 'comp-main') === userCompanyId);
    if (isAdminOrSuper) return companyAreas;
    const userProjs = currentUser?.assignedProjectIds;
    if (Array.isArray(userProjs) && userProjs.length > 0) {
      return companyAreas.filter((a) => userProjs.includes(a.projectId || defaultProjectId));
    }
    return companyAreas;
  }, [isSuper, isAdminOrSuper, areas, userCompanyId, currentUser?.assignedProjectIds, defaultProjectId]);

  const accessibleAllTasks = useMemo(() => {
    const companyTasks = isSuper
      ? tasks
      : tasks.filter((t) => (t.companyId || t.company_id || 'comp-main') === userCompanyId);
    if (isAdminOrSuper) return companyTasks;
    const userProjs = currentUser?.assignedProjectIds;
    if (Array.isArray(userProjs) && userProjs.length > 0) {
      return companyTasks.filter((t) => userProjs.includes(t.projectId || defaultProjectId));
    }
    return companyTasks;
  }, [isSuper, isAdminOrSuper, tasks, userCompanyId, currentUser?.assignedProjectIds, defaultProjectId]);

  const addMasterProgram = (item: Omit<MasterCleaningProgramItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: MasterCleaningProgramItem = {
      ...item,
      id: `mcp-${Date.now()}`,
      projectId: item.projectId || safeActiveProjectId,
      frequency: normalizeFrequencyCode(item.frequency),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMasterPrograms((prev) => [newItem, ...prev]);
    upsertRecord(COLLECTIONS.MASTER_PROGRAMS, newItem);
  };

  const updateMasterProgram = (
    idOrItem: string | MasterCleaningProgramItem,
    updates?: Partial<MasterCleaningProgramItem>
  ) => {
    const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
    const itemUpdates = typeof idOrItem === 'string' ? (updates || {}) : idOrItem;
    setMasterPrograms((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = {
          ...m,
          ...itemUpdates,
          ...(itemUpdates.frequency ? { frequency: normalizeFrequencyCode(itemUpdates.frequency) } : {}),
          updatedAt: new Date().toISOString(),
        };
        upsertRecord(COLLECTIONS.MASTER_PROGRAMS, updated);
        return updated;
      })
    );
  };

  const deleteMasterProgram = (id: string) => {
    setMasterPrograms((prev) => prev.filter((m) => m.id !== id));
    deleteRecord(COLLECTIONS.MASTER_PROGRAMS, id);
  };

  const toggleMasterProgramDay = (programId: string, day: number, forcedStatus?: ProgramDayStatus) => {
    setMasterPrograms((prev) =>
      prev.map((m) => {
        if (m.id !== programId) return m;
        const currentStatus = m.days[day] || 'none';
        const nextStatus: ProgramDayStatus =
          forcedStatus !== undefined
            ? forcedStatus
            : getNextProgramDayStatus(currentStatus);
        const updated = {
          ...m,
          days: {
            ...m.days,
            [day]: nextStatus,
          },
          updatedAt: new Date().toISOString(),
        };
        upsertRecord(COLLECTIONS.MASTER_PROGRAMS, updated);
        return updated;
      })
    );
  };

  const batchSetMasterProgramDays = (programId: string, days: number[], status: ProgramDayStatus) => {
    setMasterPrograms((prev) =>
      prev.map((m) => {
        if (m.id !== programId) return m;
        const newDays = { ...m.days };
        days.forEach((d) => {
          newDays[d] = status;
        });
        const updated = {
          ...m,
          days: newDays,
          updatedAt: new Date().toISOString(),
        };
        upsertRecord(COLLECTIONS.MASTER_PROGRAMS, updated);
        return updated;
      })
    );
  };

  const duplicateMasterProgram = (id: string) => {
    const existing = masterPrograms.find((m) => m.id === id);
    if (!existing) return;
    const duplicated: MasterCleaningProgramItem = {
      ...existing,
      id: `mcp-${Date.now()}`,
      workDescription: `${existing.workDescription} (Salinan)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMasterPrograms((prev) => [duplicated, ...prev]);
    upsertRecord(COLLECTIONS.MASTER_PROGRAMS, duplicated);
  };

  const activeCleaner = filteredCleaners.find((c) => c.id === activeCleanerId) || filteredCleaners[0] || cleaners[0];

  const toggleTaskChecklist = (taskId: string, checklistId: string) => {
    let updatedTask: CleaningTask | undefined;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        updatedTask = {
          ...task,
          checklistArea: task.checklistArea.map((item) =>
            item.id === checklistId ? { ...item, checked: !item.checked } : item
          ),
        };
        return updatedTask;
      })
    );
    if (updatedTask) {
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('memperbarui ceklis tugas', err));
    }
  };

  const updateTaskMeta = (
    taskId: string,
    updates: Partial<
      Pick<
        CleaningTask,
        | 'shift'
        | 'areaId'
        | 'areaName'
        | 'buildingFloor'
        | 'taskDate'
        | 'monthPeriod'
        | 'cleanerId'
        | 'cleanerName'
        | 'scheduledTime'
        | 'deadlineTime'
      >
    >
  ) => {
    let updatedTask: CleaningTask | undefined;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        updatedTask = {
          ...task,
          ...updates,
        };
        return updatedTask;
      })
    );
    if (updatedTask) {
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('memperbarui jadwal/petugas tugas', err));
    }
  };

  const addTaskChecklistItem = (taskId: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    let updatedTask: CleaningTask | undefined;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const newItem: TaskChecklistItem = {
          id: `chk-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          label: trimmed,
          checked: false,
        };
        updatedTask = {
          ...task,
          checklistArea: [...task.checklistArea, newItem],
        };
        return updatedTask;
      })
    );
    if (updatedTask) {
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('menambah item ceklis tugas', err));
    }
  };

  const addCleaningTask = (payload: Omit<CleaningTask, 'id'>) => {
    const newId = `task-${Date.now().toString().slice(-4)}`;
    const newTask: CleaningTask = {
      ...payload,
      id: newId,
      projectId: payload.projectId || safeActiveProjectId,
    };
    setTasks((prev) => [newTask, ...prev]);
    upsertRecord(COLLECTIONS.TASKS, newTask).catch((err) => notifyServerError('menambah tugas cleaning', err));
  };

  const updateTaskSupply = (taskId: string, supplyId: string, amount: number) => {
    // No-op (Inventory removed)
  };

  const updateTaskRemark = (taskId: string, remarks: string) => {
    let updatedTask: CleaningTask | undefined;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          updatedTask = { ...t, remarks };
          return updatedTask;
        }
        return t;
      })
    );
    if (updatedTask) {
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('memperbarui catatan tugas', err));
    }
  };

  const updateTaskPhotos = (taskId: string, before?: string, progress?: string, after?: string) => {
    let updatedTask: CleaningTask | undefined;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        updatedTask = {
          ...t,
          ...(before !== undefined ? { photoBefore: before } : {}),
          ...(progress !== undefined ? { photoProgress: progress } : {}),
          ...(after !== undefined ? { photoAfter: after } : {}),
        };
        return updatedTask;
      })
    );
    if (updatedTask) {
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('memperbarui foto tugas', err));
    }
  };

    const currentMonthPeriod = new Date().toISOString().slice(0, 7);

  const exportTaskToMonthlyReport = (taskId: string, targetMonth?: string) => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const month = targetMonth || task.monthPeriod || currentMonthPeriod;
    const existingInMonth = tasks.filter(
      (t) => (t.monthPeriod === month || (!t.monthPeriod && month === currentMonthPeriod)) && t.exportedToMonthlyReport
    );
    const nextOrder = existingInMonth.length + 1;
    const updatedTask: CleaningTask = {
      ...task,
      exportedToMonthlyReport: true,
      monthPeriod: month,
      monthlyOrderNo: task.monthlyOrderNo || nextOrder,
      monthlyReportExportDate: todayStr,
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('ekspor tugas ke laporan bulanan', err));
  };

  const removeTaskFromMonthlyReport = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    const month = target?.monthPeriod || currentMonthPeriod;

    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            exportedToMonthlyReport: false,
            monthlyOrderNo: undefined,
          }
        : t
    );

    let counter = 1;
    const result = updated.map((t) => {
      if (t.monthPeriod === month && t.exportedToMonthlyReport) {
        const item = { ...t, monthlyOrderNo: counter };
        counter++;
        return item;
      }
      return t;
    });
    const affectedTasks = result.filter((t) => t.id === taskId || (t.monthPeriod === month && t.exportedToMonthlyReport));

    setTasks(result);
    for (const t of affectedTasks) {
      upsertRecord(COLLECTIONS.TASKS, t).catch(() => {});
    }
  };

  const bulkExportToMonthlyReport = (taskIds: string[], targetMonth?: string) => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const month = targetMonth || currentMonthPeriod;
    let currentMaxOrder = tasks
      .filter((t) => t.monthPeriod === month && t.exportedToMonthlyReport)
      .reduce((max, t) => Math.max(max, t.monthlyOrderNo || 0), 0);

    const affectedTasks: CleaningTask[] = [];
    const nextTasks = tasks.map((t) => {
      if (taskIds.includes(t.id) && !t.exportedToMonthlyReport) {
        currentMaxOrder++;
        const updated = {
          ...t,
          exportedToMonthlyReport: true,
          monthPeriod: month,
          monthlyOrderNo: currentMaxOrder,
          monthlyReportExportDate: todayStr,
        };
        affectedTasks.push(updated);
        return updated;
      }
      return t;
    });

    setTasks(nextTasks);
    for (const t of affectedTasks) {
      upsertRecord(COLLECTIONS.TASKS, t).catch(() => {});
    }
  };

  const updateTaskWorkDescription = (taskId: string, description: string) => {
    const existing = tasks.find((t) => t.id === taskId);
    const updatedTask = existing ? { ...existing, workDescription: description } : undefined;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, workDescription: description } : t))
    );
    if (updatedTask) {
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('memperbarui deskripsi tugas', err));
    }
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const existing = tasks.find((t) => t.id === taskId);
    const updatedTask: CleaningTask | undefined = existing
      ? {
          ...existing,
          status,
          ...(status === 'in_progress' && !existing.startTime ? { startTime: nowStr } : {}),
          ...(status === 'completed' ? { completedTime: nowStr } : {}),
        }
      : undefined;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              ...(status === 'in_progress' && !t.startTime ? { startTime: nowStr } : {}),
              ...(status === 'completed' ? { completedTime: nowStr } : {}),
            }
          : t
      )
    );
    if (updatedTask) {
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('memperbarui status tugas', err));
    }
  };

  const submitTaskCompletion = (
    taskId: string,
    payload: {
      checklistArea: TaskChecklistItem[];
      suppliesUsed?: SupplyUsage[];
      remarks: string;
      photoBefore: string;
      photoProgress?: string;
      photoAfter: string;
    }
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const currentTask = tasks.find((t) => t.id === taskId);
    if (currentTask) {
      const updatedTask: CleaningTask = {
        ...currentTask,
        status: 'pending_qc',
        completedTime: nowStr,
        checklistArea: payload.checklistArea,
        suppliesUsed: [],
        remarks: payload.remarks,
        photoBefore: payload.photoBefore,
        photoProgress: payload.photoProgress || currentTask.photoProgress,
        photoAfter: payload.photoAfter,
      };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('menyimpan penyelesaian tugas', err));

      setAreas((prev) =>
        prev.map((a) =>
          a.id === currentTask.areaId
            ? { ...a, status: 'in_progress', lastCleaned: `Hari ini, ${nowStr}` }
            : a
        )
      );

      setCleaners((prev) =>
        prev.map((c) =>
          c.id === currentTask.cleanerId
            ? { ...c, tasksCompletedToday: c.tasksCompletedToday + 1 }
            : c
        )
      );

      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: '📋 Tugas Baru Menunggu QC',
        message: `${currentTask.cleanerName} telah menyelesaikan tugas di ${currentTask.areaName}. Menunggu verifikasi inspeksi.`,
        timestamp: nowStr,
        type: 'info',
        targetRole: ['supervisor', 'super_admin', 'admin'],
        read: false,
        taskId: currentTask.id,
        projectId: currentTask.projectId || safeActiveProjectId,
      };
      setNotifications((prev) => [newNotif, ...prev]);
      upsertRecord(COLLECTIONS.NOTIFICATIONS, newNotif).catch(() => {});

      const updatedArea = areas.find((a) => a.id === currentTask.areaId);
      if (updatedArea) {
        upsertRecord(COLLECTIONS.AREAS, { ...updatedArea, status: 'in_progress', lastCleaned: `Hari ini, ${nowStr}` }).catch(() => {});
      }
      const currentCleaner = cleaners.find((c) => c.id === currentTask.cleanerId);
      if (currentCleaner) {
        upsertRecord(COLLECTIONS.CLEANERS, { ...currentCleaner, tasksCompletedToday: currentCleaner.tasksCompletedToday + 1 }).catch(() => {});
      }
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  const submitQCInspection = (payload: {
    taskId: string;
    areaName?: string;
    cleanerName?: string;
    score: number;
    status: 'passed' | 'failed' | 'needs_rework';
    criteriaScores?: {
      floor: number;
      glassAndMirrors: number;
      odorAndAir: number;
      wasteManagement: number;
      suppliesCompleteness: number;
    };
    auditParameters?: QCInspection['auditParameters'];
    notes: string;
    recommendations?: string[];
    photoProof?: string;
    photoBefore?: string;
    photoProgress?: string;
    photoAfter?: string;
    inspectionSource?: 'weekly' | 'monthly' | 'special_job' | 'complaint' | 'task' | 'other';
    evaluatedInputSummary?: string;
  }) => {
    const task = tasks.find((t) => t.id === payload.taskId);
    const resolvedAreaName = payload.areaName || task?.areaName || 'Area Gedung';
    const resolvedCleanerName = payload.cleanerName || task?.cleanerName || 'Tim Kebersihan';
    const resolvedPhoto = payload.photoAfter || payload.photoProof || task?.photoAfter;
    const inspectorLabel = currentUser?.name || 'Auditor QC';

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newInspection: QCInspection = {
      id: `qc-${Date.now()}`,
      projectId: task?.projectId || safeActiveProjectId,
      taskId: payload.taskId,
      areaName: resolvedAreaName,
      cleanerName: resolvedCleanerName,
      inspectorName: `${inspectorLabel} (Auditor QC)`,
      inspectedAt: `Hari ini, ${nowStr}`,
      score: payload.score,
      status: payload.status,
      criteriaScores: payload.criteriaScores,
      auditParameters: payload.auditParameters,
      notes: payload.notes,
      recommendations: payload.recommendations,
      photoProof: resolvedPhoto,
      photoBefore: payload.photoBefore || task?.photoBefore,
      photoProgress: payload.photoProgress || task?.photoProgress,
      photoAfter: payload.photoAfter || task?.photoAfter,
      inspectionSource: payload.inspectionSource || 'task',
      evaluatedInputSummary: payload.evaluatedInputSummary,
    };

    setInspections((prev) => [newInspection, ...prev]);
    upsertRecord(COLLECTIONS.INSPECTIONS, newInspection).catch((err) => notifyServerError('menyimpan inspeksi QC', err));

    if (task) {
      const updatedTask: CleaningTask = {
        ...task,
        status: payload.status === 'passed' ? 'completed' : 'pending',
        qcScore: payload.score,
        qcStatus: payload.status === 'passed' ? 'approved' : 'rejected',
        qcNotes: payload.notes,
        inspectedBy: inspectorLabel,
        inspectedAt: nowStr,
      };
      setTasks((prev) =>
        prev.map((t) => (t.id === payload.taskId ? updatedTask : t))
      );
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('memperbarui status tugas QC', err));

      setAreas((prev) =>
        prev.map((a) =>
          a.id === task.areaId
            ? { ...a, status: payload.status === 'passed' ? 'inspected' : 'needs_cleaning' }
            : a
        )
      );
      const targetArea = areas.find((a) => a.id === task.areaId);
      if (targetArea) {
        upsertRecord(COLLECTIONS.AREAS, { ...targetArea, status: payload.status === 'passed' ? 'inspected' : 'needs_cleaning' }).catch(() => {});
      }
    }

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: payload.status === 'passed' ? '🎉 Inspeksi QC Lolos!' : '⚠️ Revisi Inspeksi Diperlukan',
      message: `Inspeksi untuk ${resolvedAreaName} diberikan nilai ${payload.score}/100 oleh Auditor QC: "${payload.notes}"`,
      timestamp: nowStr,
      type: payload.status === 'passed' ? 'success' : 'warning',
      targetRole: ['petugas', 'super_admin', 'admin'],
      read: false,
      taskId: task?.id || payload.taskId,
      projectId: task?.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});

    if (payload.status === 'passed') {
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.5 },
        });
      } catch {
        // ignore
      }

      triggerTopNotification({
        category: 'qc_approved',
        title: 'Inspeksi QC Disetujui!',
        message: `Inspeksi mutu di ${resolvedAreaName} berhasil disetujui auditor QC (Skor ${payload.score}/100)`,
        targetTab: 'inspeksi',
        metaId: newInspection.id,
        projectName: activeProject?.name,
      });
    }
  };

  const submitNewComplaint = (payload: {
    reporterName: string;
    reporterRole: string;
    areaId?: string;
    areaName?: string;
    floor?: string;
    category?: string;
    description: string;
    priority?: PriorityLevel;
    slaHours?: number;
    photoBefore?: string;
  }) => {
    const area = payload.areaId ? areas.find((a) => a.id === payload.areaId) : undefined;
    const resolvedAreaName =
      payload.areaName?.trim() || area?.name || payload.areaId?.trim() || 'Area Gedung';
    const resolvedFloor =
      payload.floor?.trim() || area?.floor || activeProject?.name || 'Area Operasional';
    const resolvedCategory = payload.category?.trim() || 'Keluhan Operasional';
    const resolvedPriority: PriorityLevel = payload.priority || 'high';
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const hours = payload.slaHours && payload.slaHours > 0 ? payload.slaHours : 2;
    const slaMins = Math.round(hours * 60);
    const deadlineMs = Date.now() + hours * 3600 * 1000;
    const deadlineStr =
      new Date(deadlineMs).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';

    const newTicket: Complaint = {
      id: `comp-${Date.now()}`,
      projectId: area?.projectId || safeActiveProjectId,
      ticketNumber: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      reporterName: payload.reporterName,
      reporterRole: payload.reporterRole,
      areaId: payload.areaId || `manual-${Date.now()}`,
      areaName: resolvedAreaName,
      floor: resolvedFloor,
      category: resolvedCategory,
      description: payload.description,
      priority: resolvedPriority,
      status: 'open',
      createdAt: `Hari ini, ${nowStr}`,
      photoBefore: payload.photoBefore,
      slaHours: hours,
      slaMinutes: slaMins,
      slaDeadline: deadlineStr,
      deadlineTimestamp: deadlineMs,
      assignedCleanerId: area?.cleanerId,
      assignedCleanerName: area?.cleanerName || 'Tim Operasional',
    };

    setComplaints((prev) => [newTicket, ...prev]);
    upsertRecord(COLLECTIONS.COMPLAINTS, newTicket);

    const notif: AppNotification = {
      id: `notif-complaint-${Date.now()}`,
      title: '🚨 Keluhan Baru Diterima!',
      message: `${payload.reporterName} melaporkan keluhan "${payload.description}" di ${resolvedAreaName}. SLA penanganan: ${hours} Jam (${slaMins} menit).`,
      timestamp: nowStr,
      type: 'urgent',
      targetRole: ['super_admin', 'admin', 'supervisor', 'petugas', 'klien'],
      read: false,
      projectId: area?.projectId || safeActiveProjectId,
      isNewComplaint: true,
      complaintId: newTicket.id,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});

    triggerTopNotification({
      category: 'new_complaint',
      title: 'Komplain Baru Diterima!',
      message: `${payload.reporterName}: "${payload.description}" di ${resolvedAreaName}`,
      targetTab: userRole === 'klien' ? 'klien-keluhan' : 'complaint',
      metaId: newTicket.id,
      projectName: activeProject?.name,
    });
  };

  const startHandlingComplaint = (complaintId: string) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const existing = complaints.find((c) => c.id === complaintId);
    if (!existing) return;

    const hours = existing.slaHours && existing.slaHours > 0 ? existing.slaHours : 2;
    const needsNewDeadline =
      existing.status === 'resolved' || !existing.deadlineTimestamp || existing.deadlineTimestamp <= Date.now();
    const nextDeadline = needsNewDeadline
      ? Date.now() + hours * 3600 * 1000
      : existing.deadlineTimestamp;
    const nextDeadlineStr = needsNewDeadline
      ? new Date(nextDeadline).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' WIB'
      : existing.slaDeadline;

    const targetTicket: Complaint = {
      ...existing,
      status: 'in_progress',
      startedAt: `Hari ini, ${nowStr}`,
      resolvedAt: undefined,
      deadlineTimestamp: nextDeadline,
      slaDeadline: nextDeadlineStr,
    };

    setComplaints((prev) => prev.map((c) => (c.id === complaintId ? targetTicket : c)));
    upsertRecord(COLLECTIONS.COMPLAINTS, targetTicket).catch((err) =>
      notifyServerError('memulai penanganan komplain', err)
    );

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: '⚙️ Komplain Dalam Pengerjaan (Di Kerjakan)',
      message: `Tiket ${targetTicket.ticketNumber} di ${targetTicket.areaName} kini berstatus Di Kerjakan oleh petugas (${targetTicket.assignedCleanerName || 'Tim Kebersihan'}).`,
      timestamp: nowStr,
      type: 'info',
      targetRole: ['super_admin', 'admin', 'supervisor', 'petugas', 'klien'],
      read: false,
      projectId: targetTicket.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});
  };

  const requestComplaintExtension = (
    complaintId: string,
    hours: number,
    reason: string
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const existing = complaints.find((c) => c.id === complaintId);
    if (!existing) return;

    const req: ComplaintExtensionRequest = {
      id: `ext-${Date.now()}`,
      requestedHours: hours,
      reason: reason.trim(),
      requestedBy: activeCleaner?.name || currentUser?.name || (userRole === 'petugas' ? 'Petugas Lapangan' : 'Tim Operasional'),
      requestedAt: `Hari ini, ${nowStr}`,
      status: 'pending',
    };
    const updatedTicket: Complaint = {
      ...existing,
      extensionRequest: req,
    };

    setComplaints((prev) => prev.map((c) => (c.id === complaintId ? updatedTicket : c)));
    upsertRecord(COLLECTIONS.COMPLAINTS, updatedTicket).catch((err) =>
      notifyServerError('mengajukan perpanjangan komplain', err)
    );

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: '⏳ Pengajuan Tambahan Waktu Penanganan!',
      message: `Petugas mengajukan tambahan waktu ${hours} Jam untuk tiket ${updatedTicket.ticketNumber} (${updatedTicket.areaName}). Alasan: "${reason}". Silakan verifikasi pengajuan ini.`,
      timestamp: nowStr,
      type: 'warning',
      targetRole: ['super_admin', 'admin', 'supervisor', 'klien'],
      read: false,
      projectId: updatedTicket.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});
  };

  const respondToComplaintExtension = (
    complaintId: string,
    action: 'approve' | 'revise' | 'reject',
    revisedHours?: number,
    reviewNotes?: string
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const reviewerName =
      currentUser?.name || (userRole === 'klien' ? 'Pembuat Tiket (Klien)' : 'Pengawas/Admin');

    const existing = complaints.find((c) => c.id === complaintId);
    if (!existing || !existing.extensionRequest) return;
    const currentReq = existing.extensionRequest;
    let ticketAfter: Complaint | undefined;

    if (action === 'approve') {
      const addHours = currentReq.requestedHours;
      const currentDeadline = existing.deadlineTimestamp && existing.deadlineTimestamp > 0 ? existing.deadlineTimestamp : Date.now();
      const newDeadline = currentDeadline + addHours * 3600 * 1000;
      const newHours = (existing.slaHours || 1) + addHours;
      const newDeadlineStr = new Date(newDeadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

      ticketAfter = {
        ...existing,
        deadlineTimestamp: newDeadline,
        slaHours: newHours,
        slaMinutes: newHours * 60,
        slaDeadline: newDeadlineStr,
        extensionRequest: {
          ...currentReq,
          status: 'approved',
          reviewedBy: reviewerName,
          reviewedAt: `Hari ini, ${nowStr}`,
          reviewNotes: reviewNotes || 'Tambahan waktu disetujui sesuai permohonan.',
        },
      };
    } else if (action === 'revise') {
      const addHours = revisedHours && revisedHours > 0 ? revisedHours : 1;
      const currentDeadline = existing.deadlineTimestamp && existing.deadlineTimestamp > 0 ? existing.deadlineTimestamp : Date.now();
      const newDeadline = currentDeadline + addHours * 3600 * 1000;
      const newHours = (existing.slaHours || 1) + addHours;
      const newDeadlineStr = new Date(newDeadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

      ticketAfter = {
        ...existing,
        deadlineTimestamp: newDeadline,
        slaHours: newHours,
        slaMinutes: newHours * 60,
        slaDeadline: newDeadlineStr,
        extensionRequest: {
          ...currentReq,
          status: 'approved',
          revisedHours: addHours,
          reviewedBy: reviewerName,
          reviewedAt: `Hari ini, ${nowStr}`,
          reviewNotes: reviewNotes || `Durasi disesuaikan menjadi +${addHours} Jam.`,
        },
      };
    } else if (action === 'reject') {
      ticketAfter = {
        ...existing,
        extensionRequest: {
          ...currentReq,
          status: 'rejected',
          reviewedBy: reviewerName,
          reviewedAt: `Hari ini, ${nowStr}`,
          reviewNotes: reviewNotes || 'Pengajuan perpanjangan waktu ditolak. Harap selesaikan sesuai batas waktu.',
        },
      };
    }

    if (ticketAfter) {
      setComplaints((prev) => prev.map((c) => (c.id === complaintId ? ticketAfter! : c)));
      upsertRecord(COLLECTIONS.COMPLAINTS, ticketAfter).catch((err) =>
        notifyServerError('memproses perpanjangan komplain', err)
      );

      let notifTitle = '';
      let notifMsg = '';
      let notifType: 'success' | 'info' | 'urgent' = 'info';

      if (action === 'approve') {
        notifTitle = '✅ Tambahan Waktu Disetujui!';
        notifMsg = `Pengajuan tambahan waktu ${ticketAfter.extensionRequest?.requestedHours} Jam untuk tiket ${ticketAfter.ticketNumber} telah disetujui oleh ${reviewerName}. Deadline: ${ticketAfter.slaDeadline}.`;
        notifType = 'success';
      } else if (action === 'revise') {
        notifTitle = '📝 Tambahan Waktu Direvisi & Disetujui!';
        notifMsg = `Durasi tambahan waktu untuk tiket ${ticketAfter.ticketNumber} direvisi menjadi +${ticketAfter.extensionRequest?.revisedHours} Jam oleh ${reviewerName}. Deadline: ${ticketAfter.slaDeadline}.`;
        notifType = 'info';
      } else {
        notifTitle = '❌ Tambahan Waktu Ditolak!';
        notifMsg = `Pengajuan tambahan waktu tiket ${ticketAfter.ticketNumber} ditolak oleh ${reviewerName}. Catatan: "${reviewNotes || 'Selesaikan secepatnya'}".`;
        notifType = 'urgent';
      }

      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: notifTitle,
        message: notifMsg,
        timestamp: nowStr,
        type: notifType,
        targetRole: ['petugas', 'supervisor', 'super_admin', 'admin'],
        read: false,
        projectId: ticketAfter.projectId || safeActiveProjectId,
      };
      setNotifications((prev) => [notif, ...prev]);
      upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});
    }
  };

  const resolveComplaint = (
    complaintId: string,
    resolutionNotes: string,
    photoProgress?: string,
    photoResolved?: string
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const targetComplaint = complaints.find((c) => c.id === complaintId);
    if (targetComplaint) {
      const resolvedTicket: Complaint = {
        ...targetComplaint,
        status: 'resolved',
        resolvedAt: `Hari ini, ${nowStr}`,
        resolutionNotes,
        photoProgress: photoProgress || targetComplaint.photoProgress,
        photoResolved: photoResolved || targetComplaint.photoResolved,
      };
      setComplaints((prev) => prev.map((c) => (c.id === complaintId ? resolvedTicket : c)));
      upsertRecord(COLLECTIONS.COMPLAINTS, resolvedTicket).catch((err) =>
        notifyServerError('menyelesaikan komplain', err)
      );
    }

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: '✅ Komplain Berhasil Ditangani!',
      message: `Tiket ${targetComplaint?.ticketNumber || complaintId} di ${targetComplaint?.areaName || 'lokasi'} telah diselesaikan. Keterangan: "${resolutionNotes}"`,
      timestamp: nowStr,
      type: 'success',
      targetRole: ['super_admin', 'admin', 'supervisor', 'petugas', 'klien'],
      read: false,
      projectId: targetComplaint?.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});

    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  // Facility Damage Reports (Laporan Kerusakan Barang / Fasilitas)
  const addDamageReport = (report: Omit<FacilityDamageReport, 'id' | 'ticketNo' | 'createdAt'>) => {
    const now = new Date();
    const nowStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const dateStr = report.reportDate || now.toISOString().split('T')[0];
    const ticketNo = `DMG-${now.getFullYear()}-${String(damageReports.length + 1).padStart(3, '0')}`;
    const id = `dmg-${Date.now()}`;

    const newReport: FacilityDamageReport = {
      ...report,
      id,
      ticketNo,
      projectId: report.projectId || safeActiveProjectId,
      reportDate: dateStr,
      reportTime: report.reportTime || nowStr,
      createdAt: now.toISOString(),
      status: report.status || 'dilaporkan',
    };

    setDamageReports((prev) => [newReport, ...prev]);
    upsertRecord(COLLECTIONS.DAMAGE_REPORTS, newReport).catch((err) =>
      notifyServerError('menambah laporan kerusakan', err)
    );

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: `⚠️ Laporan Kerusakan Baru: ${ticketNo}`,
      message: `${report.reporterName} melaporkan kerusakan: "${report.itemName}" di ${report.locationName} (${report.floor}). Prioritas: ${report.priority?.toUpperCase()}.`,
      timestamp: nowStr,
      type: report.priority === 'urgent' || report.damageLevel === 'kritis' ? 'urgent' : 'warning',
      targetRole: ['super_admin', 'admin', 'supervisor'],
      read: false,
      projectId: report.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});

    triggerTopNotification({
      category: 'damage_report',
      title: `Laporan Kerusakan: ${ticketNo}`,
      message: `${report.reporterName} melaporkan kerusakan "${report.itemName}" di ${report.locationName}`,
      targetTab: userRole === 'klien' ? 'klien-kerusakan' : 'kerusakan',
      metaId: newReport.id,
      projectName: activeProject?.name,
    });
  };

  const updateDamageReport = (id: string, updates: Partial<FacilityDamageReport>) => {
    const existing = damageReports.find((r) => r.id === id);
    const updated = existing
      ? { ...existing, ...updates, updatedAt: new Date().toISOString() }
      : undefined;
    setDamageReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    );
    if (updated) {
      upsertRecord(COLLECTIONS.DAMAGE_REPORTS, updated).catch((err) =>
        notifyServerError('memperbarui laporan kerusakan', err)
      );
    }
  };

  const deleteDamageReport = (id: string) => {
    setDamageReports((prev) => prev.filter((r) => r.id !== id));
    deleteRecord(COLLECTIONS.DAMAGE_REPORTS, id).catch((err) =>
      notifyServerError('menghapus laporan kerusakan', err)
    );
  };

  const resolveDamageReport = (
    id: string,
    resolutionPayload: {
      technicianNotes?: string;
      photoAfter?: string;
      technicianName?: string;
      costEstimate?: number;
    }
  ) => {
    const now = new Date();
    const nowStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const dateStr = now.toISOString().split('T')[0];

    const target = damageReports.find((r) => r.id === id);
    if (target) {
      const updated: FacilityDamageReport = {
        ...target,
        status: 'selesai',
        repairedDate: dateStr,
        repairedTime: nowStr,
        technicianNotes: resolutionPayload.technicianNotes || target.technicianNotes,
        photoAfter: resolutionPayload.photoAfter || target.photoAfter,
        technicianName: resolutionPayload.technicianName || target.technicianName,
        costEstimate:
          resolutionPayload.costEstimate !== undefined ? resolutionPayload.costEstimate : target.costEstimate,
        updatedAt: now.toISOString(),
      };
      setDamageReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      upsertRecord(COLLECTIONS.DAMAGE_REPORTS, updated).catch((err) =>
        notifyServerError('menyelesaikan laporan kerusakan', err)
      );
    }

    const notif: AppNotification = {
      id: `notif-res-${Date.now()}`,
      title: `✅ Kerusakan Selesai Diperbaiki: ${target?.ticketNo || ''}`,
      message: `Fasilitas "${target?.itemName || 'Barang'}" di ${target?.locationName || 'Area'} telah berhasil diperbaiki oleh ${resolutionPayload.technicianName || 'Tim Teknisi'}.`,
      timestamp: nowStr,
      type: 'success',
      targetRole: ['super_admin', 'admin', 'supervisor', 'petugas'],
      read: false,
      projectId: target?.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});
  };

  const addArea = (newArea: Omit<Area, 'id'>) => {
    const id = `area-${Date.now()}`;
    const item: Area = { ...newArea, id, projectId: newArea.projectId || safeActiveProjectId };
    setAreas((prev) => [...prev, item]);
    upsertRecord(COLLECTIONS.AREAS, item).catch((err) => notifyServerError('menambah area', err));
  };

  const updateArea = (id: string, updates: Partial<Area>) => {
    let updated: Area | undefined;
    setAreas((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          updated = { ...a, ...updates };
          return updated;
        }
        return a;
      })
    );
    if (updated) {
      upsertRecord(COLLECTIONS.AREAS, updated).catch((err) => notifyServerError('memperbarui area', err));
    }
  };

  const deleteArea = (id: string) => {
    setAreas((prev) => prev.filter((a) => a.id !== id));
    deleteRecord(COLLECTIONS.AREAS, id).catch((err) => notifyServerError('menghapus area', err));
  };

  const addCleaner = (newCleaner: Omit<Cleaner, 'id'>) => {
    const id = `cln-${Date.now()}`;
    const item: Cleaner = { ...newCleaner, id, projectId: newCleaner.projectId || safeActiveProjectId };
    cleanersRef.current = [...cleanersRef.current, item];
    setCleaners((prev) => [...prev, item]);
    const writePromise = upsertRecord(COLLECTIONS.CLEANERS, item)
      .then((saved) => syncCleanerRev(saved))
      .catch((err) => notifyServerError('menambah petugas', err));
    cleanerWriteQueueRef.current.set(id, writePromise);
  };

  const updateCleaner = (id: string, updates: Partial<Cleaner>) => {
    cleanersRef.current = cleanersRef.current.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setCleaners((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    enqueueCleanerWrite(id, 'memperbarui petugas', (base) => ({
      ...base,
      ...updates,
    }));
  };

  const deleteCleaner = (id: string) => {
    cleanersRef.current = cleanersRef.current.filter((c) => c.id !== id);
    setCleaners((prev) => prev.filter((c) => c.id !== id));
    deleteRecord(COLLECTIONS.CLEANERS, id).catch((err) => notifyServerError('menghapus petugas', err));
  };

  const updateCleanerAttendance = (
    cleanerId: string,
    day: number,
    status: AttendanceStatusCode,
    monthPeriod?: string
  ) => {
    const applyPatch = (c: Cleaner): Cleaner => {
      const currentAtt = { ...(c.attendance || {}) };
      currentAtt[day] = status;
      const currentByMonth = { ...(c.attendanceByMonth || {}) };
      if (monthPeriod) {
        currentByMonth[monthPeriod] = {
          ...(currentByMonth[monthPeriod] || {}),
          [day]: status,
        };
      }
      return {
        ...c,
        attendance: currentAtt,
        attendanceByMonth: currentByMonth,
      };
    };
    cleanersRef.current = cleanersRef.current.map((c) => (c.id === cleanerId ? applyPatch(c) : c));
    setCleaners((prev) => prev.map((c) => (c.id === cleanerId ? applyPatch(c) : c)));
    enqueueCleanerWrite(cleanerId, 'memperbarui presensi petugas', applyPatch);
  };

  const batchSetCleanerAttendance = (
    cleanerId: string,
    days: Record<number, AttendanceStatusCode>,
    monthPeriod?: string
  ) => {
    const applyPatch = (c: Cleaner): Cleaner => {
      const currentAtt = { ...(c.attendance || {}), ...days };
      const currentByMonth = { ...(c.attendanceByMonth || {}) };
      if (monthPeriod) {
        currentByMonth[monthPeriod] = {
          ...(currentByMonth[monthPeriod] || {}),
          ...days,
        };
      }
      return {
        ...c,
        attendance: currentAtt,
        attendanceByMonth: currentByMonth,
      };
    };
    cleanersRef.current = cleanersRef.current.map((c) => (c.id === cleanerId ? applyPatch(c) : c));
    setCleaners((prev) => prev.map((c) => (c.id === cleanerId ? applyPatch(c) : c)));
    enqueueCleanerWrite(cleanerId, 'memperbarui presensi petugas', applyPatch);
  };

  const addShift = (newShift: Omit<Shift, 'id'>) => {
    const id = `shift-${Date.now()}`;
    const duration = calculateShiftDuration(newShift.startTime, newShift.endTime);
    const created: Shift = {
      ...newShift,
      id,
      projectId: newShift.projectId || safeActiveProjectId || undefined,
      workHoursDuration: duration.totalHoursDecimal,
      durationText: duration.text,
    };
    setShifts((prev) => [...prev, created]);
    upsertRecord(COLLECTIONS.SHIFTS, created).catch((err) => notifyServerError('menambah shift', err));
  };

  const updateShift = (id: string, updates: Partial<Shift>) => {
    let updated: Shift | undefined;
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const startTime = updates.startTime !== undefined ? updates.startTime : s.startTime;
        const endTime = updates.endTime !== undefined ? updates.endTime : s.endTime;
        const duration = calculateShiftDuration(startTime, endTime);
        updated = {
          ...s,
          ...updates,
          workHoursDuration: duration.totalHoursDecimal,
          durationText: duration.text,
        };
        return updated;
      })
    );
    if (updated) {
      upsertRecord(COLLECTIONS.SHIFTS, updated).catch((err) => notifyServerError('memperbarui shift', err));
    }
  };

  const deleteShift = (id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    deleteRecord(COLLECTIONS.SHIFTS, id).catch((err) => notifyServerError('menghapus shift', err));
  };

  const toggleClockInOut = (cleanerId: string) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const applyPatch = (c: Cleaner): Cleaner => {
      const nextClockedIn = !c.isClockedIn;
      return {
        ...c,
        isClockedIn: nextClockedIn,
        status: nextClockedIn ? 'active' : 'off',
        clockInTime: nextClockedIn ? nowStr : undefined,
      };
    };
    cleanersRef.current = cleanersRef.current.map((c) => (c.id === cleanerId ? applyPatch(c) : c));
    setCleaners((prev) => prev.map((c) => (c.id === cleanerId ? applyPatch(c) : c)));
    enqueueCleanerWrite(cleanerId, 'clock in/out petugas', applyPatch);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    deleteRecord(COLLECTIONS.NOTIFICATIONS, id).catch(() => {});
  };

  const acknowledgeComplaintNotifications = () => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (
          n.isNewComplaint ||
          n.title.includes('Komplain Baru') ||
          n.title.includes('Keluhan Baru')
        ) {
          const updated = { ...n, read: true };
          upsertRecord(COLLECTIONS.NOTIFICATIONS, updated).catch(() => {});
          return updated;
        }
        return n;
      })
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    deleteCollectionRecords(COLLECTIONS.NOTIFICATIONS).catch(() => {});
  };

  const triggerDeadlinePushNotification = () => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const firstPendingTask = tasks.find((t) => t.status === 'pending' || t.status === 'in_progress');
    const areaLabel = firstPendingTask?.areaName || 'area tugas aktif';
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: '⏰ Pengingat Batas Waktu!',
      message: `Tugas di ${areaLabel} tinggal 15 menit lagi sebelum batas waktu! Segera selesaikan tugas Anda.`,
      timestamp: nowStr,
      type: 'warning',
      targetRole: ['petugas', 'supervisor', 'super_admin', 'admin'],
      read: false,
      taskId: firstPendingTask?.id,
      projectId: safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});

    triggerTopNotification({
      category: 'deadline_reminder',
      title: 'Pengingat Batas Waktu!',
      message: `Tugas di ${areaLabel} tinggal 15 menit lagi sebelum batas waktu! Segera selesaikan tugas Anda.`,
      targetTab: 'activity',
      metaId: notif.id,
      projectName: activeProject?.name,
    });
  };

  const resetToInitialData = () => {
    localStorage.clear();
    setProjects(INITIAL_PROJECTS);
    setActiveProjectIdState('');
    setUsers(INITIAL_USERS);
    setActiveUserId('usr-admin');
    setChecklistLocations(INITIAL_CHECKLIST_LOCATIONS);
    setChecklistTemplates(INITIAL_CHECKLIST_TEMPLATES);
    setDailyChecklists(INITIAL_DAILY_CHECKLISTS);
    setAreas(INITIAL_AREAS);
    setCleaners(INITIAL_CLEANERS);
    setShifts(INITIAL_SHIFTS);
    setTasks(INITIAL_TASKS);
    setInspections(INITIAL_INSPECTIONS);
    setComplaints(INITIAL_COMPLAINTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setMasterPrograms(INITIAL_MASTER_PROGRAMS);
    setDamageReports(INITIAL_DAMAGE_REPORTS);
    setKpiConfig(DEFAULT_KPI_VISIBILITY_OFF);
    setUserRole('super_admin');
    setViewMode('web');
  };

  // Hapus Data Masal per Sub Menu (Khusus Super Admin)
  const bulkDeleteSubmenuData = async (
    submenuKey: string,
    scope: 'active_project' | 'all'
  ): Promise<{ count: number; label: string }> => {
    let deletedCount = 0;
    let label = '';
    const targetProjId = activeProject?.id || '';

    const deleteBatch = async (col: string, ids: string[]) => {
      if (!ids || ids.length === 0) return;
      await Promise.allSettled(ids.map((id) => deleteRecord(col, id)));
    };

    const deleteCollectionScoped = async (col: string) => {
      if (scope === 'all') {
        await deleteCollectionRecords(col);
      } else if (targetProjId) {
        await deleteCollectionRecords(col, targetProjId);
      }
    };

    const upsertBatch = async (col: string, items: any[]) => {
      if (!items || items.length === 0) return;
      await Promise.allSettled(items.map((it) => upsertRecord(col, it)));
    };

    switch (submenuKey) {
      case 'all_operational': {
        label = 'Seluruh Data Operasional & Aktivitas';
        const isMatch = (itemProjId?: string) =>
          scope === 'all' || !itemProjId || itemProjId === targetProjId;

        const matchedChecklists = dailyChecklists.filter((d) => scope === 'all' || d.projectId === targetProjId);
        const matchedAreas = areas.filter((a) => isMatch(a.projectId));
        const matchedLocations = checklistLocations.filter((l) => isMatch(l.projectId));
        const matchedTasks = tasks.filter((t) => isMatch(t.projectId));
        const matchedInspections = inspections.filter((i) => isMatch(i.projectId));
        const matchedDamage = damageReports.filter((d) => isMatch(d.projectId));
        const matchedComplaints = complaints.filter((c) => isMatch(c.projectId));
        const matchedMcp = masterPrograms.filter((m) => scope === 'all' || m.projectId === targetProjId);

        const chkIds = matchedChecklists.map((d) => d.id);
        const areaIds = matchedAreas.map((a) => a.id);
        const locIds = matchedLocations.map((l) => l.id);
        const taskIds = matchedTasks.map((t) => t.id);
        const inspIds = matchedInspections.map((i) => i.id);
        const damIds = matchedDamage.map((d) => d.id);
        const compIds = matchedComplaints.map((c) => c.id);
        const mcpIds = matchedMcp.map((m) => m.id);

        deletedCount =
          chkIds.length +
          areaIds.length +
          locIds.length +
          taskIds.length +
          inspIds.length +
          damIds.length +
          compIds.length +
          mcpIds.length;

        // 1. Update React state
        if (scope === 'all') {
          setDailyChecklists([]);
          setAreas([]);
          setChecklistLocations([]);
          setTasks([]);
          setInspections([]);
          setDamageReports([]);
          setComplaints([]);
          setMasterPrograms([]);
        } else {
          setDailyChecklists((prev) => prev.filter((d) => d.projectId !== targetProjId));
          setAreas((prev) => prev.filter((a) => a.projectId && a.projectId !== targetProjId));
          setChecklistLocations((prev) => prev.filter((l) => l.projectId && l.projectId !== targetProjId));
          setTasks((prev) => prev.filter((t) => t.projectId && t.projectId !== targetProjId));
          setInspections((prev) => prev.filter((i) => i.projectId && i.projectId !== targetProjId));
          setDamageReports((prev) => prev.filter((d) => d.projectId && d.projectId !== targetProjId));
          setComplaints((prev) => prev.filter((c) => c.projectId && c.projectId !== targetProjId));
          setMasterPrograms((prev) => prev.filter((m) => m.projectId !== targetProjId));
        }

        // 2. Clear snapshot & dirty refs
        for (const id of chkIds) {
          checklistSnapshotRef.current.delete(id);
          dirtyChecklistIdsRef.current.delete(id);
        }

        // 3. Clean Dexie offline cache
        try {
          if (chkIds.length > 0) await offlineDb.dailyChecklists.bulkDelete(chkIds);
          if (areaIds.length > 0) await offlineDb.areas.bulkDelete(areaIds);
          if (locIds.length > 0) await offlineDb.checklistLocations.bulkDelete(locIds);
          if (taskIds.length > 0) await offlineDb.tasks.bulkDelete(taskIds);
        } catch {}

        // 4. Delete on server in parallel
        await Promise.allSettled([
          deleteBatch(COLLECTIONS.DAILY_CHECKLISTS, chkIds),
          deleteBatch(COLLECTIONS.AREAS, areaIds),
          deleteBatch(COLLECTIONS.CHECKLIST_LOCATIONS, locIds),
          deleteBatch(COLLECTIONS.TASKS, taskIds),
          deleteBatch(COLLECTIONS.INSPECTIONS, inspIds),
          deleteBatch(COLLECTIONS.DAMAGE_REPORTS, damIds),
          deleteBatch(COLLECTIONS.COMPLAINTS, compIds),
          deleteBatch(COLLECTIONS.MASTER_PROGRAMS, mcpIds),
        ]);
        break;
      }
      case 'ceklist': {
        label = 'Ceklist Area (24 Jam)';
        const matched = dailyChecklists.filter((d) => scope === 'all' || d.projectId === targetProjId);
        const ids = matched.map((d) => d.id);
        deletedCount = ids.length;

        setDailyChecklists((prev) => (scope === 'all' ? [] : prev.filter((d) => d.projectId !== targetProjId)));

        for (const id of ids) {
          checklistSnapshotRef.current.delete(id);
          dirtyChecklistIdsRef.current.delete(id);
        }

        try {
          if (ids.length > 0) await offlineDb.dailyChecklists.bulkDelete(ids);
        } catch {}

        await deleteBatch(COLLECTIONS.DAILY_CHECKLISTS, ids);
        break;
      }
      case 'area': {
        label = 'Master Area & Titik Lokasi Ceklist';
        const isMatch = (itemProjId?: string) =>
          scope === 'all' || !itemProjId || itemProjId === targetProjId;

        const matchedAreas = areas.filter((a) => isMatch(a.projectId));
        const matchedLocs = checklistLocations.filter((l) => isMatch(l.projectId));
        const areaIds = matchedAreas.map((a) => a.id);
        const locIds = matchedLocs.map((l) => l.id);
        deletedCount = areaIds.length + locIds.length;

        if (scope === 'all') {
          setAreas([]);
          setChecklistLocations([]);
        } else {
          setAreas((prev) => prev.filter((a) => a.projectId && a.projectId !== targetProjId));
          setChecklistLocations((prev) => prev.filter((l) => l.projectId && l.projectId !== targetProjId));
        }

        try {
          if (areaIds.length > 0) await offlineDb.areas.bulkDelete(areaIds);
          if (locIds.length > 0) await offlineDb.checklistLocations.bulkDelete(locIds);
        } catch {}

        await Promise.allSettled([
          deleteBatch(COLLECTIONS.AREAS, areaIds),
          deleteBatch(COLLECTIONS.CHECKLIST_LOCATIONS, locIds),
        ]);
        break;
      }
      case 'activity': {
        label = 'Cleaning Activity & Riwayat Tugas';
        const matched = tasks.filter((t) => scope === 'all' || !t.projectId || t.projectId === targetProjId);
        const ids = matched.map((t) => t.id);
        deletedCount = ids.length;

        setTasks((prev) =>
          scope === 'all' ? [] : prev.filter((t) => t.projectId && t.projectId !== targetProjId)
        );

        try {
          if (ids.length > 0) await offlineDb.tasks.bulkDelete(ids);
        } catch {}

        await deleteBatch(COLLECTIONS.TASKS, ids);
        break;
      }
      case 'daily-activity': {
        label = 'Riwayat Tugas Harian Selesai';
        const matched = tasks.filter(
          (t) => (scope === 'all' || !t.projectId || t.projectId === targetProjId) && t.status === 'completed'
        );
        const ids = matched.map((t) => t.id);
        deletedCount = ids.length;

        setTasks((prev) =>
          prev.filter((t) => {
            if (scope === 'all') return t.status !== 'completed';
            return !((!t.projectId || t.projectId === targetProjId) && t.status === 'completed');
          })
        );

        try {
          if (ids.length > 0) await offlineDb.tasks.bulkDelete(ids);
        } catch {}

        await deleteBatch(COLLECTIONS.TASKS, ids);
        break;
      }
      case 'monthly-activity': {
        label = 'Arsip Pekerjaan Laporan Bulanan';
        const matched = tasks.filter(
          (t) => t.exportedToMonthlyReport && (scope === 'all' || !t.projectId || t.projectId === targetProjId)
        );
        const updatedTasks = matched.map((t) => ({
          ...t,
          exportedToMonthlyReport: false,
          monthlyOrderNo: undefined,
          monthlyReportExportDate: undefined,
        }));
        const idsSet = new Set(matched.map((t) => t.id));
        deletedCount = matched.length;

        setTasks((prev) =>
          prev.map((t) =>
            idsSet.has(t.id)
              ? {
                  ...t,
                  exportedToMonthlyReport: false,
                  monthlyOrderNo: undefined,
                  monthlyReportExportDate: undefined,
                }
              : t
          )
        );

        await upsertBatch(COLLECTIONS.TASKS, updatedTasks);
        break;
      }
      case 'master-program': {
        label = 'Master Cleaning Program (MCP)';
        const matched = masterPrograms.filter((m) => scope === 'all' || m.projectId === targetProjId);
        const ids = matched.map((m) => m.id);
        deletedCount = ids.length;

        setMasterPrograms((prev) =>
          scope === 'all' ? [] : prev.filter((m) => m.projectId !== targetProjId)
        );

        await deleteBatch(COLLECTIONS.MASTER_PROGRAMS, ids);
        break;
      }
      case 'inspeksi': {
        label = 'Inspeksi & QC Control';
        const matched = inspections.filter((i) => scope === 'all' || !i.projectId || i.projectId === targetProjId);
        const ids = matched.map((i) => i.id);
        deletedCount = ids.length;

        setInspections((prev) =>
          scope === 'all' ? [] : prev.filter((i) => i.projectId && i.projectId !== targetProjId)
        );

        await deleteBatch(COLLECTIONS.INSPECTIONS, ids);
        break;
      }
      case 'kerusakan': {
        label = 'Laporan Kerusakan Fasilitas';
        const matched = damageReports.filter((d) => scope === 'all' || !d.projectId || d.projectId === targetProjId);
        const ids = matched.map((d) => d.id);
        deletedCount = ids.length;

        setDamageReports((prev) =>
          scope === 'all' ? [] : prev.filter((d) => d.projectId && d.projectId !== targetProjId)
        );

        await deleteBatch(COLLECTIONS.DAMAGE_REPORTS, ids);
        break;
      }
      case 'complaint': {
        label = 'Laporan Komplain & Tiket';
        const matched = complaints.filter((c) => scope === 'all' || !c.projectId || c.projectId === targetProjId);
        const ids = matched.map((c) => c.id);
        deletedCount = ids.length;

        setComplaints((prev) =>
          scope === 'all' ? [] : prev.filter((c) => c.projectId && c.projectId !== targetProjId)
        );

        await deleteBatch(COLLECTIONS.COMPLAINTS, ids);
        break;
      }
      case 'petugas_presensi': {
        label = 'Riwayat Presensi Petugas (1-31)';
        const matched = cleaners.filter((c) => scope === 'all' || !c.projectId || c.projectId === targetProjId);
        const updatedCleaners = matched.map((c) => ({
          ...c,
          attendance: {},
          attendanceByMonth: {},
          tasksCompletedToday: 0,
          isClockedIn: false,
          clockInTime: undefined,
        }));
        const idsSet = new Set(matched.map((c) => c.id));
        deletedCount = matched.length;

        setCleaners((prev) =>
          prev.map((c) =>
            idsSet.has(c.id)
              ? {
                  ...c,
                  attendance: {},
                  attendanceByMonth: {},
                  tasksCompletedToday: 0,
                  isClockedIn: false,
                  clockInTime: undefined,
                }
              : c
          )
        );

        await upsertBatch(COLLECTIONS.CLEANERS, updatedCleaners);
        break;
      }
      case 'petugas': {
        label = 'Data Petugas Lapangan';
        const matched = cleaners.filter((c) => scope === 'all' || !c.projectId || c.projectId === targetProjId);
        const ids = matched.map((c) => c.id);
        deletedCount = ids.length;

        setCleaners((prev) =>
          scope === 'all' ? [] : prev.filter((c) => c.projectId && c.projectId !== targetProjId)
        );

        await deleteBatch(COLLECTIONS.CLEANERS, ids);
        break;
      }
      case 'shift': {
        label = 'Shift & Plotingan Kerja';
        const ids = shifts.map((s) => s.id);
        deletedCount = ids.length;

        setShifts([]);

        await deleteBatch(COLLECTIONS.SHIFTS, ids);
        break;
      }
      case 'jadwal': {
        label = 'Jadwal Cleaning';
        const matched = schedules.filter((s) => scope === 'all' || !s.projectId || s.projectId === targetProjId);
        const ids = matched.map((s) => s.id);
        deletedCount = ids.length;

        setSchedules((prev) =>
          scope === 'all' ? [] : prev.filter((s) => s.projectId && s.projectId !== targetProjId)
        );

        await deleteBatch(COLLECTIONS.SCHEDULES, ids);
        break;
      }
      case 'notifikasi': {
        label = 'Notifikasi Sistem';
        deletedCount = notifications.length;

        setNotifications([]);
        await deleteCollectionRecords(COLLECTIONS.NOTIFICATIONS);
        break;
      }
      case 'audit_logs': {
        label = 'Log Audit Sistem';
        const matched = auditLogs.filter((a) => scope === 'all' || a.projectId === targetProjId);
        deletedCount = matched.length;

        setAuditLogs((prev) =>
          scope === 'all' ? [] : prev.filter((a) => a.projectId !== targetProjId)
        );
        await deleteCollectionScoped(COLLECTIONS.AUDIT_LOGS);
        break;
      }
      case 'special-job': {
        label = 'Special Job / Penugasan Khusus';
        const matched = specialJobs.filter((s) => scope === 'all' || !s.projectId || s.projectId === targetProjId);
        deletedCount = matched.length;

        setSpecialJobs((prev) =>
          scope === 'all' ? [] : prev.filter((s) => s.projectId && s.projectId !== targetProjId)
        );
        await deleteCollectionScoped(COLLECTIONS.SPECIAL_JOBS);
        break;
      }
      case 'klien_checklist': {
        label = 'Ceklist & Inspeksi Klien Mode';
        const matchedItems = klienChecklistItems.filter((k) => scope === 'all' || k.projectId === targetProjId);
        const matchedInsps = klienChecklistInspections.filter((k) => scope === 'all' || k.projectId === targetProjId);
        const matchedTurnovers = employeeTurnovers.filter((k) => scope === 'all' || k.projectId === targetProjId);
        deletedCount = matchedItems.length + matchedInsps.length + matchedTurnovers.length;

        if (scope === 'all') {
          setKlienChecklistItems([]);
          setKlienChecklistInspections([]);
          setEmployeeTurnovers([]);
        } else {
          setKlienChecklistItems((prev) => prev.filter((k) => k.projectId !== targetProjId));
          setKlienChecklistInspections((prev) => prev.filter((k) => k.projectId !== targetProjId));
          setEmployeeTurnovers((prev) => prev.filter((k) => k.projectId !== targetProjId));
        }

        await Promise.allSettled([
          deleteCollectionScoped(COLLECTIONS.KLIEN_CHECKLIST_ITEMS),
          deleteCollectionScoped(COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS),
          deleteCollectionScoped(COLLECTIONS.EMPLOYEE_TURNOVERS),
        ]);
        break;
      }
      case 'proyek': {
        label = 'Lokasi Proyek';
        const matched = projects.filter((p) => scope === 'all' || p.id === targetProjId);
        deletedCount = matched.length;

        if (scope === 'all') {
          setProjects([]);
          setActiveProjectIdState('');
          localStorage.removeItem('sco_active_project_id');
          await deleteCollectionRecords(COLLECTIONS.PROJECTS);
        } else if (targetProjId) {
          const remaining = projects.filter((p) => p.id !== targetProjId);
          setProjects(remaining);
          setActiveProjectId(remaining[0]?.id || '');
          await deleteRecord(COLLECTIONS.PROJECTS, targetProjId);
        }
        break;
      }
      default:
        label = submenuKey;
    }

    // Push notification audit trail for Super Admin
    const auditNotif: AppNotification = {
      id: `audit-${Date.now()}`,
      title: `🗑️ Hapus Massal Sub-Menu: ${label}`,
      message: `Super Admin telah menghapus ${deletedCount} data pada sub-menu "${label}" (${scope === 'active_project' ? 'Proyek Aktif' : 'Semua Proyek'}).`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      type: 'warning',
      targetRole: ['super_admin', 'admin'],
      read: false,
    };
    setNotifications((prev) => [auditNotif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, auditNotif).catch(() => {});

    if (submenuKey !== 'audit_logs') {
      addAuditLog({
        action: 'bulk_delete',
        module: 'pengaturan',
        entityName: label,
        details: `Super Admin telah menghapus ${deletedCount} data pada sub-menu "${label}" (${scope === 'active_project' ? 'Proyek Aktif' : 'Semua Proyek'}).`,
      });
    }

    return { count: deletedCount, label };
  };

  const syncFromLiveVps = async (): Promise<{ success: boolean; message: string; summary?: any }> => {
    try {
      const res = await fetch('/api/sync/live-vps', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyinkronkan data live');
      }
      await pullAllDataFromServer(true);
      if (data.primaryProjectId) {
        setActiveProjectIdState(data.primaryProjectId);
        localStorage.setItem('sco_active_project_id', data.primaryProjectId);
      }
      return { success: true, message: data.message, summary: data.summary };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Koneksi ke endpoint sinkronisasi gagal' };
    }
  };

  return (
    <CleaningContext.Provider
      value={{
        pullAllDataFromServer,
        ensureCollectionsLoaded,
        syncFromLiveVps,
        companyProfile: effectiveCompanyProfile,
        currentCompany,
        updateCompanyProfile,
        resetCompanyProfile,
        isPwaIconsRegenerating,
        regeneratePwaIcons,
        bulkDeleteSubmenuData,
        userRole,
        setUserRole,
        viewMode,
        setViewMode,
        mobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu,
        activeCleanerId,
        setActiveCleanerId,
        activeCleaner,
        activeTab,
        setActiveTab,
        selectedTaskId,
        setSelectedTaskId,

        // Master Cleaning Program (dipisahkan sesuai lokasi kerja user / klien)
        masterPrograms: filteredMasterPrograms,
        allMasterPrograms: masterPrograms,
        addMasterProgram,
        updateMasterProgram,
        deleteMasterProgram,
        toggleMasterProgramDay,
        batchSetMasterProgramDays,
        duplicateMasterProgram,

        // Facility Damage Reports
        damageReports: filteredDamageReports,
        allDamageReports: damageReports,
        addDamageReport,
        updateDamageReport,
        deleteDamageReport,
        resolveDamageReport,

        // Projects
        projects: visibleProjects,
        allProjects: projects,
        activeProjectId: safeActiveProjectId,
        activeProject,
        setActiveProjectId,
        addProject,
        updateProject,
        deleteProject,
        assignShiftsToProject,
        getProjectShifts,

        // Multi-Company Management (Super Admin)
        companies,
        addCompany,
        updateCompany,
        deleteCompany,

        // Users & Permissions
        users,
        activeUserId,
        setActiveUserId,
        currentUser,
        addUser,
        updateUser,
        deleteUser,
        updateUserProjectAssignment,
        allowedProjects,

        // Connection & Offline Sync Management
        isOnline,
        setIsOnline,
        offlineQueue,
        syncOfflineData,
        isSyncing,
        lastSyncedAt,

        // Checklist 24 Jam & Master Data
        checklistLocations: filteredChecklistLocations,
        addChecklistLocation,
        updateChecklistLocation,
        deleteChecklistLocation,

        checklistTemplates,
        addChecklistTemplate,
        updateChecklistTemplate,
        deleteChecklistTemplate,

        dailyChecklists: filteredDailyChecklists,
        toggleHourlySlotCell,
        updateHourlySlotItem,
        batchUpdateHourStatus,
        updateSlotInspector,
        fillDailyChecklistClean,
        addManualItemToDailyChecklist,
        getOrCreateDailyChecklist,
        ensureDailyChecklist,
        selectedChecklistLocationId,
        setSelectedChecklistLocationId,
        createChecklistFromArea,
        createChecklistsFromAreas,

        // Filtered operational data for active project location
        areas: filteredAreas,
        cleaners: filteredCleaners,
        shifts,
        schedules: filteredSchedules,
        uploadedWorkSchedules: filteredUploadedWorkSchedules,
        uploadedMcpPrograms: filteredUploadedMcpPrograms,
        mcpChecklistResults: filteredMcpChecklistResults,
        tasks: filteredTasks,
        inspections: filteredInspections,
        complaints: filteredComplaints,
        notifications,

        // Unfiltered lists (restricted for non-admin)
        allAreas: accessibleAllAreas,
        allTasks: accessibleAllTasks,

        // Operations
        toggleTaskChecklist,
        updateTaskMeta,
        addTaskChecklistItem,
        addCleaningTask,
        updateTaskSupply,
        updateTaskRemark,
        updateTaskPhotos,
        exportTaskToMonthlyReport,
        removeTaskFromMonthlyReport,
        bulkExportToMonthlyReport,
        exportTasksToMonthlyReport: bulkExportToMonthlyReport,
        updateTaskWorkDescription,
        updateTaskStatus,
        submitTaskCompletion,
        submitQCInspection,
        submitNewComplaint,
        startHandlingComplaint,
        requestComplaintExtension,
        respondToComplaintExtension,
        resolveComplaint,
        addArea,
        updateArea,
        deleteArea,
        addCleaner,
        updateCleaner,
        deleteCleaner,
        updateCleanerAttendance,
        batchSetCleanerAttendance,
        addShift,
        updateShift,
        deleteShift,
        toggleClockInOut,
        dismissNotification,
        acknowledgeComplaintNotifications,
        clearAllNotifications,
        triggerDeadlinePushNotification,
        resetToInitialData,

        // Dashboard KPI Config
        kpiConfig,
        updateKpiConfig,
        resetKpiConfig,
        toggleKpiWidget,

        // Authentication & Session
        isAuthenticated,
        login,
        instantLogin,
        logout,

        // System Reload Feature
        reloadSystemData,
        isReloading,

        // RBAC Permissions Matrix
        rbacPermissions,
        updateRbacPermission,
        resetRbacPermissions,
        hasAccess,

        // Delete helpers
        deleteSchedule,
        deleteComplaint,
        saveUploadedWorkSchedule,
        syncUploadedScheduleToCleaners,
        deleteUploadedWorkSchedule,
        saveUploadedMcpProgram,
        updateUploadedMcpCell,
        updateUploadedMcpRows,
        deleteUploadedMcpProgram,
        saveMcpChecklistResults,

        // Verifikasi / Approval Berjenjang Controller
        verifyTaskApproval,

        // Audit Trail Multi-Proyek
        auditLogs,
        addAuditLog,
        clearAuditLogs,

        // Real-Time Overdue Monitoring
        checkOverdueAreasAndTasks,

        // Klien Mode Data & Methods
        employeeTurnovers: filteredTurnovers,
        addEmployeeTurnover,
        deleteEmployeeTurnover,

        klienChecklistItems: filteredKlienChecklistItems,
        addKlienChecklistItem,
        updateKlienChecklistItem,
        deleteKlienChecklistItem,
        resetKlienChecklistItems,

        klienChecklistInspections: filteredKlienChecklistInspections,
        submitKlienChecklistInspection,
        deleteKlienChecklistInspection,

        specialJobs: filteredSpecialJobs,
        allSpecialJobs: specialJobs,
        addSpecialJob,
        updateSpecialJob,
        deleteSpecialJob,

        // Supabase Realtime State & Sync
        supabaseStatus,
        syncToSupabase,
        isInitialLoading,
      }}
    >
      {children}
    </CleaningContext.Provider>

  );
};

export const useCleaning = () => {
  const context = useContext(CleaningContext);
  if (!context) {
    throw new Error('useCleaning must be used within a CleaningProvider');
  }
  return context;
};
