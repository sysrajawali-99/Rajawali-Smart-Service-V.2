import {
  CleaningTask,
  Complaint,
  MasterCleaningProgramItem,
} from '../types';

export type AuditableJobSource = 'weekly' | 'monthly' | 'special_job' | 'complaint';

export interface AuditableCompletedJob {
  id: string; // Unique composite ID
  originalId: string;
  source: AuditableJobSource;
  sourceLabel: string;
  sourceBadgeClass: string;
  title: string;
  location: string;
  cleanerName: string;
  completedDate: string; // e.g. "13/09/2026" or "Hari ini, 08:50 WIB"
  completedDateTimestamp: number; // For sorting & 7-day filtering
  description: string;
  photoBefore?: string;
  photoProgress?: string;
  photoAfter?: string;
  rawItem?: CleaningTask | Complaint | MasterCleaningProgramItem;
}

export type QcSuccessRating = {
  score: number;
  status: 'gagal' | 'mendekati' | 'berhasil';
  statusLabel: string;
  shortLabel: string;
  badgeClass: string;
  conclusion: string;
  colorClass: string;
};

export const evaluateQcSuccessRating = (score: number): QcSuccessRating => {
  if (score < 70) {
    return {
      score,
      status: 'gagal',
      statusLabel: 'Tidak Berhasil Tercapai',
      shortLabel: 'Tidak Tercapai (< 70%)',
      badgeClass: 'bg-rose-500 text-white',
      colorClass: 'text-rose-600',
      conclusion:
        'Pekerjaan tidak berhasil tercapai (< 70%). Kualitas pembersihan masih berada di bawah ambang batas minimal dan memerlukan perbaikan total / pengerjaan ulang segera.',
    };
  } else if (score < 85) {
    return {
      score,
      status: 'mendekati',
      statusLabel: 'Mendekati Hasil yang Diharapkan',
      shortLabel: 'Mendekati (70% - 84%)',
      badgeClass: 'bg-amber-500 text-white',
      colorClass: 'text-amber-600',
      conclusion:
        'Pekerjaan mendekati hasil yang diharapkan (70% - 84%). Kebersihan sudah cukup baik namun terdapat detail catatan penyempurnaan yang harus segera ditindaklanjuti.',
    };
  } else {
    return {
      score,
      status: 'berhasil',
      statusLabel: 'Sesuai dengan yang Diharapkan & Bisa Dipertahankan',
      shortLabel: 'Sesuai Standar (≥ 85%)',
      badgeClass: 'bg-emerald-600 text-white',
      colorClass: 'text-emerald-600',
      conclusion:
        'Pekerjaan yang dilakukan sesuai dengan apa yang diharapkan dan bisa dipertahankan (≥ 85%). Standar kualitas mutu kebersihan fasilitas tercapai dengan sempurna.',
    };
  }
};

/**
 * Parses date string (DD/MM/YYYY or YYYY-MM-DD or relative "Hari ini"/"Kemarin") into a JS timestamp.
 * Defaults reference anchor to 15 September 2026 (app baseline) if relative.
 */
export const parseJobDateToTimestamp = (dateStr?: string): number => {
  // Baseline app date: 15 September 2026 12:00:00
  const baselineNow = new Date(2026, 8, 15, 12, 0, 0).getTime();
  if (!dateStr) return baselineNow;

  const lower = dateStr.toLowerCase();
  if (lower.includes('hari ini')) {
    return baselineNow;
  }
  if (lower.includes('kemarin')) {
    return baselineNow - 24 * 3600 * 1000;
  }

  // Check DD/MM/YYYY
  const ddmmyyyyMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    return new Date(year, month, day, 12, 0, 0).getTime();
  }

  // Check YYYY-MM-DD
  const yyyymmddMatch = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    return new Date(year, month, day, 12, 0, 0).getTime();
  }

  return baselineNow;
};

/**
 * Filter and collect completed jobs from last 7 days starting from anchor date (15 Sep 2026)
 * Sources:
 * 1. Weekly Activity (Master Cleaning Programs with frequency W or tasks classified as weekly)
 * 2. Monthly Activity (Master Cleaning Programs with frequency M or monthly tasks)
 * 3. Special Job (Tasks or Master Programs marked as special_treatment, deep_clean, or deep cleaning tasks)
 * 4. Pusat Penanganan Komplain & Keluhan Kebersihan (resolved/closed complaints)
 */
