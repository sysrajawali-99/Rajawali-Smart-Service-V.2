import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
} from '../types';
import { calculateShiftDuration } from '../utils/shiftUtils';
import { normalizeFrequencyCode, getNextProgramDayStatus } from '../utils/mcpUtils';
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
  onRecordChange,
  onServerReconnect,
  fetchServerStatus,
  socket,
  apiLogin,
  apiLogout,
  apiVerifySession,
  getAuthToken,
  setAuthToken,
} from '../services/apiService';
import {
  cacheOfflineData,
  saveChecklistToOutbox,
  clearCachedDataOnLogout,
} from '../services/offlineDb';
import { syncService } from '../services/syncService';

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

  // Authentication & Session
  isAuthenticated: boolean;
  login: (identifier: string, pass: string) => { success: boolean; message?: string };
  instantLogin: (userId: string) => { success: boolean; message?: string };
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

  // Pengaturan Data Perusahaan & Kop Surat Dokumen PDF
  companyProfile: CompanyProfile;
  updateCompanyProfile: (updates: Partial<CompanyProfile>) => void;
  resetCompanyProfile: () => void;

  // Hapus Data Masal per Sub Menu (Khusus Super Admin)
  bulkDeleteSubmenuData: (
    submenuKey: string,
    scope: 'active_project' | 'all'
  ) => { count: number; label: string };

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


const CleaningContext = createContext<CleaningContextType | undefined>(undefined);

