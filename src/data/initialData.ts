import type {
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
  RoleModulePermission,
  ChecklistLocation,
  ChecklistTemplateItem,
  DailyAreaChecklist,
  HourlyChecklistSlot,
  HourlyCheckItemEntry,
  HourlyCheckItemStatus,
  ChecklistLocationCategory,
  MasterCleaningProgramItem,
  ProgramDayStatus,
  FacilityDamageReport,
  AuditLogEntry,
  EmployeeTurnoverRecord,
  KlienChecklistItem,
  KlienChecklistInspection,
  SpecialJobItem,
} from '../types.ts';

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
    plottingAllocations: [
      {
        id: 'alloc-s1-1',
        areaName: 'Toilet Pria & Wanita Lt. 1 & Lt. 2',
        taskDescription: 'Pembersihan kloset & urinal, pel lantai wangi, pembersihan cermin & wastafel, restock sabun & tissue',
        personnelQuota: 2,
        priority: 'intensif',
      },
      {
        id: 'alloc-s1-2',
        areaName: 'Lobby Utama, Receptionist & Teras Depan',
        taskDescription: 'Dusting meja resepsionis, pembersihan pintu kaca lobi, sweeping & mopping marmer, kosongkan sampah',
        personnelQuota: 1,
        priority: 'rutin',
      },
      {
        id: 'alloc-s1-3',
        areaName: 'Koridor Barat & Tangga Darurat Fl. 1-3',
        taskDescription: 'Dusting railing tangga, pel koridor utama, pembersihan noda dinding, cek tempat sampah pilah',
        personnelQuota: 1,
        priority: 'rutin',
      },
      {
        id: 'alloc-s1-4',
        areaName: 'Pantry Karyawan Lt. 1 & Area Makan',
        taskDescription: 'Pembersihan sink cuci piring, lap microwave & kulkas luar, steril meja makan, pengangkutan sampah basah',
        personnelQuota: 1,
        priority: 'rutin',
      },
      {
        id: 'alloc-s1-5',
        areaName: 'Musholla & Tempat Wudhu Lt. 1',
        taskDescription: 'Dry vacuum karpet sholat, pengeringan area wudhu, sanitasi lantai & dinding wudhu, tata rapi sandal',
        personnelQuota: 1,
        priority: 'rutin',
      },
    ],
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
    plottingAllocations: [
      {
        id: 'alloc-s2-1',
        areaName: 'Toilet High-Traffic Jam Sibuk Siang (Lt. 1 & 2)',
        taskDescription: 'Kontrol kebersihan tiap 1 jam, dry mopping lantai basah becek, restock tissue roll & hand soap dispenser',
        personnelQuota: 2,
        priority: 'intensif',
      },
      {
        id: 'alloc-s2-2',
        areaName: 'Sanitasi Area Publik, Lift & Lobby Gedung',
        taskDescription: 'Maintenance kebersihan jam ramai siang, sweeping lobi & teras luar, pembersihan tombol lift & cermin lift',
        personnelQuota: 1,
        priority: 'rutin',
      },
      {
        id: 'alloc-s2-3',
        areaName: 'Pantry Siang, Area Istirahat & Ruang Kopi',
        taskDescription: 'Pembersihan sink cuci piring pasca makan siang, refill galon air mineral, pengosongan sampah organik pantry',
        personnelQuota: 1,
        priority: 'rutin',
      },
    ],
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
    plottingAllocations: [
      {
        id: 'alloc-s3-1',
        areaName: 'Toilet Seluruh Lantai Pasca Jam Kantor (Lt. 1-4)',
        taskDescription: 'Pembersihan menyeluruh sore hari, sikat lantai toilet, kuras tempat sampah pembalut, semprot disinfektan',
        personnelQuota: 2,
        priority: 'intensif',
      },
      {
        id: 'alloc-s3-2',
        areaName: 'Pantry Sore, Ruang Rapat & Coworking Space',
        taskDescription: 'Rapikan ruang rapat pasca meeting, dusting meja rapat panjang, steril area pantry sore, pengangkutan sampah',
        personnelQuota: 1,
        priority: 'rutin',
      },
      {
        id: 'alloc-s3-3',
        areaName: 'Lobby Utama, Pintu Masuk & Drop-off Depan',
        taskDescription: 'Pembersihan kaca pintu putar, sweeping daun drop-off depan, mopping basah lobby malam',
        personnelQuota: 1,
        priority: 'rutin',
      },
      {
        id: 'alloc-s3-4',
        areaName: 'Koridor, Area Lift Penumpang & Tangga Service',
        taskDescription: 'Polishing stainless steel lift, lap cermin lift, dry mopping lantai koridor malam hari',
        personnelQuota: 1,
        priority: 'rutin',
      },
    ],
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
    plottingAllocations: [
      {
        id: 'alloc-s4-1',
        areaName: 'Deep Cleaning Lantai Granit Lobby & Scrubbing Mesin',
        taskDescription: 'Scrubbing menggunakan mesin polisher, penarikan chemical kotor, bilas air bersih & buffing marmer',
        personnelQuota: 1,
        priority: 'periodic',
      },
      {
        id: 'alloc-s4-2',
        areaName: 'Heavy Duty Carpet Vacuuming & Spotting Noda',
        taskDescription: 'Dry vacuum menyeluruh karpet open space & meeting room, perlakuan spot stain kopi/minyak dengan chemical khusus',
        personnelQuota: 1,
        priority: 'periodic',
      },
      {
        id: 'alloc-s4-3',
        areaName: 'Pencucian Kaca Facade Luar & Dinding Koridor',
        taskDescription: 'Squeegee kaca luar gedung lantai dasar, pembersihan sarang laba-laba plafon, dusting grill AC & exhaust toilet',
        personnelQuota: 1,
        priority: 'periodic',
      },
    ],
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
    plottingAllocations: [
      {
        id: 'alloc-sa-1',
        areaName: 'Pengawasan Rotasi, QC Inspeksi & Emergency Response',
        taskDescription: 'Inspeksi berkala seluruh area, penanganan komplain tumpahan mendadak, kontrol kualitas ceklist pengawas',
        personnelQuota: 1,
        priority: 'intensif',
      },
      {
        id: 'alloc-sa-2',
        areaName: 'Mobile Roaming Multi-Floor & Restocking Logistik',
        taskDescription: 'Monitoring rotasi toilet tiap jam, restocking chemical pembersih gudang, koordinasi serah terima antar shift',
        personnelQuota: 1,
        priority: 'rutin',
      },
    ],
  },
];

