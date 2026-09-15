import {
  Area,
  Cleaner,
  Shift,
  AttendanceStatusCode,
  CleaningSchedule,
  CleaningTask,
  QCInspection,
  Complaint,
  AppNotification,
  ProjectLocation,
  AppUser,
  ChecklistLocation,
  ChecklistTemplateItem,
  DailyAreaChecklist,
  HourlyChecklistSlot,
  HourlyCheckItemEntry,
  HourlyCheckItemStatus,
  ChecklistLocationCategory,
  MasterCleaningProgramItem,
  ProgramDayStatus,
} from '../types';
import { calculateShiftDuration } from '../utils/shiftUtils';

export const INITIAL_SHIFTS: Shift[] = [
  {
    id: 'shift-1',
    name: 'Shift 1 ( satu )',
    code: 'S1',
    startTime: '07:00',
    endTime: '15:00',
    color: '#0284c7', // Sky blue
    personnelCount: 6,
    description: 'Pembersihan awal harian, dusting meja, sanitasi toilet pagi, lobby utama.',
    workHoursDuration: 8,
    durationText: '8 Jam',
  },
  {
    id: 'shift-2',
    name: 'Shift 2 ( Midle )',
    code: 'S2',
    startTime: '11:00',
    endTime: '19:00',
    color: '#0d9488', // Teal
    personnelCount: 4,
    description: 'Shift transisi & backup jam sibuk siang ke sore, sanitasi area publik intensif.',
    workHoursDuration: 8,
    durationText: '8 Jam',
  },
  {
    id: 'shift-3',
    name: 'Shift 3 ( Siang )',
    code: 'S3',
    startTime: '15:00',
    endTime: '23:00',
    color: '#d97706', // Amber
    personnelCount: 5,
    description: 'Maintenance kebersihan siang, pembersihan pantry pasca makan, restock toilet sore.',
    workHoursDuration: 8,
    durationText: '8 Jam',
  },
  {
    id: 'shift-4',
    name: 'Shift 4 ( Malam )',
    code: 'S4',
    startTime: '23:00',
    endTime: '07:00',
    color: '#7c3aed', // Purple
    personnelCount: 3,
    description: 'Deep cleaning, floor polishing/scrubbing, pencucian kaca luar, carpet vacuuming malam.',
    workHoursDuration: 8,
    durationText: '8 Jam',
  },
  {
    id: 'shift-all',
    name: 'All Shift',
    code: 'AS',
    startTime: '07:00',
    endTime: '19:00',
    color: '#4f46e5', // Indigo
    personnelCount: 2,
    description: 'Shift operasional penuh / standby multi-tugas & pengawasan rotasi gedung.',
    workHoursDuration: 12,
    durationText: '12 Jam',
  },
];

function generateCleanerAttendanceSample(pattern: 'pagi' | 'midle' | 'siang' | 'malam' | 'all'): Record<number, AttendanceStatusCode> {
  const att: Record<number, AttendanceStatusCode> = {};
  for (let day = 1; day <= 31; day++) {
    const isWeekend = day % 7 === 0 || day % 7 === 6;
    if (isWeekend) {
      // Lembur 2x pada beberapa hari libur/weekend
      if ((day === 7 || day === 14 || day === 21) && pattern !== 'malam') {
        att[day] = 'L'; // Lembur (dihitung 2x hari kerja!)
      } else if (day === 8 && pattern === 'malam') {
        att[day] = 'L'; // Lembur malam
      } else {
        att[day] = '-';
      }
    } else {
      if (day === 10 && pattern === 'midle') {
        att[day] = 'I'; // Izin
      } else if (day === 16 && pattern === 'siang') {
        att[day] = 'S'; // Sakit
      } else if (day === 24 && pattern === 'malam') {
        att[day] = 'A'; // Alpa
      } else if (day === 28 && pattern === 'pagi') {
        att[day] = 'L'; // Lembur ekstra
      } else {
        att[day] = 'H'; // Hadir
      }
    }
  }
  return att;
}

export const INITIAL_CLEANERS: Cleaner[] = [
  {
    id: 'cln-1',
    nik: 'CLN-2024-001',
    name: 'Asep Supriyadi',
    photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    phone: '0812-8921-3341',
    shiftId: 'shift-1',
    shiftName: 'Shift 1 ( satu )',
    assignedAreas: ['area-1', 'area-2'],
    status: 'active',
    rating: 4.9,
    tasksCompletedToday: 3,
    totalTasksToday: 4,
    isClockedIn: true,
    clockInTime: '06:50 WIB',
    attendance: generateCleanerAttendanceSample('pagi'),
    workPlotting: 'Toilet Pria & Wanita Lt. 1, Koridor Barat',
    workPlottingUpdatedAt: '07:15 WIB',
  },
  {
    id: 'cln-2',
    nik: 'CLN-2024-002',
    name: 'Budi Santoso',
    photoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    phone: '0857-1123-9088',
    shiftId: 'shift-1',
    shiftName: 'Shift 1 ( satu )',
    assignedAreas: ['area-3', 'area-5'],
    status: 'active',
    rating: 4.8,
    tasksCompletedToday: 2,
    totalTasksToday: 4,
    isClockedIn: true,
    clockInTime: '06:55 WIB',
    attendance: generateCleanerAttendanceSample('pagi'),
    workPlotting: 'Lobby Utama, Receptionist & Teras Depan',
    workPlottingUpdatedAt: '07:10 WIB',
  },
  {
    id: 'cln-3',
    nik: 'CLN-2024-003',
    name: 'Siti Nurhaliza',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    phone: '0813-9002-4412',
    shiftId: 'shift-2',
    shiftName: 'Shift 2 ( Midle )',
    assignedAreas: ['area-4', 'area-6'],
    status: 'on_break',
    rating: 4.95,
    tasksCompletedToday: 1,
    totalTasksToday: 3,
    isClockedIn: true,
    clockInTime: '10:50 WIB',
    attendance: generateCleanerAttendanceSample('midle'),
    workPlotting: 'Pantry Lt. 2 & Area Coworking Lt. 2',
    workPlottingUpdatedAt: '11:15 WIB',
  },
  {
    id: 'cln-4',
    nik: 'CLN-2024-004',
    name: 'Rian Hidayat',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    phone: '0821-4433-2190',
    shiftId: 'shift-3',
    shiftName: 'Shift 3 ( Siang )',
    assignedAreas: ['area-1', 'area-4'],
    status: 'active',
    rating: 4.7,
    tasksCompletedToday: 0,
    totalTasksToday: 3,
    isClockedIn: true,
    clockInTime: '14:55 WIB',
    attendance: generateCleanerAttendanceSample('siang'),
    workPlotting: 'Toilet Lt. 3, Ruang Meeting Eksekutif & Lift',
    workPlottingUpdatedAt: '15:05 WIB',
  },
  {
    id: 'cln-5',
    nik: 'CLN-2024-005',
    name: 'Joko Prasetyo',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    phone: '0878-3321-7789',
    shiftId: 'shift-4',
    shiftName: 'Shift 4 ( Malam )',
    assignedAreas: ['area-2', 'area-6'],
    status: 'off',
    rating: 4.85,
    tasksCompletedToday: 0,
    totalTasksToday: 2,
    isClockedIn: false,
    attendance: generateCleanerAttendanceSample('malam'),
    workPlotting: 'Deep Cleaning Lobby & Polish Lantai Granit Lt. 1',
    workPlottingUpdatedAt: '23:00 WIB',
  },
  {
    id: 'cln-6',
    nik: 'CLN-2024-006',
    name: 'Dewi Sartika',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    phone: '0819-4567-8901',
    shiftId: 'shift-all',
    shiftName: 'All Shift',
    assignedAreas: ['area-1', 'area-3'],
    status: 'active',
    rating: 4.9,
    tasksCompletedToday: 2,
    totalTasksToday: 4,
    isClockedIn: true,
    clockInTime: '07:05 WIB',
    attendance: generateCleanerAttendanceSample('all'),
    workPlotting: 'Mobile Standby / Roaming Multi-Floor',
    workPlottingUpdatedAt: '07:30 WIB',
  },
];