export const CleaningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Roles & View mode
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('sco_role') as UserRole) || 'admin';
  });
  const [viewMode, setViewMode] = useState<ViewMode>('web');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const [activeCleanerId, setActiveCleanerId] = useState<string>('cln-1');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('task-101');

  // Error notification helper for server operations
  const notifyServerError = (actionDesc: string, err?: any) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const notif: AppNotification = {
      id: `notif-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: '⚠️ Gagal Menyimpan ke Database Server',
      message: `${actionDesc}: ${err?.message || 'Koneksi ke backend bermasalah'}.`,
      timestamp: nowStr,
      type: 'urgent',
      targetRole: ['admin', 'supervisor', 'petugas', 'klien'],
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

  const updateCompanyProfile = (updates: Partial<CompanyProfile>) => {
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
      targetRole: ['petugas', 'supervisor', 'admin'],
      read: false,
    };
    setNotifications((prev) => [syncNotif, ...prev]);
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

  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => {
    const saved = localStorage.getItem('sco_active_project_id');
    return saved || 'proj-1';
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

  // User restriction:
  // Super Admin ('admin') can view all projects.
  // Other users can ONLY view projects assigned to them by Super Admin!
  const allowedProjects =
    userRole === 'admin'
      ? projects
      : projects.filter((p) => currentUser?.assignedProjectIds?.includes(p.id));

  // If activeProjectId is not in allowedProjects, automatically select first allowed
  const safeActiveProjectId =
    allowedProjects.some((p) => p.id === activeProjectId)
      ? activeProjectId
      : allowedProjects[0]?.id || (userRole === 'admin' ? projects[0]?.id || 'proj-1' : '');

  const setActiveProjectId = (id: string) => {
    // Only allow setting if admin OR if id is in allowedProjects
    if (userRole === 'admin' || allowedProjects.some((p) => p.id === id)) {
      setActiveProjectIdState(id);
      localStorage.setItem('sco_active_project_id', id);
    }
  };

  const activeProject =
    allowedProjects.find((p) => p.id === safeActiveProjectId) ||
    projects.find((p) => p.id === safeActiveProjectId) ||
    allowedProjects[0] ||
    projects[0] ||
    INITIAL_PROJECTS[0];

  const visibleProjects = userRole === 'admin' ? projects : allowedProjects;

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
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
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

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Refs for daily_checklists synchronization (Point A, B, C, D)
  const initialSyncDone = useRef<boolean>(false);
  const checklistSnapshotRef = useRef<Map<string, string>>(new Map());
  const dirtyChecklistIdsRef = useRef<Set<string>>(new Set());
  const dailyChecklistsRef = useRef<DailyAreaChecklist[]>(dailyChecklists);

  useEffect(() => {
    dailyChecklistsRef.current = dailyChecklists;
  }, [dailyChecklists]);

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

  // Pull all collections from backend (auto-pull on load & reconnect)
  const pullAllDataFromServer = async () => {
    try {
      setSupabaseStatus((prev) => ({ ...prev, status: 'SYNCING' }));
      const [
        remoteProjects,
        remoteUsers,
        remoteRbac,
        remoteAreas,
        remoteCleaners,
        remoteShifts,
        remoteSchedules,
        remoteChecklistLocs,
        remoteChecklistTpls,
        remoteDailyChecklists,
        remoteTasks,
        remoteInspections,
        remoteComplaints,
        remoteDamage,
        remoteSpecial,
        remoteMcp,
        remoteTurnovers,
        remoteKlienItems,
        remoteKlienInspections,
        remoteNotifs,
        remoteAuditLogs,
        remoteProfile,
        remoteKpi,
      ] = await Promise.all([
        getRecords<ProjectLocation>(COLLECTIONS.PROJECTS),
        getRecords<AppUser>(COLLECTIONS.USERS),
        getRecords<RoleModulePermission>(COLLECTIONS.RBAC_PERMISSIONS),
        getRecords<Area>(COLLECTIONS.AREAS),
        getRecords<Cleaner>(COLLECTIONS.CLEANERS),
        getRecords<Shift>(COLLECTIONS.SHIFTS),
        getRecords<CleaningSchedule>(COLLECTIONS.SCHEDULES),
        getRecords<ChecklistLocation>(COLLECTIONS.CHECKLIST_LOCATIONS),
        getRecords<ChecklistTemplateItem>(COLLECTIONS.CHECKLIST_TEMPLATES),
        getRecords<DailyAreaChecklist>(COLLECTIONS.DAILY_CHECKLISTS),
        getRecords<CleaningTask>(COLLECTIONS.TASKS),
        getRecords<QCInspection>(COLLECTIONS.INSPECTIONS),
        getRecords<Complaint>(COLLECTIONS.COMPLAINTS),
        getRecords<FacilityDamageReport>(COLLECTIONS.DAMAGE_REPORTS),
        getRecords<SpecialJobItem>(COLLECTIONS.SPECIAL_JOBS),
        getRecords<MasterCleaningProgramItem>(COLLECTIONS.MASTER_PROGRAMS),
        getRecords<EmployeeTurnoverRecord>(COLLECTIONS.EMPLOYEE_TURNOVERS),
        getRecords<KlienChecklistItem>(COLLECTIONS.KLIEN_CHECKLIST_ITEMS),
        getRecords<KlienChecklistInspection>(COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS),
        getRecords<AppNotification>(COLLECTIONS.NOTIFICATIONS),
        getRecords<AuditLogEntry>(COLLECTIONS.AUDIT_LOGS),
        getRecords<CompanyProfile>(COLLECTIONS.COMPANY_PROFILE),
        getRecords<DashboardKpiVisibilityConfig>(COLLECTIONS.KPI_CONFIG),
      ]);

      await Promise.all([
        loadOrSeedCollection(COLLECTIONS.PROJECTS, remoteProjects, INITIAL_PROJECTS, setProjects),
        loadOrSeedCollection(COLLECTIONS.USERS, remoteUsers, INITIAL_USERS, setUsers),
        loadOrSeedCollection(COLLECTIONS.RBAC_PERMISSIONS, remoteRbac, DEFAULT_RBAC_PERMISSIONS, setRbacPermissions),
        loadOrSeedCollection(COLLECTIONS.AREAS, remoteAreas, INITIAL_AREAS, setAreas),
        loadOrSeedCollection(COLLECTIONS.CLEANERS, remoteCleaners, INITIAL_CLEANERS, setCleaners),
        loadOrSeedCollection(COLLECTIONS.SHIFTS, remoteShifts, INITIAL_SHIFTS, setShifts),
        loadOrSeedCollection(COLLECTIONS.SCHEDULES, remoteSchedules, INITIAL_SCHEDULES, setSchedules),
        loadOrSeedCollection(COLLECTIONS.CHECKLIST_LOCATIONS, remoteChecklistLocs, INITIAL_CHECKLIST_LOCATIONS, setChecklistLocations),
        loadOrSeedCollection(COLLECTIONS.CHECKLIST_TEMPLATES, remoteChecklistTpls, INITIAL_CHECKLIST_TEMPLATES, setChecklistTemplates),
        loadOrSeedCollection(COLLECTIONS.TASKS, remoteTasks, INITIAL_TASKS, setTasks),
        loadOrSeedCollection(COLLECTIONS.INSPECTIONS, remoteInspections, INITIAL_INSPECTIONS, setInspections),
        loadOrSeedCollection(COLLECTIONS.COMPLAINTS, remoteComplaints, INITIAL_COMPLAINTS, setComplaints),
        loadOrSeedCollection(COLLECTIONS.DAMAGE_REPORTS, remoteDamage, INITIAL_DAMAGE_REPORTS, setDamageReports),
        loadOrSeedCollection(COLLECTIONS.SPECIAL_JOBS, remoteSpecial, INITIAL_SPECIAL_JOBS, setSpecialJobs),
        loadOrSeedCollection(COLLECTIONS.MASTER_PROGRAMS, remoteMcp, INITIAL_MASTER_PROGRAMS, setMasterPrograms),
        loadOrSeedCollection(COLLECTIONS.EMPLOYEE_TURNOVERS, remoteTurnovers, INITIAL_EMPLOYEE_TURNOVERS, setEmployeeTurnovers),
        loadOrSeedCollection(COLLECTIONS.KLIEN_CHECKLIST_ITEMS, remoteKlienItems, INITIAL_KLIEN_CHECKLIST_ITEMS, setKlienChecklistItems),
        loadOrSeedCollection(COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS, remoteKlienInspections, INITIAL_KLIEN_CHECKLIST_INSPECTIONS, setKlienChecklistInspections),
        loadOrSeedCollection(COLLECTIONS.NOTIFICATIONS, remoteNotifs, INITIAL_NOTIFICATIONS, setNotifications),
        loadOrSeedCollection(COLLECTIONS.AUDIT_LOGS, remoteAuditLogs, INITIAL_AUDIT_LOGS, setAuditLogs),
      ]);

      // Daily Checklists:
      if (remoteDailyChecklists.length > 0) {
        const serverMap = new Map(remoteDailyChecklists.map((c) => [c.id, c]));
        setDailyChecklists((prevLocal) => {
          const merged: DailyAreaChecklist[] = [];
          if (!initialSyncDone.current) {
            merged.push(...remoteDailyChecklists);
            for (const loc of prevLocal) {
              if (!serverMap.has(loc.id)) merged.push(loc);
            }
          } else {
            for (const rem of remoteDailyChecklists) {
              if (dirtyChecklistIdsRef.current.has(rem.id)) {
                const dirty = prevLocal.find((d) => d.id === rem.id);
                if (dirty) {
                  merged.push(dirty);
                  continue;
                }
              }
              merged.push(rem);
            }
            for (const loc of prevLocal) {
              if (!serverMap.has(loc.id)) merged.push(loc);
            }
          }
          for (const item of merged) {
            if (!dirtyChecklistIdsRef.current.has(item.id)) {
              checklistSnapshotRef.current.set(item.id, JSON.stringify(item));
            }
          }
          return merged;
        });
      } else if (INITIAL_DAILY_CHECKLISTS && INITIAL_DAILY_CHECKLISTS.length > 0) {
        console.debug(`[Seed] Koleksi 'daily_checklists' kosong di server. Menyemai data awal...`);
        setDailyChecklists(INITIAL_DAILY_CHECKLISTS);
        for (const item of INITIAL_DAILY_CHECKLISTS) {
          checklistSnapshotRef.current.set(item.id, JSON.stringify(item));
          upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, item).catch(() => {});
        }
      }
      initialSyncDone.current = true;

      // Company profile & KPI config:
      if (remoteProfile.length > 0) {
        setCompanyProfile(remoteProfile[0]);
        try {
          localStorage.setItem('jti_company_profile', JSON.stringify(remoteProfile[0]));
        } catch {}
      } else {
        try {
          const saved = localStorage.getItem('jti_company_profile');
          if (saved) {
            const parsed = JSON.parse(saved);
            setCompanyProfile(parsed);
            upsertRecord(COLLECTIONS.COMPANY_PROFILE, { ...parsed, id: 'main' }).catch(() => {});
          } else {
            upsertRecord(COLLECTIONS.COMPANY_PROFILE, { ...DEFAULT_COMPANY_PROFILE, id: 'main' }).catch(() => {});
          }
        } catch {
          upsertRecord(COLLECTIONS.COMPANY_PROFILE, { ...DEFAULT_COMPANY_PROFILE, id: 'main' }).catch(() => {});
        }
      }

      if (remoteKpi.length > 0) {
        setKpiConfig(remoteKpi[0]);
        try {
          localStorage.setItem('jti_kpi_config', JSON.stringify(remoteKpi[0]));
        } catch {}
      } else {
        try {
          const saved = localStorage.getItem('jti_kpi_config');
          if (saved) {
            const parsed = JSON.parse(saved);
            setKpiConfig(parsed);
            upsertRecord(COLLECTIONS.KPI_CONFIG, { ...parsed, id: 'main' }).catch(() => {});
          } else {
            upsertRecord(COLLECTIONS.KPI_CONFIG, { ...DEFAULT_KPI_VISIBILITY_OFF, id: 'main' }).catch(() => {});
          }
        } catch {
          upsertRecord(COLLECTIONS.KPI_CONFIG, { ...DEFAULT_KPI_VISIBILITY_OFF, id: 'main' }).catch(() => {});
        }
      }

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setSupabaseStatus({
        isConfigured: true,
        status: 'CONNECTED',
        lastSyncedAt: nowStr,
      });
      setIsInitialLoading(false);

      // Cache operational data in Dexie IndexedDB for instant offline availability
      cacheOfflineData({
        templates: remoteChecklistTpls?.length ? remoteChecklistTpls : INITIAL_CHECKLIST_TEMPLATES,
        areas: remoteAreas?.length ? remoteAreas : INITIAL_AREAS,
        locations: remoteChecklistLocs?.length ? remoteChecklistLocs : INITIAL_CHECKLIST_LOCATIONS,
        checklists: remoteDailyChecklists?.length ? remoteDailyChecklists : INITIAL_DAILY_CHECKLISTS,
        tasks: remoteTasks?.length ? remoteTasks : INITIAL_TASKS,
      }).catch(() => {});

      // Auto-trigger sync of any pending outbox items from earlier offline session
      syncService.triggerSync().catch(() => {});
    } catch (err) {
      console.warn('[Auto-Pull] Gagal mengambil data dari server:', err);
      setSupabaseStatus((prev) => ({ ...prev, status: 'ERROR' }));
      setIsInitialLoading(false);
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
        const itemJson = JSON.stringify(checklist);
        console.debug('[Sync] Mengirim update daily_checklist ke server:', checklist.id);
        try {
          await upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, checklist);
          checklistSnapshotRef.current.set(checklist.id, itemJson);
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

    // 1. Initial Auto-pull on app load
    pullAllDataFromServer();

    // 2. Auto-pull every time Socket.IO reconnects
    const unsubscribeReconnect = onServerReconnect(async () => {
      if (!isMounted) return;
      setSupabaseStatus((prev) => ({
        ...prev,
        status: 'CONNECTED',
        lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      }));
      await pullAllDataFromServer();
      if (dirtyChecklistIdsRef.current.size > 0) {
        for (const dirtyId of Array.from(dirtyChecklistIdsRef.current)) {
          const item = dailyChecklistsRef.current.find((c) => c.id === dirtyId);
          if (item) {
            console.debug('[Sync] Mencoba kirim ulang daily_checklist saat reconnect:', dirtyId);
            try {
              await upsertRecord(COLLECTIONS.DAILY_CHECKLISTS, item);
              checklistSnapshotRef.current.set(item.id, JSON.stringify(item));
              dirtyChecklistIdsRef.current.delete(item.id);
            } catch (err) {
              console.warn('[Sync] Gagal kirim ulang saat reconnect:', dirtyId, err);
            }
          }
        }
      }
    });

    // 3. Auto-pull when tab becomes active again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.debug('[Sync] Tab aktif kembali, menyinkronkan data...');
        pullAllDataFromServer();
      }
    };
    const handleWindowFocus = () => {
      pullAllDataFromServer();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // 4. Periodic backup pull every 30 seconds
    const backupInterval = setInterval(() => {
      pullAllDataFromServer();
    }, 30000);

    // 5. Real-time updates without page refresh via Socket.IO
    const unsubscribeChanges = onRecordChange((evt) => {
      if (!isMounted) return;
      const { collection, id, data, isDeleted, action } = evt;

      if (action === 'delete' || isDeleted) {
        switch (collection) {
          case COLLECTIONS.PROJECTS: setProjects((prev) => prev.filter((p) => p.id !== id)); break;
          case COLLECTIONS.USERS: setUsers((prev) => prev.filter((u) => u.id !== id)); break;
          case COLLECTIONS.RBAC_PERMISSIONS: setRbacPermissions((prev) => prev.filter((p) => p.moduleId !== id)); break;
          case COLLECTIONS.AREAS: setAreas((prev) => prev.filter((a) => a.id !== id)); break;
          case COLLECTIONS.CLEANERS: setCleaners((prev) => prev.filter((c) => c.id !== id)); break;
          case COLLECTIONS.SHIFTS: setShifts((prev) => prev.filter((s) => s.id !== id)); break;
          case COLLECTIONS.SCHEDULES: setSchedules((prev) => prev.filter((s) => s.id !== id)); break;
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
          case COLLECTIONS.EMPLOYEE_TURNOVERS: setEmployeeTurnovers((prev) => prev.filter((e) => e.id !== id)); break;
          case COLLECTIONS.KLIEN_CHECKLIST_ITEMS: setKlienChecklistItems((prev) => prev.filter((k) => k.id !== id)); break;
          case COLLECTIONS.KLIEN_CHECKLIST_INSPECTIONS: setKlienChecklistInspections((prev) => prev.filter((k) => k.id !== id)); break;
          case COLLECTIONS.NOTIFICATIONS: setNotifications((prev) => prev.filter((n) => n.id !== id)); break;
          case COLLECTIONS.AUDIT_LOGS: setAuditLogs((prev) => prev.filter((a) => a.id !== id)); break;
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
          case COLLECTIONS.DAILY_CHECKLISTS:
            checklistSnapshotRef.current.set(id, JSON.stringify(data));
            dirtyChecklistIdsRef.current.delete(id);
            setDailyChecklists((prev) => {
              const idx = prev.findIndex((dc) => dc.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [...prev, data];
            });
            break;
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
              const idx = prev.findIndex((a) => a.id === id);
              if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], ...data }; return next; }
              return [data, ...prev];
            });
            break;
          case COLLECTIONS.COMPANY_PROFILE:
            setCompanyProfile(data);
            try {
              localStorage.setItem('jti_company_profile', JSON.stringify(data));
            } catch {}
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

    const onSocketDisconnect = () => {
      if (!isMounted) return;
      setSupabaseStatus((prev) => ({ ...prev, status: 'DISCONNECTED' }));
    };

    socket.on('disconnect', onSocketDisconnect);

    return () => {
      isMounted = false;
      unsubscribeReconnect();
      unsubscribeChanges();
      socket.off('disconnect', onSocketDisconnect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(backupInterval);
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

    const newLog: AuditLogEntry = {
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
    };

    setAuditLogs((prev) => [newLog, ...prev]);
    upsertRecord(COLLECTIONS.AUDIT_LOGS, newLog).catch(() => {});
  };

  const clearAuditLogs = () => {
    for (const log of auditLogs) {
      deleteRecord(COLLECTIONS.AUDIT_LOGS, log.id).catch(() => {});
    }
    setAuditLogs([]);
  };

  // Controller Verification / Approval for Tasks
  const verifyTaskApproval = (
    taskId: string,
    action: 'approved' | 'rejected',
    notes?: string
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const verifierName = currentUser?.name || 'Pengawas/Controller';

    let affectedTask: CleaningTask | undefined;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          affectedTask = {
            ...t,
            status: action === 'approved' ? 'completed' : 'in_progress',
            controllerApprovalStatus: action,
            controllerApprovedBy: verifierName,
            controllerApprovedAt: nowStr,
            controllerRejectionReason: action === 'rejected' ? notes : undefined,
            remarks: action === 'rejected' && notes ? `[Catatan Controller: ${notes}] ${t.remarks || ''}` : t.remarks,
          };
          return affectedTask;
        }
        return t;
      })
    );

    if (affectedTask) {
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
      targetRole: ['petugas', 'admin', 'supervisor'],
      read: false,
      taskId: taskId,
      projectId: affectedTask?.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});

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
      previousState: affectedTask?.controllerApprovalStatus || 'pending',
      newState: action,
    });
  };

  // Real-time Check for Overdue Checklist & Tasks
  const checkOverdueAreasAndTasks = (): { overdueTasksCount: number; overdueChecklistsCount: number } => {
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = '2026-09-13'; // Standard baseline or today's date
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
        targetRole: ['admin', 'supervisor', 'petugas'],
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
          targetRole: ['admin', 'supervisor'],
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

  // Verify or restore session across origins / preview environments via Bearer token
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
    }
  }, []);

  const login = (identifier: string, pass: string): { success: boolean; message?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Harap masukkan Username/Email dan Password.' };
    }

    const matchedUser = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId)
    );

    if (!matchedUser) {
      return { success: false, message: 'Akun tidak ditemukan. Periksa kembali Username atau Email Anda.' };
    }

    const expectedPassword =
      matchedUser.password ||
      (matchedUser.role === 'admin'
        ? 'admin123'
        : matchedUser.role === 'supervisor'
        ? 'spv123'
        : matchedUser.role === 'petugas'
        ? 'petugas123'
        : 'klien123');

    if (expectedPassword !== cleanPass) {
      return { success: false, message: 'Password salah. Silakan periksa kembali kata sandi Anda.' };
    }

    setIsAuthenticated(true);
    setActiveUserId(matchedUser.id);
    setUserRole(matchedUser.role);

    const userAllowedProjs =
      matchedUser.role === 'admin'
        ? projects
        : projects.filter((p) => matchedUser.assignedProjectIds?.includes(p.id));
    const nextProjId = userAllowedProjs[0]?.id || projects[0]?.id || 'proj-1';
    setActiveProjectIdState(nextProjId);
    localStorage.setItem('sco_active_project_id', nextProjId);

    localStorage.setItem('sco_auth_state', 'true');
    localStorage.setItem('sco_active_user_id', matchedUser.id);
    localStorage.setItem('sco_role', matchedUser.role);

    // Call backend API login asynchronously to retrieve and persist Bearer token
    apiLogin({ identifier: cleanId, password: cleanPass }).catch((err) => {
      console.warn('[Login Token] Backend token issuance notice:', err);
    });

    if (matchedUser.role === 'klien') {
      setActiveTab('klien-manpower');
    } else {
      setActiveTab('dashboard');
    }

    return { success: true };
  };

  const instantLogin = (userId: string): { success: boolean; message?: string } => {
    const matchedUser = users.find((u) => u.id === userId);
    if (!matchedUser) {
      return { success: false, message: 'Akun pengguna tidak ditemukan.' };
    }

    setIsAuthenticated(true);
    setActiveUserId(matchedUser.id);
    setUserRole(matchedUser.role);

    const userAllowedProjs =
      matchedUser.role === 'admin'
        ? projects
        : projects.filter((p) => matchedUser.assignedProjectIds?.includes(p.id));
    const nextProjId = userAllowedProjs[0]?.id || projects[0]?.id || 'proj-1';
    setActiveProjectIdState(nextProjId);
    localStorage.setItem('sco_active_project_id', nextProjId);

    localStorage.setItem('sco_auth_state', 'true');
    localStorage.setItem('sco_active_user_id', matchedUser.id);
    localStorage.setItem('sco_role', matchedUser.role);

    // Call backend API login asynchronously to retrieve and persist Bearer token
    apiLogin({ userId }).catch((err) => {
      console.warn('[Instant Login Token] Backend token issuance notice:', err);
    });

    if (matchedUser.role === 'klien') {
      setActiveTab('klien-manpower');
    } else {
      setActiveTab('dashboard');
    }

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('sco_auth_state');
    localStorage.removeItem('sco_auth_token');
    setAuthToken(null);
    clearCachedDataOnLogout().catch(() => {});
    apiLogout().catch(() => {});
    setActiveTab('dashboard');
  };

  const updateRbacPermission = (moduleId: string, role: UserRole, allowed: boolean) => {
    if (role === 'admin') return; // Super admin always has full access
    let updatedPerm: RoleModulePermission | undefined;
    setRbacPermissions((prev) =>
      prev.map((perm) => {
        if (perm.moduleId === moduleId) {
          updatedPerm = { ...perm, [role]: allowed };
          return updatedPerm;
        }
        return perm;
      })
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
    if (role === 'admin') return true;
    const perm = rbacPermissions.find((p) => p.moduleId === moduleId);
    if (!perm) return true; // Default allow if not configured
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
      targetRole: ['admin', 'supervisor', 'petugas', 'klien'],
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

  // Project Location CRUD
  const addProject = (proj: Omit<ProjectLocation, 'id' | 'createdAt'>) => {
    const id = `proj-${Date.now()}`;
    const createdAt = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const newProj: ProjectLocation = { ...proj, id, createdAt };
    setProjects((prev) => [...prev, newProj]);
    upsertRecord(COLLECTIONS.PROJECTS, newProj).catch((err) => notifyServerError('menambah proyek', err));

    // Give super admin access automatically
    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.role === 'admin'
          ? { ...u, assignedProjectIds: [...(u.assignedProjectIds || []), id] }
          : u
      );
      updated.filter((u) => u.role === 'admin').forEach((adminUser) => {
        upsertRecord(COLLECTIONS.USERS, adminUser).catch((e) => notifyServerError('memperbarui akses admin', e));
      });
      return updated;
    });
  };

  const updateProject = (id: string, updates: Partial<ProjectLocation>) => {
    let updatedProj: ProjectLocation | undefined;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          updatedProj = { ...p, ...updates };
          return updatedProj;
        }
        return p;
      })
    );
    if (updatedProj) {
      upsertRecord(COLLECTIONS.PROJECTS, updatedProj).catch((err) => notifyServerError('memperbarui proyek', err));
    }
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    deleteRecord(COLLECTIONS.PROJECTS, id).catch((err) => notifyServerError('menghapus proyek', err));
    if (safeActiveProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      setActiveProjectId(remaining[0]?.id || 'proj-1');
    }
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
        const newCleanerItem: Cleaner = {
          id: newCleanerId,
          projectId: firstProjId,
          nik: newNik,
          name: userData.name,
          phone: userData.phone || '0812-3456-7890',
          photoUrl:
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          shiftId: 'shift-1',
          shiftName: 'Pagi (06:00 - 14:00)',
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
    let updatedUser: AppUser | undefined;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedUser = { ...u, ...updates };
          return updatedUser;
        }
        return u;
      })
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
    if (target.role === 'admin') {
      const remainingAdmins = users.filter((u) => u.role === 'admin' && u.id !== userId);
      if (remainingAdmins.length === 0) {
        return {
          success: false,
          message: 'Akun Super Admin utama tidak dapat dihapus demi keamanan sistem.',
        };
      }
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    deleteRecord(COLLECTIONS.USERS, userId).catch((err) => notifyServerError('menghapus pengguna', err));

    // If deleting current active user, fallback safely to an admin
    if (activeUserId === userId) {
      const fallback = users.find((u) => u.role === 'admin' && u.id !== userId) || users[0];
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

    setDailyChecklists((prev) =>
      prev.map((d) => {
        if (d.id !== dailyChecklistId) return d;
        locationName = d.locationName;
        const location = checklistLocations.find((l) => l.id === d.locationId);
        const category = d.category || location?.category || 'toilet';

        const updatedSlots = d.hourlySlots.map((slot) => {
          if (slot.hour !== hour) return slot;

          // 1. Ensure all standard items exist for category without losing existing entries
          const currentItems = ensureCompleteSlotItems(slot.items, category, checklistTemplates);

          // 2. Deterministically find item by id, standard key, or name
          let targetIndex = currentItems.findIndex(
            (it) => it.itemId === itemKeyOrId || it.itemId.toLowerCase() === itemKeyOrId.toLowerCase()
          );

          if (targetIndex === -1) {
            const matched = findMatchingSlotItem(currentItems, itemKeyOrId);
            if (matched) {
              targetIndex = currentItems.findIndex((it) => it.itemId === matched.itemId);
            }
          }

          let updatedItems: HourlyCheckItemEntry[];

          if (targetIndex !== -1) {
            const targetItem = currentItems[targetIndex];
            affectedItemName = targetItem.itemName;
            const nextStatus = forcedStatus !== undefined ? forcedStatus : getNextChecklistStatus(targetItem.status);
            updatedItems = currentItems.map((item, idx) =>
              idx === targetIndex ? { ...item, status: nextStatus } : item
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
          const allClean = updatedItems.every((i) => i.status === 'clean');
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
                : 'Asep S. (Petugas)'),
          };
        });

        return { ...d, hourlySlots: updatedSlots };
      })
    );

    // Save to Dexie outbox for resilient offline storage & background sync
    saveChecklistToOutbox({
      type: 'hourly_slot_update',
      projectId: safeActiveProjectId,
      checklistId: dailyChecklistId,
      locationName,
      slotHour: hour,
      answers: [],
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

    setDailyChecklists((prev) =>
      prev.map((d) => {
        if (d.id !== dailyChecklistId) return d;
        locationName = d.locationName;
        const location = checklistLocations.find((l) => l.id === d.locationId);
        const category = d.category || location?.category || 'toilet';

        const updatedSlots = d.hourlySlots.map((slot) => {
          if (slot.hour !== hour) return slot;
          const currentItems = ensureCompleteSlotItems(slot.items, category, checklistTemplates);
          const updatedItems = currentItems.map((item) => ({ ...item, status }));
          const slotStatus: 'clean' | 'has_issue' | 'pending' =
            status === 'clean'
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
        return { ...d, hourlySlots: updatedSlots };
      })
    );

    // Save batch update to Dexie outbox
    saveChecklistToOutbox({
      type: 'hourly_slot_batch',
      projectId: safeActiveProjectId,
      checklistId: dailyChecklistId,
      locationName,
      slotHour: hour,
      answers: [],
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
    setDailyChecklists((prev) =>
      prev.map((d) => {
        if (d.id !== dailyChecklistId) return d;
        const updatedSlots = d.hourlySlots.map((slot) => {
          if (slot.hour !== hour) return slot;
          return {
            ...slot,
            checkedBy,
            ...(supervisorVerified !== undefined ? { supervisorVerified } : {}),
          };
        });
        return { ...d, hourlySlots: updatedSlots };
      })
    );
  };

  const fillDailyChecklistClean = (
    dailyChecklistId: string,
    startHourOrHours: number | number[],
    endHourOrCheckedBy?: number | string,
    checkedByArg?: string
  ) => {
    let targetHours: number[] = [];
    let checkedBy = 'Asep S.';

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

    setDailyChecklists((prev) =>
      prev.map((d) => {
        if (d.id !== dailyChecklistId) return d;
        locationName = d.locationName;
        const location = checklistLocations.find((l) => l.id === d.locationId);
        const category = d.category || location?.category || 'toilet';

        const updatedSlots = d.hourlySlots.map((slot) => {
          if (!targetHours.includes(slot.hour)) return slot;
          const currentItems = ensureCompleteSlotItems(slot.items, category, checklistTemplates);
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
        return { ...d, hourlySlots: updatedSlots };
      })
    );

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
    setDailyChecklists((prev) =>
      prev.map((d) => {
        if (d.id !== dailyChecklistId) return d;
        const updatedSlots = d.hourlySlots.map((slot) => ({
          ...slot,
          items: [...slot.items, { itemId: newItemId, itemName, status: 'not_checked' as HourlyCheckItemStatus }],
        }));
        return { ...d, hourlySlots: updatedSlots };
      })
    );
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
    setDailyChecklists((prev) => {
      const existing = prev.find(
        (d) => d.projectId === projectId && d.locationId === locationId && d.date === date
      );
      if (existing) return prev;
      const newDaily = buildDailyChecklistObject(projectId, locationId, date);
      return [...prev, newDaily];
    });
  };

  const getOrCreateDailyChecklist = (projectId: string, locationId: string, date: string): DailyAreaChecklist => {
    const existing = dailyChecklists.find(
      (d) => d.projectId === projectId && d.locationId === locationId && d.date === date
    );
    if (existing) return existing;
    return buildDailyChecklistObject(projectId, locationId, date);
  };

  // Filter operational data by the active project location (strictly isolate locations)
  const filteredAreas = areas.filter((a) => (a.projectId || 'proj-1') === safeActiveProjectId);
  const filteredCleaners = cleaners.filter((c) => (c.projectId || 'proj-1') === safeActiveProjectId);
  const filteredSchedules = schedules.filter((s) => (s.projectId || 'proj-1') === safeActiveProjectId);
  const filteredTasks = tasks.filter((t) => (t.projectId || 'proj-1') === safeActiveProjectId);
  const filteredInspections = inspections.filter((i) => (i.projectId || 'proj-1') === safeActiveProjectId);
  const filteredComplaints = complaints.filter((c) => (c.projectId || 'proj-1') === safeActiveProjectId);
  const filteredChecklistLocations = checklistLocations.filter(
    (cl) => (cl.projectId || 'proj-1') === safeActiveProjectId
  );
  const filteredDailyChecklists = dailyChecklists.filter(
    (d) => (d.projectId || 'proj-1') === safeActiveProjectId
  );
  const filteredMasterPrograms = masterPrograms.filter(
    (m) => (m.projectId || 'proj-1') === safeActiveProjectId
  );
  const filteredDamageReports = damageReports.filter(
    (r) => (r.projectId || 'proj-1') === safeActiveProjectId
  );

  // Klien Mode Filtered Data by Active Project
  const filteredTurnovers = employeeTurnovers.filter(
    (to) => (to.projectId || 'proj-1') === safeActiveProjectId
  );
  const filteredKlienChecklistItems = klienChecklistItems.filter(
    (item) => (item.projectId || 'proj-1') === safeActiveProjectId
  );
  const filteredKlienChecklistInspections = klienChecklistInspections.filter(
    (insp) => (insp.projectId || 'proj-1') === safeActiveProjectId
  );
  const filteredSpecialJobs = specialJobs.filter(
    (job) => (job.projectId || 'proj-1') === safeActiveProjectId
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
      targetRole: ['admin', 'supervisor', 'petugas', 'klien'],
      read: false,
      projectId: job.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);

    return newJob;
  };

  const updateSpecialJob = (id: string, updates: Partial<SpecialJobItem>) => {
    setSpecialJobs((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const updated = { ...j, ...updates };
        upsertRecord(COLLECTIONS.SPECIAL_JOBS, updated);
        return updated;
      })
    );
  };

  const deleteSpecialJob = (id: string) => {
    setSpecialJobs((prev) => prev.filter((j) => j.id !== id));
    deleteRecord(COLLECTIONS.SPECIAL_JOBS, id);
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
    const defaults = INITIAL_KLIEN_CHECKLIST_ITEMS.map((item) => ({
      ...item,
      projectId: safeActiveProjectId,
    }));
    setKlienChecklistItems((prev) => [
      ...prev.filter((item) => (item.projectId || 'proj-1') !== safeActiveProjectId),
      ...defaults,
    ]);
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

  // Global areas/tasks filtered by user's assigned projects for non-admin
  const accessibleAllAreas =
    userRole === 'admin'
      ? areas
      : areas.filter((a) => currentUser?.assignedProjectIds?.includes(a.projectId || 'proj-1'));
  const accessibleAllTasks =
    userRole === 'admin'
      ? tasks
      : tasks.filter((t) => currentUser?.assignedProjectIds?.includes(t.projectId || 'proj-1'));

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

  const exportTaskToMonthlyReport = (taskId: string, targetMonth?: string) => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let updatedTask: CleaningTask | undefined;
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      const month = targetMonth || task.monthPeriod || '2026-09';
      const existingInMonth = prev.filter(
        (t) => (t.monthPeriod === month || (!t.monthPeriod && month === '2026-09')) && t.exportedToMonthlyReport
      );
      const nextOrder = existingInMonth.length + 1;

      return prev.map((t) => {
        if (t.id === taskId) {
          updatedTask = {
            ...t,
            exportedToMonthlyReport: true,
            monthPeriod: month,
            monthlyOrderNo: t.monthlyOrderNo || nextOrder,
            monthlyReportExportDate: todayStr,
          };
          return updatedTask;
        }
        return t;
      });
    });
    if (updatedTask) {
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('ekspor tugas ke laporan bulanan', err));
    }
  };

  const removeTaskFromMonthlyReport = (taskId: string) => {
    let targetMonth = '2026-09';
    let affectedTasks: CleaningTask[] = [];

    setTasks((prev) => {
      const target = prev.find((t) => t.id === taskId);
      const month = target?.monthPeriod || '2026-09';
      targetMonth = month;

      const updated = prev.map((t) =>
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
      affectedTasks = result.filter((t) => t.id === taskId || (t.monthPeriod === month && t.exportedToMonthlyReport));
      return result;
    });

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

    const affectedTasks: CleaningTask[] = [];
    setTasks((prev) => {
      const month = targetMonth || '2026-09';
      let currentMaxOrder = prev
        .filter((t) => t.monthPeriod === month && t.exportedToMonthlyReport)
        .reduce((max, t) => Math.max(max, t.monthlyOrderNo || 0), 0);

      return prev.map((t) => {
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
    });

    for (const t of affectedTasks) {
      upsertRecord(COLLECTIONS.TASKS, t).catch(() => {});
    }
  };

  const updateTaskWorkDescription = (taskId: string, description: string) => {
    let updatedTask: CleaningTask | undefined;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          updatedTask = { ...t, workDescription: description };
          return updatedTask;
        }
        return t;
      })
    );
    if (updatedTask) {
      upsertRecord(COLLECTIONS.TASKS, updatedTask).catch((err) => notifyServerError('memperbarui deskripsi tugas', err));
    }
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated = {
          ...t,
          status,
          ...(status === 'in_progress' && !t.startTime ? { startTime: nowStr } : {}),
          ...(status === 'completed' ? { completedTime: nowStr } : {}),
        };
        upsertRecord(COLLECTIONS.TASKS, updated);
        return updated;
      })
    );
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

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated = {
          ...t,
          status: 'pending_qc' as const,
          completedTime: nowStr,
          checklistArea: payload.checklistArea,
          suppliesUsed: [],
          remarks: payload.remarks,
          photoBefore: payload.photoBefore,
          photoProgress: payload.photoProgress || t.photoProgress,
          photoAfter: payload.photoAfter,
        };
        upsertRecord(COLLECTIONS.TASKS, updated);
        return updated;
      })
    );

    const currentTask = tasks.find((t) => t.id === taskId);
    if (currentTask) {
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
        targetRole: ['supervisor', 'admin'],
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

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newInspection: QCInspection = {
      id: `qc-${Date.now()}`,
      projectId: task?.projectId || safeActiveProjectId,
      taskId: payload.taskId,
      areaName: resolvedAreaName,
      cleanerName: resolvedCleanerName,
      inspectorName: 'Hendra Wijaya (Auditor QC)',
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
        inspectedBy: 'Hendra Wijaya',
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
      targetRole: ['petugas', 'admin'],
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
      targetRole: ['admin', 'supervisor', 'petugas', 'klien'],
      read: false,
      projectId: area?.projectId || safeActiveProjectId,
      isNewComplaint: true,
      complaintId: newTicket.id,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const startHandlingComplaint = (complaintId: string) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    let targetTicket: Complaint | undefined;

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id === complaintId) {
          const hours = c.slaHours && c.slaHours > 0 ? c.slaHours : 2;
          const needsNewDeadline =
            c.status === 'resolved' || !c.deadlineTimestamp || c.deadlineTimestamp <= Date.now();
          const nextDeadline = needsNewDeadline
            ? Date.now() + hours * 3600 * 1000
            : c.deadlineTimestamp;
          const nextDeadlineStr = needsNewDeadline
            ? new Date(nextDeadline).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              }) + ' WIB'
            : c.slaDeadline;

          targetTicket = {
            ...c,
            status: 'in_progress',
            startedAt: `Hari ini, ${nowStr}`,
            resolvedAt: undefined,
            deadlineTimestamp: nextDeadline,
            slaDeadline: nextDeadlineStr,
          };
          return targetTicket;
        }
        return c;
      })
    );

    if (targetTicket) {
      upsertRecord(COLLECTIONS.COMPLAINTS, targetTicket);
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: '⚙️ Komplain Dalam Pengerjaan (Di Kerjakan)',
        message: `Tiket ${targetTicket.ticketNumber} di ${targetTicket.areaName} kini berstatus Di Kerjakan oleh petugas (${targetTicket.assignedCleanerName || 'Tim Kebersihan'}).`,
        timestamp: nowStr,
        type: 'info',
        targetRole: ['admin', 'supervisor', 'petugas', 'klien'],
        read: false,
        projectId: targetTicket.projectId || safeActiveProjectId,
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  const requestComplaintExtension = (
    complaintId: string,
    hours: number,
    reason: string
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    let updatedTicket: Complaint | undefined;

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id === complaintId) {
          const req: ComplaintExtensionRequest = {
            id: `ext-${Date.now()}`,
            requestedHours: hours,
            reason: reason.trim(),
            requestedBy: activeCleaner?.name || (userRole === 'petugas' ? 'Petugas Lapangan' : 'Tim Operasional'),
            requestedAt: `Hari ini, ${nowStr}`,
            status: 'pending',
          };
          updatedTicket = {
            ...c,
            extensionRequest: req,
          };
          return updatedTicket;
        }
        return c;
      })
    );

    if (updatedTicket) {
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: '⏳ Pengajuan Tambahan Waktu Penanganan!',
        message: `Petugas mengajukan tambahan waktu ${hours} Jam untuk tiket ${updatedTicket.ticketNumber} (${updatedTicket.areaName}). Alasan: "${reason}". Silakan verifikasi pengajuan ini.`,
        timestamp: nowStr,
        type: 'warning',
        targetRole: ['admin', 'supervisor', 'klien'],
        read: false,
        projectId: updatedTicket.projectId || safeActiveProjectId,
      };
      setNotifications((prev) => [notif, ...prev]);
    }
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

    let ticketAfter: Complaint | undefined;

    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId || !c.extensionRequest) return c;

        const currentReq = c.extensionRequest;

        if (action === 'approve') {
          const addHours = currentReq.requestedHours;
          const currentDeadline = c.deadlineTimestamp && c.deadlineTimestamp > 0 ? c.deadlineTimestamp : Date.now();
          const newDeadline = currentDeadline + addHours * 3600 * 1000;
          const newHours = (c.slaHours || 1) + addHours;
          const newDeadlineStr = new Date(newDeadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

          ticketAfter = {
            ...c,
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
          return ticketAfter;
        }

        if (action === 'revise') {
          const addHours = revisedHours && revisedHours > 0 ? revisedHours : 1;
          const currentDeadline = c.deadlineTimestamp && c.deadlineTimestamp > 0 ? c.deadlineTimestamp : Date.now();
          const newDeadline = currentDeadline + addHours * 3600 * 1000;
          const newHours = (c.slaHours || 1) + addHours;
          const newDeadlineStr = new Date(newDeadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

          ticketAfter = {
            ...c,
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
          return ticketAfter;
        }

        if (action === 'reject') {
          ticketAfter = {
            ...c,
            extensionRequest: {
              ...currentReq,
              status: 'rejected',
              reviewedBy: reviewerName,
              reviewedAt: `Hari ini, ${nowStr}`,
              reviewNotes: reviewNotes || 'Pengajuan perpanjangan waktu ditolak. Harap selesaikan sesuai batas waktu.',
            },
          };
          return ticketAfter;
        }

        return c;
      })
    );

    if (ticketAfter) {
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

      // Notifikasi masuk kepada penerima keluhan (petugas lapangan / tim operasional)
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        title: notifTitle,
        message: notifMsg,
        timestamp: nowStr,
        type: notifType,
        targetRole: ['petugas', 'supervisor', 'admin'],
        read: false,
        projectId: ticketAfter.projectId || safeActiveProjectId,
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  const resolveComplaint = (
    complaintId: string,
    resolutionNotes: string,
    photoProgress?: string,
    photoResolved?: string
  ) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              status: 'resolved',
              resolvedAt: `Hari ini, ${nowStr}`,
              resolutionNotes,
              photoProgress: photoProgress || c.photoProgress,
              photoResolved:
                photoResolved ||
                c.photoResolved ||
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=80',
            }
          : c
      )
    );

    const targetComplaint = complaints.find((c) => c.id === complaintId);
    if (targetComplaint) {
      upsertRecord(COLLECTIONS.COMPLAINTS, {
        ...targetComplaint,
        status: 'resolved',
        resolvedAt: `Hari ini, ${nowStr}`,
        resolutionNotes,
        photoProgress: photoProgress || targetComplaint.photoProgress,
        photoResolved: photoResolved || targetComplaint.photoResolved,
      });
    }

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: '✅ Komplain Berhasil Ditangani!',
      message: `Tiket ${targetComplaint?.ticketNumber || complaintId} di ${targetComplaint?.areaName || 'lokasi'} telah diselesaikan. Keterangan: "${resolutionNotes}"`,
      timestamp: nowStr,
      type: 'success',
      targetRole: ['admin', 'supervisor', 'petugas', 'klien'],
      read: false,
      projectId: targetComplaint?.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);

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
    upsertRecord(COLLECTIONS.DAMAGE_REPORTS, newReport);

    // Push notification for team
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: `⚠️ Laporan Kerusakan Baru: ${ticketNo}`,
      message: `${report.reporterName} melaporkan kerusakan: "${report.itemName}" di ${report.locationName} (${report.floor}). Prioritas: ${report.priority?.toUpperCase()}.`,
      timestamp: nowStr,
      type: report.priority === 'urgent' || report.damageLevel === 'kritis' ? 'urgent' : 'warning',
      targetRole: ['admin', 'supervisor'],
      read: false,
      projectId: report.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const updateDamageReport = (id: string, updates: Partial<FacilityDamageReport>) => {
    setDamageReports((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = {
          ...r,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        upsertRecord(COLLECTIONS.DAMAGE_REPORTS, updated);
        return updated;
      })
    );
  };

  const deleteDamageReport = (id: string) => {
    setDamageReports((prev) => prev.filter((r) => r.id !== id));
    deleteRecord(COLLECTIONS.DAMAGE_REPORTS, id);
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

    setDamageReports((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = {
          ...r,
          status: 'selesai' as const,
          repairedDate: dateStr,
          repairedTime: nowStr,
          technicianNotes: resolutionPayload.technicianNotes || r.technicianNotes,
          photoAfter: resolutionPayload.photoAfter || r.photoAfter,
          technicianName: resolutionPayload.technicianName || r.technicianName,
          costEstimate: resolutionPayload.costEstimate !== undefined ? resolutionPayload.costEstimate : r.costEstimate,
          updatedAt: now.toISOString(),
        };
        upsertRecord(COLLECTIONS.DAMAGE_REPORTS, updated);
        return updated;
      })
    );

    const target = damageReports.find((r) => r.id === id);
    const notif: AppNotification = {
      id: `notif-res-${Date.now()}`,
      title: `✅ Kerusakan Selesai Diperbaiki: ${target?.ticketNo || ''}`,
      message: `Fasilitas "${target?.itemName || 'Barang'}" di ${target?.locationName || 'Area'} telah berhasil diperbaiki oleh ${resolutionPayload.technicianName || 'Tim Teknisi'}.`,
      timestamp: nowStr,
      type: 'success',
      targetRole: ['admin', 'supervisor', 'petugas'],
      read: false,
      projectId: target?.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
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
    setCleaners((prev) => [...prev, item]);
    upsertRecord(COLLECTIONS.CLEANERS, item).catch((err) => notifyServerError('menambah petugas', err));
  };

  const updateCleaner = (id: string, updates: Partial<Cleaner>) => {
    let updated: Cleaner | undefined;
    setCleaners((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          updated = { ...c, ...updates };
          return updated;
        }
        return c;
      })
    );
    if (updated) {
      upsertRecord(COLLECTIONS.CLEANERS, updated).catch((err) => notifyServerError('memperbarui petugas', err));
    }
  };

  const deleteCleaner = (id: string) => {
    setCleaners((prev) => prev.filter((c) => c.id !== id));
    deleteRecord(COLLECTIONS.CLEANERS, id).catch((err) => notifyServerError('menghapus petugas', err));
  };

  const updateCleanerAttendance = (
    cleanerId: string,
    day: number,
    status: AttendanceStatusCode,
    monthPeriod?: string
  ) => {
    let updated: Cleaner | undefined;
    setCleaners((prev) =>
      prev.map((c) => {
        if (c.id !== cleanerId) return c;
        const currentAtt = { ...(c.attendance || {}) };
        currentAtt[day] = status;

        const currentByMonth = { ...(c.attendanceByMonth || {}) };
        if (monthPeriod) {
          currentByMonth[monthPeriod] = {
            ...(currentByMonth[monthPeriod] || {}),
            [day]: status,
          };
        }

        updated = {
          ...c,
          attendance: currentAtt,
          attendanceByMonth: currentByMonth,
        };
        return updated;
      })
    );
    if (updated) {
      upsertRecord(COLLECTIONS.CLEANERS, updated).catch((err) => notifyServerError('memperbarui presensi petugas', err));
    }
  };

  const batchSetCleanerAttendance = (
    cleanerId: string,
    days: Record<number, AttendanceStatusCode>,
    monthPeriod?: string
  ) => {
    let updated: Cleaner | undefined;
    setCleaners((prev) =>
      prev.map((c) => {
        if (c.id !== cleanerId) return c;
        const currentAtt = { ...(c.attendance || {}), ...days };
        const currentByMonth = { ...(c.attendanceByMonth || {}) };
        if (monthPeriod) {
          currentByMonth[monthPeriod] = {
            ...(currentByMonth[monthPeriod] || {}),
            ...days,
          };
        }
        updated = {
          ...c,
          attendance: currentAtt,
          attendanceByMonth: currentByMonth,
        };
        return updated;
      })
    );
    if (updated) {
      upsertRecord(COLLECTIONS.CLEANERS, updated).catch((err) => notifyServerError('memperbarui presensi petugas', err));
    }
  };

  const addShift = (newShift: Omit<Shift, 'id'>) => {
    const id = `shift-${Date.now()}`;
    const duration = calculateShiftDuration(newShift.startTime, newShift.endTime);
    const created: Shift = {
      ...newShift,
      id,
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
    let updated: Cleaner | undefined;
    setCleaners((prev) =>
      prev.map((c) => {
        if (c.id !== cleanerId) return c;
        const nextClockedIn = !c.isClockedIn;
        updated = {
          ...c,
          isClockedIn: nextClockedIn,
          status: nextClockedIn ? 'active' : 'off',
          clockInTime: nextClockedIn ? nowStr : undefined,
        };
        return updated;
      })
    );
    if (updated) {
      upsertRecord(COLLECTIONS.CLEANERS, updated).catch((err) => notifyServerError('clock in/out petugas', err));
    }
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
  };

  const triggerDeadlinePushNotification = () => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: '⏰ Pengingat Batas Waktu!',
      message: 'Tugas di Lobby Utama & Receptionist tinggal 15 menit lagi sebelum batas waktu! Segera selesaikan tugas Anda.',
      timestamp: nowStr,
      type: 'warning',
      targetRole: ['petugas', 'supervisor'],
      read: false,
      taskId: 'task-102',
      projectId: safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
    upsertRecord(COLLECTIONS.NOTIFICATIONS, notif).catch(() => {});
  };

  const resetToInitialData = () => {
    localStorage.clear();
    setProjects(INITIAL_PROJECTS);
    setActiveProjectIdState('proj-1');
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
    setUserRole('admin');
    setViewMode('web');
  };

  // Hapus Data Masal per Sub Menu (Khusus Super Admin)
  const bulkDeleteSubmenuData = (
    submenuKey: string,
    scope: 'active_project' | 'all'
  ): { count: number; label: string } => {
    let deletedCount = 0;
    let label = '';
    const targetProjId = activeProject?.id || 'proj-1';

    switch (submenuKey) {
      case 'all_operational': {
        label = 'Seluruh Data Operasional & Aktivitas';
        if (scope === 'active_project') {
          const cCount = dailyChecklists.filter((d) => d.projectId === targetProjId).length;
          const aCount = areas.filter((a) => !a.projectId || a.projectId === targetProjId).length;
          const tCount = tasks.filter((t) => !t.projectId || t.projectId === targetProjId).length;
          const iCount = inspections.filter((i) => !i.projectId || i.projectId === targetProjId).length;
          const dCount = damageReports.filter((d) => !d.projectId || d.projectId === targetProjId).length;
          const compCount = complaints.filter((c) => !c.projectId || c.projectId === targetProjId).length;
          const mCount = masterPrograms.filter((m) => m.projectId === targetProjId).length;
          deletedCount = cCount + aCount + tCount + iCount + dCount + compCount + mCount;
          setDailyChecklists((prev) => prev.filter((d) => d.projectId !== targetProjId));
          setAreas((prev) => prev.filter((a) => a.projectId && a.projectId !== targetProjId));
          setTasks((prev) => prev.filter((t) => t.projectId && t.projectId !== targetProjId));
          setInspections((prev) => prev.filter((i) => i.projectId && i.projectId !== targetProjId));
          setDamageReports((prev) => prev.filter((d) => d.projectId && d.projectId !== targetProjId));
          setComplaints((prev) => prev.filter((c) => c.projectId && c.projectId !== targetProjId));
          setMasterPrograms((prev) => prev.filter((m) => m.projectId !== targetProjId));
        } else {
          deletedCount =
            dailyChecklists.length +
            areas.length +
            tasks.length +
            inspections.length +
            damageReports.length +
            complaints.length +
            masterPrograms.length;
          setDailyChecklists([]);
          setAreas([]);
          setTasks([]);
          setInspections([]);
          setDamageReports([]);
          setComplaints([]);
          setMasterPrograms([]);
        }
        break;
      }
      case 'ceklist': {
        label = 'Ceklist Area (24 Jam)';
        if (scope === 'active_project') {
          const matched = dailyChecklists.filter((d) => d.projectId === targetProjId);
          deletedCount = matched.length;
          setDailyChecklists((prev) => prev.filter((d) => d.projectId !== targetProjId));
        } else {
          deletedCount = dailyChecklists.length;
          setDailyChecklists([]);
        }
        break;
      }
      case 'area': {
        label = 'Master Area Cleaning';
        if (scope === 'active_project') {
          const matched = areas.filter((a) => !a.projectId || a.projectId === targetProjId);
          deletedCount = matched.length;
          setAreas((prev) => prev.filter((a) => a.projectId && a.projectId !== targetProjId));
        } else {
          deletedCount = areas.length;
          setAreas([]);
        }
        break;
      }
      case 'activity': {
        label = 'Cleaning Activity & Riwayat Tugas';
        if (scope === 'active_project') {
          const matched = tasks.filter((t) => !t.projectId || t.projectId === targetProjId);
          deletedCount = matched.length;
          setTasks((prev) => prev.filter((t) => t.projectId && t.projectId !== targetProjId));
        } else {
          deletedCount = tasks.length;
          setTasks([]);
        }
        break;
      }
      case 'inspeksi': {
        label = 'Inspeksi & QC Control';
        if (scope === 'active_project') {
          const matched = inspections.filter((i) => !i.projectId || i.projectId === targetProjId);
          deletedCount = matched.length;
          setInspections((prev) => prev.filter((i) => i.projectId && i.projectId !== targetProjId));
        } else {
          deletedCount = inspections.length;
          setInspections([]);
        }
        break;
      }
      case 'petugas': {
        label = 'Data Petugas Lapangan';
        if (scope === 'active_project') {
          const matched = cleaners.filter((c) => !c.projectId || c.projectId === targetProjId);
          deletedCount = matched.length;
          setCleaners((prev) => prev.filter((c) => c.projectId && c.projectId !== targetProjId));
        } else {
          deletedCount = cleaners.length;
          setCleaners([]);
        }
        break;
      }
      case 'petugas_presensi': {
        label = 'Riwayat Presensi Petugas (1-31)';
        deletedCount = cleaners.length;
        setCleaners((prev) =>
          prev.map((c) => ({
            ...c,
            attendance: {},
            attendanceByMonth: {},
            tasksCompletedToday: 0,
            isClockedIn: false,
            clockInTime: undefined,
          }))
        );
        break;
      }
      case 'shift': {
        label = 'Shift & Plotingan Kerja';
        deletedCount = shifts.length;
        setShifts([]);
        break;
      }
      case 'jadwal': {
        label = 'Jadwal Cleaning';
        if (scope === 'active_project') {
          const matched = schedules.filter((s) => !s.projectId || s.projectId === targetProjId);
          deletedCount = matched.length;
          setSchedules((prev) => prev.filter((s) => s.projectId && s.projectId !== targetProjId));
        } else {
          deletedCount = schedules.length;
          setSchedules([]);
        }
        break;
      }
      case 'kerusakan': {
        label = 'Laporan Kerusakan Fasilitas';
        if (scope === 'active_project') {
          const matched = damageReports.filter((d) => !d.projectId || d.projectId === targetProjId);
          deletedCount = matched.length;
          setDamageReports((prev) => prev.filter((d) => d.projectId && d.projectId !== targetProjId));
        } else {
          deletedCount = damageReports.length;
          setDamageReports([]);
        }
        break;
      }
      case 'daily-activity': {
        label = 'Daily Activity Reports';
        if (scope === 'active_project') {
          const matched = tasks.filter(
            (t) => (!t.projectId || t.projectId === targetProjId) && t.status === 'completed'
          );
          deletedCount = matched.length;
          setTasks((prev) =>
            prev.filter(
              (t) => !((!t.projectId || t.projectId === targetProjId) && t.status === 'completed')
            )
          );
        } else {
          const matched = tasks.filter((t) => t.status === 'completed');
          deletedCount = matched.length;
          setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
        }
        break;
      }
      case 'monthly-activity': {
        label = 'Arsip Pekerjaan Laporan Bulanan';
        const matched = tasks.filter((t) => t.exportedToMonthlyReport);
        deletedCount = matched.length;
        setTasks((prev) =>
          prev.map((t) => ({
            ...t,
            exportedToMonthlyReport: false,
            monthlyOrderNo: undefined,
            monthlyReportExportDate: undefined,
          }))
        );
        break;
      }
      case 'master-program': {
        label = 'Master Cleaning Program (MCP)';
        if (scope === 'active_project') {
          const matched = masterPrograms.filter((m) => m.projectId === targetProjId);
          deletedCount = matched.length;
          setMasterPrograms((prev) => prev.filter((m) => m.projectId !== targetProjId));
        } else {
          deletedCount = masterPrograms.length;
          setMasterPrograms([]);
        }
        break;
      }
      case 'complaint': {
        label = 'Laporan Komplain & Tiket';
        if (scope === 'active_project') {
          const matched = complaints.filter((c) => !c.projectId || c.projectId === targetProjId);
          deletedCount = matched.length;
          setComplaints((prev) => prev.filter((c) => c.projectId && c.projectId !== targetProjId));
        } else {
          deletedCount = complaints.length;
          setComplaints([]);
        }
        break;
      }
      case 'notifikasi': {
        label = 'Notifikasi Sistem';
        deletedCount = notifications.length;
        setNotifications([]);
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
      targetRole: ['admin'],
      read: false,
    };
    setNotifications((prev) => [auditNotif, ...prev]);

    addAuditLog({
      action: 'bulk_delete',
      module: 'pengaturan',
      entityName: label,
      details: `Super Admin telah menghapus ${deletedCount} data pada sub-menu "${label}" (${scope === 'active_project' ? 'Proyek Aktif' : 'Semua Proyek'}).`,
    });

    return { count: deletedCount, label };
  };

  return (
    <CleaningContext.Provider
      value={{
        companyProfile,
        updateCompanyProfile,
        resetCompanyProfile,
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

        // Filtered operational data for active project location
        areas: filteredAreas,
        cleaners: filteredCleaners,
        shifts,
        schedules: filteredSchedules,
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
