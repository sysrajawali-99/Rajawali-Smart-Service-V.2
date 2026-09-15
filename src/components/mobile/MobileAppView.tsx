import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  Upload,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  Calendar,
  Send,
  UserCheck,
  Package,
  FileText,
  Check,
  Bell,
  X,
  Layers,
  ShieldCheck,
  ClipboardList,
  Building2,
  FileDown,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CleaningTask, ChecklistItem } from '../../types';
import { PhotoWatermarkUploader } from '../common/PhotoWatermarkUploader';
import { exportChecklistToPDF, DEFAULT_HOSPITAL_KOP, toBKRCode } from '../../utils/pdfExport';

export const MobileAppView: React.FC = () => {
  const {
    tasks,
    cleaners,
    activeCleanerId,
    setActiveCleanerId,
    toggleClockInOut,
    submitTaskCompletion,
    notifications,
    activeProject,
    checklistLocations,
    dailyChecklists,
    getOrCreateDailyChecklist,
    ensureDailyChecklist,
    toggleHourlySlotCell,
    updateHourlySlotItem,
    batchUpdateHourStatus,
    currentUser,
    isOnline,
    setIsOnline,
    offlineQueue,
    syncOfflineData,
    isSyncing,
    lastSyncedAt,
  } = useCleaning();

  const currentCleaner =
    cleaners.find((c) => c.id === activeCleanerId) || cleaners[0];

  // Cleaner's tasks
  const cleanerTasks = tasks.filter(
    (t) => t.cleanerId === currentCleaner?.id || t.cleanerName.includes(currentCleaner?.name.split(' ')[0])
  );

  // Active sub tab on mobile: 'tasks' vs 'checklist24'
  const [mobileTab, setMobileTab] = useState<'tasks' | 'checklist24'>('tasks');

  // Selected checklist location on mobile
  const [selectedChecklistLocId, setSelectedChecklistLocId] = useState<string>(
    checklistLocations[0]?.id || 'cloc-1'
  );
  const activeChecklistLocation =
    checklistLocations.find((l) => l.id === selectedChecklistLocId) || checklistLocations[0];

  const todayDate = '2026-09-13';

  useEffect(() => {
    if (activeChecklistLocation?.id && activeProject?.id) {
      ensureDailyChecklist(activeProject.id, activeChecklistLocation.id, todayDate);
    }
  }, [activeProject?.id, activeChecklistLocation?.id, todayDate, ensureDailyChecklist]);

  const mobileDailyChecklist = activeChecklistLocation
    ? getOrCreateDailyChecklist(activeProject.id, activeChecklistLocation.id, todayDate)
    : null;

  const [mobileExpandedHour, setMobileExpandedHour] = useState<number | null>(new Date().getHours());

  // Active task currently being executed by the cleaner
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);

  // Task execution form state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [remarks, setRemarks] = useState('');
  const [photoBefore, setPhotoBefore] = useState<string>('');
  const [photoProgress, setPhotoProgress] = useState<string>('');
  const [photoAfter, setPhotoAfter] = useState<string>('');
  const [suppliesCount, setSuppliesCount] = useState({
    sabun: 1,
    tisu: 2,
    trashBag: 2,
  });
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Sample photo choices to simulate real camera captures
  const sampleBeforePhotos = [
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80',
  ];

  const sampleAfterPhotos = [
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80',
  ];

  const sampleProgressPhotos = [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=500&auto=format&fit=crop&q=80',
  ];

  const handleOpenTask = (task: CleaningTask) => {
    setSelectedTask(task);
    setChecklist(task.checklistArea);
    setRemarks(task.remarks || '');
    setPhotoBefore(task.photoBefore || sampleBeforePhotos[0]);
    setPhotoProgress(task.photoProgress || sampleProgressPhotos[0]);
    setPhotoAfter(task.photoAfter || sampleAfterPhotos[0]);
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    submitTaskCompletion({
      taskId: selectedTask.id,
      checklistArea: checklist,
      remarks: remarks || 'Semua area telah disanitasi sesuai standar SOP operasional.',
      photoBefore: photoBefore || sampleBeforePhotos[0],
      photoProgress: photoProgress || sampleProgressPhotos[0],
      photoAfter: photoAfter || sampleAfterPhotos[0],
      suppliesUsed: [
        { supplyName: 'Sabun Cuci Tangan Foaming', amountUsed: suppliesCount.sabun, unit: 'Pouch' },
        { supplyName: 'Jumbo Roll Tissue Toilet', amountUsed: suppliesCount.tisu, unit: 'Roll' },
        { supplyName: 'Trash Bag Hitam Tebal', amountUsed: suppliesCount.trashBag, unit: 'Pcs' },
      ],
    });

    setShowSuccessNotification(true);
    setTimeout(() => {
      setShowSuccessNotification(false);
      setSelectedTask(null);
    }, 1500);
  };

  return (
    <div className="py-6 px-3 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-slate-100">
      {/* Helper Bar to switch simulated cleaner & simulate network */}
      <div className="w-full max-w-sm mb-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-600" />
            <span className="font-semibold text-slate-800">Petugas:</span>
          </div>
          <select
            value={activeCleanerId}
            onChange={(e) => {
              setActiveCleanerId(e.target.value);
              setSelectedTask(null);
            }}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
          >
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.shiftName.split(' ')[0]})
              </option>
            ))}
          </select>
        </div>

        {/* Network status test switcher */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <WifiOff className="w-3 h-3 text-rose-600" />
                Offline
              </span>
            )}
            {offlineQueue.length > 0 && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">
                {offlineQueue.length} tertunda
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                isOnline
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="Klik untuk mensimulasikan jaringan putus atau tersambung"
            >
              {isOnline ? 'Simulasi Hilang Sinyal' : 'Simulasi Ada Sinyal'}
            </button>
            {offlineQueue.length > 0 && isOnline && (
              <button
                onClick={() => syncOfflineData()}
                disabled={isSyncing}
                className="p-1 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
                title="Sinkronkan data tersimpan sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Phone Mockup Frame */}
      <div className="w-full max-w-[380px] bg-slate-900 rounded-[44px] p-3 shadow-2xl ring-1 ring-slate-800 relative">
        {/* Screen Bezel / Container */}
        <div className="w-full h-[760px] bg-slate-50 rounded-[36px] overflow-hidden flex flex-col relative border border-slate-700/50">
          {/* Top Notch & Status Bar */}
          <div className="bg-slate-900 text-white px-5 pt-3 pb-2 flex items-center justify-between text-[11px] font-medium shrink-0">
            <span>09:41</span>
            <div className="w-20 h-4 bg-black rounded-full mx-auto"></div>
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3 h-3" />
                  <span className="text-[10px] font-bold">4G</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-400">
                  <WifiOff className="w-3 h-3" />
                  <span className="text-[10px] font-bold">Offline</span>
                </div>
              )}
              <div className="w-4 h-2 border border-white rounded-xs p-0.5 flex items-center">
                <div className="w-full h-full bg-white"></div>
              </div>
            </div>
          </div>

          {/* Network Banner: Offline / Syncing / Reconnected */}
          {!isOnline && (
            <div className="bg-amber-500 text-white px-3 py-1.5 flex items-center justify-between text-[10px] font-medium shadow-xs shrink-0 animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>Mode Offline</strong> • Ceklis disimpan di HP ({offlineQueue.length} antrean)
                </span>
              </div>
              <span className="bg-amber-700/70 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                LOKAL
              </span>
            </div>
          )}

          {isOnline && isSyncing && (
            <div className="bg-sky-600 text-white px-3 py-1.5 flex items-center gap-2 text-[10px] font-medium shadow-xs shrink-0 animate-in fade-in">
              <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
              <span>Menyinkronkan otomatis {offlineQueue.length} data ke server...</span>
            </div>
          )}

          {isOnline && !isSyncing && offlineQueue.length > 0 && (
            <div className="bg-emerald-600 text-white px-3 py-1.5 flex items-center justify-between text-[10px] font-medium shrink-0 animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span>Sinyal kembali! {offlineQueue.length} data tersimpan siap kirim</span>
              </div>
              <button
                onClick={() => syncOfflineData()}
                className="px-2 py-0.5 rounded bg-white text-emerald-800 font-bold text-[9px] hover:bg-emerald-50 transition-colors shadow-2xs"
              >
                Kirim Sekarang
              </button>
            </div>
          )}

          {/* Success Toast */}
          {showSuccessNotification && (
            <div className="absolute top-16 left-4 right-4 z-50 p-3 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
              <Check className="w-4 h-4" />
              <span>Laporan Berhasil Disimpan!</span>
            </div>
          )}

          {/* Mobile Screen Content */}
          <div className="flex-1 overflow-y-auto flex flex-col justify-between">
            {/* SCREEN 1: Task Execution Detail Form */}
            {selectedTask ? (
              <div className="flex flex-col h-full bg-white">
                {/* Task Header */}
                <div className="p-4 bg-sky-600 text-white flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="p-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-wider text-sky-200 font-bold block">
                      Formulir Laporan Kebersihan
                    </span>
                    <h3 className="font-bold text-sm truncate">{selectedTask.areaName}</h3>
                  </div>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmitTask} className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
                  {/* Task Meta */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Lokasi: {selectedTask.buildingFloor}</span>
                      <span className="font-bold text-sky-700">Target: {selectedTask.deadlineTime}</span>
                    </div>
                    <p className="font-semibold text-slate-800">
                      Standard Operating Procedure (SOP) Kebersihan
                    </p>
                  </div>

                  {/* 1. Checklist Kondisi Area */}
                  <div className="space-y-2">
                    <label className="font-bold text-slate-900 block flex items-center justify-between">
                      <span>1. Checklist Kondisi Area (SOP)</span>
                      <span className="text-[11px] text-emerald-600 font-semibold">
                        {checklist.filter((c) => c.checked).length}/{checklist.length} Selesai
                      </span>
                    </label>

                    <div className="space-y-1.5">
                      {checklist.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => handleToggleChecklist(item.id)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                            item.checked
                              ? 'bg-emerald-50 border-emerald-300 text-slate-900 font-medium'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="text-xs">{item.label}</span>
                          <span
                            className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                              item.checked
                                ? 'bg-emerald-600 text-white'
                                : 'border border-slate-300 bg-white'
                            }`}
                          >
                            {item.checked && '✓'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Photo Upload with Auto-Watermark Validation (Before, Progress, After) */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-900 block">
                        2. Foto Bukti (Wajib Watermark Tanggal)
                      </label>
                      <span className="text-[10px] text-sky-600 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Auto Validasi
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200 text-[11px] text-sky-800 leading-relaxed">
                      Sesuai SOP, foto akan dianalisa secara otomatis. Jika tidak memiliki watermark tanggal/bulan/tahun maka foto akan ditolak sistem.
                    </div>

                    <div className="space-y-2">
                      <PhotoWatermarkUploader
                        label="Foto Sebelum (Before)"
                        stage="before"
                        currentPhoto={photoBefore}
                        onPhotoAccepted={(url) => setPhotoBefore(url)}
                        areaName={selectedTask.areaName}
                        cleanerName={currentCleaner.name}
                      />

                      <PhotoWatermarkUploader
                        label="Foto Sedang Dikerjakan (Progress)"
                        stage="progress"
                        currentPhoto={photoProgress}
                        onPhotoAccepted={(url) => setPhotoProgress(url)}
                        areaName={selectedTask.areaName}
                        cleanerName={currentCleaner.name}
                      />

                      <PhotoWatermarkUploader
                        label="Foto Sesudah Selesai (After)"
                        stage="after"
                        currentPhoto={photoAfter}
                        onPhotoAccepted={(url) => setPhotoAfter(url)}
                        areaName={selectedTask.areaName}
                        cleanerName={currentCleaner.name}
                      />
                    </div>
                  </div>

                  {/* 3. Catatan Tambahan */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="font-bold text-slate-900 block">
                      3. Catatan & Keterangan Petugas
                    </label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                      placeholder="Tuliskan catatan kondisi khusus jika ada..."
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Kirim Laporan ke Supervisor</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* SCREEN 2: Cleaner Home Dashboard & Task Roster / Checklist 24 Jam */
              <div className="flex-1 flex flex-col">
                {/* Cleaner Identity Card */}
                <div className="p-4 bg-sky-600 text-white shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={currentCleaner.photoUrl}
                        alt={currentCleaner.name}
                        className="w-11 h-11 rounded-xl object-cover border-2 border-white/40 shadow-xs"
                      />
                      <div>
                        <h3 className="font-bold text-sm leading-tight">{currentCleaner.name}</h3>
                        <p className="text-[11px] text-sky-100 font-mono">{currentCleaner.nik}</p>
                        <span className="text-[10px] text-sky-200 font-medium">
                          {currentCleaner.shiftName}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleClockInOut(currentCleaner.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-xs transition-colors ${
                        currentCleaner.isClockedIn
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          : 'bg-rose-500 hover:bg-rose-600 text-white'
                      }`}
                    >
                      {currentCleaner.isClockedIn ? 'Clocked In' : 'Clock In'}
                    </button>
                  </div>

                  {/* Project Location Badge */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-sky-100 bg-sky-700/60 px-2.5 py-1 rounded-lg">
                    <Building2 className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                    <span className="truncate font-semibold">{activeProject.name}</span>
                  </div>
                </div>

                {/* Sub Tab Switcher: Tugas vs Ceklist 24 Jam */}
                <div className="flex border-b border-slate-200 bg-white text-xs font-semibold">
                  <button
                    onClick={() => setMobileTab('tasks')}
                    className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
                      mobileTab === 'tasks'
                        ? 'border-sky-600 text-sky-600 bg-sky-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tugas Harian ({cleanerTasks.length})
                  </button>
                  <button
                    onClick={() => setMobileTab('checklist24')}
                    className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 ${
                      mobileTab === 'checklist24'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Ceklist 24 Jam</span>
                  </button>
                </div>

                {/* TAB 1: Tasks List */}
                {mobileTab === 'tasks' && (
                  <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
                    {cleanerTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      const isPendingQC = task.status === 'pending_qc';

                      return (
                        <div
                          key={task.id}
                          onClick={() => !isDone && handleOpenTask(task)}
                          className={`p-3 rounded-2xl border transition-all text-xs flex flex-col justify-between ${
                            isDone
                              ? 'bg-slate-50 border-slate-200 opacity-75'
                              : isPendingQC
                              ? 'bg-amber-50/50 border-amber-300 cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-sky-300 shadow-xs cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {task.id.toUpperCase()}
                              </span>
                              <h4 className="font-bold text-slate-900 text-xs mt-0.5">
                                {task.areaName}
                              </h4>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {task.buildingFloor}
                              </p>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPendingQC
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {isDone ? '✓ Selesai' : isPendingQC ? 'Menunggu QC' : 'Kerjakan'}
                            </span>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {task.scheduledTime}
                            </span>
                            <span className="font-semibold text-rose-600">
                              Batas: {task.deadlineTime}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 2: Ceklist 24 Jam Area */}
                {mobileTab === 'checklist24' && (
                  <div className="p-3 space-y-3 flex-1 overflow-y-auto text-xs">
                    {/* Location selector pills */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Pilih Lokasi Ceklist:</span>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {checklistLocations.map((loc) => (
                          <button
                            key={loc.id}
                            onClick={() => setSelectedChecklistLocId(loc.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                              loc.id === selectedChecklistLocId
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            {loc.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* PDF Download Button & Info */}
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                      <span className="text-[10px] text-emerald-800 font-medium">
                        Model Resmi Ceklist Kebersihan Area
                      </span>
                      <button
                        onClick={() => {
                          if (mobileDailyChecklist && activeChecklistLocation) {
                            exportChecklistToPDF({
                              dailyChecklist: mobileDailyChecklist,
                              location: activeChecklistLocation,
                              project: activeProject,
                              kopSurat: DEFAULT_HOSPITAL_KOP,
                              startHour: 6,
                              endHour: 24,
                            });
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-[10px] font-bold shadow-2xs"
                      >
                        <FileDown className="w-3 h-3" />
                        <span>Download PDF</span>
                      </button>
                    </div>

                    {/* Hourly Slots in Mobile */}
                    <div className="space-y-2.5">
                      {mobileDailyChecklist?.hourlySlots.slice(6, 22).map((slot) => {
                        const isClean = slot.status === 'clean';
                        const isIssue = slot.status === 'has_issue';
                        const isExpanded = mobileExpandedHour === slot.hour;
                        const itemsToShow = isExpanded ? slot.items : slot.items.slice(0, 4);

                        return (
                          <div
                            key={slot.hour}
                            className={`p-3 rounded-2xl border transition-all ${
                              isClean
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : isIssue
                                ? 'bg-rose-50/50 border-rose-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {slot.hourLabel}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isClean
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : isIssue
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {isClean ? 'Bersih (B)' : isIssue ? 'Ada Isu (K/R)' : 'Belum Cek'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    batchUpdateHourStatus(
                                      mobileDailyChecklist.id,
                                      slot.hour,
                                      'clean',
                                      currentCleaner.name
                                    )
                                  }
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                                >
                                  ✓ Set Semua B
                                </button>
                                <button
                                  onClick={() =>
                                    setMobileExpandedHour(isExpanded ? null : slot.hour)
                                  }
                                  className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold"
                                  title={isExpanded ? 'Tutup Rincian' : 'Buka Semua Item'}
                                >
                                  {isExpanded ? '▲' : `▼ (${slot.items.length})`}
                                </button>
                              </div>
                            </div>

                            {/* Item checklist grid in mobile slot */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-0.5">
                                <span>Item Area (Tap: - → B → K → R)</span>
                                <span>
                                  {slot.items.filter((i) => i.status === 'clean').length}/{slot.items.length} B
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                {itemsToShow.map((item) => {
                                  const code = toBKRCode(item.status);
                                  return (
                                    <button
                                      key={item.itemId}
                                      onClick={() =>
                                        toggleHourlySlotCell(
                                          mobileDailyChecklist.id,
                                          slot.hour,
                                          item.itemId
                                        )
                                      }
                                      className={`p-2 rounded-xl text-left border flex items-center justify-between gap-1 transition-all active:scale-[0.98] ${
                                        code === 'B'
                                          ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-semibold'
                                          : code === 'K'
                                          ? 'bg-rose-100/70 border-rose-300 text-rose-950 font-semibold'
                                          : code === 'R'
                                          ? 'bg-amber-100/70 border-amber-300 text-amber-950 font-semibold'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span className="truncate text-[10.5px] leading-tight">
                                        {item.itemName}
                                      </span>
                                      <span
                                        className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] shrink-0 ${
                                          code === 'B'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : code === 'K'
                                            ? 'bg-rose-600 text-white shadow-2xs'
                                            : code === 'R'
                                            ? 'bg-amber-500 text-white shadow-2xs'
                                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                                        }`}
                                      >
                                        {code}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {!isExpanded && slot.items.length > 4 && (
                                <button
                                  onClick={() => setMobileExpandedHour(slot.hour)}
                                  className="w-full py-1 text-center text-[10px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50/50 hover:bg-sky-50 rounded-lg transition-colors"
                                >
                                  + Tampilkan {slot.items.length - 4} item lainnya (Lantai, Kaca, dll)
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bar Navigation */}
          <div className="bg-white border-t border-slate-200 py-2.5 px-6 flex items-center justify-around text-slate-600 shrink-0">
            <button
              onClick={() => {
                setSelectedTask(null);
                setMobileTab('tasks');
              }}
              className={`flex flex-col items-center gap-0.5 ${
                mobileTab === 'tasks' ? 'text-sky-600 font-bold' : 'hover:text-sky-600'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[9px]">Tugas Harian</span>
            </button>

            <button
              onClick={() => {
                setSelectedTask(null);
                setMobileTab('checklist24');
              }}
              className={`flex flex-col items-center gap-0.5 ${
                mobileTab === 'checklist24' ? 'text-emerald-600 font-bold' : 'hover:text-emerald-600'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span className="text-[9px]">Ceklist 24 Jam</span>
            </button>

            <button
              onClick={() => {
                alert(`Petugas: ${currentCleaner.name}\nShift: ${currentCleaner.shiftName}\nLokasi Proyek: ${activeProject.name}`);
              }}
              className="flex flex-col items-center gap-0.5 hover:text-sky-600"
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-[9px]">Status</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