export const INITIAL_AREAS: Area[] = [
  {
    id: 'area-1',
    name: 'Lobby Utama & Receptionist',
    code: 'LOB-01',
    building: 'Menara Mandiri Tower A',
    floor: 'Lantai 1',
    zone: 'Zona Barat',
    type: 'lobby',
    status: 'needs_cleaning',
    cleanerId: 'cln-1',
    cleanerName: 'Asep Supriyadi',
    lastCleaned: 'Hari ini, 07:15 WIB',
    nextScheduled: 'Hari ini, 10:30 WIB',
    targetDurationMinutes: 45,
  },
  {
    id: 'area-2',
    name: 'Toilet Pria & Wanita Lt. 2',
    code: 'TLT-02',
    building: 'Menara Mandiri Tower A',
    floor: 'Lantai 2',
    zone: 'Zona Service',
    type: 'toilet',
    status: 'in_progress',
    cleanerId: 'cln-1',
    cleanerName: 'Asep Supriyadi',
    lastCleaned: 'Hari ini, 06:45 WIB',
    nextScheduled: 'Hari ini, 11:00 WIB',
    targetDurationMinutes: 35,
  },
  {
    id: 'area-3',
    name: 'Executive Meeting Room B',
    code: 'MTR-03',
    building: 'Menara Mandiri Tower A',
    floor: 'Lantai 3',
    zone: 'Zona Direksi',
    type: 'office',
    status: 'clean',
    cleanerId: 'cln-2',
    cleanerName: 'Budi Santoso',
    lastCleaned: 'Hari ini, 08:30 WIB',
    nextScheduled: 'Hari ini, 13:00 WIB',
    targetDurationMinutes: 30,
  },
  {
    id: 'area-4',
    name: 'Pantry & Coffee Corner Lt. LG',
    code: 'PAN-LG',
    building: 'Menara Mandiri Tower A',
    floor: 'Lantai LG',
    zone: 'Zona Komunal',
    type: 'pantry',
    status: 'inspected',
    cleanerId: 'cln-3',
    cleanerName: 'Siti Nurhaliza',
    lastCleaned: 'Hari ini, 09:15 WIB',
    nextScheduled: 'Hari ini, 14:00 WIB',
    targetDurationMinutes: 40,
  },
  {
    id: 'area-5',
    name: 'Koridor Utama & Area Lift Lt. 2',
    code: 'KOR-02',
    building: 'Menara Mandiri Tower A',
    floor: 'Lantai 2',
    zone: 'Zona Sirkulasi',
    type: 'corridor',
    status: 'clean',
    cleanerId: 'cln-2',
    cleanerName: 'Budi Santoso',
    lastCleaned: 'Hari ini, 09:45 WIB',
    nextScheduled: 'Hari ini, 14:30 WIB',
    targetDurationMinutes: 25,
  },
  {
    id: 'area-6',
    name: 'Open Space Workstation B2',
    code: 'OPS-04',
    building: 'Menara Mandiri Tower A',
    floor: 'Lantai 4',
    zone: 'Zona Kerja',
    type: 'office',
    status: 'needs_cleaning',
    cleanerId: 'cln-4',
    cleanerName: 'Rian Hidayat',
    lastCleaned: 'Kemarin, 17:30 WIB',
    nextScheduled: 'Hari ini, 14:15 WIB',
    targetDurationMinutes: 50,
  },
];

export const INITIAL_SCHEDULES: CleaningSchedule[] = [
  {
    id: 'sch-1',
    title: 'Daily Morning Sweeping & Mopping Lobby',
    areaId: 'area-1',
    areaName: 'Lobby Utama & Receptionist',
    cleanerId: 'cln-1',
    cleanerName: 'Asep Supriyadi',
    frequency: 'harian',
    timeSlot: '06:30 - 07:15',
    shiftId: 'shift-1',
    checklistTemplates: ['Lantai marmer mengkilap & bebas noda', 'Kaca pintu otomatis bersih', 'Tempat sampah lobi kosong', 'Aroma citrus segar'],
    isActive: true,
  },
  {
    id: 'sch-2',
    title: 'Sanitasi & Refill Supplies Toilet Lt. 2',
    areaId: 'area-2',
    areaName: 'Toilet Pria & Wanita Lt. 2',
    cleanerId: 'cln-1',
    cleanerName: 'Asep Supriyadi',
    frequency: 'harian',
    timeSlot: '07:30 - 08:05',
    shiftId: 'shift-1',
    checklistTemplates: ['Kloset & urinoir higienis', 'Cermin bebas bercak air', 'Lantai kering tidak licin', 'Refill sabun & tisu gulung'],
    isActive: true,
  },
  {
    id: 'sch-3',
    title: 'Pembersihan Meja Rapat & Vacuum Carpet Lt. 3',
    areaId: 'area-3',
    areaName: 'Executive Meeting Room B',
    cleanerId: 'cln-2',
    cleanerName: 'Budi Santoso',
    frequency: 'harian',
    timeSlot: '08:15 - 08:45',
    shiftId: 'shift-1',
    checklistTemplates: ['Meja kaca & kayu bebas debu', 'Karpet divacuum bersih', 'Papan tulis whiteboard bersih', 'Kursi tertata rapi'],
    isActive: true,
  },
  {
    id: 'sch-4',
    title: 'Pembersihan Deep Kitchenette Pantry LG',
    areaId: 'area-4',
    areaName: 'Pantry & Coffee Corner Lt. LG',
    cleanerId: 'cln-3',
    cleanerName: 'Siti Nurhaliza',
    frequency: 'harian',
    timeSlot: '13:30 - 14:10',
    shiftId: 'shift-2',
    checklistTemplates: ['Bak cuci piring bebas sisa makanan', 'Meja konter disemprot food-grade sanitizer', 'Kulkas luar dibersihkan', 'Sampah basah dipilah & dibuang'],
    isActive: true,
  },
  {
    id: 'sch-5',
    title: 'Pencucian Kaca Fasad & Jendela Koridor',
    areaId: 'area-5',
    areaName: 'Koridor Utama & Area Lift Lt. 2',
    cleanerId: 'cln-2',
    cleanerName: 'Budi Santoso',
    frequency: 'mingguan',
    timeSlot: 'Sabtu, 09:00 - 11:30',
    shiftId: 'shift-1',
    checklistTemplates: ['Kaca koridor bebas sidik jari', 'Stainless steel lift digosok polish', 'Lampu plafond bebas sarang laba-laba'],
    isActive: true,
  },
  {
    id: 'sch-6',
    title: 'Kristalisasi Marmer & Buffing Lobby',
    areaId: 'area-1',
    areaName: 'Lobby Utama & Receptionist',
    cleanerId: 'cln-5',
    cleanerName: 'Joko Prasetyo',
    frequency: 'bulanan',
    timeSlot: 'Minggu ke-4, 23:00 - 04:00',
    shiftId: 'shift-3',
    checklistTemplates: ['Coating marmer kilap 90GU', 'Buffing kecepatan tinggi merata', 'Tidak ada cairan kimia tercecer'],
    isActive: true,
  }
];