export const getCompletedJobsLast7Days = (
  tasks: CleaningTask[],
  complaints: Complaint[],
  masterPrograms: MasterCleaningProgramItem[],
  currentDateAnchor: Date = new Date(2026, 8, 15) // Sep 15, 2026
): AuditableCompletedJob[] => {
  const sevenDaysAgoTime = currentDateAnchor.getTime() - 7 * 24 * 3600 * 1000;
  const futureCutoffTime = currentDateAnchor.getTime() + 24 * 3600 * 1000;

  const results: AuditableCompletedJob[] = [];

  // 1. COMPLAINTS (Pusat Penanganan Komplain & Keluhan Kebersihan)
  complaints.forEach((cmp) => {
    // Only completed / resolved complaints
    if (cmp.status === 'resolved') {
      const ts = parseJobDateToTimestamp(cmp.resolvedAt || cmp.createdAt);
      if (ts >= sevenDaysAgoTime && ts <= futureCutoffTime) {
        results.push({
          id: `job-cmp-${cmp.id}`,
          originalId: cmp.id,
          source: 'complaint',
          sourceLabel: 'Komplain & Keluhan',
          sourceBadgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          title: `Penanganan: ${cmp.category || 'Keluhan Kebersihan'}`,
          location: `${cmp.areaName} (${cmp.floor})`,
          cleanerName: cmp.assignedCleanerName || 'Tim Quick Response',
          completedDate: cmp.resolvedAt || cmp.createdAt || '14/09/2026',
          completedDateTimestamp: ts,
          description: cmp.resolutionNotes
            ? `Penyelesaian: ${cmp.resolutionNotes} • Keluhan Awal: ${cmp.description}`
            : cmp.description,
          photoBefore: cmp.photoBefore || 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&auto=format&fit=crop&q=80',
          photoProgress: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
          photoAfter: cmp.photoResolved || 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
          rawItem: cmp,
        });
      }
    }
  });

  // 2. MASTER PROGRAMS (Weekly, Monthly, Special Job that have completed days in last 7 days)
  // Last 7 days days of September 2026: day 9, 10, 11, 12, 13, 14, 15
  const anchorDay = currentDateAnchor.getDate(); // 15
  const anchorMonth = currentDateAnchor.getMonth() + 1; // 9
  const anchorYear = currentDateAnchor.getFullYear(); // 2026

  masterPrograms.forEach((prog) => {
    if (prog.month === anchorMonth && prog.year === anchorYear) {
      // Check days in last 7 days (anchorDay - 6 up to anchorDay)
      for (let d = Math.max(1, anchorDay - 6); d <= anchorDay; d++) {
        const dayStatus = prog.days[d];
        if (dayStatus === 'done') {
          const jobDateStr = `${d.toString().padStart(2, '0')}/09/2026`;
          const ts = new Date(anchorYear, anchorMonth - 1, d, 14, 0, 0).getTime();

          let source: AuditableJobSource = 'weekly';
          let sourceLabel = 'Weekly Activity';
          let badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';

          const freq = String(prog.frequency).toUpperCase();
          if (prog.category === 'special_treatment' || prog.category === 'deep_clean') {
            source = 'special_job';
            sourceLabel = 'Special Job';
            badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
          } else if (freq === 'M' || freq.includes('BULAN')) {
            source = 'monthly';
            sourceLabel = 'Monthly Activity';
            badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
          } else if (freq === 'W' || freq.includes('MINGGU')) {
            source = 'weekly';
            sourceLabel = 'Weekly Activity';
            badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
          }

          results.push({
            id: `job-mcp-${prog.id}-d${d}`,
            originalId: prog.id,
            source,
            sourceLabel,
            sourceBadgeClass: badgeClass,
            title: prog.workDescription,
            location: prog.location,
            cleanerName: prog.picName || 'Petugas Khusus',
            completedDate: jobDateStr,
            completedDateTimestamp: ts,
            description: `Metode: ${prog.workMethod || 'Sesuai SOP program kebersihan berkala'}. Catatan: ${prog.notes || '-'}`,
            photoBefore: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80',
            photoProgress: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
            photoAfter: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
            rawItem: prog,
          });
        }
      }
    }
  });

  // 3. CLEANING TASKS (Completed tasks within last 7 days)
  tasks.forEach((task) => {
    if (task.status === 'completed' || task.status === 'pending_qc') {
      const ts = parseJobDateToTimestamp(task.taskDate || task.completedTime);
      if (ts >= sevenDaysAgoTime && ts <= futureCutoffTime) {
        // Categorize into Special Job, Weekly, Monthly, or Routine
        let source: AuditableJobSource = 'special_job';
        let sourceLabel = 'Special Job';
        let badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';

        const descLower = (task.workDescription || '').toLowerCase();
        if (descLower.includes('kristalisasi') || descLower.includes('buffing') || descLower.includes('deep clean') || descLower.includes('ekstraksi')) {
          source = 'special_job';
          sourceLabel = 'Special Job';
          badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
        } else if (task.exportedToMonthlyReport || descLower.includes('bulanan')) {
          source = 'monthly';
          sourceLabel = 'Monthly Activity';
          badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
        } else {
          source = 'weekly';
          sourceLabel = 'Weekly Activity';
          badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
        }

        results.push({
          id: `job-task-${task.id}`,
          originalId: task.id,
          source,
          sourceLabel,
          sourceBadgeClass: badgeClass,
          title: task.workDescription || `Pembersihan Rutin ${task.areaName}`,
          location: `${task.areaName} (${task.buildingFloor})`,
          cleanerName: task.cleanerName,
          completedDate: task.taskDate || task.completedTime || 'Hari ini',
          completedDateTimestamp: ts,
          description: task.remarks ? `Catatan: ${task.remarks}` : task.workDescription || '',
          photoBefore: task.photoBefore || 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&auto=format&fit=crop&q=80',
          photoProgress: task.photoProgress || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
          photoAfter: task.photoAfter || 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
          rawItem: task,
        });
      }
    }
  });

  // Sort descending: newest to oldest
  return results.sort((a, b) => b.completedDateTimestamp - a.completedDateTimestamp);
};
