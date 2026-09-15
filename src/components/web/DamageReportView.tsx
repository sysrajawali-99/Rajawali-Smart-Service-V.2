import React, { useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  FileDown,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  AlertCircle,
  Eye,
  Edit3,
  Trash2,
  Check,
  X,
  Upload,
  Camera,
  Layers,
  ArrowUpDown,
  Tag,
  Phone,
  User,
  DollarSign,
  FileText,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import {
  FacilityDamageReport,
  DamageCategory,
  DamageSeverity,
  DamageReportStatus,
} from '../../types';
import {
  exportDamageSummaryToPDF,
  exportDamageWorkOrderToPDF,
} from '../../utils/damagePdfExport';

export const DamageReportView: React.FC = () => {
  const {
    damageReports,
    addDamageReport,
    updateDamageReport,
    deleteDamageReport,
    resolveDamageReport,
    areas,
    cleaners,
    activeProject,
    currentUser,
  } = useCleaning();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<FacilityDamageReport | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // New Report Form State
  const [newReport, setNewReport] = useState<{
    itemName: string;
    category: DamageCategory;
    areaId: string;
    locationName: string;
    floor: string;
    zone: string;
    damageLevel: DamageSeverity;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    chronology: string;
    impact: string;
    actionTaken: string;
    targetDepartment: string;
    reporterName: string;
    reporterRole: string;
    reporterPhone: string;
    costEstimate: string;
    photoBefore: string;
  }>({
    itemName: '',
    category: 'sanitair',
    areaId: areas[0]?.id || '',
    locationName: areas[0]?.name || 'Toilet Zona A Pria',
    floor: areas[0]?.floor || 'Lantai GF',
    zone: areas[0]?.zone || 'Zona A Sanitair',
    damageLevel: 'sedang',
    priority: 'medium',
    chronology: '',
    impact: '',
    actionTaken: '',
    targetDepartment: 'Building Management & Engineering (MEP)',
    reporterName: currentUser?.name || 'Asep Supriyadi',
    reporterRole: 'Petugas Kebersihan',
    reporterPhone: '0812-3456-7890',
    costEstimate: '',
    photoBefore: '',
  });

  // Resolve / Update Form State
  const [resolveForm, setResolveForm] = useState<{
    status: DamageReportStatus;
    technicianName: string;
    technicianNotes: string;
    photoAfter: string;
    costEstimate: string;
  }>({
    status: 'selesai',
    technicianName: '',
    technicianNotes: '',
    photoAfter: '',
    costEstimate: '',
  });

  // Unique floors for filter dropdown
  const availableFloors = Array.from(
    new Set(damageReports.map((r) => r.floor).filter(Boolean))
  );

  // Filtered Damage Reports
  const filteredReports = damageReports.filter((report) => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        report.ticketNo.toLowerCase().includes(term) ||
        report.itemName.toLowerCase().includes(term) ||
        report.locationName.toLowerCase().includes(term) ||
        report.floor.toLowerCase().includes(term) ||
        report.reporterName.toLowerCase().includes(term) ||
        (report.technicianName && report.technicianName.toLowerCase().includes(term)) ||
        (report.targetDepartment && report.targetDepartment.toLowerCase().includes(term));

      if (!matchSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && report.status !== statusFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && report.category !== categoryFilter) {
      return false;
    }

    // Severity filter
    if (severityFilter !== 'all' && report.damageLevel !== severityFilter) {
      return false;
    }

    // Floor filter
    if (floorFilter !== 'all' && report.floor !== floorFilter) {
      return false;
    }

    return true;
  });

  // KPIs
  const totalReports = damageReports.length;
  const inProgressReports = damageReports.filter(
    (r) => r.status === 'dalam_penanganan' || r.status === 'menunggu_sparepart'
  ).length;
  const criticalReports = damageReports.filter(
    (r) => r.damageLevel === 'kritis' || r.priority === 'urgent'
  ).length;
  const completedReports = damageReports.filter((r) => r.status === 'selesai').length;
  const totalCost = damageReports.reduce((acc, curr) => acc + (curr.costEstimate || 0), 0);

  // Preset suggestions for fast reporting
  const commonDamages = [
    { name: 'Kran Wastafel Sensor Bocor / Rusak', cat: 'sanitair', level: 'sedang' as DamageSeverity },
    { name: 'Kloset Mampet / Flush Valve Macet', cat: 'sanitair', level: 'berat' as DamageSeverity },
    { name: 'Handrail Karet Eskalator Sobek', cat: 'eskalator_lift', level: 'berat' as DamageSeverity },
    { name: 'Tombol COP / Indikator Lantai Lift Macet', cat: 'eskalator_lift', level: 'berat' as DamageSeverity },
    { name: 'Pintu Kaca Otomatis Sensor Macet / Anjlok', cat: 'sipil_arsitektur', level: 'sedang' as DamageSeverity },
    { name: 'Lampu LED Downlight Koridor Mati / Flickering', cat: 'elektrikal', level: 'ringan' as DamageSeverity },
    { name: 'Exhaust Fan Toilet Mati & Suara Bising', cat: 'mekanikal', level: 'sedang' as DamageSeverity },
    { name: 'Hand Dryer Otomatis Tidak Menyala', cat: 'elektrikal', level: 'ringan' as DamageSeverity },
    { name: 'Keramik Lantai Retak / Trap Tangga Goyang', cat: 'sipil_arsitektur', level: 'kritis' as DamageSeverity },
    { name: 'Mesin Polisher / Vacuum Cleaner Korslet', cat: 'alat_kerja', level: 'sedang' as DamageSeverity },
  ];

  // Handle Area Selection in Add Form
  const handleAreaSelect = (areaId: string) => {
    const selected = areas.find((a) => a.id === areaId);
    if (selected) {
      setNewReport((prev) => ({
        ...prev,
        areaId: selected.id,
        locationName: selected.name,
        floor: selected.floor,
        zone: selected.zone || '',
      }));
    }
  };

  // Submit New Damage Report
  const handleSubmitNewReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.itemName.trim()) {
      alert('Mohon isi nama barang atau fasilitas yang rusak!');
      return;
    }

    addDamageReport({
      itemName: newReport.itemName,
      category: newReport.category,
      areaId: newReport.areaId,
      locationName: newReport.locationName,
      floor: newReport.floor,
      zone: newReport.zone,
      damageLevel: newReport.damageLevel,
      priority: newReport.priority,
      chronology: newReport.chronology || 'Ditemukan kerusakan saat inspeksi dan pengerjaan kebersihan rutin oleh petugas.',
      impact: newReport.impact || 'Perlu perbaikan segera agar tidak mengganggu operasional gedung.',
      actionTaken: newReport.actionTaken || 'Telah dipasang penanda pengaman di sekitar lokasi.',
      targetDepartment: newReport.targetDepartment,
      reporterName: newReport.reporterName,
      reporterRole: newReport.reporterRole,
      reporterPhone: newReport.reporterPhone,
      costEstimate: newReport.costEstimate ? parseInt(newReport.costEstimate, 10) : undefined,
      photoBefore:
        newReport.photoBefore ||
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
      reportDate: new Date().toISOString().split('T')[0],
      status: 'dilaporkan',
    });

    setShowAddModal(false);
    // Reset form
    setNewReport({
      itemName: '',
      category: 'sanitair',
      areaId: areas[0]?.id || '',
      locationName: areas[0]?.name || 'Toilet Zona A Pria',
      floor: areas[0]?.floor || 'Lantai GF',
      zone: areas[0]?.zone || 'Zona A Sanitair',
      damageLevel: 'sedang',
      priority: 'medium',
      chronology: '',
      impact: '',
      actionTaken: '',
      targetDepartment: 'Building Management & Engineering (MEP)',
      reporterName: currentUser?.name || 'Asep Supriyadi',
      reporterRole: 'Petugas Kebersihan',
      reporterPhone: '0812-3456-7890',
      costEstimate: '',
      photoBefore: '',
    });
  };

  // Open Resolve / Status Modal
  const handleOpenResolveModal = (report: FacilityDamageReport) => {
    setSelectedReport(report);
    setResolveForm({
      status: report.status === 'selesai' ? 'selesai' : 'dalam_penanganan',
      technicianName: report.technicianName || '',
      technicianNotes: report.technicianNotes || '',
      photoAfter: report.photoAfter || '',
      costEstimate: report.costEstimate ? String(report.costEstimate) : '',
    });
    setShowResolveModal(true);
  };

  // Submit Resolve / Status Update
  const handleSubmitResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    if (resolveForm.status === 'selesai') {
      resolveDamageReport(selectedReport.id, {
        technicianNotes: resolveForm.technicianNotes || 'Perbaikan telah selesai dilaksanakan dan fasilitas sudah berfungsi normal.',
        technicianName: resolveForm.technicianName || 'Tim Maintenance / Engineering',
        photoAfter:
          resolveForm.photoAfter ||
          'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
        costEstimate: resolveForm.costEstimate ? parseInt(resolveForm.costEstimate, 10) : selectedReport.costEstimate,
      });
    } else {
      updateDamageReport(selectedReport.id, {
        status: resolveForm.status,
        technicianName: resolveForm.technicianName,
        technicianNotes: resolveForm.technicianNotes,
        costEstimate: resolveForm.costEstimate ? parseInt(resolveForm.costEstimate, 10) : selectedReport.costEstimate,
      });
    }

    setShowResolveModal(false);
    setSelectedReport(null);
  };

  // Export Summary PDF
  const handleExportSummaryPDF = () => {
    setIsExportingPDF(true);
    try {
      exportDamageSummaryToPDF({
        reports: filteredReports,
        project: activeProject,
        filterPeriod: `${new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`,
        filterStatus: statusFilter !== 'all' ? statusFilter : undefined,
        filterCategory: categoryFilter !== 'all' ? categoryFilter : undefined,
        filterFloor: floorFilter !== 'all' ? floorFilter : undefined,
      });
    } catch (err) {
      console.error('Error generating summary PDF:', err);
      alert('Gagal mengekspor PDF rekapitulasi. Pastikan data laporan valid.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Export Single Work Order PDF
  const handleExportSinglePDF = async (report: FacilityDamageReport) => {
    setIsExportingPDF(true);
    try {
      await exportDamageWorkOrderToPDF({
        report,
        project: activeProject,
      });
    } catch (err) {
      console.error('Error generating work order PDF:', err);
      alert('Gagal mengekspor Berita Acara PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Photo upload helper using FileReader
  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'before' | 'after'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (type === 'before') {
        setNewReport((prev) => ({ ...prev, photoBefore: dataUrl }));
      } else {
        setResolveForm((prev) => ({ ...prev, photoAfter: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Badge helpers
  const getStatusBadge = (status: DamageReportStatus) => {
    switch (status) {
      case 'selesai':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Selesai Diperbaiki
          </span>
        );
      case 'dalam_penanganan':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Dalam Penanganan
          </span>
        );
      case 'menunggu_sparepart':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            Menunggu Sparepart
          </span>
        );
      case 'dilaporkan':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Baru Dilaporkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getSeverityBadge = (level: DamageSeverity) => {
    switch (level) {
      case 'kritis':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            KRITIS
          </span>
        );
      case 'berat':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            BERAT
          </span>
        );
      case 'sedang':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
            SEDANG
          </span>
        );
      case 'ringan':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
            RINGAN
          </span>
        );
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'sanitair':
        return 'Sanitair & Plumbing';
      case 'elektrikal':
        return 'Elektrikal';
      case 'mekanikal':
        return 'Mekanikal & AC';
      case 'sipil_arsitektur':
        return 'Sipil & Kaca';
      case 'furniture_interior':
        return 'Furniture';
      case 'eskalator_lift':
        return 'Eskalator & Lift';
      case 'alat_kerja':
        return 'Alat Cleaning';
      default:
        return 'Fasilitas Lainnya';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Laporan Kerusakan Barang / Fasilitas
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Pencatatan Berita Acara, koordinasi perbaikan dengan Engineering, dan ekspor dokumen PDF resmi.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              {activeProject.name}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">
              {activeProject.managerName} (Facility Manager)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportSummaryPDF}
            disabled={isExportingPDF || filteredReports.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs disabled:opacity-50"
            title="Download PDF Rekapitulasi Laporan Kerusakan"
          >
            <FileDown className="w-4 h-4 text-rose-600" />
            <span>{isExportingPDF ? 'Membuat PDF...' : 'Ekspor PDF Rekap'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Laporan Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
            Total Laporan
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{totalReports}</span>
            <span className="text-xs text-slate-400">Tiket</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Seluruh periode proyek</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-rose-200 bg-rose-50/20 shadow-2xs">
          <div className="text-rose-700 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Kritis / Urgent
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600">{criticalReports}</span>
            <span className="text-xs text-rose-500 font-medium">Prioritas</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-medium">Butuh tindakan segera</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="text-amber-700 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Dalam Proses
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700">{inProgressReports}</span>
            <span className="text-xs text-amber-600 font-medium">Kasus</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-600 font-medium">Tim MEP / Teknisi</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Terselesaikan
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700">{completedReports}</span>
            <span className="text-xs text-emerald-600 font-medium">
              {totalReports > 0 ? `${Math.round((completedReports / totalReports) * 100)}%` : '0%'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">Berfungsi normal</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white rounded-xl p-4 border border-indigo-200 bg-indigo-50/20 shadow-2xs">
          <div className="text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            Estimasi Biaya
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-indigo-900 truncate">
              Rp {totalCost.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-indigo-600 font-medium">Total usulan sparepart</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari no. tiket, nama barang, lantai, pelapor, teknisi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="sanitair">Sanitair & Plumbing</option>
              <option value="eskalator_lift">Eskalator & Lift</option>
              <option value="elektrikal">Elektrikal</option>
              <option value="sipil_arsitektur">Sipil & Kaca</option>
              <option value="mekanikal">Mekanikal</option>
              <option value="alat_kerja">Alat Cleaning</option>
            </select>

            {/* Severity Dropdown */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Tingkat Kerusakan</option>
              <option value="kritis">Kritis</option>
              <option value="berat">Berat</option>
              <option value="sedang">Sedang</option>
              <option value="ringan">Ringan</option>
            </select>

            {/* Floor Dropdown */}
            {availableFloors.length > 0 && (
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Semua Lantai</option>
                {availableFloors.map((fl) => (
                  <option key={fl} value={fl}>
                    {fl}
                  </option>
                ))}
              </select>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Kartu
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tabel
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {[
            { id: 'all', label: 'Semua Laporan', count: damageReports.length },
            {
              id: 'dilaporkan',
              label: 'Baru Dilaporkan',
              count: damageReports.filter((r) => r.status === 'dilaporkan').length,
            },
            {
              id: 'dalam_penanganan',
              label: 'Dalam Penanganan',
              count: damageReports.filter((r) => r.status === 'dalam_penanganan').length,
            },
            {
              id: 'menunggu_sparepart',
              label: 'Menunggu Sparepart',
              count: damageReports.filter((r) => r.status === 'menunggu_sparepart').length,
            },
            {
              id: 'selesai',
              label: 'Selesai',
              count: damageReports.filter((r) => r.status === 'selesai').length,
            },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area: Cards or Table */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Wrench className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            Tidak ada laporan kerusakan yang cocok
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Coba ubah kata kunci pencarian atau bersihkan filter status dan kategori untuk melihat laporan lainnya.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setCategoryFilter('all');
              setSeverityFilter('all');
              setFloorFilter('all');
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Grid of Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {report.ticketNo}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      {report.reportDate} • {report.reportTime || ''}
                    </span>
                  </div>
                  {getSeverityBadge(report.damageLevel)}
                </div>

                {/* Item Name */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                    {report.itemName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700">{report.locationName}</span>
                    <span className="text-slate-400">({report.floor})</span>
                  </div>
                </div>

                {/* Photo Thumbnail if available */}
                {report.photoBefore && (
                  <div className="relative rounded-lg overflow-hidden h-36 bg-slate-100 border border-slate-200">
                    <img
                      src={report.photoBefore}
                      alt={report.itemName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-bold bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded">
                        Foto Temuan Awal
                      </span>
                    </div>
                    {report.photoAfter && (
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] font-bold bg-emerald-700/90 backdrop-blur-xs text-white px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ada Foto After
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Chronology & Impact Snippet */}
                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="line-clamp-2 text-slate-700 font-normal">
                    <span className="font-semibold text-slate-800">Kronologi: </span>
                    {report.chronology}
                  </div>
                  {report.actionTaken && (
                    <div className="line-clamp-1 text-slate-600">
                      <span className="font-semibold text-slate-700">Tindakan Awal: </span>
                      {report.actionTaken}
                    </div>
                  )}
                </div>

                {/* Status & Category metadata */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div>{getStatusBadge(report.status)}</div>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {getCategoryLabel(report.category)}
                  </span>
                </div>

                {/* Reporter & Technician Info */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 truncate">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Pelapor: </span>
                    <span className="font-medium text-slate-700">{report.reporterName}</span>
                  </div>
                  {report.costEstimate && (
                    <span className="font-bold text-slate-800">
                      Rp {report.costEstimate.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setShowDetailModal(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-white rounded-md transition-colors border border-transparent hover:border-slate-200"
                    title="Lihat Detail Lengkap"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleExportSinglePDF(report)}
                    disabled={isExportingPDF}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                    title="Cetak Berita Acara Kerusakan (PDF)"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>PDF Berita Acara</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenResolveModal(report)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                    title="Update Status / Selesaikan"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Update</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Hapus laporan kerusakan ${report.ticketNo}?`)) {
                        deleteDamageReport(report.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Hapus Laporan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3">No. Tiket</th>
                  <th className="py-3 px-3">Nama Barang / Fasilitas</th>
                  <th className="py-3 px-3">Lokasi & Lantai</th>
                  <th className="py-3 px-3">Tingkat</th>
                  <th className="py-3 px-3">Tgl Lapor</th>
                  <th className="py-3 px-3">Pelapor</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Estimasi Biaya</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReports.map((report, idx) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {report.ticketNo}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 max-w-[220px]">
                      <div className="truncate font-bold">{report.itemName}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {getCategoryLabel(report.category)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <div className="font-semibold">{report.locationName}</div>
                      <div className="text-[11px] text-slate-400">{report.floor}</div>
                    </td>
                    <td className="py-3 px-3">{getSeverityBadge(report.damageLevel)}</td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {report.reportDate}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{report.reporterName}</td>
                    <td className="py-3 px-3">{getStatusBadge(report.status)}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {report.costEstimate ? `Rp ${report.costEstimate.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => handleExportSinglePDF(report)}
                        disabled={isExportingPDF}
                        className="p-1.5 text-rose-700 hover:bg-rose-50 rounded border border-rose-200"
                        title="Download PDF Berita Acara"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowDetailModal(true);
                        }}
                        className="p-1.5 text-blue-700 hover:bg-blue-50 rounded border border-blue-200"
                        title="Lihat Detail"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenResolveModal(report)}
                        className="p-1.5 text-amber-700 hover:bg-amber-50 rounded border border-amber-200"
                        title="Update Penanganan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus laporan ${report.ticketNo}?`)) {
                            deleteDamageReport(report.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BUAT LAPORAN KERUSAKAN BARU */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Buat Laporan Kerusakan Barang / Fasilitas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Catat kerusakan fisik gedung untuk ditindaklanjuti oleh Engineering / Maintenance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewReport} className="p-6 space-y-4">
              {/* Preset Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pilihan Cepat Jenis Kerusakan Populer:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {commonDamages.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setNewReport((prev) => ({
                          ...prev,
                          itemName: preset.name,
                          category: preset.cat as DamageCategory,
                          damageLevel: preset.level,
                        }))
                      }
                      className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-full font-medium transition-colors"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nama Barang & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Barang / Fasilitas Rusak <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kran Wastafel Sensor Otomatis"
                    value={newReport.itemName}
                    onChange={(e) => setNewReport({ ...newReport, itemName: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Fasilitas
                  </label>
                  <select
                    value={newReport.category}
                    onChange={(e) =>
                      setNewReport({ ...newReport, category: e.target.value as DamageCategory })
                    }
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="sanitair">Sanitair & Plumbing (Wastafel, Kloset, Pipa)</option>
                    <option value="eskalator_lift">Eskalator & Lift (Vertical Transport)</option>
                    <option value="elektrikal">Elektrikal & Penerangan (Lampu, Saklar)</option>
                    <option value="sipil_arsitektur">Sipil & Arsitektur (Kaca, Pintu, Lantai)</option>
                    <option value="mekanikal">Mekanikal & Tata Udara (AC, Exhaust)</option>
                    <option value="furniture_interior">Furniture & Interior Gedung</option>
                    <option value="alat_kerja">Peralatan / Mesin Cleaning Service</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Area, Lantai & Zona */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Area Kerja Terdaftar
                  </label>
                  <select
                    value={newReport.areaId}
                    onChange={(e) => handleAreaSelect(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.floor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi / Ruangan Spesifik
                  </label>
                  <input
                    type="text"
                    value={newReport.locationName}
                    onChange={(e) => setNewReport({ ...newReport, locationName: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lantai Gedung
                  </label>
                  <input
                    type="text"
                    value={newReport.floor}
                    onChange={(e) => setNewReport({ ...newReport, floor: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Tingkat Kerusakan, Prioritas & Dept Tujuan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kerusakan
                  </label>
                  <select
                    value={newReport.damageLevel}
                    onChange={(e) =>
                      setNewReport({ ...newReport, damageLevel: e.target.value as DamageSeverity })
                    }
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="ringan">Ringan (Estetika / Minor)</option>
                    <option value="sedang">Sedang (Fungsi Terganggu)</option>
                    <option value="berat">Berat (Mogok / Tidak Berfungsi)</option>
                    <option value="kritis">Kritis (Bahaya Keselamatan Langsung)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Level Prioritas
                  </label>
                  <select
                    value={newReport.priority}
                    onChange={(e) =>
                      setNewReport({
                        ...newReport,
                        priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                      })
                    }
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="low">Rendah (Low)</option>
                    <option value="medium">Menengah (Medium)</option>
                    <option value="high">Tinggi (High)</option>
                    <option value="urgent">Urgent / Darurat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tujuan Disposisi Dept.
                  </label>
                  <select
                    value={newReport.targetDepartment}
                    onChange={(e) => setNewReport({ ...newReport, targetDepartment: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Building Management & Engineering (MEP)">
                      Engineering / MEP Gedung
                    </option>
                    <option value="Vendor Resmi Eskalator / Lift">Vendor Eskalator & Lift</option>
                    <option value="Tim Perbaikan Sipil & Kaca">Sipil / Kaca & Aluminium</option>
                    <option value="General Affair & Pengadaan">GA / Logistik & Pengadaan</option>
                  </select>
                </div>
              </div>

              {/* Kronologi Kerusakan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kronologi & Gejala Kerusakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jelaskan detail kondisi kerusakan fisik, letak patahan/kebocoran, dan dugaan penyebab..."
                  value={newReport.chronology}
                  onChange={(e) => setNewReport({ ...newReport, chronology: e.target.value })}
                  className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Dampak & Tindakan Awal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dampak Operasional Gedung
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Air menggenang ke lantai dan membahayakan pejalan kaki"
                    value={newReport.impact}
                    onChange={(e) => setNewReport({ ...newReport, impact: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tindakan Awal Petugas Cleaning
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pasang safety cone 'Wet Floor' dan tutup stop kran"
                    value={newReport.actionTaken}
                    onChange={(e) => setNewReport({ ...newReport, actionTaken: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pelapor & Estimasi Biaya */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Petugas Pelapor
                  </label>
                  <input
                    type="text"
                    value={newReport.reporterName}
                    onChange={(e) => setNewReport({ ...newReport, reporterName: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / Kontak
                  </label>
                  <input
                    type="text"
                    value={newReport.reporterPhone}
                    onChange={(e) => setNewReport({ ...newReport, reporterPhone: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Biaya Sparepart (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 450000"
                    value={newReport.costEstimate}
                    onChange={(e) => setNewReport({ ...newReport, costEstimate: e.target.value })}
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Upload Foto Bukti Kerusakan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Bukti Kerusakan Fisik
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>Upload Foto dari Galeri / Kamera</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, 'before')}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setNewReport((prev) => ({
                        ...prev,
                        photoBefore:
                          'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
                      }))
                    }
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Pakai Sampel Foto
                  </button>
                </div>

                {newReport.photoBefore && (
                  <div className="mt-2 relative w-32 h-24 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={newReport.photoBefore}
                      alt="Bukti Kerusakan"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setNewReport((prev) => ({ ...prev, photoBefore: '' }))}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors"
                >
                  Simpan Laporan & Cetak Tiket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UPDATE STATUS & SELESAIKAN PERBAIKAN */}
      {/* ========================================================================= */}
      {showResolveModal && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Update Penanganan & Perbaikan
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Tiket: {selectedReport.ticketNo} • {selectedReport.itemName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResolveModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitResolve} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Penanganan Terkini
                </label>
                <select
                  value={resolveForm.status}
                  onChange={(e) =>
                    setResolveForm({ ...resolveForm, status: e.target.value as DamageReportStatus })
                  }
                  className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
                >
                  <option value="dilaporkan">Baru Dilaporkan (Menunggu Tim)</option>
                  <option value="dalam_penanganan">Dalam Proses Penanganan / Inspeksi MEP</option>
                  <option value="menunggu_sparepart">Menunggu Pengadaan Sparepart / Vendor</option>
                  <option value="selesai">✅ Selesai Diperbaiki & Berfungsi Normal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Teknisi / PIC Pelaksana
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bambang Irawan (Engineering MEP)"
                  value={resolveForm.technicianName}
                  onChange={(e) =>
                    setResolveForm({ ...resolveForm, technicianName: e.target.value })
                  }
                  className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tindakan Perbaikan
                </label>
                <textarea
                  rows={2}
                  placeholder="Rincian tindakan teknis, penggantian sparepart baru, atau kalibrasi yang dilakukan..."
                  value={resolveForm.technicianNotes}
                  onChange={(e) =>
                    setResolveForm({ ...resolveForm, technicianNotes: e.target.value })
                  }
                  className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biaya Akhir / Realisasi Sparepart (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 450000"
                  value={resolveForm.costEstimate}
                  onChange={(e) =>
                    setResolveForm({ ...resolveForm, costEstimate: e.target.value })
                  }
                  className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Foto Bukti Selesai */}
              {resolveForm.status === 'selesai' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Foto Bukti Selesai Diperbaiki (After)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>Upload Foto Hasil</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, 'after')}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setResolveForm((prev) => ({
                          ...prev,
                          photoAfter:
                            'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
                        }))
                      }
                      className="text-xs text-emerald-700 hover:text-emerald-800 underline"
                    >
                      Pakai Sampel Foto Selesai
                    </button>
                  </div>

                  {resolveForm.photoAfter && (
                    <div className="mt-2 relative w-28 h-20 rounded-lg overflow-hidden border border-emerald-300">
                      <img
                        src={resolveForm.photoAfter}
                        alt="Hasil Perbaikan"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DETAIL LENGKAP & PREVIEW DOKUMEN */}
      {/* ========================================================================= */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {selectedReport.ticketNo}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedReport.itemName}
                  </h3>
                  <div className="text-xs text-slate-500">
                    {selectedReport.locationName} • {selectedReport.floor}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status and Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedReport.status)}
                  {getSeverityBadge(selectedReport.damageLevel)}
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  Kategori: {getCategoryLabel(selectedReport.category)}
                </div>
              </div>

              {/* Photos comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/20">
                  <div className="bg-rose-600 text-white text-xs font-bold py-1.5 px-3 flex items-center justify-between">
                    <span>Foto Bukti Kerusakan (Before)</span>
                    <span className="text-[10px] font-normal">{selectedReport.reportDate}</span>
                  </div>
                  <div className="h-44 bg-slate-100 flex items-center justify-center">
                    {selectedReport.photoBefore ? (
                      <img
                        src={selectedReport.photoBefore}
                        alt="Foto Sebelum"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Tidak ada lampiran foto</span>
                    )}
                  </div>
                </div>

                <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/20">
                  <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 flex items-center justify-between">
                    <span>Foto Hasil Perbaikan (After)</span>
                    <span className="text-[10px] font-normal">
                      {selectedReport.repairedDate || 'Dalam Proses'}
                    </span>
                  </div>
                  <div className="h-44 bg-slate-100 flex items-center justify-center">
                    {selectedReport.photoAfter ? (
                      <img
                        src={selectedReport.photoAfter}
                        alt="Foto Sesudah"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center p-3">
                        <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <span className="text-xs text-slate-500">
                          {selectedReport.status === 'selesai'
                            ? 'Selesai tanpa lampiran foto'
                            : 'Belum selesai diperbaiki'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs divide-y divide-slate-200">
                <div className="grid grid-cols-3 p-3 bg-white">
                  <span className="font-semibold text-slate-500">Kronologi Kerusakan</span>
                  <span className="col-span-2 text-slate-800 font-medium">{selectedReport.chronology}</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-slate-50">
                  <span className="font-semibold text-slate-500">Dampak Operasional</span>
                  <span className="col-span-2 text-slate-800">{selectedReport.impact || '-'}</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-white">
                  <span className="font-semibold text-slate-500">Tindakan Awal Petugas</span>
                  <span className="col-span-2 text-slate-800">{selectedReport.actionTaken || '-'}</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-slate-50">
                  <span className="font-semibold text-slate-500">Departemen Tujuan</span>
                  <span className="col-span-2 text-slate-800 font-semibold">{selectedReport.targetDepartment}</span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-white">
                  <span className="font-semibold text-slate-500">Pelapor / Kontak</span>
                  <span className="col-span-2 text-slate-800">
                    {selectedReport.reporterName} ({selectedReport.reporterPhone || '-'})
                  </span>
                </div>
                <div className="grid grid-cols-3 p-3 bg-slate-50">
                  <span className="font-semibold text-slate-500">Teknisi Penanggung Jawab</span>
                  <span className="col-span-2 text-slate-800 font-semibold">
                    {selectedReport.technicianName || 'Belum ditugaskan'}
                  </span>
                </div>
                {selectedReport.technicianNotes && (
                  <div className="grid grid-cols-3 p-3 bg-white">
                    <span className="font-semibold text-slate-500">Catatan Perbaikan</span>
                    <span className="col-span-2 text-slate-800">{selectedReport.technicianNotes}</span>
                  </div>
                )}
                {selectedReport.costEstimate && (
                  <div className="grid grid-cols-3 p-3 bg-emerald-50/50">
                    <span className="font-semibold text-emerald-800">Realisasi / Estimasi Biaya</span>
                    <span className="col-span-2 font-bold text-emerald-900 text-sm">
                      Rp {selectedReport.costEstimate.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleExportSinglePDF(selectedReport)}
                  disabled={isExportingPDF}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download Berita Acara PDF</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleOpenResolveModal(selectedReport);
                    }}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  >
                    Update Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