export const INITIAL_TASKS: CleaningTask[] = [
  {
    id: 'task-101',
    areaId: 'area-2',
    areaName: 'Toilet Pria & Wanita Lt. 2',
    buildingFloor: 'Tower A - Lantai 2',
    cleanerId: 'cln-1',
    cleanerName: 'Asep Supriyadi',
    shift: 'Shift 1 (Pagi)',
    taskDate: '13/09/2026',
    monthPeriod: '2026-09',
    workDescription: 'Sanitasi kloset & urinoir, pembersihan cermin wastafel, scrubbing lantai keramik basah, refill sabun foaming, dan penggantian kantong sampah.',
    scheduledTime: '10:30 WIB',
    deadlineTime: '11:15 WIB',
    status: 'in_progress',
    startTime: '10:35 WIB',
    durationMinutes: 35,
    checklistArea: [
      { id: 'c1', label: 'Lantai keramik disikat & kering (tidak licin)', checked: true },
      { id: 'c2', label: 'Urinoir & Kloset disanitasi cairan disinfektan', checked: true },
      { id: 'c3', label: 'Kaca cermin wastafel digosok bebas bercak air', checked: true },
      { id: 'c4', label: 'Tempat sampah dikosongkan & dipasang plastik hitam baru', checked: false },
      { id: 'c5', label: 'Aroma toilet segar (Pengharum ruangan otomatis dicek)', checked: false },
      { id: 'c6', label: 'Hand dryer & kran wastafel dicek kelayakannya', checked: false },
    ],
    suppliesUsed: [
      { supplyId: 'inv-1', supplyName: 'Floor Cleaner Pine (ml)', amountUsed: 150, unit: 'ml' },
      { supplyId: 'inv-3', supplyName: 'Hand Soap Refill (ml)', amountUsed: 300, unit: 'ml' },
      { supplyId: 'inv-4', supplyName: 'Jumbo Roll Tissue (Roll)', amountUsed: 2, unit: 'roll' },
      { supplyId: 'inv-5', supplyName: 'Kantong Sampah Hitam 60x80 (Pcs)', amountUsed: 3, unit: 'pcs' }
    ],
    remarks: 'Kran wastafel nomor 2 debit airnya agak kecil, sudah dilaporkan ke Engineering.',
    photoBefore: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
    photoProgress: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    photoAfter: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600&auto=format&fit=crop&q=80',
    exportedToMonthlyReport: false,
  },
  {
    id: 'task-102',
    areaId: 'area-1',
    areaName: 'Lobby Utama & Receptionist',
    buildingFloor: 'Tower A - Lantai 1',
    cleanerId: 'cln-1',
    cleanerName: 'Asep Supriyadi',
    shift: 'Shift 1 (Pagi)',
    taskDate: '13/09/2026',
    monthPeriod: '2026-09',
    workDescription: 'Pengepelan marmer lobby utama dengan anti-slip gloss chemical, dusting meja resepsionis, pembersihan sofa tunggu tamu, dan sanitasi gagang pintu kaca masuk.',
    scheduledTime: '11:15 WIB',
    deadlineTime: '11:45 WIB',
    status: 'pending',
    checklistArea: [
      { id: 'l1', label: 'Lantai marmer dipel dengan chemical anti-slip', checked: false },
      { id: 'l2', label: 'Meja reception dibersihkan bebas noda jari & debu', checked: false },
      { id: 'l3', label: 'Sofa tunggu tamu divacuum dan disemprot fabric spray', checked: false },
      { id: 'l4', label: 'Kaca entrance otomatis dibersihkan kedua sisi', checked: false },
      { id: 'l5', label: 'Dispenser hand sanitizer pintu masuk terisi penuh', checked: false },
    ],
    suppliesUsed: [
      { supplyId: 'inv-1', supplyName: 'Floor Cleaner Pine', amountUsed: 0, unit: 'ml' },
      { supplyId: 'inv-2', supplyName: 'Glass Cleaner Spray', amountUsed: 0, unit: 'ml' }
    ],
    remarks: '',
    photoBefore: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80',
    photoProgress: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    photoAfter: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
    exportedToMonthlyReport: false,
  },
  {
    id: 'task-103',
    areaId: 'area-3',
    areaName: 'Executive Meeting Room B',
    buildingFloor: 'Tower A - Lantai 3',
    cleanerId: 'cln-2',
    cleanerName: 'Budi Santoso',
    shift: 'Shift 1 (Pagi)',
    taskDate: '13/09/2026',
    monthPeriod: '2026-09',
    workDescription: 'Pembersihan meja konferensi kayu jati dengan wood polish, vacuum karpet tebal, pembersihan papan whiteboard, dan penyemprotan aerosol green tea.',
    scheduledTime: '08:30 WIB',
    deadlineTime: '09:15 WIB',
    status: 'completed',
    startTime: '08:30 WIB',
    completedTime: '09:05 WIB',
    durationMinutes: 35,
    checklistArea: [
      { id: 'm1', label: 'Meja konferensi dilap dan dipoles kayu', checked: true },
      { id: 'm2', label: 'Karpet divacuum menyeluruh', checked: true },
      { id: 'm3', label: 'Whiteboard dibersihkan dari spidol bekas rapat', checked: true },
      { id: 'm4', label: 'Gelas & botol air bekas disingkirkan ke pantry', checked: true },
      { id: 'm5', label: 'Ruangan disemprot pengharum green tea', checked: true },
    ],
    suppliesUsed: [
      { supplyId: 'inv-6', supplyName: 'Furniture Wood Polish', amountUsed: 50, unit: 'ml' },
      { supplyId: 'inv-7', supplyName: 'Room Fragrance Spray', amountUsed: 30, unit: 'ml' }
    ],
    remarks: 'Ruang rapat sudah rapi dan siap untuk meeting direksi jam 10:00.',
    photoBefore: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
    photoProgress: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    photoAfter: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
    qcScore: 98,
    qcStatus: 'approved',
    qcNotes: 'Pengerjaan sangat rapi, wangi tahan lama, kabel AV tersusun rapi.',
    inspectedBy: 'Hendra Wijaya (Supervisor)',
    inspectedAt: '09:20 WIB',
    exportedToMonthlyReport: true,
    monthlyOrderNo: 1,
    monthlyReportExportDate: '13/09/2026',
  },
  {
    id: 'task-104',
    areaId: 'area-4',
    areaName: 'Pantry & Coffee Corner Lt. LG',
    buildingFloor: 'Tower A - Lantai LG',
    cleanerId: 'cln-3',
    cleanerName: 'Siti Nurhaliza',
    shift: 'Shift 2 (Siang)',
    taskDate: '13/09/2026',
    monthPeriod: '2026-09',
    workDescription: 'Pencucian bak kitchen sink, disinfeksi food-grade meja pantry, pembersihan luar dalam microwave, pemilahan tempat sampah basah/kering, dan pengisian sabun.',
    scheduledTime: '09:00 WIB',
    deadlineTime: '09:45 WIB',
    status: 'pending_qc',
    startTime: '09:00 WIB',
    completedTime: '09:40 WIB',
    durationMinutes: 40,
    checklistArea: [
      { id: 'p1', label: 'Sink wastafel bersih bebas sisa minyak & ampas kopi', checked: true },
      { id: 'p2', label: 'Counter table dilap dengan food grade sanitizer', checked: true },
      { id: 'p3', label: 'Microwave bagian dalam dilap bersih', checked: true },
      { id: 'p4', label: 'Tempat sampah organik & anorganik dipilah & diganti', checked: true },
    ],
    suppliesUsed: [
      { supplyId: 'inv-8', supplyName: 'Dishwashing Liquid Lemon', amountUsed: 100, unit: 'ml' },
      { supplyId: 'inv-5', supplyName: 'Kantong Sampah Hitam 60x80', amountUsed: 2, unit: 'pcs' },
      { supplyId: 'inv-9', supplyName: 'Food Grade Surface Spray', amountUsed: 50, unit: 'ml' }
    ],
    remarks: 'Sudah diisi ulang sabun cuci piring dan tisu dispenser pantry.',
    photoBefore: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
    photoProgress: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&auto=format&fit=crop&q=80',
    photoAfter: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=600&auto=format&fit=crop&q=80',
    exportedToMonthlyReport: true,
    monthlyOrderNo: 2,
    monthlyReportExportDate: '13/09/2026',
  },
  {
    id: 'task-105',
    areaId: 'area-6',
    areaName: 'Open Space Workstation B2',
    buildingFloor: 'Tower A - Lantai 4',
    cleanerId: 'cln-4',
    cleanerName: 'Rian Hidayat',
    shift: 'Shift 2 (Siang)',
    taskDate: '13/09/2026',
    monthPeriod: '2026-09',
    workDescription: 'Dusting workstation cubicle, pengosongan tempat sampah meja staf per workstation, vacuum karpet area walkway utama, sanitasi panel saklar lampu.',
    scheduledTime: '14:15 WIB',
    deadlineTime: '15:05 WIB',
    status: 'pending',
    checklistArea: [
      { id: 'o1', label: 'Meja kerja bebas debu (dusting microfiber)', checked: false },
      { id: 'o2', label: 'Keranjang sampah di setiap cubicle dikosongkan', checked: false },
      { id: 'o3', label: 'Karpet jalur jalan utama divacuum', checked: false },
    ],
    suppliesUsed: [],
    remarks: '',
    photoBefore: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80',
    photoProgress: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    photoAfter: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
    exportedToMonthlyReport: false,
  },
  {
    id: 'task-098',
    areaId: 'area-5',
    areaName: 'Koridor Utama & Area Lift Lt. 2',
    buildingFloor: 'Tower A - Lantai 2',
    cleanerId: 'cln-2',
    cleanerName: 'Budi Santoso',
    shift: 'Shift 1 (Pagi)',
    taskDate: '11/09/2026',
    monthPeriod: '2026-09',
    workDescription: 'Pembersihan kaca jendela fasad koridor, polishing stainless steel pintu lift, dusting railing tangga darurat, mopping lantai granit.',
    scheduledTime: '08:00 WIB',
    deadlineTime: '09:00 WIB',
    status: 'completed',
    startTime: '08:05 WIB',
    completedTime: '08:50 WIB',
    durationMinutes: 45,
    checklistArea: [
      { id: 'k1', label: 'Kaca koridor bening bebas sidik jari', checked: true },
      { id: 'k2', label: 'Pintu stainless lift mengkilap tidak bernoda', checked: true },
      { id: 'k3', label: 'Lantai granit bersih kering', checked: true },
    ],
    suppliesUsed: [
      { supplyId: 'inv-2', supplyName: 'Glass Cleaner Spray', amountUsed: 80, unit: 'ml' }
    ],
    remarks: 'Pintu lift sudah dipoles dengan stainless polish.',
    photoBefore: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&auto=format&fit=crop&q=80',
    photoProgress: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    photoAfter: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
    qcScore: 95,
    qcStatus: 'approved',
    qcNotes: 'Kaca sangat bersih, lift mengkilap.',
    inspectedBy: 'Hendra Wijaya (Supervisor)',
    inspectedAt: '09:10 WIB',
    exportedToMonthlyReport: true,
    monthlyOrderNo: 3,
    monthlyReportExportDate: '11/09/2026',
  },
  {
    id: 'task-090',
    areaId: 'area-1',
    areaName: 'Lobby Utama & Receptionist',
    buildingFloor: 'Tower A - Lantai 1',
    cleanerId: 'cln-5',
    cleanerName: 'Joko Prasetyo',
    shift: 'Shift 3 (Malam)',
    taskDate: '28/08/2026',
    monthPeriod: '2026-08',
    workDescription: 'Deep cleaning bulanan kristalisasi lantai marmer lobby, buffing mesin putaran tinggi, pencucian fasad kaca entrance.',
    scheduledTime: '23:00 WIB',
    deadlineTime: '04:00 WIB',
    status: 'completed',
    startTime: '23:10 WIB',
    completedTime: '03:45 WIB',
    durationMinutes: 275,
    checklistArea: [
      { id: 'd1', label: 'Coating marmer kilap 92GU merata', checked: true },
      { id: 'd2', label: 'Buffing lantai bersih tanpa goresan mesin', checked: true },
      { id: 'd3', label: 'Kaca lobi bening bebas debu jalanan', checked: true },
    ],
    suppliesUsed: [
      { supplyId: 'inv-1', supplyName: 'Floor Cleaner Pine', amountUsed: 500, unit: 'ml' }
    ],
    remarks: 'Selesai deep clean marmer malam, gloss meter 92GU.',
    photoBefore: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80',
    photoProgress: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    photoAfter: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
    qcScore: 99,
    qcStatus: 'approved',
    qcNotes: 'Kristalisasi marmer sempurna, kilap tinggi.',
    inspectedBy: 'Hendra Wijaya (Supervisor)',
    inspectedAt: '06:30 WIB',
    exportedToMonthlyReport: true,
    monthlyOrderNo: 1,
    monthlyReportExportDate: '28/08/2026',
  }
];