export const INITIAL_CLEANERS: Cleaner[] = [];

export const INITIAL_AREAS: Area[] = [];

export const INITIAL_SCHEDULES: CleaningSchedule[] = [];

export const INITIAL_TASKS: CleaningTask[] = [];

export const INITIAL_INSPECTIONS: QCInspection[] = [];

export const INITIAL_COMPLAINTS: Complaint[] = [];

export const INITIAL_PROJECTS: ProjectLocation[] = [
  {
    id: 'proj-1793818532678',
    code: 'PRJ-612',
    name: 'BLOK M SQUARE',
    address: 'Malawai 1',
    city: 'Jakarta Selatan',
    totalFloors: 5,
    managerName: 'Bapak Sarono ',
    clientName: 'Building Management Blok M Square',
    status: 'active',
    createdAt: '05 Nov 2026',
    company_id: 'comp-main',
    companyId: 'comp-main',
  },
  {
    id: 'proj-2',
    code: 'PRJ-GKBI',
    name: 'WISMA GKBI',
    address: 'Jl. Jend. Sudirman No. 28, Bendungan Hilir',
    city: 'Jakarta Pusat',
    totalFloors: 39,
    managerName: 'Budi Santoso',
    clientName: 'Building Management Wisma GKBI',
    status: 'active',
    createdAt: '01 Nov 2026',
    company_id: 'comp-main',
    companyId: 'comp-main',
  },
  {
    id: 'proj-3',
    code: 'PRJ-SOETTA',
    name: 'BANDARA SOEKARNO HATTA (TERMINAL 3)',
    address: 'Bandara Internasional Soekarno-Hatta, Terminal 3 Ultimate',
    city: 'Tangerang',
    totalFloors: 3,
    managerName: 'Bambang Haryo',
    clientName: 'PT Angkasa Pura II',
    status: 'active',
    createdAt: '01 Nov 2026',
    company_id: 'comp-main',
    companyId: 'comp-main',
  },
];

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr-admin',
    name: 'Super Administrator',
    email: 'superadmin@cleaningops.com',
    username: 'superadmin',
    password: 'admin123',
    role: 'admin',
    assignedProjectIds: ['proj-1793818532678', 'proj-2', 'proj-3'],
    company_id: 'comp-main',
    companyId: 'comp-main',
  },
  {
    id: 'usr-spv-1',
    name: 'Hendra Wijaya (SPV Blok M Square)',
    email: 'spv.blokm@cleaningops.com',
    username: 'spv1',
    password: 'spv123',
    role: 'supervisor',
    assignedProjectIds: ['proj-1793818532678'],
    company_id: 'comp-main',
    companyId: 'comp-main',
  },
  {
    id: 'usr-cln-1',
    name: 'Petugas Kebersihan Blok M Square',
    email: 'petugas.blokm@cleaningops.com',
    username: 'petugas1',
    password: 'petugas123',
    role: 'petugas',
    assignedProjectIds: ['proj-1793818532678'],
    company_id: 'comp-main',
    companyId: 'comp-main',
  },
  {
    id: 'usr-klien',
    name: 'Building Management Blok M Square',
    email: 'klien.blokm@cleaningops.com',
    username: 'klien1',
    password: 'klien123',
    role: 'klien',
    assignedProjectIds: ['proj-1793818532678'],
    company_id: 'comp-main',
    companyId: 'comp-main',
  },
];

