import React, { useState, useMemo, useRef } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Eye,
  Camera,
  Upload,
  Trash2,
  Layers,
  Building2,
  X,
  Calendar,
  User,
  Phone,
  FileText,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import { FacilityDamageReport, DamageCategory, DamageSeverity, DamageReportStatus } from '../../../types';

export const KlienDamageSection: React.FC = () => {
  const {
    damageReports,
    addDamageReport,
    updateDamageReport,
    deleteDamageReport,
    resolveDamageReport,
    activeProject,
    currentUser,
    userRole,
  } = useCleaning();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DamageReportStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | DamageSeverity>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<FacilityDamageReport | null>(null);

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

  const availableYears = useMemo(() => {
    const years = new Set<number>([2024, 2025, 2026, 2027]);
    damageReports.forEach((r) => {
      const dateStr = r.reportDate || (r.createdAt ? r.createdAt.split('T')[0] : '');
      if (dateStr) {
        const y = parseInt(dateStr.split('-')[0], 10);
        if (!isNaN(y) && y > 2000) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [damageReports]);

  // Modal: Create New Damage Report
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newCategory, setNewCategory] = useState<DamageCategory>('sanitair');
  const [newLocationName, setNewLocationName] = useState('');
  const [newFloor, setNewFloor] = useState('Lantai 1');
  const [newZone, setNewZone] = useState('Zona Publik');
  const [newDamageLevel, setNewDamageLevel] = useState<DamageSeverity>('sedang');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newChronology, setNewChronology] = useState('');
  const [newImpact, setNewImpact] = useState('');
  const [newActionTaken, setNewActionTaken] = useState('');
  const [newTargetDept, setNewTargetDept] = useState('Building Maintenance (MEP)');
  const [newPhotoBefore, setNewPhotoBefore] = useState('');
  const [newPhotoMeta, setNewPhotoMeta] = useState<{ timestamp: string; userName: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const resolveCameraInputRef = useRef<HTMLInputElement | null>(null);
  const resolveGalleryInputRef = useRef<HTMLInputElement | null>(null);

  // Modal: Resolve Damage Report
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvingReport, setResolvingReport] = useState<FacilityDamageReport | null>(null);
  const [resolutionTechnician, setResolutionTechnician] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionPhotoAfter, setResolutionPhotoAfter] = useState('');
  const [resolutionPhotoMeta, setResolutionPhotoMeta] = useState<{ timestamp: string; userName: string } | null>(null);
  const [resolutionCost, setResolutionCost] = useState<number>(0);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filter by Month & Year Period
  const periodFilteredReports = useMemo(() => {
    return damageReports.filter((item) => {
      const dateStr = item.reportDate || (item.createdAt ? item.createdAt.split('T')[0] : '');
      if (!dateStr) {
        return selectedYear === 'all' && selectedMonth === 'all';
      }
      let rYear = NaN;
      let rMonth = NaN;
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length >= 2) {
          rYear = parseInt(parts[0], 10);
          rMonth = parseInt(parts[1], 10);
        }
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          rMonth = parseInt(parts[1], 10);
          rYear = parseInt(parts[2], 10);
        }
      }
      if (!isNaN(rYear) && !isNaN(rMonth)) {
        if (selectedYear !== 'all' && rYear !== parseInt(selectedYear, 10)) {
          return false;
        }
        if (selectedMonth !== 'all' && rMonth !== parseInt(selectedMonth, 10)) {
          return false;
        }
        return true;
      }
      return selectedYear === 'all' && selectedMonth === 'all';
    });
  }, [damageReports, selectedMonth, selectedYear]);

  // Filtered Damage Reports (already filtered by active project in context)
  const filteredReports = useMemo(() => {
    return periodFilteredReports.filter((item) => {
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'dalam_penanganan'
          ? item.status === 'dalam_penanganan' || item.status === 'menunggu_sparepart'
          : item.status === statusFilter;
      const matchSeverity = severityFilter === 'all' || item.damageLevel === severityFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (item.ticketNo || '').toLowerCase().includes(q) ||
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.locationName || '').toLowerCase().includes(q) ||
        (item.floor || '').toLowerCase().includes(q) ||
        (item.reporterName || '').toLowerCase().includes(q);

      return matchStatus && matchSeverity && matchQuery;
    });
  }, [periodFilteredReports, statusFilter, severityFilter, searchQuery]);

  // Statistics
  const totalCount = periodFilteredReports.length;
  const reportedCount = periodFilteredReports.filter((r) => r.status === 'dilaporkan').length;
  const inProgressCount = periodFilteredReports.filter(
    (r) => r.status === 'dalam_penanganan' || r.status === 'menunggu_sparepart'
  ).length;
  const resolvedCount = periodFilteredReports.filter((r) => r.status === 'selesai').length;
  const criticalCount = periodFilteredReports.filter((r) => r.damageLevel === 'kritis' || r.priority === 'urgent').length;

  // Helper: Stamp automatic timestamp & logged-in user name onto uploaded/captured photo
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

          // Draw original photo
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // Draw bottom watermark banner with timestamp & logged-in user name
          const bannerHeight = Math.max(76, Math.floor(targetH * 0.16));
          const bannerY = targetH - bannerHeight;

          const gradient = ctx.createLinearGradient(0, bannerY, 0, targetH);
          gradient.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
          gradient.addColorStop(0.35, 'rgba(15, 23, 42, 0.88)');
          gradient.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, bannerY, targetW, bannerHeight);

          // Top accent line
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(0, bannerY, targetW, Math.max(2, Math.floor(targetH * 0.004)));

          const padX = Math.max(14, Math.floor(targetW * 0.025));
          const fontSizePrimary = Math.max(13, Math.floor(targetW * 0.024));
          const fontSizeSecondary = Math.max(11, Math.floor(targetW * 0.019));

          // Line 1: Timestamp (Date & Time)
          let textY = bannerY + Math.floor(bannerHeight * 0.36);
          ctx.font = `bold ${fontSizePrimary}px monospace`;
          ctx.fillStyle = '#fde047';
          ctx.fillText(`🕒 ${fullTimestamp}`, padX, textY);

          // Line 2: Logged-in User Name
          textY += Math.floor(bannerHeight * 0.32);
          ctx.font = `bold ${fontSizeSecondary}px sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`👤 User: ${loggedInUser}`, padX, textY);

          // Line 3: Project / Location
          textY += Math.floor(bannerHeight * 0.24);
          ctx.font = `normal ${Math.max(10, fontSizeSecondary - 2)}px sans-serif`;
          ctx.fillStyle = '#cbd5e1';
          const locInfo = locationLabel
            ? `${activeProject.name} • ${locationLabel}`
            : activeProject.name;
          ctx.fillText(`📍 ${locInfo}`, padX, textY);

          const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve({
            dataUrl: stampedDataUrl,
            timestamp: fullTimestamp,
            userName: loggedInUser,
          });
        };
        img.onerror = () => reject(new Error('Format gambar tidak dapat diproses.'));
        img.src = baseDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleBeforePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setPhotoError(null);
    try {
      const locLabel = newLocationName.trim()
        ? `${newLocationName.trim()} (${newFloor})`
        : newFloor;
      const result = await processPhotoWithTimestamp(file, locLabel);
      setNewPhotoBefore(result.dataUrl);
      setNewPhotoMeta({ timestamp: result.timestamp, userName: result.userName });
    } catch {
      setPhotoError('Gagal memproses foto. Silakan coba ambil ulang atau pilih file gambar lain.');
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleAfterPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    try {
      const locLabel = resolvingReport
        ? `${resolvingReport.locationName} (${resolvingReport.floor})`
        : undefined;
      const result = await processPhotoWithTimestamp(file, locLabel);
      setResolutionPhotoAfter(result.dataUrl);
      setResolutionPhotoMeta({ timestamp: result.timestamp, userName: result.userName });
    } catch {
      showToast('Gagal memproses foto perbaikan.');
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newLocationName.trim()) {
      setPhotoError('Nama barang dan lokasi kerusakan wajib diisi.');
      return;
    }
    if (!newPhotoBefore) {
      setPhotoError('Foto bukti kerusakan wajib diambil dari kamera atau diupload dari galeri/file.');
      return;
    }

    addDamageReport({
      projectId: activeProject.id,
      itemName: newItemName,
      category: newCategory,
      locationName: newLocationName,
      floor: newFloor,
      zone: newZone,
      damageLevel: newDamageLevel,
      priority: newPriority,
      chronology: newChronology || 'Ditemukan saat inspeksi operasional rutin.',
      impact: newImpact || 'Mengganggu kenyamanan pengguna fasilitas gedung.',
      actionTaken: newActionTaken || 'Pemberian tanda pengaman & pembatasan akses sementara.',
      targetDepartment: newTargetDept,
      reporterName: currentUser?.name || 'Klien Building Management',
      reporterRole: userRole === 'klien' ? 'Klien Gedung' : 'Pengawas Operasional',
      photoBefore: newPhotoBefore,
      status: 'dilaporkan',
      reportDate: new Date().toISOString().split('T')[0],
      reportTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    });

    showToast(`Laporan kerusakan "${newItemName}" berhasil dibuat.`);
    setShowCreateModal(false);

    // Reset Form
    setNewItemName('');
    setNewLocationName('');
    setNewChronology('');
    setNewImpact('');
    setNewActionTaken('');
    setNewPhotoBefore('');
    setNewPhotoMeta(null);
    setPhotoError(null);
  };

  const handleOpenResolve = (report: FacilityDamageReport) => {
    setResolvingReport(report);
    setResolutionTechnician(currentUser?.name || 'Tim Maintenance MEP');
    setResolutionNotes('');
    setResolutionPhotoAfter('');
    setResolutionPhotoMeta(null);
    setResolutionCost(report.costEstimate || 0);
    setShowResolveModal(true);
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingReport) return;

    resolveDamageReport(resolvingReport.id, {
      technicianName: resolutionTechnician,
      technicianNotes: resolutionNotes || 'Perbaikan fasilitas telah selesai dan diuji fungsi dengan baik.',
      photoAfter:
        resolutionPhotoAfter ||
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
      costEstimate: Number(resolutionCost) || 0,
    });

    showToast(`Tiket kerusakan ${resolvingReport.ticketNo} berhasil diselesaikan.`);
    setShowResolveModal(false);
    setResolvingReport(null);
    if (selectedReport?.id === resolvingReport.id) {
      setSelectedReport(null);
    }
  };

  const getStatusBadge = (status: DamageReportStatus) => {
    switch (status) {
      case 'dilaporkan':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Dilaporkan
          </span>
        );
      case 'dalam_penanganan':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Dalam Penanganan
          </span>
        );
      case 'menunggu_sparepart':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Menunggu Sparepart
          </span>
        );
      case 'selesai':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Selesai Diperbaiki
          </span>
        );
      case 'ditolak':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Ditolak
          </span>
        );
      default:
        return null;
    }
  };

  const getSeverityBadge = (level: DamageSeverity) => {
    switch (level) {
      case 'kritis':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">Kritis</span>;
      case 'berat':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800">Berat</span>;
      case 'sedang':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">Sedang</span>;
      case 'ringan':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">Ringan</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* HEADER & SUMMARY METRICS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-rose-600" />
            <span>Laporan Kerusakan Fasilitas & Aset</span>
          </h3>
          <p className="text-xs text-slate-500">
            Pemantauan kerusakan sarana gedung, tindak lanjut teknisi, dan dokumentasi perbaikan di {activeProject.name}.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start lg:self-auto shrink-0">
          {/* Filter Periode: Bulan & Tahun */}
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3 h-9 rounded-xl shadow-xs">
            <div className="flex items-center gap-1.5 text-slate-600 border-r border-slate-200 pr-2">
              <Calendar className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">Filter Periode</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Bulan:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Filter Bulan"
                className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-200">|</span>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Filter Tahun"
                className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {(selectedMonth !== 'all' || selectedYear !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth('all');
                  setSelectedYear('all');
                }}
                title="Reset Periode"
                className="ml-0.5 p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Tambah Laporan</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS (Interactive Status Filters for Mobile & Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          aria-pressed={statusFilter === 'all'}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            statusFilter === 'all'
              ? 'bg-white border-slate-400 ring-2 ring-slate-900/10 shadow-sm'
              : 'bg-white/80 hover:bg-white border-slate-200/90 opacity-75 hover:opacity-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Laporan</div>
            {statusFilter === 'all' && (
              <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{totalCount}</div>
          <div className="text-[10.5px] text-slate-500 mt-0.5">Seluruh tiket tercatat</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'dilaporkan' ? 'all' : 'dilaporkan'))}
          aria-pressed={statusFilter === 'dilaporkan'}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            statusFilter === 'dilaporkan'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/25 shadow-sm'
              : statusFilter === 'all'
              ? 'bg-rose-50/70 hover:bg-rose-50 border-rose-200 shadow-xs'
              : 'bg-rose-50/40 hover:bg-rose-50/80 border-rose-200/70 opacity-70 hover:opacity-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Menunggu Tindakan</div>
            {statusFilter === 'dilaporkan' && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-rose-700 tabular-nums">{reportedCount}</div>
          <div className="text-[10.5px] text-rose-600 mt-0.5 font-medium">Status Dilaporkan</div>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter((prev) => (prev === 'dalam_penanganan' ? 'all' : 'dalam_penanganan'))
          }
          aria-pressed={statusFilter === 'dalam_penanganan'}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            statusFilter === 'dalam_penanganan'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/25 shadow-sm'
              : statusFilter === 'all'
              ? 'bg-amber-50/70 hover:bg-amber-50 border-amber-200 shadow-xs'
              : 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-200/70 opacity-70 hover:opacity-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Sedang Ditangani</div>
            {statusFilter === 'dalam_penanganan' && (
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-amber-700 tabular-nums">{inProgressCount}</div>
          <div className="text-[10.5px] text-amber-600 mt-0.5 font-medium">Proses teknisi / part</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'selesai' ? 'all' : 'selesai'))}
          aria-pressed={statusFilter === 'selesai'}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
            statusFilter === 'selesai'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/25 shadow-sm'
              : statusFilter === 'all'
              ? 'bg-emerald-50/70 hover:bg-emerald-50 border-emerald-200 shadow-xs'
              : 'bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-200/70 opacity-70 hover:opacity-100 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Selesai Diperbaiki</div>
            {statusFilter === 'selesai' && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{resolvedCount}</div>
          <div className="text-[10.5px] text-emerald-600 mt-0.5 font-medium">Fasilitas normal kembali</div>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no. tiket, nama barang, lantai, atau pelapor..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
          />
        </div>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as any)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 shrink-0"
        >
          <option value="all">Semua Keparahan</option>
          <option value="kritis">Kritis</option>
          <option value="berat">Berat</option>
          <option value="sedang">Sedang</option>
          <option value="ringan">Ringan</option>
        </select>
      </div>

      {/* LIST OF DAMAGE REPORTS */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Wrench className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">Tidak Ada Laporan Kerusakan</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Tidak ditemukan catatan kerusakan fasilitas yang cocok dengan filter aktif saat ini.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSeverityFilter('all');
              setSelectedMonth('all');
              setSelectedYear('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Photo Before Header */}
                  <div className="relative h-40 bg-slate-100 overflow-hidden group">
                    <img
                      src={
                        report.photoBefore ||
                        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'
                      }
                      alt={report.itemName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-900/80 backdrop-blur-xs text-white">
                        {report.ticketNo}
                      </span>
                      {getSeverityBadge(report.damageLevel)}
                    </div>

                    <div className="absolute top-2.5 right-2.5">{getStatusBadge(report.status)}</div>

                    {report.status === 'selesai' && report.photoAfter && (
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-lg bg-emerald-600/90 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Foto Selesai Ada</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{report.itemName}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {report.locationName} · {report.floor}
                        </span>
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {report.chronology}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Pelapor</span>
                        <span className="font-medium text-slate-700 truncate block">{report.reporterName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tanggal Lapor</span>
                        <span className="font-medium text-slate-700 block">{report.reportDate}</span>
                      </div>
                    </div>

                    {report.status === 'selesai' && (
                      <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 text-xs text-emerald-800">
                        <div className="font-bold flex items-center gap-1 mb-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Telah Diperbaiki: {report.repairedDate || 'Hari ini'}</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 line-clamp-1">
                          Teknisi: {report.technicianName || 'Tim Maintenance'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Detail Lengkap</span>
                  </button>

                  {report.status !== 'selesai' && (
                    <button
                      type="button"
                      onClick={() => handleOpenResolve(report)}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Selesaikan</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: DETAIL LAPORAN */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-900 text-white">
                    {selectedReport.ticketNo}
                  </span>
                  {getSeverityBadge(selectedReport.damageLevel)}
                  {getStatusBadge(selectedReport.status)}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{selectedReport.itemName}</h3>
                <p className="text-xs text-slate-500">
                  {selectedReport.locationName} · {selectedReport.floor} ({selectedReport.zone || 'Semua Zona'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photos Side by Side if Resolved */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 mb-1.5 block flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-rose-500" />
                  Foto Kerusakan Awal
                </span>
                <div className="h-44 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
                  <img
                    src={
                      selectedReport.photoBefore ||
                      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'
                    }
                    alt="Kerusakan Awal"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 mb-1.5 block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Foto Hasil Perbaikan Selesai
                </span>
                <div className="h-44 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                  {selectedReport.photoAfter ? (
                    <img
                      src={selectedReport.photoAfter}
                      alt="Hasil Perbaikan"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400">
                      <Wrench className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">Belum ada foto perbaikan</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Kronologi Kerusakan:</span>
                <p className="text-slate-600 leading-relaxed">{selectedReport.chronology}</p>
              </div>

              {selectedReport.impact && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Dampak Terhadap Operasional:</span>
                  <p className="text-slate-600 leading-relaxed">{selectedReport.impact}</p>
                </div>
              )}

              {selectedReport.actionTaken && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Tindakan Pengamanan Awal:</span>
                  <p className="text-slate-600 leading-relaxed">{selectedReport.actionTaken}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Pelapor</span>
                  <span className="font-bold text-slate-800">{selectedReport.reporterName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Departemen Dituju</span>
                  <span className="font-bold text-slate-800">{selectedReport.targetDepartment}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Waktu Pelaporan</span>
                  <span className="font-bold text-slate-800">
                    {selectedReport.reportDate} · {selectedReport.reportTime}
                  </span>
                </div>
              </div>

              {selectedReport.status === 'selesai' && (
                <div className="pt-2 border-t border-emerald-200 text-emerald-900 bg-emerald-100/60 p-3 rounded-xl mt-2">
                  <div className="font-bold text-xs mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Rincian Tindakan Perbaikan Selesai</span>
                  </div>
                  <p className="text-xs mb-2">{selectedReport.technicianNotes || 'Perbaikan selesai dilaksanakan.'}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800">
                    <div>Teknisi: {selectedReport.technicianName || '-'}</div>
                    <div>Biaya Estimasi: Rp {(selectedReport.costEstimate || 0).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>

              {selectedReport.status !== 'selesai' && (
                <button
                  type="button"
                  onClick={() => {
                    handleOpenResolve(selectedReport);
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tandai Selesai Diperbaiki</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LAPOR KERUSAKAN BARU */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Laporkan Kerusakan Fasilitas</h3>
                  <p className="text-xs text-slate-500">Tiket diteruskan langsung ke tim maintenance & MEP</p>
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

            <form onSubmit={handleCreateReport} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Fasilitas / Barang Rusak *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kloset Bilik 2 Mampet, Hand Dryer Rusak, Pintu Kaca Retak"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Fasilitas</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="sanitair">Sanitair / Plumbing</option>
                    <option value="elektrikal">Elektrikal / Lampu</option>
                    <option value="mekanikal">Mekanikal / AC / Exhaust</option>
                    <option value="eskalator_lift">Eskalator & Lift</option>
                    <option value="furniture_interior">Furniture & Interior</option>
                    <option value="sipil_arsitektur">Sipil & Dinding</option>
                    <option value="alat_kerja">Alat Kerja Cleaning</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tingkat Keparahan</label>
                  <select
                    value={newDamageLevel}
                    onChange={(e) => setNewDamageLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="ringan">Ringan (Masih bisa fungsi)</option>
                    <option value="sedang">Sedang (Perlu perbaikan segera)</option>
                    <option value="berat">Berat (Tidak dapat digunakan)</option>
                    <option value="kritis">Kritis (Bahaya K3 / Meluap)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lokasi Ruangan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Toilet Pria Zona A, Lobby Barat"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lantai</label>
                  <select
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="Basement B2">Basement B2</option>
                    <option value="Basement B1">Basement B1</option>
                    <option value="Lantai GF">Lantai GF / Dasar</option>
                    <option value="Lantai 1">Lantai 1</option>
                    <option value="Lantai 2">Lantai 2</option>
                    <option value="Lantai 3">Lantai 3</option>
                    <option value="Lantai 5">Lantai 5</option>
                    <option value="Lantai 8">Lantai 8</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kronologi & Gejala Kerusakan</label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan detail apa yang rusak dan sejak kapan..."
                  value={newChronology}
                  onChange={(e) => setNewChronology(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Departemen Penanganan</label>
                  <select
                    value={newTargetDept}
                    onChange={(e) => setNewTargetDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="Building Maintenance (MEP)">Building Maintenance (MEP)</option>
                    <option value="General Affair & Pengadaan">General Affair & Pengadaan</option>
                    <option value="Vendor Spesialis / Teknisi Luar">Vendor Spesialis / Teknisi Luar</option>
                    <option value="Pengelola Gedung Tenant">Pengelola Gedung Tenant</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prioritas</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="low">Rendah (Sesuai Roster)</option>
                    <option value="medium">Sedang (Hari Ini)</option>
                    <option value="high">Tinggi (Maks. 2 Jam)</option>
                    <option value="urgent">Mendesak (Segera Tangani)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">
                    Foto Bukti Kerusakan <span className="text-rose-600">* (Wajib)</span>
                  </label>
                  <span className="text-[10.5px] text-slate-500">
                    Otomatis Timestamp & User: <strong className="text-slate-700">{currentUser?.name || 'User Login'}</strong>
                  </span>
                </div>

                {/* Hidden File Inputs for Camera & Gallery/File */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleBeforePhotoFileChange}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBeforePhotoFileChange}
                  className="hidden"
                />

                {!newPhotoBefore ? (
                  <div
                    className={`p-3.5 rounded-2xl border-2 border-dashed transition-colors ${
                      photoError
                        ? 'border-rose-300 bg-rose-50/50'
                        : 'border-slate-200 bg-slate-50/70 hover:border-rose-300'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={isProcessingPhoto}
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        <Camera className="w-5 h-5" />
                        <span className="text-xs">Ambil dari Kamera</span>
                        <span className="text-[10px] text-rose-100 font-normal">Kamera Langsung</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingPhoto}
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        <Upload className="w-5 h-5 text-rose-600" />
                        <span className="text-xs">Upload Galeri / File</span>
                        <span className="text-[10px] text-slate-400 font-normal">Pilih dari Ponsel</span>
                      </button>
                    </div>
                    <p className="text-[10.5px] text-slate-500 text-center mt-2">
                      {isProcessingPhoto
                        ? 'Memproses foto & menyematkan timestamp...'
                        : 'Setiap foto otomatis disematkan waktu (timestamp) & nama user login.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 h-48">
                      <img
                        src={newPhotoBefore}
                        alt="Preview Bukti Kerusakan"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewPhotoBefore('');
                          setNewPhotoMeta(null);
                        }}
                        className="absolute top-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-600 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus / Ganti</span>
                      </button>
                    </div>

                    {newPhotoMeta && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{newPhotoMeta.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-1 font-semibold">
                          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{newPhotoMeta.userName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {photoError && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{photoError}</span>
                  </p>
                )}
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Kirim Laporan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SELESAIKAN KERUSAKAN */}
      {showResolveModal && resolvingReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Penyelesaian Kerusakan</h3>
                <p className="text-xs text-slate-500">
                  Tiket {resolvingReport.ticketNo} · {resolvingReport.itemName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Teknisi / Tim yang Menangani *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Wahyu Hidayat (Plumber MEP)"
                  value={resolutionTechnician}
                  onChange={(e) => setResolutionTechnician(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Tindakan Perbaikan</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Penggantian valve karet bocor, pembersihan leher angsa porselen, uji debit air lancar normal..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Biaya Perbaikan / Part (Rp)</label>
                  <input
                    type="number"
                    value={resolutionCost}
                    onChange={(e) => setResolutionCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Foto Bukti Selesai</label>
                  <input
                    ref={resolveCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleAfterPhotoFileChange}
                    className="hidden"
                  />
                  <input
                    ref={resolveGalleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAfterPhotoFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => resolveCameraInputRef.current?.click()}
                      className="flex-1 py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-[11px] cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5 shrink-0" />
                      <span>Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveGalleryInputRef.current?.click()}
                      className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-[11px] cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      <span>Galeri</span>
                    </button>
                  </div>
                  {resolutionPhotoMeta && (
                    <p className="text-[10px] text-emerald-700 font-medium mt-1 truncate">
                      ✓ {resolutionPhotoMeta.timestamp} • {resolutionPhotoMeta.userName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Selesaikan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