export const INITIAL_INSPECTIONS: QCInspection[] = [
  {
    id: 'qc-01',
    taskId: 'task-103',
    areaName: 'Executive Meeting Room B (Lt. 3)',
    cleanerName: 'Budi Santoso',
    inspectorName: 'Hendra Wijaya (Supervisor)',
    inspectedAt: 'Hari ini, 09:20 WIB',
    score: 98,
    status: 'passed',
    criteriaScores: {
      floor: 20,
      glassAndMirrors: 20,
      odorAndAir: 19,
      wasteManagement: 20,
      suppliesCompleteness: 19,
    },
    notes: 'Kerapihan sangat baik sesuai SOP bintang 5. Kursi rapat simetris dan aroma sangat nyaman.',
    photoProof: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'qc-02',
    taskId: 'task-099',
    areaName: 'Toilet VIP Lt. 1',
    cleanerName: 'Asep Supriyadi',
    inspectorName: 'Hendra Wijaya (Supervisor)',
    inspectedAt: 'Kemarin, 16:30 WIB',
    score: 92,
    status: 'passed',
    criteriaScores: {
      floor: 18,
      glassAndMirrors: 19,
      odorAndAir: 19,
      wasteManagement: 18,
      suppliesCompleteness: 18,
    },
    notes: 'Kondisi sanitasi sangat bersih. Catatan kecil: cek sudut lantai dekat pot bunga.',
  }
];

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 'cmp-01',
    ticketNumber: 'CMP-2024-089',
    reporterName: 'Ibu Ratna Dewi',
    reporterRole: 'Tenant Office Suite 204 (PT Mega Finansial)',
    areaId: 'area-2',
    areaName: 'Toilet Pria & Wanita Lt. 2',
    floor: 'Lantai 2',
    category: 'Stok Habis & Air Kran',
    description: 'Sabun cuci tangan di wastafel wanita habis dan kran sebelah kiri airnya menetes tidak bisa tertutup rapat.',
    priority: 'high',
    status: 'in_progress',
    createdAt: 'Hari ini, 10:15 WIB',
    assignedCleanerId: 'cln-1',
    assignedCleanerName: 'Asep Supriyadi',
    photoBefore: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
    slaMinutes: 30,
    slaDeadline: '10:45 WIB',
  },
  {
    id: 'cmp-02',
    ticketNumber: 'CMP-2024-088',
    reporterName: 'Bpk. Alvin Tan',
    reporterRole: 'Building Management Visitor',
    areaId: 'area-1',
    areaName: 'Lobby Utama & Receptionist',
    floor: 'Lantai 1',
    category: 'Tumpahan Minuman',
    description: 'Ada tumpahan kopi di dekat pintu kaca putar masuk lobi, lantai agak licin dan membahayakan pengunjung.',
    priority: 'urgent',
    status: 'resolved',
    createdAt: 'Hari ini, 07:45 WIB',
    resolvedAt: 'Hari ini, 07:58 WIB',
    assignedCleanerId: 'cln-1',
    assignedCleanerName: 'Asep Supriyadi',
    photoBefore: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    photoResolved: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
    resolutionNotes: 'Sudah dipel dengan floor neutralizer, dipasang wet floor sign, dan dipastikan kering dalam 10 menit.',
    slaMinutes: 15,
    slaDeadline: '08:00 WIB',
  },
  {
    id: 'cmp-03',
    ticketNumber: 'CMP-2024-087',
    reporterName: 'Ferry Kurniawan',
    reporterRole: 'Karyawan Coworking Lt. 4',
    areaId: 'area-6',
    areaName: 'Open Space Workstation B2',
    floor: 'Lantai 4',
    category: 'Tempat Sampah Penuh',
    description: 'Tempat sampah dekat meja B-12 menumpuk setelah lembur semalam, mohon dikosongkan sebelum jam kantor.',
    priority: 'medium',
    status: 'open',
    createdAt: 'Hari ini, 08:10 WIB',
    assignedCleanerId: 'cln-4',
    assignedCleanerName: 'Rian Hidayat',
    slaMinutes: 60,
    slaDeadline: '09:10 WIB',
  }
];

