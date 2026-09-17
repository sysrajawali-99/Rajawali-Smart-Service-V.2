import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Building2,
  ChevronDown,
  ChevronRight,
  FileDown,
  Sparkles,
  Search,
  Check,
  X,
  FileText,
  ShieldCheck,
  SlidersHorizontal,
  Settings2,
  CheckSquare,
  Filter,
  RefreshCw,
  Wifi,
  WifiOff,
  MapPin,
  Layers,
  Briefcase,
  Smartphone,
  Table,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import {
  ChecklistLocationCategory,
  HourlyCheckItemStatus,
  ChecklistLocation,
  Shift,
} from '../../types';
import {
  renderParameterIcon,
  BauBauanIcon,
  LantaiIcon,
  DindingIcon,
  KotakSampahIcon,
  KacaIcon,
  WastafelIcon,
  SabunCuciTanganIcon,
  KlosetIcon,
  TisuIcon,
  UrinoirIcon,
  HandDrierIcon,
} from '../common/ChecklistParameterIcons';
import {
  exportChecklistToPDF,
  DEFAULT_HOSPITAL_KOP,
  getProjectKop,
  KopSuratConfig,
  toBKRCode,
} from '../../utils/pdfExport';
import {
  STANDARD_TOILET_PARAMETERS,
  findMatchingSlotItem,
} from '../../utils/checklistHelper';

interface ShiftSlotDefinition {
  hour: number;
  dateStr: string;
  isNextDay: boolean;
  timeLabel: string;
}

