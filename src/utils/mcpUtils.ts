import { ProgramDayStatus, ProgramFrequencyCode } from '../types';

export const normalizeFrequencyCode = (freq: string | undefined): ProgramFrequencyCode => {
  if (!freq) return 'D';
  const f = freq.toLowerCase().trim();
  if (f === 'd' || f === 'harian' || f === 'daily') return 'D';
  if (f === 'w' || f === 'mingguan' || f === 'dua_mingguan' || f === 'weekly') return 'W';
  if (f === 'm' || f === 'bulanan' || f === 'berkala' || f === 'khusus' || f === 'monthly') return 'M';
  return 'D';
};

export interface FrequencyMeta {
  code: ProgramFrequencyCode;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  headerColor: string;
}

export const FREQUENCY_META: Record<ProgramFrequencyCode, FrequencyMeta> = {
  D: {
    code: 'D',
    label: 'Daily Activity',
    shortLabel: 'Daily (Harian)',
    description: 'Pekerjaan operasional rutin harian setiap shift',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
    headerColor: 'bg-blue-700 text-white',
  },
  W: {
    code: 'W',
    label: 'Weekly Activity',
    shortLabel: 'Weekly (Mingguan)',
    description: 'Pekerjaan berkala mingguan terjadwal (Siklus 1-4 Minggu)',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
    headerColor: 'bg-purple-700 text-white',
  },
  M: {
    code: 'M',
    label: 'Monthly Activity',
    shortLabel: 'Monthly (Bulanan)',
    description: 'Pekerjaan deep clean & treatment berkala bulanan',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
    headerColor: 'bg-amber-700 text-white',
  },
};

export interface StatusMeta {
  code: string;
  label: string;
  fullLabel: string;
  pillClass: string;
  badgeClass: string;
}

export const PROGRAM_STATUS_META: Record<ProgramDayStatus, StatusMeta> = {
  none: {
    code: '-',
    label: 'Tidak Terjadwal',
    fullLabel: '- : Tidak Terjadwal',
    pillClass: 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 font-medium',
    badgeClass: 'text-slate-400 bg-slate-100 border border-slate-200',
  },
  planned: {
    code: 'R',
    label: 'Rencana (Planned)',
    fullLabel: 'R : Rencana (Planned)',
    pillClass: 'bg-sky-100 text-sky-700 border border-sky-300 font-bold shadow-2xs hover:bg-sky-200',
    badgeClass: 'bg-sky-100 text-sky-700 border border-sky-300',
  },
  in_progress: {
    code: 'P',
    label: 'Sedang Pengerjaan (Progress)',
    fullLabel: 'P : Sedang Pengerjaan (Progress)',
    pillClass: 'bg-amber-100 text-amber-700 border border-amber-300 font-bold shadow-2xs hover:bg-amber-200',
    badgeClass: 'bg-amber-100 text-amber-700 border border-amber-300',
  },
  done: {
    code: 'S',
    label: 'Selesai / Valid (Done)',
    fullLabel: 'S : Selesai / Valid (Done)',
    pillClass: 'bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold shadow-2xs hover:bg-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  },
  rescheduled: {
    code: 'T',
    label: 'Tertunda / Reschedule',
    fullLabel: 'T : Tertunda / Reschedule',
    pillClass: 'bg-rose-100 text-rose-700 border border-rose-300 font-bold shadow-2xs hover:bg-rose-200',
    badgeClass: 'bg-rose-100 text-rose-700 border border-rose-300',
  },
};

export const getNextProgramDayStatus = (current: ProgramDayStatus | undefined): ProgramDayStatus => {
  switch (current) {
    case 'none':
    case undefined:
      return 'planned';
    case 'planned':
      return 'in_progress';
    case 'in_progress':
      return 'done';
    case 'done':
      return 'rescheduled';
    case 'rescheduled':
      return 'none';
    default:
      return 'planned';
  }
};

export const MONTH_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];
