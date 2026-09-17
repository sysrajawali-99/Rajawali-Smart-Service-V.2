import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Calendar,
  X,
  ListChecks,
  Search,
  Layers,
  CheckSquare,
  Square,
  Check,
  UserCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CleaningSchedule, Cleaner } from '../../types';

export const JadwalCleaningView: React.FC = () => {
  const { schedules, areas, cleaners, shifts, updateCleaner, deleteSchedule } = useCleaning();

  // Navigation tab: 'schedules' | 'roster'
  const [activeMainTab, setActiveMainTab] = useState<'schedules' | 'roster'>('schedules');

  // Frequency Filter for Schedules
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'harian' | 'mingguan' | 'bulanan'>('all');
  const [scheduleList, setScheduleList] = useState<CleaningSchedule[]>(schedules);

  useEffect(() => {
    setScheduleList(schedules);
  }, [schedules]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Schedule State
  const [newTitle, setNewTitle] = useState('');
  const [newAreaId, setNewAreaId] = useState(areas[0]?.id || '');
  const [newCleanerId, setNewCleanerId] = useState(cleaners[0]?.id || '');
  const [newFrequency, setNewFrequency] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [newTimeSlot, setNewTimeSlot] = useState('08:00 - 09:00 WIB');
  const [newChecklistText, setNewChecklistText] = useState('Sapu dan pel bersih\nDisinfeksi gagang pintu\nKosongkan tempat sampah');

  // Roster Search & Filter
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterShiftFilter, setRosterShiftFilter] = useState<string>('all');

  // Plotingan Modal State
  const [plottingCleaner, setPlottingCleaner] = useState<Cleaner | null>(null);
  const [plottingSelectedShiftId, setPlottingSelectedShiftId] = useState<string>('');
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<string[]>([]);
  const [manualPlottingText, setManualPlottingText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredSchedules = scheduleList.filter(
    (s) => frequencyFilter === 'all' || s.frequency === frequencyFilter
  );

  const filteredCleaners = cleaners.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(rosterSearchQuery.toLowerCase()) ||
      (c.workPlotting && c.workPlotting.toLowerCase().includes(rosterSearchQuery.toLowerCase()));
    const matchShift = rosterShiftFilter === 'all' || c.shiftId === rosterShiftFilter;
    return matchSearch && matchShift;
  });

  const toggleSchedule = (id: string) => {
    setScheduleList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const area = areas.find((a) => a.id === newAreaId);
    const cleaner = cleaners.find((c) => c.id === newCleanerId);

    const newSched: CleaningSchedule = {
      id: `sch-${Date.now()}`,
      title: newTitle,
      areaId: newAreaId,
      areaName: area?.name || 'Area Gedung',
      cleanerId: newCleanerId,
      cleanerName: cleaner?.name || 'Asep Supriyadi',
      frequency: newFrequency,
      timeSlot: newTimeSlot,
      shiftId: cleaner?.shiftId || 'shift-1',
      checklistTemplates: newChecklistText.split('\n').filter((t) => t.trim()),
      isActive: true,
    };

    setScheduleList([newSched, ...scheduleList]);
    setNewTitle('');
    setShowAddModal(false);
    showToast(`Jadwal rutinitas "${newTitle}" berhasil ditambahkan.`);
  };

  // Plotingan Handlers (Terhubung ke Uraian Tugas & Deskripsi Shift)
  const handleOpenPlottingModal = (cleaner: Cleaner) => {
    setPlottingCleaner(cleaner);
    setManualPlottingText(cleaner.workPlotting || '');
    const currentShiftId = cleaner.shiftId || shifts[0]?.id || '';
    setPlottingSelectedShiftId(currentShiftId);

    const targetShift = shifts.find((s) => s.id === currentShiftId) || shifts[0];
    const initialSelectedIds: string[] = [];
    if (targetShift?.plottingAllocations && cleaner.workPlotting) {
      targetShift.plottingAllocations.forEach((alloc) => {
        if (cleaner.workPlotting?.toLowerCase().includes(alloc.areaName.toLowerCase())) {
          initialSelectedIds.push(alloc.id);
        }
      });
    }
    setSelectedAllocationIds(initialSelectedIds);
  };

  const handleTogglePlottingAllocation = (allocId: string) => {
    let nextIds: string[];
    if (selectedAllocationIds.includes(allocId)) {
      nextIds = selectedAllocationIds.filter((id) => id !== allocId);
    } else {
      nextIds = [...selectedAllocationIds, allocId];
    }
    setSelectedAllocationIds(nextIds);

    const targetShift = shifts.find((s) => s.id === plottingSelectedShiftId) || shifts[0];
    const chosenAllocs = (targetShift?.plottingAllocations || []).filter((a) => nextIds.includes(a.id));

    if (chosenAllocs.length === 0) {
      setManualPlottingText('');
      return;
    }

    const compiled = chosenAllocs
      .map((a) => `${a.areaName}${a.taskDescription ? ` (${a.taskDescription})` : ''}`)
      .join(' • ');
    setManualPlottingText(compiled);
  };

  const handleSelectAllPlottingAllocations = () => {
    const targetShift = shifts.find((s) => s.id === plottingSelectedShiftId) || shifts[0];
    const allIds = (targetShift?.plottingAllocations || []).map((a) => a.id);
    setSelectedAllocationIds(allIds);

    const compiled = (targetShift?.plottingAllocations || [])
      .map((a) => `${a.areaName}${a.taskDescription ? ` (${a.taskDescription})` : ''}`)
      .join(' • ');
    setManualPlottingText(compiled);
  };

  const handleClearPlottingAllocations = () => {
    setSelectedAllocationIds([]);
    setManualPlottingText('');
  };

  const handleSaveWorkPlotting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plottingCleaner) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const finalLocation = manualPlottingText.trim() || 'Lobby & Koridor Utama';

    updateCleaner(plottingCleaner.id, {
      workPlotting: finalLocation,
      workPlottingUpdatedAt: nowTime,
    });

    showToast(`Plotingan lokasi ${plottingCleaner.name} berhasil diubah ke "${finalLocation}".`);
    setPlottingCleaner(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-sky-600" />
            Roster Petugas & Penjadwalan Kerja
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen alokasi plotting petugas per shift serta rutinitas harian, mingguan, dan bulanan
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMainTab === 'schedules' ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Rutin</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl font-medium">
              Terhubung langsung dengan <span className="font-bold text-sky-900">Uraian Tugas Shift</span> & <span className="font-bold text-sky-900">Presensi</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setActiveMainTab('schedules')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'schedules'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>Jadwal Rutinitas SOP ({scheduleList.length})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('roster')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'roster'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Roster Petugas & Plotingan Kerja ({cleaners.length})</span>
        </button>
      </div>

      {/* TAB 1: JADWAL RUTINITAS SOP */}
      {activeMainTab === 'schedules' && (
        <div className="space-y-4">
          {/* Frequency Filter Tabs */}
          <div className="flex items-center gap-2 text-xs">
            {[
              { id: 'all', label: 'Semua Jadwal' },
              { id: 'harian', label: 'Harian (Daily Routine)' },
              { id: 'mingguan', label: 'Mingguan (Weekly Routine)' },
              { id: 'bulanan', label: 'Bulanan (Monthly Deep Clean)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFrequencyFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  frequencyFilter === tab.id
                    ? 'bg-sky-50 text-sky-700 font-bold shadow-xs border border-sky-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Schedules List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.map((item) => {
              const freqBadge = {
                harian: { label: 'Harian', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                mingguan: { label: 'Mingguan', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
                bulanan: { label: 'Bulanan', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              }[item.frequency];

              const assignedCleaner = cleaners.find((c) => c.id === item.cleanerId || c.name === item.cleanerName);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
                    item.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${freqBadge.bg}`}
                      >
                        {freqBadge.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer" title="Aktif / Nonaktif">
                          <input
                            type="checkbox"
                            checked={item.isActive}
                            onChange={() => toggleSchedule(item.id)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-600"></div>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            deleteSchedule(item.id);
                            setScheduleList((prev) => prev.filter((s) => s.id !== item.id));
                            showToast(`Jadwal "${item.title}" berhasil dihapus.`);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 mt-2">{item.title}</h3>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{item.areaName}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="text-slate-700">{item.timeSlot}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-700 font-semibold">{item.cleanerName}</span>
                        </div>
                        {assignedCleaner?.workPlotting && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold border border-sky-200 flex items-center gap-1 truncate max-w-[150px]">
                            <span>📍</span>
                            <span className="truncate">{assignedCleaner.workPlotting}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SOP Checklist Templates preview */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Standard Checklist SOP ({item.checklistTemplates.length}):
                      </span>
                      <ul className="space-y-1">
                        {item.checklistTemplates.slice(0, 3).map((tpl, i) => (
                          <li key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="truncate">{tpl}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Status: {item.isActive ? 'Aktif Terjadwal' : 'Dinonaktifkan'}</span>
                    <span className="font-semibold text-sky-600 cursor-pointer hover:underline">
                      Edit Checklist &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ROSTER PETUGAS & PLOTINGAN KERJA PER SHIFT */}
      {activeMainTab === 'roster' && (
        <div className="space-y-4">
          {/* Search & Shift Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={rosterSearchQuery}
                onChange={(e) => setRosterSearchQuery(e.target.value)}
                placeholder="Cari nama petugas atau lokasi plotingan..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Filter Shift:</span>
              <select
                value={rosterShiftFilter}
                onChange={(e) => setRosterShiftFilter(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Shift</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime} WIB)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Roster Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCleaners.map((cleaner) => {
              const shiftObj = shifts.find((s) => s.id === cleaner.shiftId);
              const shiftAllocations = shiftObj?.plottingAllocations || [];

              return (
                <div
                  key={cleaner.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    {/* Header: Cleaner info & Shift */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={cleaner.photoUrl}
                          alt={cleaner.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{cleaner.name}</h4>
                          <span className="text-[11px] text-slate-500 block">
                            {cleaner.phone || 'ID: ' + cleaner.id}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: `${shiftObj?.color || '#0284c7'}15`,
                            color: shiftObj?.color || '#0284c7',
                            borderColor: `${shiftObj?.color || '#0284c7'}40`,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: shiftObj?.color || '#0284c7' }}
                          />
                          {cleaner.shiftName}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {shiftObj?.startTime} - {shiftObj?.endTime} WIB
                        </span>
                      </div>
                    </div>

                    {/* Plotingan Kerja Section */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-150 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-sky-600" />
                          Alokasi Plotingan Tugas:
                        </span>
                        {cleaner.workPlottingUpdatedAt && (
                          <span className="text-[9px] text-slate-400">
                            Update: {cleaner.workPlottingUpdatedAt}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800 leading-relaxed">
                        {cleaner.workPlotting || 'Belum ada alokasi tugas spesifik'}
                      </p>

                      <p className="text-[10px] text-slate-400">
                        Shift ini memiliki {shiftAllocations.length} alokasi tugas standar pada master shift.
                      </p>
                    </div>
                  </div>

                  {/* Footer Action: Ganti Plotingan Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Status: <span className="font-semibold text-emerald-600">Aktif Bekerja</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenPlottingModal(cleaner)}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs border border-sky-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Ganti Plotingan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: TAMBAH JADWAL RUTIN                                 */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Jadwal Rutinitas Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Rutinitas</label>
                <input
                  type="text"
                  placeholder="Misal: Sanitasi Kloset & Refill Sabun Lt. 2"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area Lokasi</label>
                  <select
                    value={newAreaId}
                    onChange={(e) => setNewAreaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.floor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frekuensi</label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer"
                  >
                    <option value="harian">Harian (Daily)</option>
                    <option value="mingguan">Mingguan (Weekly)</option>
                    <option value="bulanan">Bulanan (Monthly)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Petugas Pelaksana</label>
                  <select
                    value={newCleanerId}
                    onChange={(e) => setNewCleanerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer"
                  >
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Pelaksanaan</label>
                  <input
                    type="text"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Checklist SOP (Pisahkan dengan baris baru)
                </label>
                <textarea
                  rows={3}
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: GANTI PLOTINGAN PETUGAS PADA ROSTER                 */}
      {/* ============================================================ */}
      {plottingCleaner && (() => {
        const activeShift = shifts.find((s) => s.id === plottingSelectedShiftId) || shifts[0];
        const shiftAllocations = activeShift?.plottingAllocations || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Ganti Alokasi Plotingan Tugas
                    </h3>
                    <p className="text-xs text-slate-500">
                      Petugas: <span className="font-bold text-slate-800">{plottingCleaner.name}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPlottingCleaner(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveWorkPlotting} className="space-y-4 pt-4 text-xs">
                {/* Shift Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    Shift Operasional Petugas:
                  </label>
                  <select
                    value={plottingSelectedShiftId}
                    onChange={(e) => {
                      const newShiftId = e.target.value;
                      setPlottingSelectedShiftId(newShiftId);
                      setSelectedAllocationIds([]);
                      setManualPlottingText('');
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50/50 cursor-pointer"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime} WIB)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plotting Allocations from Uraian Tugas & Deskripsi Shift */}
                <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-600" />
                      <h4 className="text-xs font-bold text-slate-900">
                        Lokasi & Tugas pada {activeShift?.name}:
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-extrabold">
                        {selectedAllocationIds.length} Dipilih
                      </span>
                    </div>

                    {shiftAllocations.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={handleSelectAllPlottingAllocations}
                          className="px-2 py-0.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold transition-colors cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <button
                          type="button"
                          onClick={handleClearPlottingAllocations}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>

                  {shiftAllocations.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white border border-dashed border-sky-200 text-center space-y-1">
                      <p className="text-xs text-slate-600 font-semibold">
                        Shift ini belum memiliki alokasi plotting pada pengaturan shift.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Anda dapat menambahkannya di menu "Shift" &gt; "Edit Pengaturan Shift", atau ketik manual di bawah.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
                      {shiftAllocations.map((alloc) => {
                        const isSelected = selectedAllocationIds.includes(alloc.id);

                        return (
                          <div
                            key={alloc.id}
                            onClick={() => handleTogglePlottingAllocation(alloc.id)}
                            className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                              isSelected
                                ? 'bg-white border-sky-500 shadow-xs ring-1 ring-sky-400/40'
                                : 'bg-white/80 border-slate-200 hover:border-sky-300 hover:bg-white'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-sky-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-sky-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`font-bold ${isSelected ? 'text-sky-950 font-extrabold' : 'text-slate-800'}`}>
                                  {alloc.areaName}
                                </span>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {alloc.personnelQuota && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                      Target: {alloc.personnelQuota} Staf
                                    </span>
                                  )}
                                  {alloc.priority && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                        alloc.priority === 'intensif'
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                          : alloc.priority === 'periodic'
                                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}
                                    >
                                      {alloc.priority}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                {alloc.taskDescription || 'Pembersihan rutin sesuai SOP kebersihan.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Final Plotingan Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Rincian Plotingan Akhir yang Disimpan: <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Dapat diedit atau memilih lebih dari satu tugas
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={manualPlottingText}
                    onChange={(e) => setManualPlottingText(e.target.value)}
                    placeholder="Pilih lokasi di atas atau ketik manual..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium leading-relaxed"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Data ini langsung disinkronkan ke Presensi Interaktif, Roster Petugas & Shift.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPlottingCleaner(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Simpan Plotingan
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
