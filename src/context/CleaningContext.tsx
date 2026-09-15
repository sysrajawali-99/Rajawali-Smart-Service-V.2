import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  ViewMode,
  Area,
  Cleaner,
  Shift,
  CleaningSchedule,
  CleaningTask,
  QCInspection,
  Complaint,
  AppNotification,
  TaskChecklistItem,
  SupplyUsage,
  ProjectLocation,
  AppUser,
  ChecklistLocation,
  ChecklistTemplateItem,
  DailyAreaChecklist,
  HourlyCheckItemStatus,
  HourlyCheckItemEntry,
  OfflineSyncEntry,
  MasterCleaningProgramItem,
  ProgramDayStatus,
  AttendanceStatusCode,
} from '../types';
import { calculateShiftDuration } from '../utils/shiftUtils';
import { normalizeFrequencyCode } from '../utils/mcpUtils';
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
  INITIAL_CHECKLIST_TEMPLATES,
  INITIAL_CHECKLIST_LOCATIONS,
  INITIAL_DAILY_CHECKLISTS,
  INITIAL_MASTER_PROGRAMS,
  generate24HourSlots,
} from '../data/initialData';
import {
  ensureCompleteSlotItems,
  findMatchingSlotItem,
  getNextChecklistStatus,
} from '../utils/checklistHelper';
import confetti from 'canvas-confetti';

interface CleaningContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeCleanerId: string;
  setActiveCleanerId: (id: string) => void;
  activeCleaner: Cleaner;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Connection & Offline Queue
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  offlineQueue: OfflineSyncEntry[];
  syncOfflineData: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Project Location Management & User Access Restrictions
  projects: ProjectLocation[];
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
  updateMasterProgram: (id: string, updates: Partial<MasterCleaningProgramItem>) => void;
  deleteMasterProgram: (id: string) => void;
  toggleMasterProgramDay: (programId: string, day: number, forcedStatus?: ProgramDayStatus) => void;
  batchSetMasterProgramDays: (programId: string, days: number[], status: ProgramDayStatus) => void;
  duplicateMasterProgram: (id: string) => void;

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
  updateTaskSupply: (taskId: string, supplyId: string, amount: number) => void;
  updateTaskRemark: (taskId: string, remarks: string) => void;
  updateTaskPhotos: (taskId: string, before?: string, progress?: string, after?: string) => void;
  exportTaskToMonthlyReport: (taskId: string, targetMonth?: string) => void;
  removeTaskFromMonthlyReport: (taskId: string) => void;
  bulkExportToMonthlyReport: (taskIds: string[], targetMonth?: string) => void;
  exportTasksToMonthlyReport: (taskIds: string[], targetMonth?: string) => void;
  updateTaskWorkDescription: (taskId: string, description: string) => void;
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
      score: number;
      status: 'passed' | 'failed' | 'needs_rework';
      criteriaScores: {
        floor: number;
        glassAndMirrors: number;
        odorAndAir: number;
        wasteManagement: number;
        suppliesCompleteness: number;
      };
      notes: string;
      photoProof?: string;
    }
  ) => void;
  submitNewComplaint: (
    payload: {
      reporterName: string;
      reporterRole: string;
      areaId: string;
      category: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      photoBefore?: string;
    }
  ) => void;
  resolveComplaint: (
    complaintId: string,
    resolutionNotes: string,
    photoResolved?: string
  ) => void;
  addArea: (newArea: Omit<Area, 'id'>) => void;
  updateArea: (id: string, updates: Partial<Area>) => void;
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
  clearAllNotifications: () => void;
  triggerDeadlinePushNotification: () => void;
  resetToInitialData: () => void;
}

const CleaningContext = createContext<CleaningContextType | undefined>(undefined);

