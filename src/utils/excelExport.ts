/**
 * Utility for exporting operational data to Excel-compatible CSV / XLSX (with BOM for Excel UTF-8 support)
 * Supports full formatting, client-ready Indonesian naming, and detailed metrics.
 */
import { CleaningTask } from '../types';

export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes fields for CSV format
 */
export function escapeCSV(field: string | number | boolean | null | undefined): string {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports tasks to Excel-ready CSV file formatted for client delivery
 */
export function exportTasksToExcel(
  tasks: CleaningTask[],
  filename: string,
  projectName?: string
): void {
  const headers = [
    'No',
    'ID Pekerjaan',
    'Nama Area',
    'Lokasi / Lantai',
    'Petugas Pelaksana',
    'Shift Kerja',
    'Jadwal Waktu',
    'Status Pengerjaan',
    'Verifikasi Controller',
    'Skor QC (%)',
    'Tanggal Pengerjaan',
    'Waktu Selesai',
    'Deskripsi Pekerjaan',
    'Foto Before Terlampir',
    'Foto Progress Terlampir',
    'Foto After Terlampir',
  ];

  const rows = tasks.map((t, idx) => {
    const hasBefore = t.photoBefore ? 'Ya' : 'Tidak';
    const hasProgress = t.photoProgress ? 'Ya' : 'Tidak';
    const hasAfter = t.photoAfter ? 'Ya' : 'Tidak';

    return [
      idx + 1,
      t.id,
      t.areaName,
      t.buildingFloor || '-',
      t.cleanerName,
      t.shift || '-',
      t.scheduledTime || '-',
      t.status === 'completed' ? 'Selesai' : t.status === 'in_progress' ? 'Dikerjakan' : 'Tertunda',
      t.controllerApprovalStatus === 'approved'
        ? `Disetujui (${t.controllerApprovedBy || 'Controller'})`
        : t.controllerApprovalStatus === 'rejected'
        ? `Ditolak (${t.controllerRejectionReason || '-'})`
        : 'Menunggu Verifikasi',
      t.qcScore !== undefined ? `${t.qcScore}%` : '-',
      t.taskDate || '-',
      t.completedTime || '-',
      t.workDescription || '-',
      hasBefore,
      hasProgress,
      hasAfter,
    ];
  });

  const titleRow = [
    `LAPORAN HASIL PEKERJAAN OPERASIONAL CLEANING SERVICE`,
  ];
  const projectRow = [`Lokasi Proyek / Gedung: ${projectName || 'Semua Lokasi'}`];
  const dateRow = [`Tanggal Download: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`];
  const emptyRow: string[] = [];

  const csvContent = [
    titleRow.map(escapeCSV).join(','),
    projectRow.map(escapeCSV).join(','),
    dateRow.map(escapeCSV).join(','),
    emptyRow.join(','),
    headers.map(escapeCSV).join(','),
    ...rows.map((r) => r.map(escapeCSV).join(',')),
  ].join('\r\n');

  downloadCSV(filename, csvContent);
}