export const INITIAL_PROJECTS: ProjectLocation[] = [
  {
    id: 'proj-1',
    code: 'PRJ-MMT',
    name: 'Menara Mandiri Tower A',
    address: 'Jl. Jend. Sudirman Kav. 54-55, Senayan, Kebayoran Baru',
    city: 'Jakarta Selatan',
    totalFloors: 12,
    managerName: 'Bambang Suryo, S.T.',
    clientName: 'PT Mandiri Capital Indonesia',
    status: 'active',
    createdAt: '01 Jan 2026',
  },
  {
    id: 'proj-2',
    code: 'PRJ-GKBI',
    name: 'Wisma GKBI Sudirman',
    address: 'Jl. Jend. Sudirman No. 28, Bendungan Hilir, Tanah Abang',
    city: 'Jakarta Pusat',
    totalFloors: 28,
    managerName: 'Dimas Wicaksono',
    clientName: 'PT Asuransi Jiwa Mega',
    status: 'active',
    createdAt: '15 Feb 2026',
  },
  {
    id: 'proj-3',
    code: 'PRJ-SOETTA',
    name: 'Bandara Soekarno Hatta T3',
    address: 'Bandara Internasional Soekarno-Hatta, Benda',
    city: 'Tangerang',
    totalFloors: 4,
    managerName: 'Capt. Rahmat Hidayat',
    clientName: 'PT Angkasa Pura Solusi',
    status: 'active',
    createdAt: '10 Mar 2026',
  },
];

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr-admin',
    name: 'Super Administrator',
    email: 'superadmin@cleaningops.com',
    role: 'admin',
    assignedProjectIds: ['proj-1', 'proj-2', 'proj-3'],
  },
  {
    id: 'usr-spv-1',
    name: 'Hendra Wijaya (SPV Mandiri)',
    email: 'hendra.spv@cleaningops.com',
    role: 'supervisor',
    assignedProjectIds: ['proj-1'],
  },
  {
    id: 'usr-spv-2',
    name: 'Rian Firman (SPV GKBI)',
    email: 'rian.spv@cleaningops.com',
    role: 'supervisor',
    assignedProjectIds: ['proj-2'],
  },
  {
    id: 'usr-cln-1',
    name: 'Asep Supriyadi (Petugas Mandiri)',
    email: 'asep.cln@cleaningops.com',
    role: 'petugas',
    assignedProjectIds: ['proj-1'],
  },
  {
    id: 'usr-cln-2',
    name: 'Joko Prasetyo (Petugas GKBI)',
    email: 'joko.cln@cleaningops.com',
    role: 'petugas',
    assignedProjectIds: ['proj-2'],
  },
  {
    id: 'usr-klien',
    name: 'Bapak Irawan (Building Management Mandiri)',
    email: 'irawan.client@mandiri.co.id',
    role: 'klien',
    assignedProjectIds: ['proj-1'],
  },
];

export const INITIAL_CHECKLIST_TEMPLATES: ChecklistTemplateItem[] = [
  // TOILET (Standard 11 Parameters Sesuai Formulir RS & Gedung)
  { id: 'tpl-tlt-1', category: 'toilet', name: 'Bau-bauan', description: 'Bebas bau tidak sedap / aroma segar pengharum ruangan', order: 1 },
  { id: 'tpl-tlt-2', category: 'toilet', name: 'Lantai', description: 'Disapu, dipel kering, tidak licin & bebas noda air', order: 2 },
  { id: 'tpl-tlt-3', category: 'toilet', name: 'Dinding', description: 'Keramik & partisi kubikal bersih bebas noda cipratan', order: 3 },
  { id: 'tpl-tlt-4', category: 'toilet', name: 'Kotak Sampah', description: 'Dikosongkan, dipasang kantong plastik hitam baru & bersih', order: 4 },
  { id: 'tpl-tlt-5', category: 'toilet', name: 'Kaca', description: 'Cermin wastafel bening, bebas bercak air & sidik jari', order: 5 },
  { id: 'tpl-tlt-6', category: 'toilet', name: 'Wastafel', description: 'Bak wastafel & keran air disanitasi mengkilap, saluran lancar', order: 6 },
  { id: 'tpl-tlt-7', category: 'toilet', name: 'Sabun Cuci Tangan', description: 'Dispenser hand soap terisi penuh & berfungsi lancar', order: 7 },
  { id: 'tpl-tlt-8', category: 'toilet', name: 'Kloset', description: 'Kloset duduk/jongkok disikat desinfektan, dudukan bersih kering', order: 8 },
  { id: 'tpl-tlt-9', category: 'toilet', name: 'Tisu', description: 'Jumbo roll tissue / hand towel terisi mencukupi', order: 9 },
  { id: 'tpl-tlt-10', category: 'toilet', name: 'Urinoir', description: 'Urinal disiram bersih, bebas kerak urin, tablet pewangi aktif', order: 10 },
  { id: 'tpl-tlt-11', category: 'toilet', name: 'Hand Drier', description: 'Mesin pengering tangan berfungsi hangat, permukaan dilap bersih', order: 11 },

  // PUBLIC AREA
  { id: 'tpl-pub-1', category: 'public_area', name: 'Lantai lobby disapu & dipel mengkilap', order: 1 },
  { id: 'tpl-pub-2', category: 'public_area', name: 'Pintu kaca utama dan jendela lobby bersih bening', order: 2 },
  { id: 'tpl-pub-3', category: 'public_area', name: 'Tempat sampah standing stainless bersih & kosong', order: 3 },
  { id: 'tpl-pub-4', category: 'public_area', name: 'Sofa tunggu, meja tamu & counter reception rapi', order: 4 },
  { id: 'tpl-pub-5', category: 'public_area', name: 'Hand sanitizer automatic dispenser terisi', order: 5 },
  { id: 'tpl-pub-6', category: 'public_area', name: 'Area drop-off luar bebas puntung rokok & sampah', order: 6 },

  // KORIDOR
  { id: 'tpl-kor-1', category: 'koridor', name: 'Lantai koridor dipel bersih tanpa noda bekas sepatu', order: 1 },
  { id: 'tpl-kor-2', category: 'koridor', name: 'Dinding dan skirting koridor bersih bebas coretan', order: 2 },
  { id: 'tpl-kor-3', category: 'koridor', name: 'Plafon koridor bebas dari sarang laba-laba', order: 3 },
  { id: 'tpl-kor-4', category: 'koridor', name: 'Lampu penerangan koridor & signage evakuasi menyala', order: 4 },
  { id: 'tpl-kor-5', category: 'koridor', name: 'Kotak APAR dan hydrant bersih tanpa debu', order: 5 },

  // MUSHOLLA
  { id: 'tpl-msh-1', category: 'musholla', name: 'Karpet sajadah divacuum bersih & harum', order: 1 },
  { id: 'tpl-msh-2', category: 'musholla', name: 'Tempat wudhu bersih tidak berlumut & kran lancar', order: 2 },
  { id: 'tpl-msh-3', category: 'musholla', name: 'Mukena & perlengkapan ibadah tertata rapi di lemari', order: 3 },
  { id: 'tpl-msh-4', category: 'musholla', name: 'Pendingin ruangan (AC) menyala & sejuk', order: 4 },

  // LIFT & ESKALATOR
  { id: 'tpl-lft-1', category: 'lift', name: 'Dinding stainless lift dilap mengkilap bebas sidik jari', order: 1 },
  { id: 'tpl-lft-2', category: 'lift', name: 'Tombol lantai lift disanitasi cairan antiseptik', order: 2 },
  { id: 'tpl-lft-3', category: 'lift', name: 'Lantai lift bersih & keset karpet divacuum', order: 3 },
  { id: 'tpl-lft-4', category: 'lift', name: 'Handrail eskalator dilap bersih dan higienis', order: 4 },

  // PANTRY
  { id: 'tpl-pan-1', category: 'pantry', name: 'Sink cuci piring bersih bebas sisa makanan & bau', order: 1 },
  { id: 'tpl-pan-2', category: 'pantry', name: 'Meja makan & counter pantry diseka bersih', order: 2 },
  { id: 'tpl-pan-3', category: 'pantry', name: 'Dispenser air minum bersih & galon air terisi', order: 3 },
  { id: 'tpl-pan-4', category: 'pantry', name: 'Tempat sampah organik & anorganik dikosongkan', order: 4 },
];

