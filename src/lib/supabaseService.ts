import { supabase, isSupabaseConfigured } from './supabase';
import { CleaningTask, Complaint, FacilityDamageReport, SpecialJobItem } from '../types';

export { isSupabaseConfigured };

/**
 * Service to sync application data with Supabase in Realtime.
 * If Supabase credentials are not configured, functions gracefully resolve without throwing errors.
 */

// --- TASKS ---
export async function fetchSupabaseTasks(): Promise<CleaningTask[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) {
      console.warn('[Supabase] Failed to fetch tasks:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      projectId: row.project_id || 'proj-1',
      areaId: row.area_id || '',
      areaName: row.area_name || row.title,
      buildingFloor: 'Lt. 1',
      cleanerId: row.cleaner_id || '',
      cleanerName: row.cleaner_name || '',
      shift: 'Pagi (06:00 - 14:00)',
      scheduledTime: row.scheduled_time || '08:00',
      deadlineTime: row.deadline_time || '10:00',
      status: row.status || 'pending',
      checklistArea: row.checklist_items || [],
      suppliesUsed: row.supplies_used || [],
      photoBefore: row.photo_before,
      photoProgress: row.photo_progress,
      photoAfter: row.photo_after,
      photoProof: row.photo_proof,
      completedTime: row.completed_time,
      completedAt: row.completed_at,
      remarks: row.remarks || row.notes,
      workDescription: row.title,
    })) as CleaningTask[];
  } catch (err) {
    console.warn('[Supabase] Error loading tasks:', err);
    return null;
  }
}

export async function upsertSupabaseTask(task: CleaningTask): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('tasks').upsert({
      id: task.id,
      project_id: task.projectId || 'proj-1',
      title: task.workDescription || task.areaName,
      area_id: task.areaId,
      area_name: task.areaName,
      cleaner_id: task.cleanerId,
      cleaner_name: task.cleanerName,
      scheduled_time: task.scheduledTime,
      deadline_time: task.deadlineTime,
      status: task.status,
      completed_time: task.completedTime,
      completed_at: task.completedAt || (task.completedTime ? new Date().toISOString() : null),
      photo_before: task.photoBefore,
      photo_progress: task.photoProgress,
      photo_after: task.photoAfter,
      photo_proof: task.photoProof,
      remarks: task.remarks,
      checklist_items: task.checklistArea,
      supplies_used: task.suppliesUsed,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Supabase] Failed to upsert task:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase] Error upserting task:', err);
  }
}

// --- COMPLAINTS ---
export async function fetchSupabaseComplaints(): Promise<Complaint[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('complaints').select('*');
    if (error) {
      console.warn('[Supabase] Failed to fetch complaints:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: any) => {
      const hours = 2;
      const now = Date.now();
      return {
        id: row.id,
        projectId: row.project_id || 'proj-1',
        ticketNumber: row.ticket_no || row.id,
        reporterName: row.reporter_name || 'Pelapor',
        reporterRole: row.reporter_role || 'Staff',
        areaId: 'area-1',
        areaName: row.location || 'Area',
        floor: 'Lt. 1',
        category: row.category || 'kebersihan',
        description: row.description || row.title || '',
        priority: row.priority || 'medium',
        status: row.status || 'open',
        createdAt: row.reported_at || row.created_at || 'Hari ini, 08:00 WIB',
        resolvedAt: row.resolved_at,
        assignedCleanerName: row.assigned_to,
        resolutionNotes: row.resolution_notes,
        slaHours: hours,
        slaMinutes: hours * 60,
        slaDeadline: '10:00 WIB',
        deadlineTimestamp: now + hours * 3600 * 1000,
      } as Complaint;
    });
  } catch (err) {
    console.warn('[Supabase] Error loading complaints:', err);
    return null;
  }
}

export async function upsertSupabaseComplaint(complaint: Complaint): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('complaints').upsert({
      id: complaint.id,
      project_id: complaint.projectId || 'proj-1',
      ticket_no: complaint.ticketNumber,
      title: complaint.description || 'Komplain',
      description: complaint.description,
      location: complaint.areaName,
      category: complaint.category,
      priority: complaint.priority,
      status: complaint.status,
      reporter_name: complaint.reporterName,
      reporter_role: complaint.reporterRole,
      reported_at: complaint.createdAt,
      assigned_to: complaint.assignedCleanerName,
      resolution_notes: complaint.resolutionNotes,
      resolved_at: complaint.resolvedAt,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Supabase] Failed to upsert complaint:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase] Error upserting complaint:', err);
  }
}