export const CeklistAreaView: React.FC = () => {
  const {
    projects,
    allowedProjects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    checklistLocations,
    addChecklistLocation,
    checklistTemplates,
    dailyChecklists,
    toggleHourlySlotCell,
    updateHourlySlotItem,
    batchUpdateHourStatus,
    updateSlotInspector,
    fillDailyChecklistClean,
    addManualItemToDailyChecklist,
    getOrCreateDailyChecklist,
    ensureDailyChecklist,
    userRole,
    currentUser,
    setActiveTab,
    isOnline,
    setIsOnline,
    offlineQueue,
    syncOfflineData,
    isSyncing,
    shifts,
  } = useCleaning();

  const [selectedDate, setSelectedDate] = useState('2026-09-13');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    checklistLocations[0]?.id || 'cloc-1'
  );
  const [selectedShiftId, setSelectedShiftId] = useState<string>('shift-1');
  const [viewMode, setViewMode] = useState<'official_table' | 'slot_details'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'slot_details';
    }
    return 'official_table';
  });
  const [expandedHour, setExpandedHour] = useState<number | null>(new Date().getHours());
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Kop Surat selection (RSUP / Kemenkes vs Active Project)
  const [kopType, setKopType] = useState<'hospital' | 'project'>('hospital');
  const [showKopModal, setShowKopModal] = useState(false);
  const [customKop, setCustomKop] = useState<KopSuratConfig>(DEFAULT_HOSPITAL_KOP);

  // Modal states
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCategory, setNewLocCategory] = useState<ChecklistLocationCategory>('toilet');
  const [newLocFloor, setNewLocFloor] = useState('Lantai 1');
  const [newLocCode, setNewLocCode] = useState('');

  const [showAddManualItemModal, setShowAddManualItemModal] = useState(false);
  const [manualItemName, setManualItemName] = useState('');

  // Synchronize selectedLocationId when active project changes or checklist locations update
  useEffect(() => {
    if (checklistLocations.length > 0) {
      const exists = checklistLocations.some((loc) => loc.id === selectedLocationId);
      if (!exists) {
        setSelectedLocationId(checklistLocations[0].id);
      }
    }
  }, [checklistLocations, selectedLocationId]);

  // Make sure we have a valid selected location
  const currentLocation =
    checklistLocations.find((l) => l.id === selectedLocationId) ||
    checklistLocations[0];

  useEffect(() => {
    if (activeProject?.id && currentLocation?.id && selectedDate) {
      ensureDailyChecklist(activeProject.id, currentLocation.id, selectedDate);
    }
  }, [activeProject?.id, currentLocation?.id, selectedDate, ensureDailyChecklist]);

  const currentDailyChecklist = currentLocation
    ? getOrCreateDailyChecklist(activeProject.id, currentLocation.id, selectedDate)
    : null;

  // Active Kop Surat object
  const activeKop = kopType === 'hospital' ? customKop : getProjectKop(activeProject);

  // Helper date formatter (DD/MM/YYYY) with optional day offset
  const computeDateFormatted = (dateInput: string, offsetDays = 0): string => {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10) + offsetDays;
      const dateObj = new Date(y, m, d);
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return dateInput;
  };

  // Indonesian long date display
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Active Shift definition from setup menu
  const activeShift = shifts.find((s) => s.id === selectedShiftId);

  // Dynamically compute the time slots and corresponding dates based on the selected shift
  const shiftSlotDefs = useMemo<ShiftSlotDefinition[]>(() => {
    const curDateStr = computeDateFormatted(selectedDate, 0);
    const nextDateStr = computeDateFormatted(selectedDate, 1);

    if (selectedShiftId === 'all_24' || !activeShift) {
      // 24 Hour view: 00:00 to 24:00
      return Array.from({ length: 24 }, (_, h) => {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = ((h + 1) === 24 ? 24 : (h + 1) % 24).toString().padStart(2, '0');
        return {
          hour: h,
          dateStr: curDateStr,
          isNextDay: false,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        };
      });
    }

    const startH = parseInt((activeShift.startTime || '07:00').split(':')[0], 10) || 0;
    const endH = parseInt((activeShift.endTime || '15:00').split(':')[0], 10) || 0;

    const defs: ShiftSlotDefinition[] = [];

    if (startH === endH) {
      // 24-hour shift
      for (let h = 0; h < 24; h++) {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = ((h + 1) === 24 ? 24 : (h + 1) % 24).toString().padStart(2, '0');
        defs.push({
          hour: h,
          dateStr: curDateStr,
          isNextDay: false,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        });
      }
    } else if (startH < endH) {
      // Normal shift within same day (e.g. 07:00 - 15:00, 11:00 - 19:00, 15:00 - 23:00)
      for (let h = startH; h < endH; h++) {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = (h + 1).toString().padStart(2, '0');
        defs.push({
          hour: h,
          dateStr: curDateStr,
          isNextDay: false,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        });
      }
    } else {
      // Crosses midnight (e.g. Shift 4 Malam: 23:00 - 07:00)
      for (let h = startH; h < 24; h++) {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = (h + 1 === 24 ? 24 : h + 1).toString().padStart(2, '0');
        defs.push({
          hour: h,
          dateStr: curDateStr,
          isNextDay: false,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        });
      }
      for (let h = 0; h < endH; h++) {
        const hStr = h.toString().padStart(2, '0');
        const nextHStr = (h + 1).toString().padStart(2, '0');
        defs.push({
          hour: h,
          dateStr: nextDateStr,
          isNextDay: true,
          timeLabel: `${hStr}.00 - ${nextHStr}.00`,
        });
      }
    }

    return defs;
  }, [selectedShiftId, activeShift, selectedDate]);

  const shiftSlotHours = useMemo(() => shiftSlotDefs.map((d) => d.hour), [shiftSlotDefs]);

  // Standard 11 toilet parameters matching ceklist.webp
  const standardToiletHeaders = STANDARD_TOILET_PARAMETERS.map((param) => ({
    key: param.key,
    id: param.id,
    name: param.name,
    icon: renderParameterIcon(param.name, 18, 'text-sky-700'),
  }));

  // If the location is non-toilet, map from current slot items or fallback
  const firstSlot = currentDailyChecklist?.hourlySlots[0];
  const isToiletCategory = currentLocation?.category === 'toilet';

  const tableColumns = isToiletCategory
    ? standardToiletHeaders
    : (firstSlot?.items || []).slice(0, 11).map((it) => ({
        key: it.itemId,
        id: it.itemId,
        name: it.itemName,
        icon: renderParameterIcon(it.itemName, 18, 'text-sky-700'),
      }));

  // Hourly slots matching active shift with date and time metadata
  const displayedSlotsWithMeta = useMemo(() => {
    return shiftSlotDefs.map((def) => {
      const rawSlot = currentDailyChecklist?.hourlySlots.find((s) => s.hour === def.hour);
      if (rawSlot) {
        return {
          ...rawSlot,
          timeLabel: def.timeLabel,
          dateStr: def.dateStr,
          isNextDay: def.isNextDay,
        };
      }
      return {
        hour: def.hour,
        hourLabel: def.timeLabel,
        timeLabel: def.timeLabel,
        dateStr: def.dateStr,
        isNextDay: def.isNextDay,
        status: 'pending' as const,
        items: [],
      };
    });
  }, [shiftSlotDefs, currentDailyChecklist]);

  // Stats calculation
  const totalSlots = displayedSlotsWithMeta.length;
  const cleanSlots = displayedSlotsWithMeta.filter((s) => s.status === 'clean').length;
  const issueSlots = displayedSlotsWithMeta.filter((s) => s.status === 'has_issue').length;
  const pendingSlots = displayedSlotsWithMeta.filter((s) => s.status === 'pending').length;
  const cleanlinessRate = totalSlots > 0 ? Math.round((cleanSlots / totalSlots) * 100) : 0;

  // Handle PDF Export tailored to active shift and filtered project location
  const handleDownloadPDF = () => {
    if (!currentDailyChecklist || !currentLocation) return;
    setIsDownloadingPdf(true);

    const slotDateMap: Record<number, string> = {};
    shiftSlotDefs.forEach((def) => {
      slotDateMap[def.hour] = def.dateStr;
    });

    try {
      exportChecklistToPDF({
        dailyChecklist: currentDailyChecklist,
        location: currentLocation,
        project: activeProject,
        kopSurat: activeKop,
        allowedHours: shiftSlotHours,
        shiftName: activeShift ? activeShift.name : '24 Jam Penuh',
        shiftHoursText: activeShift
          ? `${activeShift.startTime} - ${activeShift.endTime} WIB (${activeShift.durationText || `${activeShift.workHoursDuration || 8} Jam`})`
          : '00:00 - 24:00 WIB (24 Jam Penuh)',
        slotDateMap,
      });
    } catch (err) {
      console.error('Error exporting checklist PDF:', err);
    } finally {
      setTimeout(() => setIsDownloadingPdf(false), 800);
    }
  };

  // Quick action: Fill hours of active shift as Clean 'B'
  const handleQuickFillClean = () => {
    if (!currentDailyChecklist) return;
    const inspectorName = currentUser?.name?.split(' ')[0] || 'Asep S.';
    fillDailyChecklistClean(currentDailyChecklist.id, shiftSlotHours, inspectorName);
  };

  // Toggle single cell value: '-' -> 'B' -> 'K' -> 'R' -> '-'
  const handleToggleCell = (hour: number, colKey: string) => {
    if (!currentDailyChecklist) return;
    toggleHourlySlotCell(currentDailyChecklist.id, hour, colKey);
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    addChecklistLocation({
      name: newLocName,
      category: newLocCategory,
      floor: newLocFloor,
      code: newLocCode || `${newLocCategory.slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
      projectId: activeProject.id,
    });

    setNewLocName('');
    setNewLocCode('');
    setShowAddLocationModal(false);
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemName.trim() || !currentDailyChecklist) return;

    addManualItemToDailyChecklist(currentDailyChecklist.id, manualItemName);
    setManualItemName('');
    setShowAddManualItemModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Center */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Ceklist Kebersihan Area (Formulir Resmi)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-sky-700" />
                  {activeProject.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {activeShift ? `${activeShift.name} (${activeShift.startTime} - ${activeShift.endTime})` : '24 Jam Penuh'}
                </span>
                {!isOnline ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <WifiOff className="w-3 h-3 text-rose-600" />
                    Offline (Simpan Lokal)
                  </span>
                ) : offlineQueue.length > 0 ? (
                  <button
                    onClick={() => syncOfflineData()}
                    disabled={isSyncing}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 hover:bg-amber-100"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    {offlineQueue.length} data tertunda (Klik Sinkron)
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Model formulir resmi kebersihan sesuai standar operasional untuk proyek{' '}
                <span className="font-semibold text-slate-800">{activeProject.name}</span> ({activeProject.clientName}).
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Clean Fill */}
          <button
            onClick={handleQuickFillClean}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors shadow-xs"
            title={`Tandai semua jam pada ${activeShift ? activeShift.name : '24 Jam'} sebagai Bersih (B) dengan satu klik`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Isi Jam Shift = B (Bersih)</span>
          </button>

          {/* Kop Surat Setting */}
          <button
            onClick={() => setShowKopModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            title="Sesuaikan Kop Surat RSUP / Proyek"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Kop Dokumen</span>
          </button>

          {/* Download PDF (Replaces Cetak) */}
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloadingPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-60"
            title="Unduh file dokumen PDF resmi persis seperti formulir gambar"
          >
            <FileDown className="w-4 h-4" />
            <span>{isDownloadingPdf ? 'Menyiapkan PDF...' : 'Download PDF Ceklist'}</span>
          </button>
        </div>
      </div>

      {/* FILTER & SETUP BAR: PROYEK, AREA KERJA, TANGGAL, JAM KERJA / SHIFT */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. PILIHAN PROYEK (DITENTUKAN SUPER ADMIN) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-sky-700" />
                <span>1. Proyek (Super Admin):</span>
              </label>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                Site Aktif
              </span>
            </div>
            <div className="relative">
              <select
                value={activeProject.id}
                onChange={(e) => {
                  const newProjId = e.target.value;
                  setActiveProjectId(newProjId);
                }}
                className="w-full pl-3 pr-8 py-2 bg-sky-50/60 border border-sky-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                {(userRole === 'admin' ? projects : allowedProjects).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.clientName})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-sky-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[10.5px] text-slate-500 truncate">
              {activeProject.type === 'office'
                ? 'Gedung Perkantoran'
                : activeProject.type === 'airport'
                ? 'Bandara Udara'
                : 'Fasilitas Komersial'}{' '}
              • {activeProject.totalFloors} Lantai • {activeProject.city}
            </p>
          </div>

          {/* 2. PILIHAN AREA KERJA (HANYA AREA PROYEK INI, AREA LAIN DISEMBUNYIKAN) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>2. Area Kerja:</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {checklistLocations.length} Area
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                {checklistLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.floor})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[10.5px] text-slate-500 truncate">
              Kategori: <strong className="capitalize">{currentLocation?.category || 'Toilet'}</strong> • Kode: {currentLocation?.code || '-'}
            </p>
          </div>

          {/* 3. PILIHAN TANGGAL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-700" />
                <span>3. Tanggal Ceklist:</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-09-13')}
                  className="text-[10px] font-semibold text-slate-500 hover:text-sky-700 underline"
                  title="Gunakan tanggal data awal"
                >
                  Default (13 Sep)
                </button>
              </div>
            </div>
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <p className="text-[10.5px] text-slate-500 truncate">
              {formattedSelectedDate}
            </p>
          </div>

          {/* 4. PILIHAN JAM KERJA / SHIFT (SETUP MENU SHIFT) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>4. Jam Kerja / Shift:</span>
              </label>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                {shiftSlotHours.length} Jam Aktif
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime} WIB • {s.durationText || `${s.workHoursDuration || 8} Jam`})
                  </option>
                ))}
                <option value="all_24">
                  Semua Jam (24 Jam Penuh: 00:00 - 24:00 WIB)
                </option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[10.5px] text-slate-500 truncate">
              {activeShift
                ? `${activeShift.description || 'Pembersihan operasional'}`
                : 'Pemantauan checklist kebersihan 24 jam penuh'}
            </p>
          </div>
        </div>

        {/* Quick Pills for Fast Area & Shift Switching */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Shift Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Shift Cepat:</span>
            {shifts.map((s) => {
              const isSelected = selectedShiftId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedShiftId(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-700 text-white font-bold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.color || '#0284c7' }}
                  />
                  <span>{s.name.split('(')[0].trim()}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                    ({s.startTime}-{s.endTime})
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedShiftId('all_24')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedShiftId === 'all_24'
                  ? 'bg-slate-800 text-white font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>24 Jam Penuh</span>
            </button>
          </div>

          {/* View mode toggle & master actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('slot_details')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === 'slot_details'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan kartu ramah layar ponsel (Touch-Friendly)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mode Ponsel (Kartu)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('official_table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === 'official_table'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan tabel cetak resmi operasional"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabel Resmi</span>
              </button>
            </div>

            <button
              onClick={() => setShowAddLocationModal(true)}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1"
              title="Tambah Lokasi Baru ke Proyek Ini"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Lokasi</span>
            </button>

            <button
              onClick={() => setShowAddManualItemModal(true)}
              className="px-2.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1"
              title="Tambah item pengecekan manual ke lembar hari ini"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Item</span>
            </button>
          </div>
        </div>

        {/* Location selector pills for fast 1-click area navigation */}
        {checklistLocations.length > 1 && (
          <div className="pt-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1 whitespace-nowrap">Area Proyek:</span>
            {checklistLocations.map((loc) => {
              const isSelected = selectedLocationId === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocationId(loc.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                    isSelected
                      ? 'bg-emerald-700 text-white font-bold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {loc.name} <span className="text-[10px] opacity-80">({loc.floor})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick KPI Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">Total Slot Ditampilkan</span>
            <span className="text-lg font-bold text-slate-800">{totalSlots} Jam ({activeShift ? activeShift.name.split('(')[0].trim() : '24 Jam'})</span>
          </div>
          <Clock className="w-6 h-6 text-slate-300" />
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-600 font-semibold block">Status Bersih (B)</span>
            <span className="text-lg font-bold text-emerald-700">{cleanSlots} Jam</span>
          </div>
          <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs">
            B
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-rose-600 font-semibold block">Temuan Kotor (K)</span>
            <span className="text-lg font-bold text-rose-700">{issueSlots} Jam</span>
          </div>
          <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 font-black flex items-center justify-center text-xs">
            K
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-sky-600 font-semibold block">Tingkat Kebersihan</span>
            <span className="text-lg font-bold text-sky-800">{cleanlinessRate}%</span>
          </div>
          <ShieldCheck className="w-6 h-6 text-sky-400" />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. VIEW MODE: OFFICIAL FORMULIR MODEL (PERSIS CEKLIST.WEBP) */}
      {/* ============================================================ */}
      {viewMode === 'official_table' && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-6 sm:p-8 space-y-6 overflow-hidden">
          {/* OFFICIAL INSTITUTION KOP SURAT */}
          <div className="border-b-2 border-slate-800 pb-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left Logo (Kemenkes Style) */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex flex-col items-center justify-center p-1 border border-emerald-300 bg-emerald-50 rounded-xl text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
                  +
                </div>
                <span className="text-[8px] sm:text-[9px] font-bold text-emerald-800 mt-1 uppercase tracking-tighter">
                  Kemenkes RI
                </span>
              </div>

              {/* Center Kop Surat Text */}
              <div className="flex-1 text-center space-y-0.5">
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {activeKop.institutionLine1}
                </h4>
                <h5 className="text-[10px] sm:text-[11px] font-semibold text-slate-700 uppercase">
                  {activeKop.institutionLine2}
                </h5>
                <h3 className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-tight">
                  {activeKop.facilityName}
                </h3>
                <p className="text-[9px] sm:text-[10px] text-slate-600 leading-tight">
                  {activeKop.addressLine1}
                </p>
                <p className="text-[8px] sm:text-[9.5px] text-slate-500 leading-tight">
                  {activeKop.contactLine}
                </p>
              </div>

              {/* Right Logo (RSMH / Akreditasi) */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex flex-col items-center justify-center p-1 border border-sky-300 bg-sky-50 rounded-xl text-center">
                <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                  RS
                </div>
                <span className="text-[8px] sm:text-[9px] font-bold text-sky-900 mt-1 uppercase tracking-tighter">
                  Akreditasi A
                </span>
              </div>
            </div>

            {/* Double Horizontal Rule */}
            <div className="mt-3 border-t-2 border-slate-900 pt-0.5 border-b border-slate-900"></div>
          </div>

          {/* DOCUMENT TITLE & SUBHEADER */}
          <div className="text-center space-y-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide underline underline-offset-4 decoration-2">
              {isToiletCategory
                ? 'CHECKLIST KEBERSIHAN TOILET'
                : `CHECKLIST KEBERSIHAN ${currentLocation?.name.toUpperCase()}`}
            </h2>

            <div className="flex flex-col md:flex-row md:items-center justify-between text-xs font-semibold text-slate-800 pt-2 px-1 gap-2 border-b border-slate-200 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900">
                  {isToiletCategory ? 'Toilet :' : 'Area / Ruangan :'}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 font-bold text-slate-900">
                  {currentLocation?.name} ({currentLocation?.floor})
                </span>
                <span className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-sky-700" />
                  {activeProject.name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-slate-600">
                <div>
                  <span>Tanggal : </span>
                  <span className="font-bold text-slate-900">{formattedSelectedDate}</span>
                </div>
                <div className="h-3 w-px bg-slate-300 hidden sm:block"></div>
                <div className="flex items-center gap-1">
                  <span>Shift : </span>
                  <span className="font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                    {activeShift
                      ? `${activeShift.name} (${activeShift.startTime} - ${activeShift.endTime} WIB)`
                      : 'Semua Shift (24 Jam Penuh)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE SWIPE HINT BANNER */}
          <div className="md:hidden flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-[11px] leading-tight">
                Tampilan tabel lebar: Geser ke samping, atau beralih ke <strong>Mode Ponsel</strong> untuk pengisian cepat per kartu.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('slot_details')}
              className="shrink-0 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs"
            >
              Mode Ponsel
            </button>
          </div>

          {/* TABLE CONTAINER - PERSIS MODEL DI GAMBAR CEKLIST.WEBP */}
          <div className="border border-slate-400 rounded-lg overflow-x-auto shadow-xs">
            <table className="w-full border-collapse text-center text-xs">
              {/* TABLE HEADER WITH ICONS */}
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 divide-x divide-slate-300 text-slate-900">
                  <th className="p-2 w-24 text-center font-bold text-[11px] align-middle bg-slate-200/70">
                    Tanggal
                  </th>
                  <th className="p-2 w-28 text-center font-bold text-[11px] align-middle bg-slate-200/70">
                    Jam
                  </th>

                  {/* 11 Parameters with Icons matching ceklist.webp */}
                  {tableColumns.map((col) => (
                    <th
                      key={col.key}
                      className="p-2 min-w-[70px] max-w-[85px] text-center align-bottom"
                      title={col.name}
                    >
                      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center shadow-2xs">
                          {col.icon}
                        </div>
                        <span className="text-[10px] font-bold leading-tight line-clamp-2 text-slate-800">
                          {col.name}
                        </span>
                      </div>
                    </th>
                  ))}

                  <th className="p-2 w-28 text-center font-bold text-[11px] align-middle bg-slate-200/70">
                    Pengawas
                  </th>
                  <th className="p-2 w-16 text-center font-bold text-[11px] align-middle bg-slate-200/70">
                    Paraf
                  </th>
                </tr>
              </thead>

              {/* TABLE BODY (Hourly Rows) */}
              <tbody className="divide-y divide-slate-300">
                {displayedSlotsWithMeta.map((slot) => {
                  const isCurrentHour = new Date().getHours() === slot.hour;

                  return (
                    <tr
                      key={`${slot.hour}-${slot.dateStr}`}
                      className={`divide-x divide-slate-300 hover:bg-sky-50/40 transition-colors group ${
                        isCurrentHour ? 'bg-amber-50/50' : 'bg-white'
                      }`}
                    >
                      {/* Tanggal */}
                      <td className="p-1.5 text-[10.5px] font-medium text-slate-700 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <span>{slot.dateStr}</span>
                          {slot.isNextDay && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              +1 Hari
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Jam */}
                      <td className="p-1.5 text-[10.5px] font-bold text-slate-900 whitespace-nowrap bg-slate-50/80">
                        <div className="flex items-center justify-center gap-1">
                          <span>{slot.timeLabel}</span>
                          {isCurrentHour && (
                            <span
                              className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                              title="Jam Saat Ini"
                            ></span>
                          )}
                        </div>
                      </td>

                      {/* 11 Item Parameter Cells with B / K / R status */}
                      {tableColumns.map((col) => {
                        // Find matching item deterministically
                        const matchedItem =
                          findMatchingSlotItem(slot.items, col.key) ||
                          findMatchingSlotItem(slot.items, col.name);

                        // Strictly matchedItem status, NEVER fall back to slot.status!
                        const currentVal = matchedItem ? toBKRCode(matchedItem.status) : '-';

                        return (
                          <td
                            key={col.key}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCell(slot.hour, col.key);
                            }}
                            className="p-1 cursor-pointer select-none transition-all hover:bg-sky-100/70"
                            title={`Klik untuk ubah: ${col.name} (Jam ${slot.hour}:00) - Status: ${currentVal}`}
                          >
                            <div className="flex items-center justify-center">
                              {currentVal === 'B' ? (
                                <span className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-400 font-black text-xs flex items-center justify-center shadow-xs">
                                  B
                                </span>
                              ) : currentVal === 'K' ? (
                                <span className="w-7 h-7 rounded-md bg-rose-100 text-rose-900 border border-rose-400 font-black text-xs flex items-center justify-center shadow-xs">
                                  K
                                </span>
                              ) : currentVal === 'R' ? (
                                <span className="w-7 h-7 rounded-md bg-amber-100 text-amber-900 border border-amber-400 font-black text-xs flex items-center justify-center shadow-xs">
                                  R
                                </span>
                              ) : (
                                <span className="w-7 h-7 rounded-md bg-slate-50 text-slate-300 hover:text-slate-600 hover:bg-slate-200/70 border border-dashed border-slate-300 font-bold text-xs flex items-center justify-center transition-colors">
                                  -
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Pengawas Column */}
                      <td className="p-1 text-[11px] text-slate-700">
                        <input
                          type="text"
                          value={slot.checkedBy || ''}
                          placeholder="Nama Pengawas"
                          onChange={(e) => {
                            if (currentDailyChecklist) {
                              updateSlotInspector(
                                currentDailyChecklist.id,
                                slot.hour,
                                e.target.value,
                                slot.supervisorVerified
                              );
                            }
                          }}
                          className="w-full text-center px-1 py-0.5 text-[11px] font-medium border-0 focus:ring-1 focus:ring-sky-500 rounded bg-transparent hover:bg-slate-100 focus:bg-white"
                        />
                      </td>

                      {/* Paraf Column */}
                      <td className="p-1 text-[11px] font-bold text-center">
                        <button
                          onClick={() => {
                            if (currentDailyChecklist) {
                              updateSlotInspector(
                                currentDailyChecklist.id,
                                slot.hour,
                                slot.checkedBy || 'Pengawas',
                                !slot.supervisorVerified
                              );
                            }
                          }}
                          className={`w-6 h-6 mx-auto rounded flex items-center justify-center transition-colors ${
                            slot.status !== 'pending' || slot.supervisorVerified
                              ? 'bg-sky-100 text-sky-800 font-bold'
                              : 'text-slate-300 hover:text-slate-600 border border-slate-200'
                          }`}
                          title="Tanda tangan / Paraf verifikasi"
                        >
                          {slot.status !== 'pending' || slot.supervisorVerified ? '✓' : '-'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* CATATAN (CARA PENGISIAN KOLOM SEBAGAI BERIKUT) - PERSIS GAMBAR CEKLIST.WEBP */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pt-2">
            {/* Legend Note */}
            <div className="space-y-1.5 text-xs text-slate-800">
              <p className="font-bold">Catatan : Cara pengisian kolom sebagai berikut</p>
              <div className="pl-6 space-y-1 font-semibold text-[11.5px]">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs flex items-center justify-center">
                    B
                  </span>
                  <span>: Bersih</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-black text-xs flex items-center justify-center">
                    K
                  </span>
                  <span>: Kotor</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-black text-xs flex items-center justify-center">
                    R
                  </span>
                  <span>: Rusak</span>
                </div>
              </div>
            </div>

            {/* SIGNATURE SECTION (PETUGAS PELAKSANA & PENGAWAS RS / SUPERVISOR) */}
            <div className="flex items-center gap-8 sm:gap-14 text-center text-xs text-slate-800">
              <div>
                <p className="text-slate-600 mb-12 font-medium">Petugas Pelaksana Kebersihan:</p>
                <p className="font-bold text-slate-900 underline">( Asep Supriyadi )</p>
                <p className="text-[10px] text-slate-500">Cleaning Service Staff</p>
              </div>

              <div>
                <p className="text-slate-600 mb-12 font-medium">Pengawas / Supervisor Area:</p>
                <p className="font-bold text-slate-900 underline">( Hendra Wijaya )</p>
                <p className="text-[10px] text-slate-500">Quality & Hygiene Inspector</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. VIEW MODE: DETAIL KARTU SLOT PER JAM (TOUCH FRIENDLY)     */}
      {/* ============================================================ */}
      {viewMode === 'slot_details' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-sky-600" />
                <span>Mode Kartu Pemeriksaan Per Jam (Ramah Ponsel)</span>
              </p>
              <p className="text-slate-500 mt-0.5">
                {displayedSlotsWithMeta.length} slot waktu aktif ({activeShift ? activeShift.name : '24 Jam'}). Ketuk tombol status untuk mengubah nilai dengan cepat.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandedHour(expandedHour === null ? (displayedSlotsWithMeta[0]?.hour ?? 7) : null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                {expandedHour !== null ? 'Tutup Rincian' : 'Buka Rincian'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddManualItemModal(true)}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Item</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {displayedSlotsWithMeta.map((slot) => {
              const isExpanded = expandedHour === slot.hour;
              const isCurrentHour = new Date().getHours() === slot.hour;
              const cleanCount = slot.items.filter((it) => it.status === 'clean').length;
              const issueCount = slot.items.filter((it) => it.status === 'issue').length;
              const brokenCount = slot.items.filter((it) => it.status === 'broken').length;

              return (
                <div
                  key={`${slot.hour}-${slot.dateStr}`}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isCurrentHour
                      ? 'border-sky-300 ring-2 ring-sky-200 bg-white shadow-sm'
                      : slot.status === 'clean'
                      ? 'border-emerald-200 bg-white'
                      : slot.status === 'has_issue'
                      ? 'border-rose-200 bg-white'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div
                    onClick={() => setExpandedHour(isExpanded ? null : slot.hour)}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-16 sm:w-20 text-center shrink-0 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-900 text-xs font-mono block">
                          {slot.timeLabel}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {slot.dateStr}
                        </span>
                        {slot.isNextDay && (
                          <span className="block mt-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                            +1 Hari
                          </span>
                        )}
                      </div>

                      <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">
                            Jam {slot.timeLabel} WIB
                          </span>
                          {isCurrentHour && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] font-bold animate-pulse">
                              Jam Sekarang
                            </span>
                          )}
                          {slot.status === 'clean' && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                              Lengkap Bersih
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Pengawas: <strong className="text-slate-700">{slot.checkedBy || 'Belum ditugaskan'}</strong> •{' '}
                          {slot.items.length} parameter
                        </p>

                        {/* Quick counts chips */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {cleanCount} B
                          </span>
                          {issueCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {issueCount} K
                            </span>
                          )}
                          {brokenCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {brokenCount} R
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentDailyChecklist) {
                            batchUpdateHourStatus(
                              currentDailyChecklist.id,
                              slot.hour,
                              'clean',
                              currentUser?.name?.split(' ')[0] || 'Asep S.'
                            );
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                        title="Tandai semua parameter jam ini bersih"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+ B Semua</span>
                      </button>

                      <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                        <span className="hidden sm:inline">{isExpanded ? 'Tutup' : 'Buka'}</span>
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <ChevronDown
                            className={`w-4 h-4 text-slate-600 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail items */}
                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-slate-100 bg-slate-50/60 space-y-4">
                      {/* Grid of items */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                        {slot.items.map((item) => (
                          <div
                            key={item.itemId}
                            className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                                  {renderParameterIcon(item.itemName, 15, 'text-sky-700')}
                                </div>
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {item.itemName}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  item.status === 'clean'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.status === 'issue'
                                    ? 'bg-rose-100 text-rose-800'
                                    : item.status === 'broken'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.status === 'clean'
                                  ? 'Bersih'
                                  : item.status === 'issue'
                                  ? 'Kotor'
                                  : item.status === 'broken'
                                  ? 'Rusak'
                                  : 'Belum'}
                              </span>
                            </div>

                            {/* Touch-Friendly Buttons Grid (min 44px touch ergonomics) */}
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateHourlySlotItem(
                                    currentDailyChecklist!.id,
                                    slot.hour,
                                    item.itemId,
                                    'clean'
                                  )
                                }
                                className={`h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                                  item.status === 'clean'
                                    ? 'bg-emerald-600 text-white shadow-sm scale-102 ring-2 ring-emerald-300'
                                    : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateHourlySlotItem(
                                    currentDailyChecklist!.id,
                                    slot.hour,
                                    item.itemId,
                                    'issue',
                                    'Ditemukan kotor'
                                  )
                                }
                                className={`h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                                  item.status === 'issue'
                                    ? 'bg-rose-600 text-white shadow-sm scale-102 ring-2 ring-rose-300'
                                    : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                                }`}
                              >
                                K
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateHourlySlotItem(
                                    currentDailyChecklist!.id,
                                    slot.hour,
                                    item.itemId,
                                    'broken',
                                    'Ditemukan rusak'
                                  )
                                }
                                className={`h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                                  item.status === 'broken'
                                    ? 'bg-amber-600 text-white shadow-sm scale-102 ring-2 ring-amber-300'
                                    : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                R
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateHourlySlotItem(
                                    currentDailyChecklist!.id,
                                    slot.hour,
                                    item.itemId,
                                    'not_checked'
                                  )
                                }
                                className={`h-10 rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                                  item.status === 'not_checked'
                                    ? 'bg-slate-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                                }`}
                              >
                                -
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick Inspector & Paraf within card */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <label className="text-slate-600 font-bold shrink-0">Pengawas:</label>
                          <input
                            type="text"
                            value={slot.checkedBy || ''}
                            placeholder="Nama Pengawas"
                            onChange={(e) => {
                              if (currentDailyChecklist) {
                                updateSlotInspector(
                                  currentDailyChecklist.id,
                                  slot.hour,
                                  e.target.value,
                                  slot.supervisorVerified
                                );
                              }
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <label className="text-slate-600 font-bold">Verifikasi / Paraf:</label>
                          <button
                            type="button"
                            onClick={() => {
                              if (currentDailyChecklist) {
                                updateSlotInspector(
                                  currentDailyChecklist.id,
                                  slot.hour,
                                  slot.checkedBy || 'Pengawas',
                                  !slot.supervisorVerified
                                );
                              }
                            }}
                            className={`h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                              slot.supervisorVerified
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>{slot.supervisorVerified ? 'Terverifikasi' : 'Beri Paraf'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Reset Jam Ini */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (currentDailyChecklist) {
                              batchUpdateHourStatus(
                                currentDailyChecklist.id,
                                slot.hour,
                                'not_checked',
                                ''
                              );
                            }
                          }}
                          className="px-3 py-1.5 border border-slate-300 hover:bg-white text-slate-600 rounded-xl font-medium"
                        >
                          Reset Semua Parameter Jam Ini
                        </button>

                        <span className="text-slate-400 text-[11px]">
                          Terakhir diperiksa: {slot.checkedAt || 'Belum diisi'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PENGATURAN KOP SURAT                                  */}
      {/* ============================================================ */}
      {showKopModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-sky-600" />
                Pengaturan Kop Surat Dokumen
              </h3>
              <button
                onClick={() => setShowKopModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setKopType('hospital')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                    kopType === 'hospital'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kop RSUP Dr. Mohammad Hoesin (Sesuai Gambar)
                </button>
                <button
                  type="button"
                  onClick={() => setKopType('project')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                    kopType === 'project'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kop Proyek Aktif ({activeProject.name})
                </button>
              </div>

              {kopType === 'hospital' && (
                <div className="space-y-2.5 pt-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Instansi Baris 1
                    </label>
                    <input
                      type="text"
                      value={customKop.institutionLine1}
                      onChange={(e) =>
                        setCustomKop({ ...customKop, institutionLine1: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Instansi Baris 2
                    </label>
                    <input
                      type="text"
                      value={customKop.institutionLine2}
                      onChange={(e) =>
                        setCustomKop({ ...customKop, institutionLine2: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nama Rumah Sakit / Fasilitas
                    </label>
                    <input
                      type="text"
                      value={customKop.facilityName}
                      onChange={(e) =>
                        setCustomKop({ ...customKop, facilityName: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Alamat</label>
                    <input
                      type="text"
                      value={customKop.addressLine1}
                      onChange={(e) =>
                        setCustomKop({ ...customKop, addressLine1: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kontak & Web</label>
                    <input
                      type="text"
                      value={customKop.contactLine}
                      onChange={(e) =>
                        setCustomKop({ ...customKop, contactLine: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600"
                    />
                  </div>
                </div>
              )}

              {kopType === 'project' && (
                <div className="p-3 bg-sky-50 rounded-xl text-sky-800 text-[11px] leading-relaxed">
                  Dokumen akan menggunakan kop resmi manajemen operasional gedung untuk site{' '}
                  <strong>{activeProject.name}</strong> dengan pengelola{' '}
                  <strong>{activeProject.clientName}</strong>.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowKopModal(false)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-xs shadow-xs"
              >
                Selesai & Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD LOCATION */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                Tambah Lokasi Ceklist Area
              </h3>
              <button
                onClick={() => setShowAddLocationModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLocation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Area / Ruangan</label>
                <input
                  type="text"
                  required
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  placeholder="Contoh: Toilet VIP Lt. 3, Koridor Barat, Musholla Utama..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori Area</label>
                  <select
                    value={newLocCategory}
                    onChange={(e) => setNewLocCategory(e.target.value as ChecklistLocationCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="toilet">Toilet</option>
                    <option value="public_area">Public Area</option>
                    <option value="koridor">Koridor</option>
                    <option value="musholla">Musholla</option>
                    <option value="lift">Lift & Eskalator</option>
                    <option value="pantry">Pantry</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lantai</label>
                  <input
                    type="text"
                    required
                    value={newLocFloor}
                    onChange={(e) => setNewLocFloor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    placeholder="Lantai 1 / Basement"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Area (Opsional)</label>
                <input
                  type="text"
                  value={newLocCode}
                  onChange={(e) => setNewLocCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono"
                  placeholder="TLT-03 / KOR-01"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-slate-500 text-[11px] leading-relaxed">
                Lokasi baru ini akan langsung memiliki lembar ceklist 24 jam dengan 11 parameter template resmi.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Simpan Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MANUAL ITEM TO THIS CHECKLIST */}
      {showAddManualItemModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-600" />
                Tambah Item Ceklist Manual
              </h3>
              <button
                onClick={() => setShowAddManualItemModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Uraian Item Pekerjaan / Pengecekan
                </label>
                <textarea
                  rows={3}
                  required
                  value={manualItemName}
                  onChange={(e) => setManualItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  placeholder="Contoh: Keset depan pintu diganti kering, dispenser aroma dicek baterainya..."
                />
              </div>

              <div className="p-3 bg-sky-50 rounded-xl text-sky-800 text-[11px] leading-relaxed">
                Item ini akan langsung ditambahkan ke semua slot 24 jam pada lembar ceklist hari ini untuk lokasi {currentLocation?.name}.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddManualItemModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Tambahkan Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
