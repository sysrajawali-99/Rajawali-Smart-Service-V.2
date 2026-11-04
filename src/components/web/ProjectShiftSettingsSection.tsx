import React, { useState, useMemo } from 'react';
import {
  Clock,
  Building2,
  Users,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  Save,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  AlertCircle,
  Calendar,
  Zap,
  Info,
  MapPin,
  X,
  Briefcase,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { Shift, ShiftPlottingAllocation, ProjectLocation } from '../../types';
import { calculateShiftDuration } from '../../utils/shiftUtils';

const COLOR_PRESETS = [
  { label: 'Sky Blue', value: '#0284c7' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Rose', value: '#e11d48' },
];

export const ProjectShiftSettingsSection: React.FC = () => {
  const {
    projects,
    allProjects,
    activeProjectId,
    shifts,
    addShift,
    updateShift,
    deleteShift,
    assignShiftsToProject,
    userRole,
  } = useCleaning();

  const isSuperAdmin = userRole === 'admin' || userRole === 'super_admin';
  const availableProjects = allProjects && allProjects.length > 0 ? allProjects : projects;

  // Selected project for configuring shifts
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId || availableProjects[0]?.id || 'proj-1');

  // Currently selected project object
  const currentProject = useMemo(() => {
    return availableProjects.find((p) => p.id === selectedProjectId) || availableProjects[0];
  }, [availableProjects, selectedProjectId]);

  // Active shift IDs for the selected project
  // If project has shiftIds defined, use that. Otherwise, default to all shifts.
  const [activeShiftIds, setActiveShiftIds] = useState<string[]>(() => {
    if (currentProject && Array.isArray(currentProject.shiftIds) && currentProject.shiftIds.length > 0) {
      return currentProject.shiftIds;
    }
    return shifts.map((s) => s.id);
  });

  // Keep activeShiftIds in sync when switching projects
  React.useEffect(() => {
    if (currentProject && Array.isArray(currentProject.shiftIds) && currentProject.shiftIds.length > 0) {
      setActiveShiftIds(currentProject.shiftIds);
    } else {
      // Default: all master shifts active for this project
      setActiveShiftIds(shifts.map((s) => s.id));
    }
    setSaveSuccess(false);
  }, [currentProject?.id]);

  // Toast feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Modal State for Creating / Editing Shift
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<{
    name: string;
    code: string;
    startTime: string;
    endTime: string;
    color: string;
    personnelCount: number;
    description: string;
    plottingAllocations: ShiftPlottingAllocation[];
  }>({
    name: '',
    code: '',
    startTime: '07:00',
    endTime: '15:00',
    color: '#0284c7',
    personnelCount: 4,
    description: '',
    plottingAllocations: [],
  });

  // Plotingan sub-form state within modal
  const [newPlotArea, setNewPlotArea] = useState('');
  const [newPlotTask, setNewPlotTask] = useState('');
  const [newPlotQuota, setNewPlotQuota] = useState(1);
  const [newPlotPriority, setNewPlotPriority] = useState<'rutin' | 'intensif' | 'periodic'>('rutin');

  // Toggle shift active state for current project
  const handleToggleShift = (shiftId: string) => {
    setActiveShiftIds((prev) => {
      if (prev.includes(shiftId)) {
        // Prevent disabling all shifts
        if (prev.length <= 1) {
          showToast('Minimal harus ada 1 shift aktif pada proyek!');
          return prev;
        }
        return prev.filter((id) => id !== shiftId);
      } else {
        return [...prev, shiftId];
      }
    });
    setSaveSuccess(false);
  };

  // Quick Preset Actions
  const handleApplyPreset = (presetType: 'all' | '24hours' | 'office2shifts' | 'single') => {
    if (presetType === 'all') {
      setActiveShiftIds(shifts.map((s) => s.id));
      showToast('Seluruh master shift telah diaktifkan untuk proyek ini.');
    } else if (presetType === '24hours') {
      // Find or pick up to 3 shifts that cover 24 hours (or first 3 shifts)
      const selected = shifts.slice(0, 3).map((s) => s.id);
      setActiveShiftIds(selected);
      showToast('Pola 3 Shift (24 Jam) berhasil diterapkan.');
    } else if (presetType === 'office2shifts') {
      // Pick first 2 shifts
      const selected = shifts.slice(0, 2).map((s) => s.id);
      setActiveShiftIds(selected);
      showToast('Pola 2 Shift (Office Hours & Transisi) berhasil diterapkan.');
    } else if (presetType === 'single') {
      // Pick first shift
      const selected = shifts.slice(0, 1).map((s) => s.id);
      setActiveShiftIds(selected);
      showToast('Pola 1 Shift (Normal) berhasil diterapkan.');
    }
    setSaveSuccess(false);
  };

  // Save changes to project
  const handleSaveProjectShifts = () => {
    if (!currentProject) return;
    assignShiftsToProject(currentProject.id, activeShiftIds);
    setSaveSuccess(true);
    showToast(`Konfigurasi shift untuk proyek "${currentProject.name}" berhasil disimpan!`);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Open modal for new shift
  const handleOpenAddShift = () => {
    setEditingShiftId(null);
    setShiftForm({
      name: '',
      code: `S${shifts.length + 1}`,
      startTime: '07:00',
      endTime: '15:00',
      color: COLOR_PRESETS[shifts.length % COLOR_PRESETS.length].value,
      personnelCount: 4,
      description: `Shift operasional kebersihan untuk ${currentProject?.name || 'proyek'}`,
      plottingAllocations: [],
    });
    setIsModalOpen(true);
  };

  // Open modal for editing existing shift
  const handleOpenEditShift = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setShiftForm({
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      color: shift.color,
      personnelCount: shift.personnelCount,
      description: shift.description || '',
      plottingAllocations: shift.plottingAllocations || [],
    });
    setIsModalOpen(true);
  };

  // Handle adding a plotting allocation
  const handleAddPlotting = () => {
    if (!newPlotArea.trim()) return;
    const newAlloc: ShiftPlottingAllocation = {
      id: `alloc-${Date.now()}`,
      areaName: newPlotArea.trim(),
      taskDescription: newPlotTask.trim() || 'Pembersihan rutin area kerja',
      personnelQuota: newPlotQuota,
      priority: newPlotPriority,
    };
    setShiftForm((prev) => ({
      ...prev,
      plottingAllocations: [...prev.plottingAllocations, newAlloc],
    }));
    setNewPlotArea('');
    setNewPlotTask('');
    setNewPlotQuota(1);
    setNewPlotPriority('rutin');
  };

  // Handle removing a plotting allocation
  const handleRemovePlotting = (allocId: string) => {
    setShiftForm((prev) => ({
      ...prev,
      plottingAllocations: prev.plottingAllocations.filter((a) => a.id !== allocId),
    }));
  };

  // Handle saving shift form (add or edit)
  const handleSaveShiftModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name.trim() || !shiftForm.code.trim()) {
      showToast('Harap lengkapi nama shift dan kode shift!');
      return;
    }

    const duration = calculateShiftDuration(shiftForm.startTime, shiftForm.endTime);

    if (editingShiftId) {
      updateShift(editingShiftId, {
        name: shiftForm.name.trim(),
        code: shiftForm.code.trim().toUpperCase(),
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        color: shiftForm.color,
        personnelCount: Number(shiftForm.personnelCount) || 1,
        description: shiftForm.description.trim(),
        plottingAllocations: shiftForm.plottingAllocations,
        workHoursDuration: duration.totalHoursDecimal,
        durationText: duration.text,
      });
      showToast(`Shift "${shiftForm.name}" berhasil diperbarui!`);
    } else {
      const newShiftId = `shift-${Date.now()}`;
      addShift({
        name: shiftForm.name.trim(),
        code: shiftForm.code.trim().toUpperCase(),
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        color: shiftForm.color,
        personnelCount: Number(shiftForm.personnelCount) || 1,
        description: shiftForm.description.trim(),
        plottingAllocations: shiftForm.plottingAllocations,
        workHoursDuration: duration.totalHoursDecimal,
        durationText: duration.text,
        projectId: currentProject?.id,
      });
      // Automatically add new shift to the active project list
      setActiveShiftIds((prev) => [...prev, newShiftId]);
      showToast(`Shift baru "${shiftForm.name}" berhasil dibuat dan ditambahkan ke proyek!`);
    }

    setIsModalOpen(false);
  };

  // Calculations for active shifts in this project
  const projectActiveShifts = useMemo(() => {
    return shifts.filter((s) => activeShiftIds.includes(s.id));
  }, [shifts, activeShiftIds]);

  const totalManpowerQuota = useMemo(() => {
    return projectActiveShifts.reduce((acc, s) => acc + (s.personnelCount || 0), 0);
  }, [projectActiveShifts]);

  return (
    <div
      id="section-project-shifts"
      className="p-5 sm:p-6 rounded-2xl bg-white border border-sky-200/80 shadow-xs space-y-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 relative">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Pengaturan Shift Operasional per Proyek
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                {projectActiveShifts.length} Shift Diterapkan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
              Atur jadwal shift kerja yang aktif di setiap lokasi proyek gedung, durasi jam kerja (kontrol 24 jam), kuota petugas kebersihan, serta alokasi posisi plotingan area.
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-2 shrink-0">
          {saveSuccess && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Tersimpan!</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveProjectShifts}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Shift Proyek</span>
          </button>
        </div>
      </div>

      {/* Project Selector & Active Project Overview Card */}
      <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
            <label htmlFor="select-project-shift" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pilih Lokasi Proyek yang Diatur:
            </label>
          </div>

          {/* Project Selector Dropdown */}
          <div className="relative w-full sm:w-80">
            <select
              id="select-project-shift"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-2xs cursor-pointer"
            >
              {availableProjects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.code}) — {proj.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Project Highlight Banner */}
        {currentProject && (
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                {currentProject.code || 'PRJ'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">{currentProject.name}</h4>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Proyek Aktif
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {currentProject.address}, {currentProject.city}
                  </span>
                  <span>•</span>
                  <span>{currentProject.totalFloors || 1} Lantai Gedung</span>
                  <span>•</span>
                  <span>Pengelola: {currentProject.clientName || 'Building Management'}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats on Staffing for this Project */}
            <div className="flex items-center gap-3 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Shift Aktif</span>
                <span className="font-extrabold text-sky-700 text-sm">
                  {projectActiveShifts.length} <span className="text-xs font-normal text-slate-500">Shift</span>
                </span>
              </div>
              <div className="w-px h-7 bg-slate-200" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Kuota</span>
                <span className="font-extrabold text-indigo-700 text-sm">
                  {totalManpowerQuota} <span className="text-xs font-normal text-slate-500">Petugas</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Application Toolbar & Add Shift Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 font-semibold mr-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Pola Cepat:</span>
          </span>

          <button
            type="button"
            onClick={() => handleApplyPreset('24hours')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-colors cursor-pointer"
            title="Terapkan 3 shift untuk operasional 24 jam penuh (Pagi, Siang, Malam)"
          >
            🌙 3 Shift (24 Jam)
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('office2shifts')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
            title="Terapkan 2 shift untuk gedung perkantoran (Pagi & Middle)"
          >
            🏢 2 Shift (Office)
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('single')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Terapkan 1 shift tunggal"
          >
            ☀️ 1 Shift (Normal)
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('all')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
            title="Aktifkan seluruh master shift"
          >
            Pilih Semua ({shifts.length})
          </button>
        </div>

        {/* Add New Custom Shift Button */}
        <button
          type="button"
          onClick={handleOpenAddShift}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Shift Baru</span>
        </button>
      </div>

      {/* Visual Operational Hours Timeline Coverage Bar */}
      <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-100">Cakupan Jam Operasional di {currentProject?.name}:</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Total Kuota Terencana: <strong className="text-white">{totalManpowerQuota} Petugas</strong></span>
          </div>
        </div>

        {/* 24-Hour Timeline Bar */}
        <div className="space-y-1.5">
          <div className="h-6 w-full bg-slate-800 rounded-lg overflow-hidden flex relative p-0.5 border border-slate-700/80">
            {projectActiveShifts.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-mono">
                Belum ada shift yang diaktifkan untuk proyek ini
              </div>
            ) : (
              projectActiveShifts.map((s, idx) => (
                <div
                  key={s.id}
                  style={{
                    backgroundColor: s.color || '#0284c7',
                    flex: Math.max(1, s.workHoursDuration || 8),
                  }}
                  className="h-full rounded-md flex items-center justify-center px-1 text-[10px] font-bold text-white shadow-xs truncate transition-all opacity-90 hover:opacity-100"
                  title={`${s.name} (${s.startTime} - ${s.endTime})`}
                >
                  <span className="truncate">{s.code}: {s.startTime}-{s.endTime}</span>
                </div>
              ))
            )}
          </div>

          {/* Hour Markers */}
          <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </div>

      {/* Shifts List for Selected Project */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Daftar Shift & Konfigurasi Penerapan ({shifts.length} Master Shift)</span>
          </h4>
          <span className="text-[11px] text-slate-500">
            Centang untuk mengaktifkan atau menonaktifkan shift pada proyek ini
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {shifts.map((shift) => {
            const isActive = activeShiftIds.includes(shift.id);
            const duration = shift.durationText || `${shift.workHoursDuration || 8} Jam`;
            const plottingCount = (shift.plottingAllocations || []).length;

            return (
              <div
                key={shift.id}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-white border-sky-300 shadow-xs ring-1 ring-sky-100'
                    : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-90'
                }`}
              >
                <div>
                  {/* Top Bar: Checkbox & Shift Code */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id={`shift-toggle-${shift.id}`}
                        checked={isActive}
                        onChange={() => handleToggleShift(shift.id)}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                      />
                      <label htmlFor={`shift-toggle-${shift.id}`} className="cursor-pointer">
                        <span
                          style={{ backgroundColor: shift.color || '#0284c7' }}
                          className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-2xs"
                        >
                          {shift.code}
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditShift(shift)}
                        className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit rincian shift"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {shifts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Yakin ingin menghapus shift "${shift.name}" secara permanen?`)) {
                              deleteShift(shift.id);
                              setActiveShiftIds((prev) => prev.filter((id) => id !== shift.id));
                              showToast(`Shift "${shift.name}" telah dihapus.`);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus master shift"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Shift Name & Time */}
                  <h5 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">{shift.name}</h5>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold mt-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{shift.startTime} - {shift.endTime}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 font-normal">
                      ({duration})
                    </span>
                  </div>

                  {/* Description */}
                  {shift.description && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {shift.description}
                    </p>
                  )}

                  {/* Plotingan Details Preview */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        Target Kuota Petugas:
                      </span>
                      <strong className="text-slate-900">{shift.personnelCount} Orang</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        Posisi Plotingan Area:
                      </span>
                      <span className="font-medium text-sky-700">
                        {plottingCount > 0 ? `${plottingCount} Area Terploting` : 'Belum Diatur'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Toggle Button */}
                <div className="pt-3 mt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleToggleShift(shift.id)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-sky-600" />
                        <span>Aktif di Proyek Ini</span>
                      </>
                    ) : (
                      <span>Nonaktifkan di Proyek Ini</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Tambah / Edit Shift */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingShiftId ? 'Edit Master Shift' : 'Tambah Shift Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShiftModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Shift <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                    placeholder="Contoh: Shift 1 (Pagi), Shift Malam"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Shift <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={shiftForm.code}
                    onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                    placeholder="S1, S2, SM"
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Selesai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Duration calculation display */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-600">
                <span>Durasi Jam Kerja Terhitung:</span>
                <span className="font-bold text-sky-700">
                  {calculateShiftDuration(shiftForm.startTime, shiftForm.endTime).text}
                </span>
              </div>

              {/* Personnel Count & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Kuota Petugas (Orang)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={shiftForm.personnelCount}
                    onChange={(e) => setShiftForm({ ...shiftForm, personnelCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Warna Tema Badge
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setShiftForm({ ...shiftForm, color: c.value })}
                        style={{ backgroundColor: c.value }}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                          shiftForm.color === c.value ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian Tugas & Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={shiftForm.description}
                  onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
                  placeholder="Deskripsi tugas utama pada shift ini..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Plotingan Area Management Section */}
              <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/70">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Alokasi Plotingan Posisi ({shiftForm.plottingAllocations.length})</span>
                </div>

                {shiftForm.plottingAllocations.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {shiftForm.plottingAllocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-800 truncate">{alloc.areaName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{alloc.taskDescription}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {alloc.personnelQuota || 1} Org
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePlotting(alloc.id)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Plotingan row */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newPlotArea}
                    onChange={(e) => setNewPlotArea(e.target.value)}
                    placeholder="Nama area / posisi (e.g. Toilet Lt. 1)"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    value={newPlotTask}
                    onChange={(e) => setNewPlotTask(e.target.value)}
                    placeholder="Uraian tugas"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPlotting}
                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                  >
                    + Posisi
                  </button>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {editingShiftId ? 'Simpan Perubahan Shift' : 'Tambahkan Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