export const INITIAL_CHECKLIST_LOCATIONS: ChecklistLocation[] = [
  {
    id: 'cloc-1',
    projectId: 'proj-1',
    name: 'Toilet Pria & Wanita Lt. 1',
    category: 'toilet',
    floor: 'Lantai 1',
    code: 'TLT-01',
  },
  {
    id: 'cloc-2',
    projectId: 'proj-1',
    name: 'Toilet Eksekutif Lt. 2',
    category: 'toilet',
    floor: 'Lantai 2',
    code: 'TLT-02',
  },
  {
    id: 'cloc-3',
    projectId: 'proj-1',
    name: 'Public Area Main Lobby',
    category: 'public_area',
    floor: 'Lantai 1',
    code: 'PUB-01',
  },
  {
    id: 'cloc-4',
    projectId: 'proj-1',
    name: 'Koridor Utama & Area Lift Lt. 2',
    category: 'koridor',
    floor: 'Lantai 2',
    code: 'KOR-02',
  },
  {
    id: 'cloc-5',
    projectId: 'proj-1',
    name: 'Musholla Karyawan Basement',
    category: 'musholla',
    floor: 'Basement 1',
    code: 'MSH-B1',
  },
  {
    id: 'cloc-6',
    projectId: 'proj-1',
    name: 'Pantry & Coffee Corner Lt. LG',
    category: 'pantry',
    floor: 'Lantai LG',
    code: 'PAN-LG',
  },
  {
    id: 'cloc-7',
    projectId: 'proj-2',
    name: 'Toilet Lobby Utama Wisma GKBI',
    category: 'toilet',
    floor: 'Lantai Ground',
    code: 'GKBI-TLT',
  },
  {
    id: 'cloc-8',
    projectId: 'proj-2',
    name: 'Public Area Plaza & Atrium GKBI',
    category: 'public_area',
    floor: 'Lantai 1',
    code: 'GKBI-PUB',
  },
  {
    id: 'cloc-9',
    projectId: 'proj-2',
    name: 'Koridor Office Tenant Lt. 10',
    category: 'koridor',
    floor: 'Lantai 10',
    code: 'GKBI-KOR',
  },
  {
    id: 'cloc-10',
    projectId: 'proj-3',
    name: 'Toilet Keberangkatan Domestik Gate 1-5',
    category: 'toilet',
    floor: 'Lantai 2',
    code: 'SOETTA-TLT1',
  },
  {
    id: 'cloc-11',
    projectId: 'proj-3',
    name: 'Boarding Lounge & Waiting Area T3',
    category: 'public_area',
    floor: 'Lantai 2',
    code: 'SOETTA-PUB1',
  },
  {
    id: 'cloc-12',
    projectId: 'proj-3',
    name: 'Koridor Kedatangan & Baggage Claim',
    category: 'koridor',
    floor: 'Lantai 1',
    code: 'SOETTA-KOR1',
  },
  {
    id: 'cloc-13',
    projectId: 'proj-3',
    name: 'Pantry & Crew Rest Area T3',
    category: 'pantry',
    floor: 'Lantai 1',
    code: 'SOETTA-PAN1',
  },
];

export const generate24HourSlots = (
  category: ChecklistLocationCategory,
  templates: ChecklistTemplateItem[],
  samplePreset?: 'realistic_toilet' | 'realistic_public' | 'empty'
): HourlyChecklistSlot[] => {
  const categoryTemplates = templates.filter((t) => t.category === category);

  return Array.from({ length: 24 }, (_, h) => {
    const startHourStr = h.toString().padStart(2, '0');
    const endHourStr = (h + 1 === 24 ? 24 : h + 1).toString().padStart(2, '0');
    const hourLabel = `${startHourStr}.00 - ${endHourStr}.00`;

    let status: 'clean' | 'has_issue' | 'pending' = 'pending';
    let checkedBy: string | undefined = undefined;
    let checkedAt: string | undefined = undefined;
    let notes: string | undefined = undefined;

    if (samplePreset === 'realistic_toilet') {
      if (h >= 0 && h < 6) {
        status = 'clean';
        checkedBy = 'Joko P. (Night Shift)';
        checkedAt = `${startHourStr}:30 WIB`;
      } else if (h >= 6 && h <= 12) {
        status = 'clean';
        checkedBy = 'Asep S. (Pagi)';
        checkedAt = `${startHourStr}:15 WIB`;
      } else if (h === 13) {
        status = 'has_issue';
        checkedBy = 'Asep S. (Pagi)';
        checkedAt = '13:20 WIB';
        notes = 'Sabun habis di wastafel 2, sudah diisi ulang.';
      } else if (h === 14) {
        status = 'clean';
        checkedBy = 'Rian H. (Siang)';
        checkedAt = '14:10 WIB';
      }
    } else if (samplePreset === 'realistic_public') {
      if (h >= 6 && h <= 14) {
        status = 'clean';
        checkedBy = 'Budi S. (Pagi)';
        checkedAt = `${startHourStr}:20 WIB`;
      }
    }

    const items: HourlyCheckItemEntry[] = categoryTemplates.map((tpl) => {
      let itemStatus: HourlyCheckItemStatus = 'not_checked';
      if (status === 'clean') {
        itemStatus = 'clean';
      } else if (status === 'has_issue') {
        if (tpl.name.toLowerCase().includes('sabun')) {
          itemStatus = 'issue';
        } else {
          itemStatus = 'clean';
        }
      }
      return {
        itemId: tpl.id,
        itemName: tpl.name,
        status: itemStatus,
      };
    });

    return {
      hour: h,
      hourLabel,
      status,
      checkedBy,
      checkedAt,
      items,
      notes,
      supervisorVerified: h <= 12 && status === 'clean',
      supervisorName: h <= 12 && status === 'clean' ? 'Hendra W. (SPV)' : undefined,
    };
  });
};