export const CleaningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Roles & View mode
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('sco_role') as UserRole) || 'admin';
  });
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [activeCleanerId, setActiveCleanerId] = useState<string>('cln-1');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('task-101');

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
    return saved ? JSON.parse(saved) : INITIAL_USERS;
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
      : projects.filter((p) => currentUser.assignedProjectIds?.includes(p.id));

  // If activeProjectId is not in allowedProjects, automatically select first allowed
  const safeActiveProjectId =
    allowedProjects.some((p) => p.id === activeProjectId)
      ? activeProjectId
      : allowedProjects[0]?.id || projects[0]?.id || 'proj-1';

  const setActiveProjectId = (id: string) => {
    // Only allow setting if admin OR if id is in allowedProjects
    if (userRole === 'admin' || allowedProjects.some((p) => p.id === id)) {
      setActiveProjectIdState(id);
      localStorage.setItem('sco_active_project_id', id);
    }
  };

  const activeProject =
    projects.find((p) => p.id === safeActiveProjectId) || projects[0] || INITIAL_PROJECTS[0];

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
    return saved ? JSON.parse(saved) : INITIAL_AREAS;
  });

  const [cleaners, setCleaners] = useState<Cleaner[]>(() => {
    const saved = localStorage.getItem('sco_cleaners');
    if (!saved) return INITIAL_CLEANERS;
    try {
      const parsed: Cleaner[] = JSON.parse(saved);
      return parsed.map((c, idx) => ({
        ...c,
        workPlotting: c.workPlotting || INITIAL_CLEANERS[idx]?.workPlotting || 'Lobby & Koridor Utama',
        workPlottingUpdatedAt: c.workPlottingUpdatedAt || '07:00 WIB',
      }));
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
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
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

  // Synchronize localStorage
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
    localStorage.setItem('sco_notifs', JSON.stringify(notifications));
  }, [notifications]);

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
  };

  const updateChecklistTemplate = (id: string, updates: Partial<ChecklistTemplateItem>) => {
    setChecklistTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteChecklistTemplate = (id: string) => {
    setChecklistTemplates((prev) => prev.filter((t) => t.id !== id));
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
          const slotStatus = hasIssue ? 'has_issue' : allClean ? 'clean' : 'pending';

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
          return {
            ...slot,
            items: updatedItems,
            status:
              status === 'clean'
                ? 'clean'
                : status === 'issue' || status === 'dirty' || status === 'broken'
                ? 'has_issue'
                : 'pending',
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
            status: 'clean',
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

  // Filter operational data by the active project location
  const filteredAreas = areas.filter((a) => !a.projectId || a.projectId === safeActiveProjectId);
  const filteredCleaners = cleaners.filter((c) => !c.projectId || c.projectId === safeActiveProjectId);
  const filteredSchedules = schedules.filter((s) => !s.projectId || s.projectId === safeActiveProjectId);
  const filteredTasks = tasks.filter((t) => !t.projectId || t.projectId === safeActiveProjectId);
  const filteredInspections = inspections.filter((i) => !i.projectId || i.projectId === safeActiveProjectId);
  const filteredComplaints = complaints.filter((c) => !c.projectId || c.projectId === safeActiveProjectId);
  const filteredChecklistLocations = checklistLocations.filter(
    (cl) => (cl.projectId || 'proj-1') === safeActiveProjectId
  );
  const filteredDailyChecklists = dailyChecklists.filter(
    (d) => (d.projectId || 'proj-1') === safeActiveProjectId
  );
  const filteredMasterPrograms = masterPrograms.filter(
    (m) => !m.projectId || m.projectId === safeActiveProjectId
  );

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

  const updateMasterProgram = (id: string, updates: Partial<MasterCleaningProgramItem>) => {
    setMasterPrograms((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              ...updates,
              ...(updates.frequency ? { frequency: normalizeFrequencyCode(updates.frequency) } : {}),
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
        let nextStatus: ProgramDayStatus = forcedStatus || 'planned';
        if (!forcedStatus) {
          if (currentStatus === 'none') nextStatus = 'planned';
          else if (currentStatus === 'planned') nextStatus = 'in_progress';
          else if (currentStatus === 'in_progress') nextStatus = 'done';
          else if (currentStatus === 'done') nextStatus = 'rescheduled';
          else nextStatus = 'none';
        }
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
        return {
          ...t,
          status: 'pending_qc',
          completedTime: nowStr,
          checklistArea: payload.checklistArea,
          suppliesUsed: [],
          remarks: payload.remarks,
          photoBefore: payload.photoBefore,
          photoProgress: payload.photoProgress || t.photoProgress,
          photoAfter: payload.photoAfter,
        };
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
    score: number;
    status: 'passed' | 'failed' | 'needs_rework';
    criteriaScores: {
      floor: number;
      glassAndMirrors: number;
      odorAndAir: number;
      wasteManagement: number;
      suppliesCompleteness: number;
    };
    notes: string;
    photoProof?: string;
  }) => {
    const task = tasks.find((t) => t.id === payload.taskId);
    if (!task) return;

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newInspection: QCInspection = {
      id: `qc-${Date.now()}`,
      projectId: task.projectId || safeActiveProjectId,
      taskId: payload.taskId,
      areaName: task.areaName,
      cleanerName: task.cleanerName,
      inspectorName: 'Hendra Wijaya (Supervisor)',
      inspectedAt: `Hari ini, ${nowStr}`,
      score: payload.score,
      status: payload.status,
      criteriaScores: payload.criteriaScores,
      notes: payload.notes,
      photoProof: payload.photoProof || task.photoAfter,
    };

    setInspections((prev) => [newInspection, ...prev]);

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

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: payload.status === 'passed' ? '🎉 Inspeksi QC Lolos!' : '⚠️ Revisi Inspeksi Diperlukan',
      message: `Inspeksi untuk ${task.areaName} diberikan nilai ${payload.score}/100 oleh Supervisor: "${payload.notes}"`,
      timestamp: nowStr,
      type: payload.status === 'passed' ? 'success' : 'warning',
      targetRole: ['petugas', 'admin'],
      read: false,
      taskId: task.id,
      projectId: task.projectId || safeActiveProjectId,
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
    areaId: string;
    category: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    photoBefore?: string;
  }) => {
    const area = areas.find((a) => a.id === payload.areaId);
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const slaMins = payload.priority === 'urgent' ? 30 : payload.priority === 'high' ? 60 : 120;
    const deadlineStr =
      new Date(Date.now() + slaMins * 60000).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';

    const newTicket: Complaint = {
      id: `comp-${Date.now()}`,
      projectId: area?.projectId || safeActiveProjectId,
      ticketNumber: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      reporterName: payload.reporterName,
      reporterRole: payload.reporterRole,
      areaId: payload.areaId,
      areaName: area?.name || 'Area Gedung',
      floor: area?.floor || 'Lantai 1',
      category: payload.category,
      description: payload.description,
      priority: payload.priority,
      status: 'open',
      createdAt: `Hari ini, ${nowStr}`,
      photoBefore: payload.photoBefore,
      slaMinutes: slaMins,
      slaDeadline: deadlineStr,
      assignedCleanerId: area?.cleanerId,
      assignedCleanerName: area?.cleanerName,
    };

    setComplaints((prev) => [newTicket, ...prev]);

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: '🚨 Komplain Baru Diterima!',
      message: `${payload.reporterName} melaporkan: "${payload.category}" di ${area?.name}. SLA penanganan ${slaMins} menit.`,
      timestamp: nowStr,
      type: 'urgent',
      targetRole: ['admin', 'supervisor', 'petugas'],
      read: false,
      projectId: area?.projectId || safeActiveProjectId,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const resolveComplaint = (
    complaintId: string,
    resolutionNotes: string,
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
              photoResolved:
                photoResolved ||
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=80',
            }
          : c
      )
    );
  };

  const addArea = (newArea: Omit<Area, 'id'>) => {
    const id = `area-${Date.now()}`;
    setAreas((prev) => [...prev, { ...newArea, id, projectId: newArea.projectId || safeActiveProjectId }]);
  };

  const updateArea = (id: string, updates: Partial<Area>) => {
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
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
    setUserRole('admin');
    setViewMode('split');
  };

  return (
    <CleaningContext.Provider
      value={{
        userRole,
        setUserRole,
        viewMode,
        setViewMode,
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

        // Projects
        projects,
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

        // Unfiltered lists
        allAreas: areas,
        allTasks: tasks,

        // Operations
        toggleTaskChecklist,
        updateTaskSupply,
        updateTaskRemark,
        updateTaskPhotos,
        exportTaskToMonthlyReport,
        removeTaskFromMonthlyReport,
        bulkExportToMonthlyReport,
        exportTasksToMonthlyReport: bulkExportToMonthlyReport,
        updateTaskWorkDescription,
        submitTaskCompletion,
        submitQCInspection,
        submitNewComplaint,
        resolveComplaint,
        addArea,
        updateArea,
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
        clearAllNotifications,
        triggerDeadlinePushNotification,
        resetToInitialData,
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
