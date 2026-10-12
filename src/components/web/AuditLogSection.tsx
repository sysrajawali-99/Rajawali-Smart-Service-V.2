import React, { useState, useMemo } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  User,
  Calendar,
  Layers,
  Download,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  FileSpreadsheet,
  Building2,
  Tag,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { AuditActionType, AuditLogEntry } from '../../types';

export const AuditLogSection: React.FC = () => {
  const {
    auditLogs,
    userRole,
    clearAuditLogs,
    reloadSystemData,
    isReloading,
    projects,
  } = useCleaning();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<AuditActionType | 'ALL'>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedLogDetail, setSelectedLogDetail] = useState<AuditLogEntry | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Extract distinct modules for filter dropdown
  const distinctModules = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((l) => {
      if (l.module) set.add(l.module);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Filter logs based on search, action, module, and project
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
      if (selectedModule !== 'ALL' && log.module !== selectedModule) return false;
      if (selectedProjectId !== 'ALL' && log.projectId !== selectedProjectId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUser = (log.userName || '').toLowerCase().includes(q);
        const matchRole = (log.userRole || '').toLowerCase().includes(q);
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        const matchModule = (log.module || '').toLowerCase().includes(q);
        const matchEntity = (log.entityName || '').toLowerCase().includes(q);
        const matchProject = (log.projectName || '').toLowerCase().includes(q);
        if (!matchUser && !matchRole && !matchDetails && !matchModule && !matchEntity && !matchProject) {
          return false;
        }
      }
      return true;
    });
  }, [auditLogs, selectedAction, selectedModule, selectedProjectId, searchQuery]);

  // Pagination calculation
  const totalPages = rowsPerPage === -1 ? 1 : Math.ceil(filteredLogs.length / rowsPerPage);
  const paginatedLogs = useMemo(() => {
    if (rowsPerPage === -1) return filteredLogs;
    const start = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, currentPage, rowsPerPage]);

  // Statistics calculation
  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let todayCount = 0;
    let approvalCount = 0;
    let criticalCount = 0;

    auditLogs.forEach((log) => {
      if (log.timestamp.includes(todayStr) || log.timestamp.includes('Hari ini')) {
        todayCount++;
      }
      if (log.action === 'verify_approve' || log.action === 'verify_reject') {
        approvalCount++;
      }
      if (log.action === 'delete' || log.action === 'bulk_delete') {
        criticalCount++;
      }
    });

    return {
      total: auditLogs.length,
      today: todayCount,
      approval: approvalCount,
      critical: criticalCount,
    };
  }, [auditLogs]);

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'verify_approve':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Approval Disetujui',
          icon: CheckCircle2,
        };
      case 'verify_reject':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Approval Ditolak',
          icon: XCircle,
        };
      case 'update':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Perbarui Data',
          icon: RefreshCw,
        };
      case 'create':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          label: 'Tambah Data',
          icon: Layers,
        };
      case 'delete':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          label: 'Hapus Data',
          icon: Trash2,
        };
      case 'bulk_delete':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
          label: 'Hapus Masal',
          icon: AlertTriangle,
        };
      case 'login':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Login Sistem',
          icon: User,
        };
      case 'export':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Ekspor Laporan',
          icon: FileSpreadsheet,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: action,
          icon: History,
        };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'supervisor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'petugas':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'klien':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const csvRows = [
      ['ID Log', 'Waktu (WIB)', 'Nama Pengguna', 'Peran Akun', 'Tipe Aksi', 'Modul', 'Nama Entitas / Target', 'Lokasi Proyek', 'Detail Perubahan', 'Status Sebelumnya', 'Status Baru'],
      ...filteredLogs.map((log) => [
        `"${log.id}"`,
        `"${log.timestamp}"`,
        `"${log.userName}"`,
        `"${log.userRole}"`,
        `"${getActionBadge(log.action).label}"`,
        `"${log.module || '-'}"`,
        `"${(log.entityName || '-').replace(/"/g, '""')}"`,
        `"${(log.projectName || '-').replace(/"/g, '""')}"`,
        `"${log.details.replace(/"/g, '""')}"`,
        `"${(log.previousState || '-').replace(/"/g, '""')}"`,
        `"${(log.newState || '-').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Log_Sistem_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice(`Berhasil mengekspor ${filteredLogs.length} baris log ke CSV!`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div id="section-audit-log" className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <History className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                Log Aktivitas Sistem & Audit Trail
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {auditLogs.length} Total Rekaman
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
              Pencatatan forensik otomatis setiap aksi penambahan, pembaruan, penghapusan, verifikasi approval, dan login pengguna untuk kepatuhan SOP operasional.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={reloadSystemData}
            disabled={isReloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Muat ulang log terbaru langsung dari server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
            <span>{isReloading ? 'Menyinkronkan...' : 'Segarkan'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Unduh rekaman log terfilter ke format Excel/CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          {userRole === 'admin' && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
              title="Khusus Super Admin: Bersihkan seluruh riwayat audit log"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Bersihkan Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Export notification */}
      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] font-medium text-slate-500 block">Total Log Tercatat</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-[10px] text-slate-400">rekaman</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80">
          <span className="text-[11px] font-medium text-sky-700 block">Aktivitas Hari Ini</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-sky-950">{stats.today}</span>
            <span className="text-[10px] text-sky-600">tindakan</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
          <span className="text-[11px] font-medium text-emerald-700 block">Verifikasi & Approval QC</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-emerald-950">{stats.approval}</span>
            <span className="text-[10px] text-emerald-600">keputusan</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
          <span className="text-[11px] font-medium text-rose-700 block">Tindakan Hapus / Kritis</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-rose-950">{stats.critical}</span>
            <span className="text-[10px] text-rose-600">rekaman</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari staf, peran, atau kata kunci..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="ALL">Semua Jenis Aksi</option>
              <option value="create">Tambah Data</option>
              <option value="update">Perbarui Data</option>
              <option value="delete">Hapus Data</option>
              <option value="verify_approve">Approval Disetujui</option>
              <option value="verify_reject">Approval Ditolak</option>
              <option value="bulk_delete">Hapus Masal</option>
              <option value="login">Login Sistem</option>
              <option value="export">Ekspor Laporan</option>
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 capitalize"
            >
              <option value="ALL">Semua Modul Sistem</option>
              {distinctModules.map((m) => (
                <option key={m} value={m}>
                  Modul: {m}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="ALL">Semua Lokasi Proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Quick Badges & Row count */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <span>Menampilkan <strong>{filteredLogs.length}</strong> dari {auditLogs.length} rekaman</span>
            {(selectedAction !== 'ALL' || selectedModule !== 'ALL' || selectedProjectId !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAction('ALL');
                  setSelectedModule('ALL');
                  setSelectedProjectId('ALL');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-sky-600 hover:text-sky-700 font-semibold underline ml-1 cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Baris:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-xs bg-white rounded border border-slate-200 text-slate-700 font-medium"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>Semua</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 w-40">Waktu & Tanggal</th>
                <th className="p-3 w-48">Pengguna & Peran</th>
                <th className="p-3 w-36">Tipe Aksi</th>
                <th className="p-3 w-36">Modul / Entitas</th>
                <th className="p-3">Rincian Perubahan & Catatan</th>
                <th className="p-3 w-20 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-sm">Tidak ada rekaman log audit yang cocok</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const actionMeta = getActionBadge(log.action);
                  const ActionIcon = actionMeta.icon;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLogDetail(log)}
                    >
                      {/* Timestamp */}
                      <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px] align-top">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{log.timestamp}</span>
                        </div>
                        {log.projectName && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{log.projectName}</span>
                          </div>
                        )}
                      </td>

                      {/* User & Role */}
                      <td className="p-3 align-top">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                            {log.userName.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate leading-tight">
                              {log.userName}
                            </span>
                            <span
                              className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase mt-0.5 ${getRoleBadge(
                                log.userRole
                              )}`}
                            >
                              {log.userRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="p-3 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${actionMeta.bg}`}
                        >
                          <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{actionMeta.label}</span>
                        </span>
                      </td>

                      {/* Module & Entity */}
                      <td className="p-3 align-top">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {log.module || 'Umum'}
                        </span>
                        <span className="font-semibold text-slate-800 text-xs block truncate max-w-[140px]" title={log.entityName || '-'}>
                          {log.entityName || '-'}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="p-3 align-top">
                        <p className="text-xs text-slate-700 leading-relaxed font-normal">
                          {log.details}
                        </p>
                        {(log.previousState || log.newState) && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100 max-w-lg">
                            {log.previousState && (
                              <span className="line-through text-slate-400 truncate max-w-[180px]">
                                {log.previousState}
                              </span>
                            )}
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                              {log.newState}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* View Action */}
                      <td className="p-3 text-center align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogDetail(log);
                          }}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Lihat detail lengkap"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({filteredLogs.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Clear Logs Confirmation (Super Admin Only) */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-rose-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                Konfirmasi Pembersihan Seluruh Log
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tindakan ini akan mengosongkan seluruh riwayat audit trail dari database server. Data log yang sudah dihapus tidak dapat dipulihkan kembali.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Disarankan mengunduh cadangan berkas dengan menekan tombol <strong>Ekspor CSV</strong> sebelum membersihkan log.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAuditLogs();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                Ya, Bersihkan Seluruh Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detail Satu Log */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Rincian Lengkap Audit Log</h4>
                  <p className="text-[11px] text-slate-400">ID: {selectedLogDetail.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Waktu Pencatatan</span>
                <span className="font-mono font-medium text-slate-800">{selectedLogDetail.timestamp}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Pelaksana & Peran</span>
                <span className="font-semibold text-slate-800">
                  {selectedLogDetail.userName} ({selectedLogDetail.userRole.toUpperCase()})
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Tipe Aksi</span>
                <span className="font-semibold text-slate-800 capitalize">{selectedLogDetail.action}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Modul / Entitas</span>
                <span className="font-semibold text-slate-800">
                  [{selectedLogDetail.module}] {selectedLogDetail.entityName || '-'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">Keterangan / Aktivitas yang Dilakukan:</span>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                {selectedLogDetail.details}
              </div>
            </div>

            {(selectedLogDetail.previousState || selectedLogDetail.newState) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                  <span className="text-[10px] font-bold text-rose-700 block uppercase">Status / Nilai Sebelumnya</span>
                  <span className="text-slate-700">{selectedLogDetail.previousState || '-'}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">Status / Nilai Baru</span>
                  <span className="text-slate-800 font-semibold">{selectedLogDetail.newState || '-'}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
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