export const INITIAL_DAILY_CHECKLISTS: DailyAreaChecklist[] = [
  {
    id: 'dchk-1',
    projectId: 'proj-1',
    locationId: 'cloc-1',
    locationName: 'Toilet Pria & Wanita Lt. 1',
    category: 'toilet',
    date: '2026-09-13',
    hourlySlots: generate24HourSlots('toilet', INITIAL_CHECKLIST_TEMPLATES, 'realistic_toilet'),
  },
  {
    id: 'dchk-2',
    projectId: 'proj-1',
    locationId: 'cloc-3',
    locationName: 'Public Area Main Lobby',
    category: 'public_area',
    date: '2026-09-13',
    hourlySlots: generate24HourSlots('public_area', INITIAL_CHECKLIST_TEMPLATES, 'realistic_public'),
  },
  {
    id: 'dchk-3',
    projectId: 'proj-1',
    locationId: 'cloc-4',
    locationName: 'Koridor Utama & Area Lift Lt. 2',
    category: 'koridor',
    date: '2026-09-13',
    hourlySlots: generate24HourSlots('koridor', INITIAL_CHECKLIST_TEMPLATES, 'realistic_public'),
  },
  {
    id: 'dchk-4',
    projectId: 'proj-2',
    locationId: 'cloc-7',
    locationName: 'Toilet Lobby Utama Wisma GKBI',
    category: 'toilet',
    date: '2026-09-13',
    hourlySlots: generate24HourSlots('toilet', INITIAL_CHECKLIST_TEMPLATES, 'realistic_toilet'),
  },
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: '⏰ Pengingat Batas Waktu!',
    message: 'Tugas di Lobby Utama & Receptionist tinggal 15 menit lagi sebelum batas waktu (11:45 WIB).',
    timestamp: '11:00 WIB',
    type: 'warning',
    targetRole: ['petugas', 'supervisor'],
    read: false,
    taskId: 'task-102',
    projectId: 'proj-1',
  },
  {
    id: 'notif-2',
    title: '🚨 Komplain Baru Diterima!',
    message: 'Ibu Ratna Dewi melaporkan kehabisan sabun di Toilet Pria & Wanita Lt. 2 (SLA 30 menit).',
    timestamp: '10:15 WIB',
    type: 'urgent',
    targetRole: ['admin', 'supervisor', 'petugas'],
    read: false,
    projectId: 'proj-1',
  },
  {
    id: 'notif-3',
    title: '✅ Inspeksi QC Disetujui',
    message: 'Supervisor menyetujui hasil pengerjaan Executive Meeting Room B dengan skor 98/100.',
    timestamp: '09:20 WIB',
    type: 'success',
    targetRole: ['petugas', 'admin'],
    read: true,
    taskId: 'task-103',
    projectId: 'proj-1',
  },
  {
    id: 'notif-4',
    title: '📋 Ceklist Jam 13:00 Selesai',
    message: 'Asep Supriyadi telah mengisi ceklist kebersihan Toilet Pria & Wanita Lt. 1 periode 13.00 - 14.00.',
    timestamp: '13:20 WIB',
    type: 'info',
    targetRole: ['admin', 'supervisor'],
    read: false,
    projectId: 'proj-1',
  },
];

// Helper to build day mapping for 1..31
export const createProgramDays = (
  activeDays: number[],
  doneDays: number[] = [],
  inProgressDays: number[] = []
): Record<number, ProgramDayStatus> => {
  const result: Record<number, ProgramDayStatus> = {};
  for (let d = 1; d <= 31; d++) {
    if (doneDays.includes(d)) {
      result[d] = 'done';
    } else if (inProgressDays.includes(d)) {
      result[d] = 'in_progress';
    } else if (activeDays.includes(d)) {
      result[d] = 'planned';
    } else {
      result[d] = 'none';
    }
  }
  return result;
};

