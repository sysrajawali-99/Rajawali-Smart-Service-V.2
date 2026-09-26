import React, { useState, useMemo, useRef } from 'react';
import {
  Sparkles,
  CalendarRange,
  CalendarClock,
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  User,
  Building2,
  MapPin,
  Layers,
  Eye,
  Trash2,
  Play,
  ShieldCheck,
  Camera,
  Upload,
  X,
  AlertCircle,
  ArrowDownToLine,
  Check,
  FileText,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import {
  SpecialJobItem,
  SpecialJobSourceType,
  SpecialJobStatus,
  MasterCleaningProgramItem,
} from '../../types';
import { normalizeFrequencyCode } from '../../utils/mcpUtils';

export const SpecialJobView: React.FC = () => {
  const {
    specialJobs,
    addSpecialJob,
    updateSpecialJob,
    deleteSpecialJob,
    masterPrograms,
    cleaners,
    areas,
    shifts,
    activeProject,
    currentUser,
    userRole,
    users,
  } = useCleaning();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SpecialJobStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | SpecialJobSourceType>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Detail Modal
  const [selectedJob, setSelectedJob] = useState<SpecialJobItem | null>(null);

  // Modal 1: Buat Request Special Job (By Request Supervisor / Pilih dari Weekly & Monthly)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSourceType, setCreateSourceType] = useState<SpecialJobSourceType>('supervisor_request');
  const [selectedMcpId, setSelectedMcpId] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newWorkMethod, setNewWorkMethod] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newFloor, setNewFloor] = useState('Lantai 1');
  const [newRequestedBy, setNewRequestedBy] = useState('');
  const [newRequestReason, setNewRequestReason] = useState('');
  const [newAssignedPic, setNewAssignedPic] = useState('');
  const [newShiftName, setNewShiftName] = useState('Shift 1 ( satu )');
  const [newPriority, setNewPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [newScheduledDate, setNewScheduledDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [newScheduledTime, setNewScheduledTime] = useState('09:00 - 11:00 WIB');
  const [newDuration, setNewDuration] = useState<number>(120);
  const [newPhotoBefore, setNewPhotoBefore] = useState('');
  const [newPhotoMeta, setNewPhotoMeta] = useState<{ timestamp: string; userName: string } | null>(
    null
  );

  // Modal 2: Ambil Pekerjaan dari Weekly & Monthly Activity (Multi-Select Picker)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [importSearch, setImportSearch] = useState('');
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [importSupervisorName, setImportSupervisorName] = useState('');
  const [importReason, setImportReason] = useState(
    'Instruksi Supervisor: Diambil dari program Weekly/Monthly Activity untuk eksekusi Special Job.'
  );
  const [importScheduledDate, setImportScheduledDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [importShiftName, setImportShiftName] = useState('Shift 1 ( satu )');
  const [importPriority, setImportPriority] = useState<'normal' | 'high' | 'urgent'>('high');

  // Modal 3: Selesaikan Special Job
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingJob, setCompletingJob] = useState<SpecialJobItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPhotoAfter, setCompletionPhotoAfter] = useState('');
  const [completionPhotoMeta, setCompletionPhotoMeta] = useState<{
    timestamp: string;
    userName: string;
  } | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // File Input Refs
  const createCameraRef = useRef<HTMLInputElement | null>(null);
  const createGalleryRef = useRef<HTMLInputElement | null>(null);
  const completeCameraRef = useRef<HTMLInputElement | null>(null);
  const completeGalleryRef = useRef<HTMLInputElement | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const MONTH_OPTIONS = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  // Supervisors list for Requestor dropdown / suggestion
  const supervisorUsers = useMemo(() => {
    return users.filter((u) => u.role === 'supervisor' || u.role === 'admin');
  }, [users]);

  const defaultSupervisorName = useMemo(() => {
    if (currentUser?.role === 'supervisor' || currentUser?.role === 'admin') {
      return currentUser.name;
    }
    const projSpv = supervisorUsers.find((u) =>
      u.assignedProjectIds?.includes(activeProject.id) && u.role === 'supervisor'
    );
    return projSpv?.name || activeProject.managerName || 'Supervisor Operasional';
  }, [currentUser, supervisorUsers, activeProject]);

  // Weekly & Monthly Programs from Master Cleaning Program
  const weeklyActivityPrograms = useMemo(() => {
    return masterPrograms.filter((p) => normalizeFrequencyCode(p.frequency) === 'W');
  }, [masterPrograms]);

  const monthlyActivityPrograms = useMemo(() => {
    return masterPrograms.filter((p) => normalizeFrequencyCode(p.frequency) === 'M');
  }, [masterPrograms]);

  const availableWeeklyMonthlyPrograms = useMemo(() => {
    return masterPrograms.filter((p) => {
      const code = normalizeFrequencyCode(p.frequency);
      return code === 'W' || code === 'M';
    });
  }, [masterPrograms]);

  // Filter Special Jobs by Month & Year
  const availableYears = useMemo(() => {
    const years = new Set<number>([2025, 2026, 2027]);
    specialJobs.forEach((j) => {
      if (j.scheduledDate) {
        const y = parseInt(j.scheduledDate.split('-')[0], 10);
        if (!isNaN(y) && y > 2000) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [specialJobs]);

  const periodFilteredJobs = useMemo(() => {
    return specialJobs.filter((item) => {
      const dateStr = item.scheduledDate || (item.createdAt ? item.createdAt.split('T')[0] : '');
      if (!dateStr) return selectedMonth === 'all' && selectedYear === 'all';
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (selectedYear !== 'all' && y !== parseInt(selectedYear, 10)) return false;
        if (selectedMonth !== 'all' && m !== parseInt(selectedMonth, 10)) return false;
      }
      return true;
    });
  }, [specialJobs, selectedMonth, selectedYear]);

  // Filtered Special Jobs
  const filteredJobs = useMemo(() => {
    return periodFilteredJobs.filter((item) => {
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchSource = sourceFilter === 'all' || item.sourceType === sourceFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (item.ticketNo || '').toLowerCase().includes(q) ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q) ||
        (item.floor || '').toLowerCase().includes(q) ||
        (item.requestedBy || '').toLowerCase().includes(q) ||
        (item.assignedPicName || '').toLowerCase().includes(q);

      return matchStatus && matchSource && matchQuery;
    });
  }, [periodFilteredJobs, statusFilter, sourceFilter, searchQuery]);

  // Counts for 4 KPI Cards
  const totalCount = periodFilteredJobs.length;
  const requestedCount = periodFilteredJobs.filter((j) => j.status === 'requested').length;
  const inProgressCount = periodFilteredJobs.filter((j) => j.status === 'in_progress').length;
  const completedCount = periodFilteredJobs.filter((j) => j.status === 'completed').length;

  // Photo Watermark Helper (Timestamp + User Login)
  const processPhotoWithTimestamp = (
    file: File,
    locationLabel?: string
  ): Promise<{ dataUrl: string; timestamp: string; userName: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
      reader.onload = () => {
        const baseDataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const now = new Date();
          const dateFormatted = now.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          const timeFormatted =
            now.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }) + ' WIB';
          const fullTimestamp = `${dateFormatted} • ${timeFormatted}`;
          const loggedInUser = currentUser?.name || 'User Login';

          const canvas = document.createElement('canvas');
          const maxDim = 1280;
          let targetW = img.width || 800;
          let targetH = img.height || 600;
          if (targetW > maxDim || targetH > maxDim) {
            if (targetW >= targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }

          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: baseDataUrl, timestamp: fullTimestamp, userName: loggedInUser });
            return;
          }

          ctx.drawImage(img, 0, 0, targetW, targetH);

          const bannerHeight = Math.max(76, Math.floor(targetH * 0.16));
          const bannerY = targetH - bannerHeight;

          const gradient = ctx.createLinearGradient(0, bannerY, 0, targetH);
          gradient.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
          gradient.addColorStop(0.35, 'rgba(15, 23, 42, 0.88)');
          gradient.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, bannerY, targetW, bannerHeight);

          ctx.fillStyle = '#6366f1';
          ctx.fillRect(0, bannerY, targetW, Math.max(2, Math.floor(targetH * 0.004)));

          const padX = Math.max(14, Math.floor(targetW * 0.025));
          const fontSizePrimary = Math.max(13, Math.floor(targetW * 0.024));
          const fontSizeSecondary = Math.max(11, Math.floor(targetW * 0.019));

          let textY = bannerY + Math.floor(bannerHeight * 0.36);
          ctx.font = `bold ${fontSizePrimary}px monospace`;
          ctx.fillStyle = '#fde047';
          ctx.fillText(`🕒 ${fullTimestamp}`, padX, textY);

          textY += Math.floor(bannerHeight * 0.32);
          ctx.font = `bold ${fontSizeSecondary}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`👤 User: ${loggedInUser}`, padX, textY);

          textY += Math.floor(bannerHeight * 0.24);
          ctx.font = `normal ${Math.max(10, fontSizeSecondary - 2)}px sans-serif`;
          ctx.fillStyle = '#cbd5e1';
          const locInfo = locationLabel
            ? `${activeProject.name} • ${locationLabel}`
            : activeProject.name;
          ctx.fillText(`📍 Special Job • ${locInfo}`, padX, textY);

          const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve({
            dataUrl: stampedDataUrl,
            timestamp: fullTimestamp,
            userName: loggedInUser,
          });
        };
        img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
        img.src = baseDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreatePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const res = await processPhotoWithTimestamp(file, newLocation || newFloor);
      setNewPhotoBefore(res.dataUrl);
      setNewPhotoMeta({ timestamp: res.timestamp, userName: res.userName });
    } catch {
      showToast('Gagal memproses foto.');
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleCompletePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const res = await processPhotoWithTimestamp(
        file,
        completingJob ? `${completingJob.location} (${completingJob.floor})` : undefined
      );
      setCompletionPhotoAfter(res.dataUrl);
      setCompletionPhotoMeta({ timestamp: res.timestamp, userName: res.userName });
    } catch {
      showToast('Gagal memproses foto hasil selesai.');
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setCreateSourceType('supervisor_request');
    setSelectedMcpId('');
    setNewTitle('');
    setNewWorkMethod('');
    setNewLocation(areas[0]?.name || 'Lobby Utama');
    setNewFloor(areas[0]?.floor || 'Lantai 1');
    setNewRequestedBy(defaultSupervisorName);
    setNewRequestReason('By Request Supervisor: Permintaan pengerjaan khusus area prioritas.');
    setNewAssignedPic(cleaners[0]?.name || 'Asep Supriyadi');
    setNewShiftName(shifts[0]?.name || 'Shift 1 ( satu )');
    setNewPriority('high');
    setNewScheduledDate(new Date().toISOString().split('T')[0]);
    setNewScheduledTime('09:00 - 11:00 WIB');
    setNewDuration(120);
    setNewPhotoBefore('');
    setNewPhotoMeta(null);
    setShowCreateModal(true);
  };

  // Auto-fill when selecting a Weekly or Monthly Activity inside Create Modal
  const handleSelectMcpTemplate = (mcpId: string) => {
    setSelectedMcpId(mcpId);
    const prog = availableWeeklyMonthlyPrograms.find((p) => p.id === mcpId);
    if (!prog) return;
    const isMonthly = normalizeFrequencyCode(prog.frequency) === 'M';
    setCreateSourceType(isMonthly ? 'monthly_activity' : 'weekly_activity');
    setNewTitle(prog.workDescription);
    setNewWorkMethod(prog.workMethod);
    setNewLocation(prog.location);
    setNewAssignedPic(prog.picName || cleaners[0]?.name || 'Petugas Khusus');
    setNewDuration(prog.targetDurationMinutes || (isMonthly ? 180 : 120));
    setNewRequestReason(
      `Diambil dari ${isMonthly ? 'Monthly Activity' : 'Weekly Activity'} oleh Supervisor untuk dikerjakan sebagai Special Job.`
    );
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocation.trim()) return;

    const created = addSpecialJob({
      projectId: activeProject.id,
      title: newTitle.trim(),
      workMethod:
        newWorkMethod.trim() || 'Sesuai Standar Operasional Prosedur (SOP) Special Treatment.',
      location: newLocation.trim(),
      floor: newFloor,
      sourceType: createSourceType,
      sourceProgramId: selectedMcpId || undefined,
      requestedBy: newRequestedBy.trim() || defaultSupervisorName,
      requestedByRole: 'Supervisor Operasional',
      requestReason:
        newRequestReason.trim() ||
        'By Request Supervisor: Pekerjaan khusus berdasarkan instruksi pengawas.',
      assignedPicName: newAssignedPic.trim() || cleaners[0]?.name || 'Tim Special Job',
      shiftName: newShiftName,
      priority: newPriority,
      scheduledDate: newScheduledDate,
      scheduledTime: newScheduledTime,
      targetDurationMinutes: Number(newDuration) || 120,
      status: 'requested',
      photoBefore: newPhotoBefore || undefined,
    });

    showToast(`Special Job "${created.ticketNo}" berhasil ditambahkan.`);
    setShowCreateModal(false);
  };

  // Open Import from Weekly & Monthly Activity Modal
  const handleOpenImportModal = () => {
    setSelectedProgramIds([]);
    setImportTab('all');
    setImportSearch('');
    setImportSupervisorName(defaultSupervisorName);
    setImportReason(
      'Diambil dari program Weekly/Monthly Activity atas permintaan Supervisor (By Request).'
    );
    setImportScheduledDate(new Date().toISOString().split('T')[0]);
    setImportShiftName(shifts[0]?.name || 'Shift 1 ( satu )');
    setImportPriority('high');
    setShowImportModal(true);
  };

  const toggleSelectProgram = (id: string) => {
    setSelectedProgramIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredImportPrograms = useMemo(() => {
    return availableWeeklyMonthlyPrograms.filter((prog) => {
      const code = normalizeFrequencyCode(prog.frequency);
      if (importTab === 'weekly' && code !== 'W') return false;
      if (importTab === 'monthly' && code !== 'M') return false;
      const q = importSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        prog.workDescription.toLowerCase().includes(q) ||
        prog.location.toLowerCase().includes(q) ||
        prog.workMethod.toLowerCase().includes(q) ||
        prog.picName.toLowerCase().includes(q)
      );
    });
  }, [availableWeeklyMonthlyPrograms, importTab, importSearch]);

  const handleConfirmImportFromWeeklyMonthly = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProgramIds.length === 0) return;

    let importedCount = 0;
    selectedProgramIds.forEach((progId) => {
      const prog = availableWeeklyMonthlyPrograms.find((p) => p.id === progId);
      if (!prog) return;
      const isMonthly = normalizeFrequencyCode(prog.frequency) === 'M';

      addSpecialJob({
        projectId: activeProject.id,
        title: prog.workDescription,
        workMethod: prog.workMethod || 'Sesuai SOP program berkala',
        location: prog.location || 'Area Gedung',
        floor: prog.location || 'Area Gedung',
        sourceType: isMonthly ? 'monthly_activity' : 'weekly_activity',
        sourceProgramId: prog.id,
        requestedBy: importSupervisorName.trim() || defaultSupervisorName,
        requestedByRole: 'Supervisor Operasional',
        requestReason:
          importReason.trim() ||
          `Diambil dari ${isMonthly ? 'Monthly Activity' : 'Weekly Activity'} By Request Supervisor.`,
        assignedPicName: prog.picName || cleaners[0]?.name || 'Tim Special Job',
        shiftName: importShiftName,
        priority: importPriority,
        scheduledDate: importScheduledDate,
        scheduledTime: isMonthly ? '22:00 - 01:00 WIB' : '09:00 - 11:00 WIB',
        targetDurationMinutes: prog.targetDurationMinutes || (isMonthly ? 180 : 120),
        status: 'requested',
        notes: prog.notes,
      });
      importedCount++;
    });

    showToast(
      `${importedCount} pekerjaan dari Weekly/Monthly Activity berhasil diambil menjadi Special Job.`
    );
    setShowImportModal(false);
    setSelectedProgramIds([]);
  };

  // Start working on Special Job
  const handleStartJob = (job: SpecialJobItem) => {
    updateSpecialJob(job.id, { status: 'in_progress' });
    showToast(`Special Job ${job.ticketNo} mulai dikerjakan.`);
  };

  // Open Complete Modal
  const handleOpenComplete = (job: SpecialJobItem) => {
    setCompletingJob(job);
    setCompletionNotes(job.notes || '');
    setCompletionPhotoAfter(job.photoAfter || '');
    setCompletionPhotoMeta(null);
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingJob) return;

    const now = new Date();
    const completedAtStr =
      now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' • ' +
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    updateSpecialJob(completingJob.id, {
      status: 'completed',
      notes:
        completionNotes.trim() ||
        'Pekerjaan Special Job telah diselesaikan sesuai instruksi Supervisor.',
      photoAfter:
        completionPhotoAfter ||
        completingJob.photoAfter ||
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
      completedAt: completedAtStr,
    });

    showToast(`Special Job ${completingJob.ticketNo} telah diselesaikan.`);
    setShowCompleteModal(false);
    setCompletingJob(null);
    if (selectedJob?.id === completingJob.id) {
      setSelectedJob(null);
    }
  };

  // Supervisor Verification
  const handleVerifyJob = (job: SpecialJobItem) => {
    const verifier = currentUser?.name || defaultSupervisorName;
    updateSpecialJob(job.id, {
      verifiedBySupervisor: true,
      verifiedByName: verifier,
    });
    showToast(`Special Job ${job.ticketNo} telah diverifikasi oleh Supervisor ${verifier}.`);
  };

  const getSourceBadge = (source: SpecialJobSourceType) => {
    switch (source) {
      case 'supervisor_request':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>By Request Supervisor</span>
          </span>
        );
      case 'weekly_activity':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <CalendarRange className="w-3 h-3 text-sky-600 shrink-0" />
            <span>Dari Weekly Activity</span>
          </span>
        );
      case 'monthly_activity':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <CalendarClock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Dari Monthly Activity</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: 'normal' | 'high' | 'urgent') => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Urgent
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            Prioritas Tinggi
          </span>
        );
      case 'normal':
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-700">
            Normal
          </span>
        );
    }
  };

  const getStatusBadge = (status: SpecialJobStatus) => {
    switch (status) {
      case 'requested':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Request Baru
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Sedang Dikerjakan
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Selesai
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* HEADER & ACTION BUTTONS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Special Job (By Request Supervisor)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {activeProject.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pekerjaan khusus yang dikerjakan <strong>By Request dari User Supervisor</strong> maupun diambil langsung dari daftar pekerjaan <strong>Weekly Activity</strong> &amp; <strong>Monthly Activity</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Filter Periode Bulan & Tahun */}
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 h-9 rounded-xl">
            <div className="flex items-center gap-1.5 text-slate-600 border-r border-slate-200 pr-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                Filter Periode
              </span>
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Filter Bulan"
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <span className="text-slate-300">|</span>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Filter Tahun"
              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Button: Ambil dari Weekly & Monthly Activity */}
          <button
            type="button"
            onClick={handleOpenImportModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 h-9 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Ambil dari Weekly / Monthly ({availableWeeklyMonthlyPrograms.length})</span>
          </button>

          {/* Button: + Buat Request Special Job */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Tambah Special Job</span>
          </button>
        </div>
      </div>

      {/* 4 INTERACTIVE KPI STATUS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            statusFilter === 'all'
              ? 'bg-white border-slate-400 ring-2 ring-slate-900/10 shadow-sm'
              : 'bg-white/80 hover:bg-white border-slate-200/90 opacity-75 hover:opacity-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Special Job
            </div>
            {statusFilter === 'all' && <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />}
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{totalCount}</div>
          <div className="text-[10.5px] text-slate-500 mt-0.5">Seluruh penugasan khusus</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'requested' ? 'all' : 'requested'))}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            statusFilter === 'requested'
              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/25 shadow-sm'
              : statusFilter === 'all'
              ? 'bg-indigo-50/70 hover:bg-indigo-50 border-indigo-200 shadow-xs'
              : 'bg-indigo-50/40 hover:bg-indigo-50/80 border-indigo-200/70 opacity-70 hover:opacity-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
              Request Baru
            </div>
            {statusFilter === 'requested' && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 tabular-nums">{requestedCount}</div>
          <div className="text-[10.5px] text-indigo-600 mt-0.5 font-medium">Menunggu eksekusi</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'in_progress' ? 'all' : 'in_progress'))}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            statusFilter === 'in_progress'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/25 shadow-sm'
              : statusFilter === 'all'
              ? 'bg-amber-50/70 hover:bg-amber-50 border-amber-200 shadow-xs'
              : 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-200/70 opacity-70 hover:opacity-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              Sedang Dikerjakan
            </div>
            {statusFilter === 'in_progress' && (
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-amber-700 tabular-nums">{inProgressCount}</div>
          <div className="text-[10.5px] text-amber-600 mt-0.5 font-medium">Proses di lapangan</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            statusFilter === 'completed'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/25 shadow-sm'
              : statusFilter === 'all'
              ? 'bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200 shadow-xs'
              : 'bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-200/70 opacity-70 hover:opacity-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Selesai Dikerjakan
            </div>
            {statusFilter === 'completed' && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{completedCount}</div>
          <div className="text-[10.5px] text-emerald-600 mt-0.5 font-medium">Tuntas &amp; terdokumentasi</div>
        </button>
      </div>

      {/* SEARCH & SOURCE FILTER BAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no. tiket, nama pekerjaan special job, lokasi, supervisor, atau petugas..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Source Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              sourceFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Sumber ({periodFilteredJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('supervisor_request')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              sourceFilter === 'supervisor_request'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              By Request SPV (
              {periodFilteredJobs.filter((j) => j.sourceType === 'supervisor_request').length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('weekly_activity')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              sourceFilter === 'weekly_activity'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>
              Weekly ({periodFilteredJobs.filter((j) => j.sourceType === 'weekly_activity').length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('monthly_activity')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              sourceFilter === 'monthly_activity'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>
              Monthly ({periodFilteredJobs.filter((j) => j.sourceType === 'monthly_activity').length})
            </span>
          </button>
        </div>
      </div>

      {/* SPECIAL JOB CARDS LIST */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">Belum Ada Pekerjaan Special Job</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            Tidak ditemukan catatan Special Job untuk filter saat ini. Anda dapat membuat request baru dari Supervisor atau mengambil pekerjaan dari Weekly &amp; Monthly Activity.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSourceFilter('all');
                setSelectedMonth('all');
                setSelectedYear('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Reset Filter
            </button>
            <button
              type="button"
              onClick={handleOpenImportModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Ambil dari Weekly / Monthly
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
            >
              <div className="p-4 space-y-3">
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-900 text-white">
                      {job.ticketNo}
                    </span>
                    {getSourceBadge(job.sourceType)}
                    {getPriorityBadge(job.priority)}
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                {/* Title & Location */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{job.title}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>
                      {job.location} {job.floor && job.floor !== job.location ? `· ${job.floor}` : ''}
                    </span>
                  </p>
                </div>

                {/* Supervisor Request Box */}
                <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-900 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Request By: {job.requestedBy}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed line-clamp-2">
                    {job.requestReason}
                  </p>
                </div>

                {/* Work Method / SOP */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase block mb-0.5">
                    Metode &amp; Alat Kerja:
                  </span>
                  <p className="text-slate-700 line-clamp-2 leading-relaxed">{job.workMethod}</p>
                </div>

                {/* Execution Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Petugas Pelaksana (PIC)</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {job.assignedPicName}
                    </span>
                    <span className="text-[10px] text-slate-500">{job.shiftName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jadwal &amp; Durasi</span>
                    <span className="font-bold text-slate-800 block">{job.scheduledDate}</span>
                    <span className="text-[10px] text-slate-500">
                      {job.scheduledTime} ({job.targetDurationMinutes} mnt)
                    </span>
                  </div>
                </div>

                {/* Verification status if completed */}
                {job.status === 'completed' && (
                  <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-xs flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Selesai: {job.completedAt || 'Hari ini'}</span>
                      </div>
                      {job.verifiedBySupervisor ? (
                        <span className="text-[10.5px] text-emerald-700 font-semibold block mt-0.5">
                          ✓ Diverifikasi SPV: {job.verifiedByName}
                        </span>
                      ) : (
                        <span className="text-[10.5px] text-amber-700 font-medium block mt-0.5">
                          Menunggu Verifikasi Supervisor
                        </span>
                      )}
                    </div>
                    {!job.verifiedBySupervisor &&
                      (userRole === 'supervisor' || userRole === 'admin') && (
                        <button
                          type="button"
                          onClick={() => handleVerifyJob(job)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer shrink-0"
                        >
                          Verifikasi
                        </button>
                      )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(job)}
                  className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Detail</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {job.status === 'requested' && (
                    <button
                      type="button"
                      onClick={() => handleStartJob(job)}
                      className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Kerjakan</span>
                    </button>
                  )}

                  {job.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleOpenComplete(job)}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Selesaikan</span>
                    </button>
                  )}

                  {(userRole === 'admin' || userRole === 'supervisor') && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteSpecialJob(job.id);
                        showToast(`Special Job ${job.ticketNo} dihapus.`);
                      }}
                      title="Hapus Special Job"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== MODAL 1: TAMBAH SPECIAL JOB (BY REQUEST SPV / PILIH WEEKLY & MONTHLY) ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tambah Pekerjaan Special Job
                  </h3>
                  <p className="text-xs text-slate-500">
                    By Request dari User Supervisor atau ambil dari program Weekly &amp; Monthly Activity
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-3.5 text-xs">
              {/* Source Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Sumber Pekerjaan Special Job *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateSourceType('supervisor_request');
                      setSelectedMcpId('');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      createSourceType === 'supervisor_request'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs">By Request Supervisor</div>
                      <div className="text-[10px] text-slate-500 font-normal">Instruksi khusus SPV</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateSourceType('weekly_activity')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      createSourceType === 'weekly_activity'
                        ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold ring-2 ring-sky-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <div className="text-xs">Dari Weekly Activity</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {weeklyActivityPrograms.length} pekerjaan tersedia
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateSourceType('monthly_activity')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      createSourceType === 'monthly_activity'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CalendarClock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-xs">Dari Monthly Activity</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {monthlyActivityPrograms.length} pekerjaan tersedia
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dropdown if Weekly or Monthly Activity is chosen */}
              {(createSourceType === 'weekly_activity' ||
                createSourceType === 'monthly_activity') && (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <label className="font-bold text-amber-900 block">
                    Pilih Pekerjaan dari{' '}
                    {createSourceType === 'weekly_activity'
                      ? 'Weekly Activity'
                      : 'Monthly Activity'}
                  </label>
                  <select
                    value={selectedMcpId}
                    onChange={(e) => handleSelectMcpTemplate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">
                      -- Pilih Pekerjaan untuk Diisi Otomatis ke Form Special Job --
                    </option>
                    {(createSourceType === 'weekly_activity'
                      ? weeklyActivityPrograms
                      : monthlyActivityPrograms
                    ).map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        [{normalizeFrequencyCode(prog.frequency) === 'W' ? 'WEEKLY' : 'MONTHLY'}]{' '}
                        {prog.workDescription} — ({prog.location})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama / Uraian Pekerjaan Special Job *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sterilisasi & Deep Cleaning Ruang Rapat VIP / Kristalisasi Marmer Lobby"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Supervisor Pemohon (By Request) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRequestedBy}
                    onChange={(e) => setNewRequestedBy(e.target.value)}
                    placeholder="Nama Supervisor yang me-request"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Petugas Pelaksana (PIC) *
                  </label>
                  <select
                    value={newAssignedPic}
                    onChange={(e) => setNewAssignedPic(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.shiftName})
                      </option>
                    ))}
                    <option value="Tim Special Treatment & Deep Clean">
                      Tim Special Treatment &amp; Deep Clean
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lokasi / Area Kerja *</label>
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Contoh: Lobby Utama, Executive Meeting Room"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lantai / Zona</label>
                  <input
                    type="text"
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    placeholder="Contoh: Lantai GF, Lantai 2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Metode Pengerjaan, SOP &amp; Chemical
                </label>
                <textarea
                  rows={2}
                  value={newWorkMethod}
                  onChange={(e) => setNewWorkMethod(e.target.value)}
                  placeholder="Jelaskan metode pengerjaan, mesin/alat, dan cairan chemical yang digunakan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Alasan / Instruksi Request Supervisor
                </label>
                <input
                  type="text"
                  value={newRequestReason}
                  onChange={(e) => setNewRequestReason(e.target.value)}
                  placeholder="Contoh: Permintaan khusus persiapan acara VIP / ditarik dari jadwal berkala"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={newScheduledDate}
                    onChange={(e) => setNewScheduledDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam Pelaksanaan</label>
                  <input
                    type="text"
                    value={newScheduledTime}
                    onChange={(e) => setNewScheduledTime(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift</label>
                  <select
                    value={newShiftName}
                    onChange={(e) => setNewShiftName(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prioritas</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Tinggi (High)</option>
                    <option value="urgent">Mendesak (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* Optional Photo Before with Automatic Timestamp & User Login */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Foto Kondisi Awal Area (Kamera / Galeri — Otomatis Timestamp &amp; User Login)
                </label>
                <input
                  ref={createCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCreatePhotoUpload}
                  className="hidden"
                />
                <input
                  ref={createGalleryRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCreatePhotoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => createCameraRef.current?.click()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ambil Kamera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => createGalleryRef.current?.click()}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Galeri / File</span>
                  </button>
                  {newPhotoMeta && (
                    <span className="text-[11px] text-emerald-700 font-semibold truncate">
                      ✓ {newPhotoMeta.timestamp} • {newPhotoMeta.userName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan Special Job</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: AMBIL PEKERJAAN DARI WEEKLY & MONTHLY ACTIVITY ==================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ambil Pekerjaan dari Weekly &amp; Monthly Activity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih satu atau beberapa pekerjaan dari Weekly Activity maupun Monthly Activity untuk dijadikan Special Job By Request Supervisor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Search inside Import Modal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setImportTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                    importTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Semua ({availableWeeklyMonthlyPrograms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('weekly')}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer flex items-center gap-1 ${
                    importTab === 'weekly' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Weekly Activity ({weeklyActivityPrograms.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('monthly')}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer flex items-center gap-1 ${
                    importTab === 'monthly' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Monthly Activity ({monthlyActivityPrograms.length})</span>
                </button>
              </div>

              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={importSearch}
                  onChange={(e) => setImportSearch(e.target.value)}
                  placeholder="Cari nama pekerjaan, lokasi, atau metode..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            {/* List of Selectable Weekly & Monthly Jobs */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[320px] border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
              {filteredImportPrograms.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tidak ada daftar pekerjaan Weekly/Monthly yang cocok dengan pencarian.
                </div>
              ) : (
                filteredImportPrograms.map((prog) => {
                  const isSelected = selectedProgramIds.includes(prog.id);
                  const isMonthly = normalizeFrequencyCode(prog.frequency) === 'M';

                  return (
                    <div
                      key={prog.id}
                      onClick={() => toggleSelectProgram(prog.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-500/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isMonthly
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}
                          >
                            {isMonthly ? 'Monthly Activity' : 'Weekly Activity'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Lokasi: {prog.location}
                          </span>
                          <span className="text-[11px] text-slate-400">• PIC: {prog.picName}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{prog.workDescription}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          Metode: {prog.workMethod}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Assignment Details Form */}
            <form onSubmit={handleConfirmImportFromWeeklyMonthly} className="space-y-3 text-xs shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Supervisor Pemohon (By Request)
                  </label>
                  <input
                    type="text"
                    required
                    value={importSupervisorName}
                    onChange={(e) => setImportSupervisorName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tanggal Eksekusi Special Job
                  </label>
                  <input
                    type="date"
                    value={importScheduledDate}
                    onChange={(e) => setImportScheduledDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift &amp; Prioritas</label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={importShiftName}
                      onChange={(e) => setImportShiftName(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      {shifts.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={importPriority}
                      onChange={(e) => setImportPriority(e.target.value as any)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-600">
                  Terpilih: <strong className="text-indigo-700">{selectedProgramIds.length}</strong> pekerjaan
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={selectedProgramIds.length === 0}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Jadikan Special Job ({selectedProgramIds.length})</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: SELESAIKAN SPECIAL JOB ==================== */}
      {showCompleteModal && completingJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Selesaikan Pekerjaan Special Job
                </h3>
                <p className="text-xs text-slate-500">
                  {completingJob.ticketNo} · {completingJob.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmComplete} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Hasil Pengerjaan *
                </label>
                <textarea
                  rows={3}
                  required
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Jelaskan hasil pengerjaan Special Job, kondisi akhir area, dan pemakaian chemical..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Foto Bukti Selesai (Otomatis Timestamp &amp; User Login)
                </label>
                <input
                  ref={completeCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCompletePhotoUpload}
                  className="hidden"
                />
                <input
                  ref={completeGalleryRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCompletePhotoUpload}
                  className="hidden"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isProcessingPhoto}
                    onClick={() => completeCameraRef.current?.click()}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Ambil Kamera</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingPhoto}
                    onClick={() => completeGalleryRef.current?.click()}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Galeri / File</span>
                  </button>
                </div>

                {completionPhotoAfter && (
                  <div className="mt-2 relative h-40 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
                    <img
                      src={completionPhotoAfter}
                      alt="Hasil Selesai"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                {completionPhotoMeta && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    ✓ {completionPhotoMeta.timestamp} • {completionPhotoMeta.userName}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan &amp; Selesaikan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 4: DETAIL SPECIAL JOB ==================== */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-900 text-white">
                    {selectedJob.ticketNo}
                  </span>
                  {getSourceBadge(selectedJob.sourceType)}
                  {getPriorityBadge(selectedJob.priority)}
                  {getStatusBadge(selectedJob.status)}
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedJob.title}</h3>
                <p className="text-xs text-slate-500">
                  Lokasi: {selectedJob.location} · {selectedJob.floor}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100 space-y-1">
                <span className="text-[10.5px] font-bold text-indigo-800 uppercase block">
                  Request Dari User Supervisor
                </span>
                <div className="font-bold text-slate-900">{selectedJob.requestedBy}</div>
                <div className="text-[11px] text-indigo-700">{selectedJob.requestReason}</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase block">
                  Pelaksana &amp; Jadwal Kerja
                </span>
                <div className="font-bold text-slate-900">
                  PIC: {selectedJob.assignedPicName} ({selectedJob.shiftName})
                </div>
                <div className="text-[11px] text-slate-600">
                  {selectedJob.scheduledDate} · {selectedJob.scheduledTime} (
                  {selectedJob.targetDurationMinutes} Menit)
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <span className="font-bold text-slate-700 block">Metode Pengerjaan &amp; SOP:</span>
              <p className="text-slate-600 leading-relaxed">{selectedJob.workMethod}</p>
              {selectedJob.notes && (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="font-bold text-slate-700 block">Catatan Pengerjaan:</span>
                  <p className="text-slate-600">{selectedJob.notes}</p>
                </div>
              )}
            </div>

            {(selectedJob.photoBefore || selectedJob.photoAfter) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedJob.photoBefore && (
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-1">
                      Foto Sebelum Pengerjaan
                    </span>
                    <div className="h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                      <img
                        src={selectedJob.photoBefore}
                        alt="Before"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {selectedJob.photoAfter && (
                  <div>
                    <span className="text-xs font-bold text-emerald-700 block mb-1">
                      Foto Selesai Pengerjaan
                    </span>
                    <div className="h-44 rounded-2xl overflow-hidden border border-emerald-200 bg-slate-100">
                      <img
                        src={selectedJob.photoAfter}
                        alt="After"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Tutup
              </button>

              {selectedJob.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => handleOpenComplete(selectedJob)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesaikan Pekerjaan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