// --- DAMAGE REPORTS ---
export async function fetchSupabaseDamageReports(): Promise<FacilityDamageReport[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('damage_reports').select('*');
    if (error) {
      console.warn('[Supabase] Failed to fetch damage reports:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      ticketNo: row.ticket_no || row.id,
      projectId: row.project_id || 'proj-1',
      itemName: row.item_name || 'Fasilitas',
      category: 'mekanikal',
      locationName: row.area_name || 'Area Gedung',
      floor: 'Lantai GF',
      damageLevel: row.severity || 'sedang',
      chronology: row.description || '',
      impact: 'Perlu penanganan teknisi',
      actionTaken: 'Dipasang barikade pengaman',
      status: row.status || 'dilaporkan',
      reportDate: (row.reported_at || new Date().toISOString()).split('T')[0],
      reporterName: row.reporter_name || 'Petugas',
      targetDepartment: 'Engineering & Maintenance',
      photoBefore: (row.photo_urls && row.photo_urls[0]) || undefined,
      technicianNotes: row.repair_notes,
      priority: 'medium',
    })) as FacilityDamageReport[];
  } catch (err) {
    console.warn('[Supabase] Error loading damage reports:', err);
    return null;
  }
}

export async function upsertSupabaseDamageReport(report: FacilityDamageReport): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('damage_reports').upsert({
      id: report.id,
      ticket_no: report.ticketNo,
      project_id: report.projectId || 'proj-1',
      area_name: report.locationName,
      item_name: report.itemName,
      description: report.chronology,
      severity: report.damageLevel,
      status: report.status,
      reporter_name: report.reporterName,
      reported_at: report.reportDate,
      photo_urls: report.photoBefore ? [report.photoBefore] : [],
      repair_notes: report.technicianNotes,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Supabase] Failed to upsert damage report:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase] Error upserting damage report:', err);
  }
}

// --- SPECIAL JOBS ---
export async function fetchSupabaseSpecialJobs(): Promise<SpecialJobItem[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('special_jobs').select('*');
    if (error) {
      console.warn('[Supabase] Failed to fetch special jobs:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      ticketNo: row.ticket_no || row.id,
      projectId: row.project_id || 'proj-1',
      title: row.title,
      workDescription: row.work_description || row.title,
      workMethod: row.work_method || 'SOP Pembersihan Khusus',
      location: row.location || 'Area Khusus',
      floor: row.floor || 'Lt. 1',
      sourceType: 'supervisor_request',
      requestedBy: 'Supervisor Operasional',
      requestedByRole: 'Supervisor Operasional',
      requestReason: 'Pekerjaan khusus berkala',
      assignedPicName: row.pic_name || 'Petugas Kebersihan',
      shiftName: 'Pagi (06:00 - 14:00)',
      priority: 'high',
      scheduledDate: row.scheduled_date || new Date().toISOString().split('T')[0],
      scheduledTime: '09:00 - 11:00 WIB',
      targetDurationMinutes: 120,
      status: (row.status === 'requested' || row.status === 'in_progress' || row.status === 'completed') ? row.status : 'requested',
      photoBefore: row.photo_before,
      photoProgress: row.photo_progress,
      photoAfter: row.photo_after,
      completedAt: row.completed_at,
      createdAt: row.created_at || new Date().toISOString(),
    })) as SpecialJobItem[];
  } catch (err) {
    console.warn('[Supabase] Error loading special jobs:', err);
    return null;
  }
}

export async function upsertSupabaseSpecialJob(job: SpecialJobItem): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('special_jobs').upsert({
      id: job.id,
      ticket_no: job.ticketNo,
      project_id: job.projectId || 'proj-1',
      title: job.title,
      work_description: job.workDescription || job.title,
      work_method: job.workMethod,
      location: job.location,
      floor: job.floor,
      frequency: 'Special',
      pic_name: job.assignedPicName,
      scheduled_date: job.scheduledDate,
      status: job.status,
      photo_before: job.photoBefore,
      photo_progress: job.photoProgress,
      photoAfter: job.photoAfter,
      completed_at: job.completedAt,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Supabase] Failed to upsert special job:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase] Error upserting special job:', err);
  }
}

// --- REALTIME SUBSCRIPTION ---
export interface RealtimeSyncHandlers {
  onTaskChange?: (payload: any) => void;
  onComplaintChange?: (payload: any) => void;
  onDamageReportChange?: (payload: any) => void;
  onSpecialJobChange?: (payload: any) => void;
  onStatusChange?: (status: string) => void;
}

export function subscribeToSupabaseRealtime(handlers: RealtimeSyncHandlers) {
  if (!isSupabaseConfigured()) {
    handlers.onStatusChange?.('LOCAL_MODE');
    return () => {};
  }

  const channel = supabase
    .channel('cleaning_realtime_channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => handlers.onTaskChange?.(payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'complaints' },
      (payload) => handlers.onComplaintChange?.(payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'damage_reports' },
      (payload) => handlers.onDamageReportChange?.(payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'special_jobs' },
      (payload) => handlers.onSpecialJobChange?.(payload)
    )
    .subscribe((status) => {
      handlers.onStatusChange?.(status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