export const INITIAL_MASTER_PROGRAMS: MasterCleaningProgramItem[] = [
  // PROJ-1: Plaza Mandiri Syariah (RS / High-Rise)
  {
    id: 'mcp-101',
    projectId: 'proj-1',
    workDescription: 'Dusting Plafon, Exhaust Fan & Grille AC Sentral',
    workMethod: 'Dry dusting dengan microfiber head & extension telescopic pole 3-6m, vacuum HEPA filter untuk celah grille AC',
    location: 'Ruang Kerja Lt. 1-4 & Lobby Utama',
    category: 'periodic',
    frequency: 'mingguan',
    picName: 'Asep Supriyadi',
    month: 9,
    year: 2026,
    days: createProgramDays([1, 4, 8, 11, 15, 18, 22, 25, 29], [1, 4, 8, 11], [15]),
    targetDurationMinutes: 120,
    notes: 'Pastikan dokumen di atas meja terlindungi plastik pelindung sebelum dusting.',
  },
  {
    id: 'mcp-102',
    projectId: 'proj-1',
    workDescription: 'Poles & Kristalisasi Lantai Marmer / Granit',
    workMethod: 'Rotary polisher machine 175 RPM + Pad Merah/Putih + Marble Crystallizer Chemical 1:1, buffing hingga kilap >85 GU',
    location: 'Lobby Utama & Selasar Resepsionis Lt. 1',
    category: 'special_treatment',
    frequency: 'mingguan',
    picName: 'Budi Santoso',
    month: 9,
    year: 2026,
    days: createProgramDays([6, 13, 20, 27], [6, 13]),
    targetDurationMinutes: 180,
    notes: 'Dikerjakan pada malam hari setelah jam operasional kantor usai (pukul 20.00 WIB).',
  },
  {
    id: 'mcp-103',
    projectId: 'proj-1',
    workDescription: 'Deep Cleaning & Descaling Kerak Kloset, Urinoir & Dinding Keramik',
    workMethod: 'Chemical descaler non-HCL, scouring pad putih, sikat kawat kuningan halus & steam washer 100°C untuk disinfeksi',
    location: 'Toilet Pria & Wanita Lt. 1 s/d Lt. 4',
    category: 'deep_clean',
    frequency: 'dua_mingguan',
    picName: 'Siti Aminah',
    month: 9,
    year: 2026,
    days: createProgramDays([2, 5, 9, 12, 16, 19, 23, 26, 30], [2, 5, 9, 12], [16]),
    targetDurationMinutes: 90,
    notes: 'Prioritas pada kerak air di bawah bibir kloset dan sela sambungan nat keramik.',
  },
  {
    id: 'mcp-104',
    projectId: 'proj-1',
    workDescription: 'Pembersihan Kaca Façade Luar Rendah & Partisi Kaca Ruang Rapat',
    workMethod: 'Window washer sleeve microfiber, neutral glass cleaner 1:20, squeegee rubber wiper blade, chamois dry finish',
    location: 'Kaca Lobby Luar, Canopy Utama & Ruang Rapat Lt. 2-3',
    category: 'periodic',
    frequency: 'mingguan',
    picName: 'Dewi Lestari',
    month: 9,
    year: 2026,
    days: createProgramDays([3, 10, 17, 24], [3, 10]),
    targetDurationMinutes: 150,
    notes: 'Gunakan body harness keselamatan kerja jika membersihkan area canopy luar.',
  },
  {
    id: 'mcp-105',
    projectId: 'proj-1',
    workDescription: 'Pencucian & Ekstraksi Karpet / Kursi Kantor Fabric',
    workMethod: 'Carpet injection & extraction machine + shampoo carpet anti-bakteri + blower air turbo 3-speed untuk pengeringan cepat',
    location: 'Auditorium & Ruang Rapat Direksi Lt. 3',
    category: 'deep_clean',
    frequency: 'bulanan',
    picName: 'Rudi Hermawan',
    month: 9,
    year: 2026,
    days: createProgramDays([7, 21], [7]),
    targetDurationMinutes: 240,
    notes: 'Area karpet diberi sign "Lantai Basah / Wet Carpet" hingga kering sempurna.',
  },
  {
    id: 'mcp-106',
    projectId: 'proj-1',
    workDescription: 'Stripping, Sealing & Waxing Lantai Vinyl Anti-Statik',
    workMethod: 'Stripper chemical non-ammonia + pad hitam, wet vacuum extractor, neutral rinse, 3 lapisan sealer & top wax coating',
    location: 'Server Room Lt. 2 & Ruang Arsip Lt. 1',
    category: 'special_treatment',
    frequency: 'bulanan',
    picName: 'Budi Santoso',
    month: 9,
    year: 2026,
    days: createProgramDays([14, 28], [], [14]),
    targetDurationMinutes: 210,
    notes: 'Wajib didampingi teknisi IT saat pengerjaan di dalam server room.',
  },
  {
    id: 'mcp-107',
    projectId: 'proj-1',
    workDescription: 'Pembersihan Dinding Keramik, Lis Plint & Stainless Steel Handrail',
    workMethod: 'Damp dusting dengan kain microfiber + stainless steel polish compound + disinfektan kuartener pada handrail tangga',
    location: 'Tangga Darurat 1 & 2 serta Selasar Koridor',
    category: 'periodic',
    frequency: 'dua_mingguan',
    picName: 'Asep Supriyadi',
    month: 9,
    year: 2026,
    days: createProgramDays([5, 12, 19, 26], [5, 12]),
    targetDurationMinutes: 100,
    notes: 'Cek lampu darurat dan pastikan handrail tidak licin atau lengket residu.',
  },
  {
    id: 'mcp-108',
    projectId: 'proj-1',
    workDescription: 'Pencucian & Disinfeksi Tempat Sampah & TPS B3 Medis/Domestik',
    workMethod: 'Penyemprotan larutan klorin 0.5%, sikat bertekanan, pembilasan air bersih, pengeringan & pemasangan kantong bertali',
    location: 'Tempat Penampungan Sampah (TPS) Basement',
    category: 'daily',
    frequency: 'harian',
    picName: 'Asep Supriyadi',
    month: 9,
    year: 2026,
    days: createProgramDays(
      Array.from({ length: 31 }, (_, i) => i + 1),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [14]
    ),
    targetDurationMinutes: 60,
    notes: 'Gunakan APD lengkap: sarung tangan nitrile tebal, masker dan sepatu safety boots.',
  },
  {
    id: 'mcp-109',
    projectId: 'proj-1',
    workDescription: 'High Pressure Water Jet Wash Area Parkir & Loading Dock',
    workMethod: 'High pressure washer 130 bar + degreaser chemical oil remover untuk noda oli kendaraan dan lumut paving',
    location: 'Area Parkir VIP & Loading Dock Basement',
    category: 'periodic',
    frequency: 'dua_mingguan',
    picName: 'Rudi Hermawan',
    month: 9,
    year: 2026,
    days: createProgramDays([8, 22], [8]),
    targetDurationMinutes: 180,
    notes: 'Pastikan saluran drainase lancar dan tidak ada genangan air sisa cuci.',
  },
  {
    id: 'mcp-110',
    projectId: 'proj-1',
    workDescription: 'Pembersihan Saluran Grease Trap & Sanitasi Pantry Karyawan',
    workMethod: 'Pengangkatan limbah lemak grease trap secara manual, desinfeksi pipa pembuangan dengan enzim bio-cleaner ramah lingkungan',
    location: 'Pantry Karyawan Lt. 1, 2, 3, 4',
    category: 'periodic',
    frequency: 'mingguan',
    picName: 'Siti Aminah',
    month: 9,
    year: 2026,
    days: createProgramDays([4, 11, 18, 25], [4, 11]),
    targetDurationMinutes: 75,
    notes: 'Limbah lemak dibungkus rapat plastik hitam ganda sebelum dibuang.',
  },

  // PROJ-2: Wisma GKBI Sudirman
  {
    id: 'mcp-201',
    projectId: 'proj-2',
    workDescription: 'Deep Cleaning Toilet & Sanitasi Urinoir Otomatis',
    workMethod: 'Descaler toilet chemical, sikat botol fleksibel, microfiber saniter warna merah, disinfeksi tombol sensor flush',
    location: 'Toilet Podium & Tower Lt. 12-28',
    category: 'deep_clean',
    frequency: 'mingguan',
    picName: 'Joko Prasetyo',
    month: 9,
    year: 2026,
    days: createProgramDays([3, 7, 10, 14, 17, 21, 24, 28], [3, 7, 10], [14]),
    targetDurationMinutes: 120,
    notes: 'Pastikan sensor otomatis flush berfungsi dengan baik dan tidak ada kebocoran air.',
  },
  {
    id: 'mcp-202',
    projectId: 'proj-2',
    workDescription: 'Poles & Buffing Lantai Granit Lift Hall',
    workMethod: 'Rotary polisher pad putih + spray buff granit liquid, pengkilapan hingga bebas jejak sepatu',
    location: 'Lift Hall Low Zone & High Zone',
    category: 'periodic',
    frequency: 'mingguan',
    picName: 'Joko Prasetyo',
    month: 9,
    year: 2026,
    days: createProgramDays([2, 9, 16, 23, 30], [2, 9]),
    targetDurationMinutes: 90,
    notes: 'Kerjakan di luar peak hours (sebelum pukul 07.30 WIB atau sesudah 18.00 WIB).',
  },
  {
    id: 'mcp-203',
    projectId: 'proj-2',
    workDescription: 'Pembersihan Kaca Partisi Ruang Meeting & Kantor Tenant',
    workMethod: 'Glass wiper rubber blade + neutral cleaner + kain microfiber waffle weave tanpa serat',
    location: 'Ruang Kantor Tenant Lt. 15, 18, 22',
    category: 'periodic',
    frequency: 'dua_mingguan',
    picName: 'Maya Indah',
    month: 9,
    year: 2026,
    days: createProgramDays([6, 20], [6]),
    targetDurationMinutes: 150,
    notes: 'Konfirmasi izin akses pintu kantor tenant ke resepsionis gedung.',
  },

  // PROJ-3: Bandara Soekarno Hatta T3
  {
    id: 'mcp-301',
    projectId: 'proj-3',
    workDescription: 'Scrubbing & Polishing Lantai Granit Concourse Terminal',
    workMethod: 'Ride-on scrubber dryer machine 28 inch + pad merah + neutral floor cleaner otomatis kering seketika',
    location: 'Concourse Domestik Gate 1 - 10',
    category: 'special_treatment',
    frequency: 'harian',
    picName: 'Ahmad Fauzi',
    month: 9,
    year: 2026,
    days: createProgramDays(
      Array.from({ length: 31 }, (_, i) => i + 1),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      [14]
    ),
    targetDurationMinutes: 240,
    notes: 'Waspada terhadap arus penumpang bandara yang padat, prioritaskan jalur safety cone.',
  },
  {
    id: 'mcp-302',
    projectId: 'proj-3',
    workDescription: 'Deep Wash & Sanitasi Toilet Gate Keberangkatan',
    workMethod: 'Foam gun descaling wash, sikat mekanis, wet vacuum, sanitizer aroma lemon segar standar penerbangan internasional',
    location: 'Toilet Gate 3, 5, 7 Keberangkatan T3',
    category: 'deep_clean',
    frequency: 'dua_mingguan',
    picName: 'Ahmad Fauzi',
    month: 9,
    year: 2026,
    days: createProgramDays([1, 5, 9, 13, 17, 21, 25, 29], [1, 5, 9, 13]),
    targetDurationMinutes: 120,
    notes: 'Pemeriksaan ketat kelengkapan sabun, hand towel, dan aroma toilet wajib wangi & segar.',
  },
];

