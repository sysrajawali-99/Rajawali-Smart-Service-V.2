import React, { createContext, useContext, useState, useEffect } from 'react';
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
  isSupabaseConfigured,
  fetchSupabaseTasks,
  upsertSupabaseTask,
  fetchSupabaseComplaints,
  upsertSupabaseComplaint,
  fetchSupabaseDamageReports,
  upsertSupabaseDamageReport,
  fetchSupabaseSpecialJobs,
  upsertSupabaseSpecialJob,
  subscribeToSupabaseRealtime,
} from '../lib/supabaseService';

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

  // Dashboard KPI Visibility Configuration (Semua widget dinonaktifkan secara default sesuai instruksi user, dikonfigurasi melalui Pengaturan & Master Data)
  const [kpiConfig, setKpiConfig] = useState<DashboardKpiVisibilityConfig>(() => {
    try {
      const saved = localStorage.getItem('sco_dashboard_kpi_config');
      if (saved) {
        return { ...DEFAULT_KPI_VISIBILITY_OFF, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load dashboard KPI config:', e);
    }
    return DEFAULT_KPI_VISIBILITY_OFF;
  });

  const updateKpiConfig = (newConfig: DashboardKpiVisibilityConfig) => {
    setKpiConfig(newConfig);
    try {
      localStorage.setItem('sco_dashboard_kpi_config', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Failed to save dashboard KPI config:', e);
    }
  };

  const resetKpiConfig = () => {
    setKpiConfig(DEFAULT_KPI_VISIBILITY_OFF);
    try {
      localStorage.setItem('sco_dashboard_kpi_config', JSON.stringify(DEFAULT_KPI_VISIBILITY_OFF));
    } catch (e) {
      console.error('Failed to reset dashboard KPI config:', e);
    }
  };

  const toggleKpiWidget = (key: keyof DashboardKpiVisibilityConfig) => {
    const updated = { ...kpiConfig, [key]: !kpiConfig[key] };
    updateKpiConfig(updated);
  };

  // Pengaturan Data Perusahaan & Kop Surat Laporan PDF / Login Page
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem('sco_company_profile');
      if (saved) {
        return { ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load company profile:', e);
    }
    return DEFAULT_COMPANY_PROFILE;
  });

  const updateCompanyProfile = (updates: Partial<CompanyProfile>) => {
    setCompanyProfile((prev) => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem('sco_company_profile', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save company profile:', e);
      }
      return updated;
    });
  };

  const resetCompanyProfile = () => {
    setCompanyProfile(DEFAULT_COMPANY_PROFILE);
    try {
      localStorage.setItem('sco_company_profile', JSON.stringify(DEFAULT_COMPANY_PROFILE));
    } catch (e) {
      console.error('Failed to reset company profile:', e);
    }
  };

  // 2. Offline Mode & Auto Sync Management
  const [isOnline, setIsOnlineState] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [offlineQueue, setOfflineQueue] = useState<OfflineSyncEntry[]>(() => {
    const saved = localStorage.getItem('sco_offline_queue');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('sco_last_synced') || null;
  });

  useEffect(() => {
    localStorage.setItem('sco_offline_queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

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
  const [projects, setProjects] = useState<ProjectLocation[]>(() => {
    const saved = localStorage.getItem('sco_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => {
    const saved = localStorage.getItem('sco_active_project_id');
    return saved || 'proj-1';
  });

  // 3. Users & Project Assignments
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('sco_users');
    if (!saved) return INITIAL_USERS;
    try {
      const parsed: AppUser[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map((u) => u.id));
      const missing = INITIAL_USERS.filter((u) => !existingIds.has(u.id));
      return [...parsed, ...missing];
    } catch {
      return INITIAL_USERS;
    }
  });

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
  const [checklistLocations, setChecklistLocations] = useState<ChecklistLocation[]>(() => {
    const saved = localStorage.getItem('sco_checklist_locations');
    if (!saved) return INITIAL_CHECKLIST_LOCATIONS;
    try {
      const parsed: ChecklistLocation[] = JSON.parse(saved);
      // Ensure any newly added initial locations (like proj-3) are merged in if missing
      const existingIds = new Set(parsed.map((l) => l.id));
      const missingInitials = INITIAL_CHECKLIST_LOCATIONS.filter((l) => !existingIds.has(l.id));
      return [...parsed, ...missingInitials].map((l) => ({
        ...l,
        projectId: l.projectId || 'proj-1',
      }));
    } catch {
      return INITIAL_CHECKLIST_LOCATIONS;
    }
  });

  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplateItem[]>(() => {
    const saved = localStorage.getItem('sco_checklist_templates');
    return saved ? JSON.parse(saved) : INITIAL_CHECKLIST_TEMPLATES;
  });

  const [dailyChecklists, setDailyChecklists] = useState<DailyAreaChecklist[]>(() => {
    const saved = localStorage.getItem('sco_daily_checklists');
    const raw: DailyAreaChecklist[] = saved ? JSON.parse(saved) : INITIAL_DAILY_CHECKLISTS;
    return raw.map((d) => ({
      ...d,
      hourlySlots: (d.hourlySlots || []).map((slot) => ({
        ...slot,
        items: ensureCompleteSlotItems(slot.items, d.category || 'toilet', INITIAL_CHECKLIST_TEMPLATES),
      })),
    }));
  });

  // 5. Core Operational Data
  const [areas, setAreas] = useState<Area[]>(() => {
    const saved = localStorage.getItem('sco_areas');
    if (!saved) return INITIAL_AREAS;
    try {
      const parsed: Area[] = JSON.parse(saved);
      const normalized = parsed.map((a) => ({
        ...a,
        projectId: a.projectId || 'proj-1',
      }));
      const existingIds = new Set(normalized.map((a) => a.id));
      const missing = INITIAL_AREAS.filter((a) => !existingIds.has(a.id));
      return [...normalized, ...missing];
    } catch {
      return INITIAL_AREAS;
    }
  });

  const [cleaners, setCleaners] = useState<Cleaner[]>(() => {
    const saved = localStorage.getItem('sco_cleaners');
    if (!saved) return INITIAL_CLEANERS;
    try {
      const parsed: Cleaner[] = JSON.parse(saved);
      const normalized = parsed.map((c, idx) => ({
        ...c,
        projectId:
          c.projectId ||
          (c.id === 'cln-5' || c.id === 'cln-7'
            ? 'proj-2'
            : c.id === 'cln-6' || c.id === 'cln-8'
            ? 'proj-3'
            : 'proj-1'),
        workPlotting: c.workPlotting || INITIAL_CLEANERS[idx]?.workPlotting || 'Lobby & Koridor Utama',
        workPlottingUpdatedAt: c.workPlottingUpdatedAt || '07:00 WIB',
      }));
      const existingIds = new Set(normalized.map((c) => c.id));
      const missing = INITIAL_CLEANERS.filter((c) => !existingIds.has(c.id));
      return [...normalized, ...missing];
    } catch {
      return INITIAL_CLEANERS;
    }
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    const saved = localStorage.getItem('sco_shifts');
    if (saved) {
      try {
        const parsed: Shift[] = JSON.parse(saved);
        return parsed.map((s) => {
          const init = INITIAL_SHIFTS.find((i) => i.id === s.id);
          return {
            ...s,
            plottingAllocations:
              s.plottingAllocations && s.plottingAllocations.length > 0
                ? s.plottingAllocations
                : init?.plottingAllocations || [],
          };
        });
      } catch (e) {
        console.error('Failed to parse saved shifts', e);
      }
    }
    return INITIAL_SHIFTS;
  });

  const [schedules, setSchedules] = useState<CleaningSchedule[]>(() => {
    const saved = localStorage.getItem('sco_schedules');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULES;
  });

  const [tasks, setTasks] = useState<CleaningTask[]>(() => {
    const saved = localStorage.getItem('sco_tasks');
    if (!saved) return INITIAL_TASKS;
    try {
      const parsed: CleaningTask[] = JSON.parse(saved);
      const normalized = parsed.map((t) => ({
        ...t,
        projectId: t.projectId || 'proj-1',
      }));
      const existingIds = new Set(normalized.map((t) => t.id));
      const missing = INITIAL_TASKS.filter((t) => !existingIds.has(t.id));
      return [...normalized, ...missing];
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [inspections, setInspections] = useState<QCInspection[]>(() => {
    const saved = localStorage.getItem('sco_inspections');
    return saved ? JSON.parse(saved) : INITIAL_INSPECTIONS;
  });

  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    const saved = localStorage.getItem('sco_complaints');
    return saved ? JSON.parse(saved) : INITIAL_COMPLAINTS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('sco_notifs');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [masterPrograms, setMasterPrograms] = useState<MasterCleaningProgramItem[]>(() => {
    const saved = localStorage.getItem('sco_master_programs');
    if (saved) {
      try {
        const parsed: MasterCleaningProgramItem[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((p) => p.id));
        const missingInitials = INITIAL_MASTER_PROGRAMS.filter((p) => !existingIds.has(p.id));
        return [...parsed, ...missingInitials].map((p) => ({
          ...p,
          frequency: normalizeFrequencyCode(p.frequency),
        }));
      } catch (e) {
        console.error('Failed to parse master programs', e);
      }
    }
    return INITIAL_MASTER_PROGRAMS.map((p) => ({
      ...p,
      frequency: normalizeFrequencyCode(p.frequency),
    }));
  });

  const [damageReports, setDamageReports] = useState<FacilityDamageReport[]>(() => {
    const saved = localStorage.getItem('sco_damage_reports');
    if (saved) {
      try {
        const parsed: FacilityDamageReport[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((r) => r.id));
        const missingInitials = INITIAL_DAMAGE_REPORTS.filter((r) => !existingIds.has(r.id));
        return [...parsed, ...missingInitials];
      } catch (e) {
        console.error('Failed to parse damage reports', e);
      }
    }
    return INITIAL_DAMAGE_REPORTS;
  });

  // Klien Mode States (Turnover, Custom Checklist Items, Inspections)
  const [employeeTurnovers, setEmployeeTurnovers] = useState<EmployeeTurnoverRecord[]>(() => {
    const saved = localStorage.getItem('sco_employee_turnovers');
    if (saved) {
      try {
        const parsed: EmployeeTurnoverRecord[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((t) => t.id));
        const missing = INITIAL_EMPLOYEE_TURNOVERS.filter((t) => !existingIds.has(t.id));
        return [...parsed, ...missing];
      } catch (e) {
        console.error('Failed to parse employee turnovers', e);
      }
    }
    return INITIAL_EMPLOYEE_TURNOVERS;
  });

  const [klienChecklistItems, setKlienChecklistItems] = useState<KlienChecklistItem[]>(() => {
    const saved = localStorage.getItem('sco_klien_checklist_items');
    if (saved) {
      try {
        const parsed: KlienChecklistItem[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((i) => i.id));
        const missing = INITIAL_KLIEN_CHECKLIST_ITEMS.filter((i) => !existingIds.has(i.id));
        return [...parsed, ...missing];
      } catch (e) {
        console.error('Failed to parse klien checklist items', e);
      }
    }
    return INITIAL_KLIEN_CHECKLIST_ITEMS;
  });

  const [klienChecklistInspections, setKlienChecklistInspections] = useState<KlienChecklistInspection[]>(() => {
    const saved = localStorage.getItem('sco_klien_checklist_inspections');
    if (saved) {
      try {
        const parsed: KlienChecklistInspection[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((i) => i.id));
        const missing = INITIAL_KLIEN_CHECKLIST_INSPECTIONS.filter((i) => !existingIds.has(i.id));
        return [...parsed, ...missing];
      } catch (e) {
        console.error('Failed to parse klien checklist inspections', e);
      }
    }
    return INITIAL_KLIEN_CHECKLIST_INSPECTIONS;
  });

  const [specialJobs, setSpecialJobs] = useState<SpecialJobItem[]>(() => {
    const saved = localStorage.getItem('sco_special_jobs');
    if (saved) {
      try {
        const parsed: SpecialJobItem[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((j) => j.id));
        const missing = INITIAL_SPECIAL_JOBS.filter((j) => !existingIds.has(j.id));
        return [...parsed, ...missing];
      } catch (e) {
        console.error('Failed to parse special jobs', e);
      }
    }
    return INITIAL_SPECIAL_JOBS;
  });

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem('sco_damage_reports', JSON.stringify(damageReports));
  }, [damageReports]);

  useEffect(() => {
    localStorage.setItem('sco_employee_turnovers', JSON.stringify(employeeTurnovers));
  }, [employeeTurnovers]);

  useEffect(() => {
    localStorage.setItem('sco_klien_checklist_items', JSON.stringify(klienChecklistItems));
  }, [klienChecklistItems]);

  useEffect(() => {
    localStorage.setItem('sco_klien_checklist_inspections', JSON.stringify(klienChecklistInspections));
  }, [klienChecklistInspections]);

  useEffect(() => {
    localStorage.setItem('sco_special_jobs', JSON.stringify(specialJobs));
  }, [specialJobs]);

  // ==================== SUPABASE REALTIME STATE & SYNC ====================
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConfigured: boolean;
    status: string;
    lastSyncedAt: string | null;
  }>({
    isConfigured: isSupabaseConfigured(),
    status: isSupabaseConfigured() ? 'CONNECTING' : 'LOCAL_STORAGE',
    lastSyncedAt: null,
  });

  const syncToSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      setSupabaseStatus((prev) => ({ ...prev, status: 'SYNCING' }));
      for (const t of tasks) {
        await upsertSupabaseTask(t);
      }
      for (const c of complaints) {
        await upsertSupabaseComplaint(c);
      }
      for (const d of damageReports) {
        await upsertSupabaseDamageReport(d);
      }
      for (const s of specialJobs) {
        await upsertSupabaseSpecialJob(s);
      }
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setSupabaseStatus({
        isConfigured: true,
        status: 'CONNECTED',
        lastSyncedAt: nowStr,
      });
    } catch (e) {
      console.warn('[Supabase Sync Error]', e);
      setSupabaseStatus((prev) => ({ ...prev, status: 'ERROR' }));
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let isMounted = true;
    async function loadInitialSupabaseData() {
      try {
        const [remoteTasks, remoteComplaints, remoteDamage, remoteSpecial] = await Promise.all([
          fetchSupabaseTasks(),
          fetchSupabaseComplaints(),
          fetchSupabaseDamageReports(),
          fetchSupabaseSpecialJobs(),
        ]);
        if (!isMounted) return;
        if (remoteTasks && remoteTasks.length > 0) setTasks(remoteTasks);
        if (remoteComplaints && remoteComplaints.length > 0) setComplaints(remoteComplaints);
        if (remoteDamage && remoteDamage.length > 0) setDamageReports(remoteDamage);
        if (remoteSpecial && remoteSpecial.length > 0) setSpecialJobs(remoteSpecial);

        const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        setSupabaseStatus({
          isConfigured: true,
          status: 'CONNECTED',
          lastSyncedAt: nowStr,
        });
      } catch (err) {
        console.warn('[Supabase] Initial fetch error:', err);
      }
    }
    loadInitialSupabaseData();

    const unsubscribe = subscribeToSupabaseRealtime({
      onStatusChange: (status) => {
        if (!isMounted) return;
        setSupabaseStatus((prev) => ({
          ...prev,
          status: status === 'SUBSCRIBED' ? 'CONNECTED' : status,
          lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        }));
      },
      onTaskChange: (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' && payload.new) {
          const newTask: CleaningTask = {
            id: payload.new.id,
            areaId: payload.new.area_id || '',
            areaName: payload.new.area_name || payload.new.title,
            buildingFloor: 'Lt. 1',
            cleanerId: payload.new.cleaner_id || '',
            cleanerName: payload.new.cleaner_name || '',
            shift: 'Pagi (06:00 - 14:00)',
            scheduledTime: payload.new.scheduled_time || '08:00',
            deadlineTime: payload.new.deadline_time || '10:00',
            status: payload.new.status || 'pending',
            checklistArea: payload.new.checklist_items || [],
            suppliesUsed: payload.new.supplies_used || [],
            photoBefore: payload.new.photo_before,
            photoProgress: payload.new.photo_progress,
            photoAfter: payload.new.photo_after,
            photoProof: payload.new.photo_proof,
            completedTime: payload.new.completed_time,
            completedAt: payload.new.completed_at,
            remarks: payload.new.remarks,
            workDescription: payload.new.title,
          };
          setTasks((prev) => {
            if (prev.some((t) => t.id === newTask.id)) return prev;
            return [newTask, ...prev];
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === payload.new.id
                ? {
                    ...t,
                    status: payload.new.status || t.status,
                    completedTime: payload.new.completed_time || t.completedTime,
                    completedAt: payload.new.completed_at || t.completedAt,
                    photoBefore: payload.new.photo_before || t.photoBefore,
                    photoProgress: payload.new.photo_progress || t.photoProgress,
                    photoAfter: payload.new.photo_after || t.photoAfter,
                    photoProof: payload.new.photo_proof || t.photoProof,
                    remarks: payload.new.remarks || t.remarks,
                  }
                : t
            )
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      },
      onComplaintChange: (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' && payload.new) {
          const hours = 2;
          const now = Date.now();
          const newComplaint: Complaint = {
            id: payload.new.id,
            projectId: payload.new.project_id || 'proj-1',
            ticketNumber: payload.new.ticket_no || payload.new.id,
            reporterName: payload.new.reporter_name || 'Pelapor',
            reporterRole: payload.new.reporter_role || 'Staff',
            areaId: 'area-1',
            areaName: payload.new.location || 'Area',
            floor: 'Lt. 1',
            category: payload.new.category || 'kebersihan',
            description: payload.new.description || payload.new.title || '',
            priority: payload.new.priority || 'medium',
            status: payload.new.status || 'open',
            createdAt: payload.new.reported_at || payload.new.created_at || 'Hari ini, 08:00 WIB',
            resolvedAt: payload.new.resolved_at,
            assignedCleanerName: payload.new.assigned_to,
            resolutionNotes: payload.new.resolution_notes,
            slaHours: hours,
            slaMinutes: hours * 60,
            slaDeadline: '10:00 WIB',
            deadlineTimestamp: now + hours * 3600 * 1000,
          };
          setComplaints((prev) => {
            if (prev.some((c) => c.id === newComplaint.id)) return prev;
            return [newComplaint, ...prev];
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setComplaints((prev) =>
            prev.map((c) =>
              c.id === payload.new.id
                ? {
                    ...c,
                    status: payload.new.status || c.status,
                    resolvedAt: payload.new.resolved_at || c.resolvedAt,
                    assignedCleanerName: payload.new.assigned_to || c.assignedCleanerName,
                    resolutionNotes: payload.new.resolution_notes || c.resolutionNotes,
                  }
                : c
            )
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setComplaints((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      },
      onDamageReportChange: (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' && payload.new) {
          const newReport: FacilityDamageReport = {
            id: payload.new.id,
            ticketNo: payload.new.ticket_no || payload.new.id,
            projectId: payload.new.project_id || 'proj-1',
            itemName: payload.new.item_name || 'Fasilitas',
            category: 'mekanikal',
            locationName: payload.new.area_name || 'Area Gedung',
            floor: 'Lantai GF',
            damageLevel: payload.new.severity || 'sedang',
            chronology: payload.new.description || '',
            impact: 'Perlu penanganan teknisi',
            actionTaken: 'Dipasang barikade pengaman',
            status: payload.new.status || 'dilaporkan',
            reportDate: (payload.new.reported_at || new Date().toISOString()).split('T')[0],
            reporterName: payload.new.reporter_name || 'Petugas',
            targetDepartment: 'Engineering & Maintenance',
            photoBefore: (payload.new.photo_urls && payload.new.photo_urls[0]) || undefined,
            technicianNotes: payload.new.repair_notes,
            priority: 'medium',
          };
          setDamageReports((prev) => {
            if (prev.some((d) => d.id === newReport.id)) return prev;
            return [newReport, ...prev];
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setDamageReports((prev) =>
            prev.map((d) =>
              d.id === payload.new.id
                ? {
                    ...d,
                    status: payload.new.status || d.status,
                    technicianNotes: payload.new.repair_notes || d.technicianNotes,
                  }
                : d
            )
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setDamageReports((prev) => prev.filter((d) => d.id !== payload.old.id));
        }
      },
      onSpecialJobChange: (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' && payload.new) {
          const newJob: SpecialJobItem = {
            id: payload.new.id,
            ticketNo: payload.new.ticket_no || payload.new.id,
            projectId: payload.new.project_id || 'proj-1',
            title: payload.new.title,
            workDescription: payload.new.work_description || payload.new.title,
            workMethod: payload.new.work_method || 'SOP Pembersihan Khusus',
            location: payload.new.location || 'Area Khusus',
            floor: payload.new.floor || 'Lt. 1',
            sourceType: 'supervisor_request',
            requestedBy: 'Supervisor Operasional',
            requestedByRole: 'Supervisor Operasional',
            requestReason: 'Pekerjaan khusus berkala',
            assignedPicName: payload.new.pic_name || 'Petugas Kebersihan',
            shiftName: 'Pagi (06:00 - 14:00)',
            priority: 'high',
            scheduledDate: payload.new.scheduled_date || new Date().toISOString().split('T')[0],
            scheduledTime: '09:00 - 11:00 WIB',
            targetDurationMinutes: 120,
            status: payload.new.status || 'requested',
            photoBefore: payload.new.photo_before,
            photoProgress: payload.new.photo_progress,
            photoAfter: payload.new.photo_after,
            completedAt: payload.new.completed_at,
            createdAt: payload.new.created_at || new Date().toISOString(),
          };
          setSpecialJobs((prev) => {
            if (prev.some((s) => s.id === newJob.id)) return prev;
            return [newJob, ...prev];
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setSpecialJobs((prev) =>
            prev.map((s) =>
              s.id === payload.new.id
                ? {
                    ...s,
                    status: payload.new.status || s.status,
                    completedAt: payload.new.completed_at || s.completedAt,
                    photoBefore: payload.new.photo_before || s.photoBefore,
                    photoProgress: payload.new.photo_progress || s.photoProgress,
                    photoAfter: payload.new.photo_after || s.photoAfter,
                  }
                : s
            )
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setSpecialJobs((prev) => prev.filter((s) => s.id !== payload.old.id));
        }
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('sco_master_programs', JSON.stringify(masterPrograms));
  }, [masterPrograms]);
  useEffect(() => {
    localStorage.setItem('sco_role', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('sco_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('sco_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('sco_active_user_id', activeUserId);
  }, [activeUserId]);

  useEffect(() => {
    localStorage.setItem('sco_checklist_locations', JSON.stringify(checklistLocations));
  }, [checklistLocations]);

  useEffect(() => {
    localStorage.setItem('sco_checklist_templates', JSON.stringify(checklistTemplates));
  }, [checklistTemplates]);

  useEffect(() => {
    localStorage.setItem('sco_daily_checklists', JSON.stringify(dailyChecklists));
  }, [dailyChecklists]);

  useEffect(() => {
    localStorage.setItem('sco_areas', JSON.stringify(areas));
  }, [areas]);

  useEffect(() => {
    localStorage.setItem('sco_cleaners', JSON.stringify(cleaners));
  }, [cleaners]);

  useEffect(() => {
    localStorage.setItem('sco_shifts', JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem('sco_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('sco_inspections', JSON.stringify(inspections));
  }, [inspections]);

  useEffect(() => {
    localStorage.setItem('sco_complaints', JSON.stringify(complaints));
  }, [complaints]);

  useEffect(() => {
    localStorage.setItem('sco_schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('sco_notifs', JSON.stringify(notifications));
  }, [notifications]);

  // Audit Logs (Multi-Proyek)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('sco_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse audit logs', e);
      }
    }
    return INITIAL_AUDIT_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('sco_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

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
  };

  const clearAuditLogs = () => {
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
          affectedTask = t;
          return {
            ...t,
            status: action === 'approved' ? 'completed' : 'in_progress',
            controllerApprovalStatus: action,
            controllerApprovedBy: verifierName,
            controllerApprovedAt: nowStr,
            controllerRejectionReason: action === 'rejected' ? notes : undefined,
            remarks: action === 'rejected' && notes ? `[Catatan Controller: ${notes}] ${t.remarks || ''}` : t.remarks,
          };
        }
        return t;
      })
    );

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
    return saved === 'true';
  });

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
    setActiveTab('dashboard');
  };

  // Role-Based Access Control (RBAC) Permissions Matrix
  const [rbacPermissions, setRbacPermissions] = useState<RoleModulePermission[]>(() => {
    const saved = localStorage.getItem('sco_rbac_permissions');
    if (saved) {
      try {
        const parsed: RoleModulePermission[] = JSON.parse(saved);
        const existingModuleIds = new Set(parsed.map((p) => p.moduleId));
        const missing = DEFAULT_RBAC_PERMISSIONS.filter((p) => !existingModuleIds.has(p.moduleId));
        return [...parsed, ...missing];
      } catch (e) {
        console.error('Failed to parse RBAC permissions', e);
      }
    }
    return DEFAULT_RBAC_PERMISSIONS;
  });

  useEffect(() => {
    localStorage.setItem('sco_rbac_permissions', JSON.stringify(rbacPermissions));
  }, [rbacPermissions]);

  const updateRbacPermission = (moduleId: string, role: UserRole, allowed: boolean) => {
    if (role === 'admin') return; // Super admin always has full access
    setRbacPermissions((prev) =>
      prev.map((perm) => (perm.moduleId === moduleId ? { ...perm, [role]: allowed } : perm))
    );
  };

  const resetRbacPermissions = () => {
    setRbacPermissions(DEFAULT_RBAC_PERMISSIONS);
    localStorage.setItem('sco_rbac_permissions', JSON.stringify(DEFAULT_RBAC_PERMISSIONS));
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
    await new Promise((res) => setTimeout(res, 650));

    // Reload from localStorage
    try {
      const savedProjects = localStorage.getItem('sco_projects');
      if (savedProjects) setProjects(JSON.parse(savedProjects));

      const savedSchedules = localStorage.getItem('sco_schedules');
      if (savedSchedules) setSchedules(JSON.parse(savedSchedules));

      const savedComplaints = localStorage.getItem('sco_complaints');
      if (savedComplaints) setComplaints(JSON.parse(savedComplaints));

      const savedReports = localStorage.getItem('sco_damage_reports');
      if (savedReports) setDamageReports(JSON.parse(savedReports));

      const savedPrograms = localStorage.getItem('sco_master_programs');
      if (savedPrograms) setMasterPrograms(JSON.parse(savedPrograms));

      const savedChecklists = localStorage.getItem('sco_daily_checklists');
      if (savedChecklists) setDailyChecklists(JSON.parse(savedChecklists));
    } catch (err) {
      console.warn('Reload sync info:', err);
    }

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const reloadNotif: AppNotification = {
      id: `notif-reload-${Date.now()}`,
      title: '🔄 Data Sistem Berhasil Dimuat Ulang',
      message: `Seluruh data operasional, jadwal, tiket, dan ceklist telah disegarkan per ${nowTime}.`,
      timestamp: nowTime,
      type: 'info',
      targetRole: ['admin', 'supervisor', 'petugas', 'klien'],
      read: false,
    };
    setNotifications((prev) => [reloadNotif, ...prev]);
    setIsReloading(false);
  };

  // Delete helpers for Schedule and Complaint
  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const deleteComplaint = (id: string) => {
    setComplaints((prev) => prev.filter((c) => c.id !== id));
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

    // Give super admin access automatically
    setUsers((prev) =>
      prev.map((u) =>
        u.role === 'admin'
          ? { ...u, assignedProjectIds: [...(u.assignedProjectIds || []), id] }
          : u
      )
    );
  };

  const updateProject = (id: string, updates: Partial<ProjectLocation>) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (safeActiveProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      setActiveProjectId(remaining[0]?.id || 'proj-1');
    }
  };

  const updateUserProjectAssignment = (userId: string, projectIds: string[]) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, assignedProjectIds: projectIds } : u))
    );
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
        setCleaners((prev) => [
          ...prev,
          {
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
          },
        ]);
      }
    }

    return newUser;
  };

  const updateUser = (userId: string, updates: Partial<AppUser>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
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
  };

  const updateChecklistLocation = (id: string, updates: Partial<ChecklistLocation>) => {
    setChecklistLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const deleteChecklistLocation = (id: string) => {
    setChecklistLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const addChecklistTemplate = (tpl: Omit<ChecklistTemplateItem, 'id'>) => {
    const id = `tpl-custom-${Date.now()}`;
    const newTpl: ChecklistTemplateItem = { ...tpl, id };
    setChecklistTemplates((prev) => [...prev, newTpl]);
    addAuditLog({
      action: 'create',
      module: 'pengaturan',
      entityId: id,
      entityName: tpl.name,
      details: `Menambah SOP Checklist baru: "${tpl.name}" [Kategori: ${tpl.category}]`,
    });
  };

  const updateChecklistTemplate = (id: string, updates: Partial<ChecklistTemplateItem>) => {
    setChecklistTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
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
    upsertSupabaseSpecialJob(newJob);

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
      prev.map((j) => (j.id === id ? { ...j, ...updates } : j))
    );
  };

  const deleteSpecialJob = (id: string) => {
    setSpecialJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const addEmployeeTurnover = (record: Omit<EmployeeTurnoverRecord, 'id' | 'createdAt'>) => {
    const newRecord: EmployeeTurnoverRecord = {
      ...record,
      id: `to-${Date.now()}`,
      projectId: record.projectId || safeActiveProjectId,
      createdAt: new Date().toISOString(),
    };
    setEmployeeTurnovers((prev) => [newRecord, ...prev]);
  };

  const deleteEmployeeTurnover = (id: string) => {
    setEmployeeTurnovers((prev) => prev.filter((r) => r.id !== id));
  };

  const addKlienChecklistItem = (item: Omit<KlienChecklistItem, 'id'>) => {
    const newItem: KlienChecklistItem = {
      ...item,
      id: `kci-${Date.now()}`,
      projectId: item.projectId || safeActiveProjectId,
    };
    setKlienChecklistItems((prev) => [...prev, newItem]);
  };

  const updateKlienChecklistItem = (id: string, updates: Partial<KlienChecklistItem>) => {
    setKlienChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const deleteKlienChecklistItem = (id: string) => {
    setKlienChecklistItems((prev) => prev.filter((item) => item.id !== id));
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
  };

  const deleteKlienChecklistInspection = (id: string) => {
    setKlienChecklistInspections((prev) => prev.filter((i) => i.id !== id));
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
  };

  const updateMasterProgram = (
    idOrItem: string | MasterCleaningProgramItem,
    updates?: Partial<MasterCleaningProgramItem>
  ) => {
    const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
    const itemUpdates = typeof idOrItem === 'string' ? (updates || {}) : idOrItem;
    setMasterPrograms((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              ...itemUpdates,
              ...(itemUpdates.frequency ? { frequency: normalizeFrequencyCode(itemUpdates.frequency) } : {}),
              updatedAt: new Date().toISOString(),
            }
          : m
      )
    );
  };

  const deleteMasterProgram = (id: string) => {
    setMasterPrograms((prev) => prev.filter((m) => m.id !== id));
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
        return {
          ...m,
          days: {
            ...m.days,
            [day]: nextStatus,
          },
          updatedAt: new Date().toISOString(),
        };
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
        return {
          ...m,
          days: newDays,
          updatedAt: new Date().toISOString(),
        };
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
  };

  const activeCleaner = filteredCleaners.find((c) => c.id === activeCleanerId) || filteredCleaners[0] || cleaners[0];

  const toggleTaskChecklist = (taskId: string, checklistId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          checklistArea: task.checklistArea.map((item) =>
            item.id === checklistId ? { ...item, checked: !item.checked } : item
          ),
        };
      })
    );
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
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          ...updates,
        };
      })
    );
  };

  const addTaskChecklistItem = (taskId: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const newItem: TaskChecklistItem = {
          id: `chk-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          label: trimmed,
          checked: false,
        };
        return {
          ...task,
          checklistArea: [...task.checklistArea, newItem],
        };
      })
    );
  };

  const addCleaningTask = (payload: Omit<CleaningTask, 'id'>) => {
    const newId = `task-${Date.now().toString().slice(-4)}`;
    const newTask: CleaningTask = {
      ...payload,
      id: newId,
      projectId: payload.projectId || safeActiveProjectId,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const updateTaskSupply = (taskId: string, supplyId: string, amount: number) => {
    // No-op (Inventory removed)
  };

  const updateTaskRemark = (taskId: string, remarks: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, remarks } : t))
    );
  };

  const updateTaskPhotos = (taskId: string, before?: string, progress?: string, after?: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          ...(before !== undefined ? { photoBefore: before } : {}),
          ...(progress !== undefined ? { photoProgress: progress } : {}),
          ...(after !== undefined ? { photoAfter: after } : {}),
        };
      })
    );
  };

  const exportTaskToMonthlyReport = (taskId: string, targetMonth?: string) => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      const month = targetMonth || task.monthPeriod || '2026-09';
      const existingInMonth = prev.filter(
        (t) => (t.monthPeriod === month || (!t.monthPeriod && month === '2026-09')) && t.exportedToMonthlyReport
      );
      const nextOrder = existingInMonth.length + 1;

      return prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              exportedToMonthlyReport: true,
              monthPeriod: month,
              monthlyOrderNo: t.monthlyOrderNo || nextOrder,
              monthlyReportExportDate: todayStr,
            }
          : t
      );
    });
  };

  const removeTaskFromMonthlyReport = (taskId: string) => {
    setTasks((prev) => {
      const target = prev.find((t) => t.id === taskId);
      const month = target?.monthPeriod || '2026-09';

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
      return updated.map((t) => {
        if (t.monthPeriod === month && t.exportedToMonthlyReport) {
          const item = { ...t, monthlyOrderNo: counter };
          counter++;
          return item;
        }
        return t;
      });
    });
  };

  const bulkExportToMonthlyReport = (taskIds: string[], targetMonth?: string) => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    setTasks((prev) => {
      const month = targetMonth || '2026-09';
      let currentMaxOrder = prev
        .filter((t) => t.monthPeriod === month && t.exportedToMonthlyReport)
        .reduce((max, t) => Math.max(max, t.monthlyOrderNo || 0), 0);

      return prev.map((t) => {
        if (taskIds.includes(t.id) && !t.exportedToMonthlyReport) {
          currentMaxOrder++;
          return {
            ...t,
            exportedToMonthlyReport: true,
            monthPeriod: month,
            monthlyOrderNo: currentMaxOrder,
            monthlyReportExportDate: todayStr,
          };
        }
        return t;
      });
    });
  };

  const updateTaskWorkDescription = (taskId: string, description: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, workDescription: description } : t))
    );
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
        upsertSupabaseTask(updated);
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
        upsertSupabaseTask(updated);
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

    if (task) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === payload.taskId
            ? {
                ...t,
                status: payload.status === 'passed' ? 'completed' : 'pending',
                qcScore: payload.score,
                qcStatus: payload.status === 'passed' ? 'approved' : 'rejected',
                qcNotes: payload.notes,
                inspectedBy: 'Hendra Wijaya',
                inspectedAt: nowStr,
              }
            : t
        )
      );

      setAreas((prev) =>
        prev.map((a) =>
          a.id === task.areaId
            ? { ...a, status: payload.status === 'passed' ? 'inspected' : 'needs_cleaning' }
            : a
        )
      );
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
    upsertSupabaseComplaint(newTicket);

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
      upsertSupabaseComplaint(targetTicket);
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
      upsertSupabaseComplaint({
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
    upsertSupabaseDamageReport(newReport);

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
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const deleteDamageReport = (id: string) => {
    setDamageReports((prev) => prev.filter((r) => r.id !== id));
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
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'selesai',
              repairedDate: dateStr,
              repairedTime: nowStr,
              technicianNotes: resolutionPayload.technicianNotes || r.technicianNotes,
              photoAfter: resolutionPayload.photoAfter || r.photoAfter,
              technicianName: resolutionPayload.technicianName || r.technicianName,
              costEstimate: resolutionPayload.costEstimate !== undefined ? resolutionPayload.costEstimate : r.costEstimate,
              updatedAt: now.toISOString(),
            }
          : r
      )
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
    setAreas((prev) => [...prev, { ...newArea, id, projectId: newArea.projectId || safeActiveProjectId }]);
  };

  const updateArea = (id: string, updates: Partial<Area>) => {
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const deleteArea = (id: string) => {
    setAreas((prev) => prev.filter((a) => a.id !== id));
  };

  const addCleaner = (newCleaner: Omit<Cleaner, 'id'>) => {
    const id = `cln-${Date.now()}`;
    setCleaners((prev) => [...prev, { ...newCleaner, id, projectId: newCleaner.projectId || safeActiveProjectId }]);
  };

  const updateCleaner = (id: string, updates: Partial<Cleaner>) => {
    setCleaners((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteCleaner = (id: string) => {
    setCleaners((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCleanerAttendance = (
    cleanerId: string,
    day: number,
    status: AttendanceStatusCode,
    monthPeriod?: string
  ) => {
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

        return {
          ...c,
          attendance: currentAtt,
          attendanceByMonth: currentByMonth,
        };
      })
    );
  };

  const batchSetCleanerAttendance = (
    cleanerId: string,
    days: Record<number, AttendanceStatusCode>,
    monthPeriod?: string
  ) => {
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
        return {
          ...c,
          attendance: currentAtt,
          attendanceByMonth: currentByMonth,
        };
      })
    );
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
  };

  const updateShift = (id: string, updates: Partial<Shift>) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const startTime = updates.startTime !== undefined ? updates.startTime : s.startTime;
        const endTime = updates.endTime !== undefined ? updates.endTime : s.endTime;
        const duration = calculateShiftDuration(startTime, endTime);
        return {
          ...s,
          ...updates,
          workHoursDuration: duration.totalHoursDecimal,
          durationText: duration.text,
        };
      })
    );
  };

  const deleteShift = (id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleClockInOut = (cleanerId: string) => {
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    setCleaners((prev) =>
      prev.map((c) => {
        if (c.id !== cleanerId) return c;
        const nextClockedIn = !c.isClockedIn;
        return {
          ...c,
          isClockedIn: nextClockedIn,
          status: nextClockedIn ? 'active' : 'off',
          clockInTime: nextClockedIn ? nowStr : undefined,
        };
      })
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const acknowledgeComplaintNotifications = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.isNewComplaint ||
        n.title.includes('Komplain Baru') ||
        n.title.includes('Keluhan Baru')
          ? { ...n, read: true }
          : n
      )
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
    localStorage.setItem('sco_dashboard_kpi_config', JSON.stringify(DEFAULT_KPI_VISIBILITY_OFF));
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
