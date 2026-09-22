import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { AuditActionType } from '../../types';

export const AuditTrailModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { auditLogs } = useCleaning();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<AuditActionType | 'ALL'>('ALL');

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchModule = (log.module || '').toLowerCase().includes(q);
      const matchEntity = (log.entityName || '').toLowerCase().includes(q);
      const matchProject = (log.projectName || '').toLowerCase().includes(q);
      if (!matchUser && !matchDetails && !matchModule && !matchEntity && !matchProject) return false;
    }
    return true;
  });

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'verify_approve':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'verify_reject':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'update':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'create':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'delete':
      case 'bulk_delete':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'login':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'export':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getActionLabel = (action: AuditActionType) => {
    switch (action) {
      case 'verify_approve':
        return 'Approval Disetujui';
      case 'verify_reject':
        return 'Approval Ditolak';
      case 'create':
        return 'Tambah Data';
      case 'update':
        return 'Perbarui Data';
      case 'delete':
        return 'Hapus Data';
      case 'bulk_delete':
        return 'Hapus Masal';
      case 'login':
        return 'Login Sistem';
      case 'export':
        return 'Ekspor Laporan';
      default:
        return action;
    }
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['Waktu', 'Pengguna', 'Role', 'Aksi', 'Modul', 'Entitas', 'Proyek', 'Keterangan Perubahan'],
      ...filteredLogs.map((log) => [
        `"${log.timestamp}"`,
        `"${log.userName}"`,
        `"${log.userRole}"`,
        `"${getActionLabel(log.action)}"`,
        `"${log.module}"`,
        `"${log.entityName || '-'}"`,
        `"${log.projectName || '-'}"`,
        `"${log.details.replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Trail_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-sky-600 text-white rounded-xl">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                Audit Trail & Log Riwayat Perubahan Sistem
              </h3>
              <p className="text-xs text-slate-400">
                Pencatatan siapa yang mengubah apa dan kapan (kontrol akses multi-proyek)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pengguna, aksi, atau detail..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="verify_approve">Approval Task (Disetujui)</option>
              <option value="verify_reject">Approval Task (Ditolak)</option>
              <option value="create">Tambah Data / SOP</option>
              <option value="update">Perbarui Data / SOP</option>
              <option value="delete">Hapus Data</option>
              <option value="bulk_delete">Hapus Masal</option>
              <option value="export">Ekspor Data</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan {filteredLogs.length} dari {auditLogs.length} riwayat
            </span>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Waktu & Tanggal</th>
                <th className="py-2.5 px-3">Pengguna & Role</th>
                <th className="py-2.5 px-3 text-center">Tipe Aksi</th>
                <th className="py-2.5 px-3">Proyek & Modul</th>
                <th className="py-2.5 px-3">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada catatan audit log yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {log.timestamp}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.userName}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {log.userRole}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800 line-clamp-1">
                        {log.projectName || 'Semua Proyek'}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">Modul: {log.module}</span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="line-clamp-2">{log.details}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
