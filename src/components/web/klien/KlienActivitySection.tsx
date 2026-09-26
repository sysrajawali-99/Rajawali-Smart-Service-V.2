import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Camera,
  Layers,
  Search,
  Filter,
  Eye,
  Check,
  Building2,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import { CleaningTask, MasterCleaningProgramItem } from '../../../types';
import { SpecialJobView } from '../SpecialJobView';

export const KlienActivitySection: React.FC = () => {
  const {
    tasks,
    masterPrograms,
    specialJobs,
    activeProject,
    userRole,
  } = useCleaning();

  // Active Sub-Tab: 'harian' | 'mingguan' | 'bulanan' | 'special_job'
  const [activityTab, setActivityTab] = useState<'harian' | 'mingguan' | 'bulanan' | 'special_job'>('harian');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'pending'>('all');
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);

  // Statistics
  const dailyTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Show all tasks or tasks from daily schedule
      return true;
    });
  }, [tasks]);

  const weeklyPrograms = useMemo(() => {
    return masterPrograms.filter((m) => {
      const f = (m.frequency || '').toLowerCase();
      return f === 'w' || f.includes('minggu');
    });
  }, [masterPrograms]);

  const monthlyPrograms = useMemo(() => {
    return masterPrograms.filter((m) => {
      const f = (m.frequency || '').toLowerCase();
      return f === 'm' || f.includes('bulan') || f.includes('deep') || f.includes('periodic');
    });
  }, [masterPrograms]);

  const completedDailyCount = dailyTasks.filter((t) => t.status === 'completed').length;
  const inProgressDailyCount = dailyTasks.filter((t) => t.status === 'in_progress').length;
  const totalDailyCount = dailyTasks.length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-indigo-600" />
            <span>Activity Report Operasional Kebersihan</span>
          </h3>
          <p className="text-xs text-slate-500">
            Laporan pelaksanaan program kerja harian, mingguan, dan bulanan di {activeProject.name}.
          </p>
        </div>

        {/* 4 SUB TABS */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActivityTab('harian')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activityTab === 'harian'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kerja Harian ({totalDailyCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActivityTab('mingguan')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activityTab === 'mingguan'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Kerja Mingguan ({weeklyPrograms.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActivityTab('bulanan')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activityTab === 'bulanan'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Kerja Bulanan ({monthlyPrograms.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActivityTab('special_job')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activityTab === 'special_job'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Special Job ({specialJobs.length})</span>
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: KERJA HARIAN ==================== */}
      {activityTab === 'harian' && (
        <div className="space-y-4">
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Total Agenda Harian
              </span>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{totalDailyCount}</div>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Plot area kerja</p>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                Selesai (Completed)
              </span>
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{completedDailyCount}</div>
              <p className="text-[10.5px] text-emerald-600 mt-0.5 font-medium">
                {totalDailyCount > 0 ? Math.round((completedDailyCount / totalDailyCount) * 100) : 0}% Realisasi
              </p>
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-xs">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                Sedang Dikerjakan
              </span>
              <div className="text-2xl font-extrabold text-amber-700 tabular-nums">{inProgressDailyCount}</div>
              <p className="text-[10.5px] text-amber-600 mt-0.5 font-medium">Progres di lapangan</p>
            </div>

            <div className="bg-sky-50/70 p-3.5 rounded-2xl border border-sky-200 shadow-xs">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                Terverifikasi QC
              </span>
              <div className="text-2xl font-extrabold text-sky-700 tabular-nums">
                {dailyTasks.filter((t) => t.qcStatus === 'approved' || (t.qcScore || 0) >= 80).length}
              </div>
              <p className="text-[10.5px] text-sky-600 mt-0.5 font-medium">Audit standar mutu</p>
            </div>
          </div>

          {/* SEARCH & FILTER */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari tugas, area, petugas..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Selesai
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === 'in_progress' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Progres
              </button>
            </div>
          </div>

          {/* TASK LIST CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {dailyTasks
              .filter((task) => {
                const matchStatus = statusFilter === 'all' || task.status === statusFilter;
                const q = searchQuery.toLowerCase().trim();
                const matchQ =
                  !q ||
                  task.areaName.toLowerCase().includes(q) ||
                  task.cleanerName.toLowerCase().includes(q) ||
                  (task.workDescription || '').toLowerCase().includes(q);
                return matchStatus && matchQ;
              })
              .map((task) => {
                const isCompleted = task.status === 'completed';
                const hasPhotos = task.photoBefore || task.photoAfter;

                return (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {task.shift}
                        </span>
                        {isCompleted ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Selesai
                          </span>
                        ) : task.status === 'in_progress' ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Diproses
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Menunggu
                          </span>
                        )}
                      </div>

                      {/* Area & Floor */}
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{task.areaName}</h4>
                      <p className="text-xs text-slate-500 mb-2.5">{task.buildingFloor}</p>

                      {/* Cleaner & Time */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 mb-3">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-400">Petugas:</span>
                          <span className="font-semibold">{task.cleanerName}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="text-slate-400">Jadwal:</span>
                          <span className="font-mono text-[11px]">{task.scheduledTime} - {task.deadlineTime}</span>
                        </div>
                        {task.qcScore && (
                          <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                            <span className="text-slate-400">Skor Mutu QC:</span>
                            <span className="font-bold text-sky-700">{task.qcScore}/100</span>
                          </div>
                        )}
                      </div>

                      {/* Photo Thumbnail Preview */}
                      {hasPhotos && (
                        <div className="flex items-center gap-2 mb-3">
                          {task.photoBefore && (
                            <div className="relative w-16 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                              <img src={task.photoBefore} alt="Before" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center font-bold">
                                Before
                              </span>
                            </div>
                          )}
                          {task.photoAfter && (
                            <div className="relative w-16 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                              <img src={task.photoAfter} alt="After" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-emerald-700/80 text-[8px] text-white text-center font-bold">
                                After
                              </span>
                            </div>
                          )}
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 ml-auto">
                            <Camera className="w-3.5 h-3.5 text-slate-400" />
                            Dokumentasi Foto
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-indigo-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Detail & Foto</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: KERJA MINGGUAN ==================== */}
      {activityTab === 'mingguan' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-indigo-900">Program Kerja Berkala Mingguan (Weekly Routine)</h4>
              <p className="text-xs text-indigo-700">
                Pembersihan mendalam area sirkulasi tinggi, dusting partisi kaca, scrubbing lantai, dan sanitasi berkala.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-200/80 text-indigo-900">
              {weeklyPrograms.length} Program Aktif
            </span>
          </div>

          <div className="space-y-3">
            {weeklyPrograms.map((prog) => {
              const activeDays = Object.entries(prog.days || {}).filter(([_, s]) => s === 'done').length;
              const plannedDays = Object.entries(prog.days || {}).filter(([_, s]) => s === 'planned').length;

              return (
                <div
                  key={prog.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                        Mingguan (Weekly)
                      </span>
                      <span className="text-xs font-semibold text-slate-500">PIC: {prog.picName}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{prog.workDescription}</h4>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lokasi: {prog.location}</span>
                    </p>
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-700">Metode:</span> {prog.workMethod}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Status Pelaksanaan</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {activeDays} Selesai / {plannedDays + activeDays} Target
                      </span>
                      <span className="text-[10px] text-slate-400 block">Durasi: {prog.targetDurationMinutes || 120} Menit</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: KERJA BULANAN ==================== */}
      {activityTab === 'bulanan' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-amber-900">Program Deep Cleaning Bulanan & Perawatan Khusus</h4>
              <p className="text-xs text-amber-700">
                Pekerjaan kristalisasi marmer, stripping & waxing vinyl, deep washing karpet, serta poles dinding kaca fasad luar.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-200/80 text-amber-900">
              {monthlyPrograms.length} Program Bulanan
            </span>
          </div>

          <div className="space-y-3">
            {monthlyPrograms.map((prog) => {
              const isSpecial = prog.category === 'special_treatment';

              return (
                <div
                  key={prog.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        isSpecial ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isSpecial ? 'Special Treatment' : 'Deep Cleaning Bulanan'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">PIC Penanggung Jawab: {prog.picName}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{prog.workDescription}</h4>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{prog.location}</span>
                    </p>
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                      <span className="font-semibold text-slate-700">SOP & Chemical:</span> {prog.workMethod}
                    </p>
                    {prog.notes && (
                      <p className="text-[11px] text-amber-800 bg-amber-50/50 p-2 rounded-lg">
                        ⚠️ <span className="font-semibold">Catatan K3:</span> {prog.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Estimasi Durasi</span>
                      <span className="text-sm font-bold text-slate-800">{prog.targetDurationMinutes || 180} Menit</span>
                      <span className="text-[10px] text-emerald-600 block font-semibold mt-1">✓ Siap Ekspor Laporan</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: SPECIAL JOB ==================== */}
      {activityTab === 'special_job' && <SpecialJobView />}

      {/* DETAIL MODAL FOR DAILY TASK */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 mb-1 inline-block">
                  {selectedTask.shift} · {selectedTask.buildingFloor}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedTask.areaName}</h3>
                <p className="text-xs text-slate-500">
                  Petugas Pelaksana: <span className="font-semibold text-slate-700">{selectedTask.cleanerName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photos Before / Progress / After */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Dokumentasi Kerja (Before - Progress - After)</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <div className="h-28 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                    <img
                      src={
                        selectedTask.photoBefore ||
                        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80'
                      }
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-center block text-slate-600">Foto Before</span>
                </div>

                <div className="space-y-1">
                  <div className="h-28 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                    <img
                      src={
                        selectedTask.photoProgress ||
                        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80'
                      }
                      alt="Progress"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-center block text-slate-600">Foto Progress</span>
                </div>

                <div className="space-y-1">
                  <div className="h-28 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                    <img
                      src={
                        selectedTask.photoAfter ||
                        'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&auto=format&fit=crop&q=80'
                      }
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-center block text-emerald-700">Foto After Selesai</span>
                </div>
              </div>
            </div>

            {/* Checklist Items */}
            {selectedTask.checklistArea && selectedTask.checklistArea.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">Checklist Pengerjaan Fisik</span>
                <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  {selectedTask.checklistArea.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${item.checked ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span className={item.checked ? 'font-medium' : 'text-slate-400'}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remarks */}
            {selectedTask.remarks && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Catatan Petugas:</span>
                <p className="text-slate-600">{selectedTask.remarks}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