export const DEFAULT_RBAC_PERMISSIONS: RoleModulePermission[] = [
  {
    moduleId: 'dashboard',
    moduleName: 'Dashboard & Statistik Harian',
    category: 'Ringkasan',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: false,
  },
  {
    moduleId: 'ceklist',
    moduleName: 'Ceklist Kebersihan Area (24 Jam)',
    category: 'Inspeksi Report',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: false,
  },
  {
    moduleId: 'area',
    moduleName: 'Area Cleaning & Master Zona Gedung',
    category: 'Inspeksi Report',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: false,
  },
  {
    moduleId: 'activity',
    moduleName: 'Cleaning Activity & Feed Progres',
    category: 'Inspeksi Report',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: false,
  },
  {
    moduleId: 'inspeksi',
    moduleName: 'Inspeksi & QC Control Penjamin Mutu',
    category: 'Inspeksi Report',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: false,
  },
  {
    moduleId: 'report',
    moduleName: 'Laporan & Rekapitulasi Bulanan (PDF)',
    category: 'Inspeksi Report',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: false,
  },
  {
    moduleId: 'petugas',
    moduleName: 'Petugas Kebersihan & Absensi',
    category: 'Operational Report',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: false,
  },
  {
    moduleId: 'shift',
    moduleName: 'Shift Operasional & Plotingan Kerja',
    category: 'Operational Report',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: false,
  },
  {
    moduleId: 'jadwal',
    moduleName: 'Jadwal Cleaning Rutin & Roster',
    category: 'Operational Report',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: false,
  },
  {
    moduleId: 'kerusakan',
    moduleName: 'Laporan Kerusakan Fasilitas & Tiket',
    category: 'Operational Report',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: false,
  },
  {
    moduleId: 'proyek',
    moduleName: 'Lokasi Proyek & Hak Akses Multi-Site',
    category: 'Operational Report',
    admin: true,
    supervisor: false,
    petugas: false,
    klien: false,
  },
  {
    moduleId: 'daily-activity',
    moduleName: 'Daily Activity Harian Petugas',
    category: 'Activity Report',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: false,
  },
  {
    moduleId: 'weekly-activity',
    moduleName: 'Weekly Activity Rutinitas Mingguan',
    category: 'Activity Report',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: false,
  },
  {
    moduleId: 'monthly-activity',
    moduleName: 'Monthly Activity & Deep Cleaning Bulanan',
    category: 'Activity Report',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: false,
  },
  {
    moduleId: 'special-job',
    moduleName: 'Special Job (By Request Supervisor & Tarik Weekly/Monthly)',
    category: 'Activity Report',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: false,
  },
  {
    moduleId: 'master-program',
    moduleName: 'Master Cleaning Program (MCP 1-31)',
    category: 'Activity Report',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: false,
  },
  {
    moduleId: 'complaint',
    moduleName: 'Pusat Penanganan Komplain & Keluhan',
    category: 'Activity Report',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: false,
  },
  {
    moduleId: 'klien-mode',
    moduleName: 'Klien Mode - Portal Eksekutif',
    category: 'Klien Mode',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: true,
  },
  {
    moduleId: 'klien-manpower',
    moduleName: 'Klien Mode: Manpower & Shift',
    category: 'Klien Mode',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: true,
  },
  {
    moduleId: 'klien-checklist',
    moduleName: 'Klien Mode: Checklist Kebersihan',
    category: 'Klien Mode',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: true,
  },
  {
    moduleId: 'klien-kerusakan',
    moduleName: 'Klien Mode: Laporan Kerusakan',
    category: 'Klien Mode',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: true,
  },
  {
    moduleId: 'klien-activity',
    moduleName: 'Klien Mode: Activity Report',
    category: 'Klien Mode',
    admin: true,
    supervisor: true,
    petugas: false,
    klien: true,
  },
  {
    moduleId: 'klien-keluhan',
    moduleName: 'Klien Mode: Keluhan & Komplain',
    category: 'Klien Mode',
    admin: true,
    supervisor: true,
    petugas: true,
    klien: true,
  },
  {
    moduleId: 'pengaturan',
    moduleName: 'Pengaturan Sistem & Master Data',
    category: 'Sistem',
    admin: true,
    supervisor: false,
    petugas: false,
    klien: false,
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

export const INITIAL_CHECKLIST_LOCATIONS: ChecklistLocation[] = [];

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

export const INITIAL_DAILY_CHECKLISTS: DailyAreaChecklist[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const createProgramDays = (
  activeDays: number[],
  doneDays: number[] = [],
  inProgressDays: number[] = [],
  rescheduledDays: number[] = []
): Record<number, ProgramDayStatus> => {
  const result: Record<number, ProgramDayStatus> = {};
  for (let d = 1; d <= 31; d++) {
    if (
      activeDays.includes(d) ||
      doneDays.includes(d) ||
      inProgressDays.includes(d) ||
      rescheduledDays.includes(d)
    ) {
      result[d] = 'planned';
    } else {
      result[d] = 'none';
    }
  }
  return result;
};

export const INITIAL_MASTER_PROGRAMS: MasterCleaningProgramItem[] = [];

export const INITIAL_DAMAGE_REPORTS: FacilityDamageReport[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

export const INITIAL_EMPLOYEE_TURNOVERS: EmployeeTurnoverRecord[] = [];

export const INITIAL_KLIEN_CHECKLIST_ITEMS: KlienChecklistItem[] = [
  // --- KATEGORI 1: TOILET ---
  {
    id: 'kci-tlt-1',
    projectId: 'proj-1',
    category: 'toilet',
    name: 'Aroma & Bau Ruangan Toilet',
    standard: 'Bebas bau tidak sedap / apek, aroma segar pengharum ruangan otomatis aktif',
    order: 1,
  },
  {
    id: 'kci-tlt-2',
    projectId: 'proj-1',
    category: 'toilet',
    name: 'Lantai Toilet (Mopping & Dry)',
    standard: 'Lantai bersih mengkilap, kering, tidak licin & bebas genangan air / noda bercak',
    order: 2,
  },
  {
    id: 'kci-tlt-3',
    projectId: 'proj-1',
    category: 'toilet',
    name: 'Sanitasi Kloset & Urinoir',
    standard: 'Kloset duduk/jongkok & urinal disikat higienis dengan disinfektan, bebas noda kerak air',
    order: 3,
  },
  {
    id: 'kci-tlt-4',
    projectId: 'proj-1',
    category: 'toilet',
    name: 'Wastafel, Keran & Cermin Kaca',
    standard: 'Bak wastafel bersih mengkilap, saluran air lancar, cermin bening bebas noda sidik jari',
    order: 4,
  },
  {
    id: 'kci-tlt-5',
    projectId: 'proj-1',
    category: 'toilet',
    name: 'Kelengkapan Sabun & Tisu Roll',
    standard: 'Dispenser hand soap terisi busa/cairan, jumbo roll tissue terpasang mencukupi',
    order: 5,
  },
  {
    id: 'kci-tlt-6',
    projectId: 'proj-1',
    category: 'toilet',
    name: 'Tempat Sampah Sanitair',
    standard: 'Dikosongkan berkala, kantong plastik hitam baru terpasang rapi, tertutup rapat',
    order: 6,
  },

  // --- KATEGORI 2: AREA PUBLIC ---
  {
    id: 'kci-pub-1',
    projectId: 'proj-1',
    category: 'public_area',
    name: 'Lantai Lobby & Atrium Utama',
    standard: 'Disapu merata, dry mopping/buffing marmer mengkilap, bebas sampah & debu',
    order: 1,
  },
  {
    id: 'kci-pub-2',
    projectId: 'proj-1',
    category: 'public_area',
    name: 'Pintu Kaca Utama & Fasad Jendela',
    standard: 'Kaca entrance bening bebas noda sidik jari, frame stainless dibersihkan',
    order: 2,
  },
  {
    id: 'kci-pub-3',
    projectId: 'proj-1',
    category: 'public_area',
    name: 'Sofa Tamu & Meja Resepsionis',
    standard: 'Permukaan meja & kursi tamu dilap bebas debu, formasi tertata simetris rapi',
    order: 3,
  },
  {
    id: 'kci-pub-4',
    projectId: 'proj-1',
    category: 'public_area',
    name: 'Plafon, AC Grill & Lampu Penerangan',
    standard: 'Bebas dari sarang laba-laba, kisi-kisi AC tidak berdebu, pencahayaan terang',
    order: 4,
  },
  {
    id: 'kci-pub-5',
    projectId: 'proj-1',
    category: 'public_area',
    name: 'Standing Dustbin Stainless',
    standard: 'Tempat sampah stainless dilap mengkilap, asbak pasir dibersihkan, tidak meluap',
    order: 5,
  },
  {
    id: 'kci-pub-6',
    projectId: 'proj-1',
    category: 'public_area',
    name: 'Area Drop-off & Teras Luar',
    standard: 'Bebas puntung rokok, daun gugur disapu bersih, keset welcome terpasang rapi',
    order: 6,
  },

  // --- KATEGORI 3: PARKING AREA ---
  {
    id: 'kci-prk-1',
    projectId: 'proj-1',
    category: 'parking',
    name: 'Lantai Parkir Mobil & Motor',
    standard: 'Disapu menyeluruh, bebas tumpahan ceceran oli kendaraan, bebas sampah plastik',
    order: 1,
  },
  {
    id: 'kci-prk-2',
    projectId: 'proj-1',
    category: 'parking',
    name: 'Jalur Pedestrian & Marka Parkir',
    standard: 'Jalur pejalan kaki bersih bebas hambatan, garis marka parkir terlihat jelas',
    order: 2,
  },
  {
    id: 'kci-prk-3',
    projectId: 'proj-1',
    category: 'parking',
    name: 'Rambu Signage & Cermin Tikungan Parkir',
    standard: 'Rambu petunjuk arah & cermin cembung tikungan dilap bersih dari debu pekat',
    order: 3,
  },
  {
    id: 'kci-prk-4',
    projectId: 'proj-1',
    category: 'parking',
    name: 'Drainase & Saluran Air Basement',
    standard: 'Grating saluran bebas sampah penyumbat, tidak ada genangan air hujan berlebih',
    order: 4,
  },
  {
    id: 'kci-prk-5',
    projectId: 'proj-1',
    category: 'parking',
    name: 'Tempat Sampah Area Parkir',
    standard: 'Tong sampah roda (wheelie bin) tertutup rapat, dikosongkan tidak berceceran',
    order: 5,
  },
  {
    id: 'kci-prk-6',
    projectId: 'proj-1',
    category: 'parking',
    name: 'Pos Tiket & Palang Barrier Gate',
    standard: 'Kaca & bodi palang gate dibersihkan, area sekitar pos barrier bersih & rapi',
    order: 6,
  },
];

export const INITIAL_KLIEN_CHECKLIST_INSPECTIONS: KlienChecklistInspection[] = [];

export const INITIAL_SPECIAL_JOBS: SpecialJobItem[] = [];
