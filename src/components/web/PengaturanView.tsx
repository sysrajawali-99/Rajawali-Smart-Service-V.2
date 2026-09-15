import React, { useState } from 'react';
import {
  Settings,
  Building,
  Shield,
  Bell,
  Check,
  Save,
  Key,
  Users,
  Clock,
  Layers,
  ClipboardList,
  Plus,
  Trash2,
  Building2,
  Lock,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { ChecklistLocationCategory } from '../../types';

export const PengaturanView: React.FC = () => {
  const {
    userRole,
    activeProject,
    checklistTemplates,
    addChecklistTemplate,
    deleteChecklistTemplate,
    setActiveTab,
  } = useCleaning();

  const [deadlineAlertMins, setDeadlineAlertMins] = useState(15);
  const [autoQCThreshold, setAutoQCThreshold] = useState(85);
  const [isSaved, setIsSaved] = useState(false);

  // Master Data Checklist Item state
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<ChecklistLocationCategory>('toilet');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ChecklistLocationCategory>('toilet');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleAddTemplateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const currentCatItems = checklistTemplates.filter((t) => t.category === newItemCategory);
    addChecklistTemplate({
      category: newItemCategory,
      name: newItemName.trim(),
      order: currentCatItems.length + 1,
    });

    setNewItemName('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const rolesMatrix = [
    {
      feature: 'Dashboard & Statistik Harian',
      admin: true,
      supervisor: true,
      petugas: true,
      klien: true,
    },
    {
      feature: 'Ceklist Kebersihan Area (24 Jam: 00.00-24.00)',
      admin: true,
      supervisor: true,
      petugas: true,
      klien: true,
    },
    {
      feature: 'Manajemen Multi-Lokasi Proyek & Hak Akses',
      admin: true,
      supervisor: false,
      petugas: false,
      klien: false,
    },
    {
      feature: 'Kelola Master Area & Zona Gedung',
      admin: true,
      supervisor: true,
      petugas: false,
      klien: false,
    },
    {
      feature: 'Pengaturan Staf & Pembagian Tugas',
      admin: true,
      supervisor: true,
      petugas: false,
      klien: false,
    },
    {
      feature: 'Jadwal & Rotasi Shift Personel',
      admin: true,
      supervisor: true,
      petugas: false,
      klien: false,
    },
    {
      feature: 'Pengisian Checklist & Foto Bukti (Mobile)',
      admin: true,
      supervisor: true,
      petugas: true,
      klien: false,
    },
    {
      feature: 'Inspeksi Penjaminan Mutu (QC Approval)',
      admin: true,
      supervisor: true,
      petugas: false,
      klien: false,
    },
    {
      feature: 'Ticketing & Penyelesaian Komplain',
      admin: true,
      supervisor: true,
      petugas: true,
      klien: true,
    },
    {
      feature: 'Download PDF & Ekspor Laporan Bulanan',
      admin: true,
      supervisor: true,
      petugas: false,
      klien: true,
    },
    {
      feature: 'Konfigurasi Master Data Item Ceklist',
      admin: true,
      supervisor: true,
      petugas: false,
      klien: false,
    },
  ];

  const categoryList: { key: ChecklistLocationCategory; label: string; icon: string }[] = [
    { key: 'toilet', label: 'Toilet', icon: '🚽' },
    { key: 'public_area', label: 'Public Area', icon: '🏢' },
    { key: 'koridor', label: 'Koridor', icon: '🚶' },
    { key: 'musholla', label: 'Musholla', icon: '🕌' },
    { key: 'lift', label: 'Lift & Eskalator', icon: '🛗' },
    { key: 'pantry', label: 'Pantry', icon: '☕' },
  ];

  const activeCategoryTemplates = checklistTemplates.filter(
    (t) => t.category === selectedCategoryTab
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pengaturan Sistem & Master Data
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi master data item ceklist kebersihan, aturan notifikasi batas waktu, dan hak akses proyek
          </p>
        </div>

        {isSaved && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Perubahan Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      {/* Section 1: Master Data Item Ceklist Kebersihan Area */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Master Data Item Ceklist Kebersihan Area
              </h3>
              <p className="text-[11px] text-slate-400">
                Item-item yang wajib diperiksa petugas per jam (00.00 - 24.00) di setiap area
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Total Item Master: <span className="font-bold text-slate-800">{checklistTemplates.length} Item</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categoryList.map((cat) => {
            const isSelected = selectedCategoryTab === cat.key;
            const count = checklistTemplates.filter((t) => t.category === cat.key).length;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setSelectedCategoryTab(cat.key);
                  setNewItemCategory(cat.key);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add New Item Form */}
        <form onSubmit={handleAddTemplateItem} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" />
            Tambah Item Baru untuk Kategori: <span className="capitalize font-bold text-emerald-700">{selectedCategoryTab}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Contoh untuk ${selectedCategoryTab}: Kloset disikat bersih, cermin di lap mengkilap...`}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-xs"
            >
              + Tambah ke Master Data
            </button>
          </div>
        </form>

        {/* Checklist Items List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
          {activeCategoryTemplates.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              Belum ada item ceklist master untuk kategori ini. Tambahkan item di atas.
            </div>
          ) : (
            activeCategoryTemplates.map((tpl, index) => (
              <div
                key={tpl.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-800">{tpl.name}</span>
                </div>

                <button
                  type="button"
                  onClick={() => deleteChecklistTemplate(tpl.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                  title="Hapus Item dari Master Data"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 2: Project Location Quick Management */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Lokasi Proyek & Hak Akses Pengguna</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Super Admin dapat menambah lokasi proyek baru dan membatasi proyek yang dapat diakses pengguna.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('proyek')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shrink-0 shadow-xs"
        >
          Buka Kelola Lokasi Proyek →
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 3: SLA & Push Notification Rules */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Aturan Notifikasi Push & Ambang Batas SLA
              </h3>
              <p className="text-[11px] text-slate-400">
                Pengingat otomatis saat tugas mendekati batas waktu pengerjaan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Waktu Peringatan Sebelum Batas Waktu:</span>
                <span className="text-amber-600 font-bold">{deadlineAlertMins} Menit</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={deadlineAlertMins}
                onChange={(e) => setDeadlineAlertMins(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Petugas akan menerima notifikasi push otomatis di ponsel sebelum jadwal tugas berakhir.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Nilai Minimum Kelolosan Audit QC:</span>
                <span className="text-emerald-600 font-bold">{autoQCThreshold} / 100</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                step="5"
                value={autoQCThreshold}
                onChange={(e) => setAutoQCThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Hasil inspeksi di bawah nilai ini akan otomatis ditandai memerlukan pembersihan ulang (re-work).
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: RBAC Roles & Permissions Matrix */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Matriks Hak Akses Pengguna (Role-Based Access Control)
              </h3>
              <p className="text-[11px] text-slate-400">
                Konfigurasi izin modul per role: Super Admin, Supervisor, Petugas Lapangan, dan Klien
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Modul & Fungsi Sistem</th>
                  <th className="p-3 text-center">Admin</th>
                  <th className="p-3 text-center">Supervisor</th>
                  <th className="p-3 text-center">Petugas Lapangan</th>
                  <th className="p-3 text-center">Klien / Tenant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rolesMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-800">{row.feature}</td>
                    <td className="p-3 text-center">
                      {row.admin ? (
                        <span className="text-emerald-600 font-bold">✓ Full</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {row.supervisor ? (
                        <span className="text-emerald-600 font-bold">✓ Ya</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {row.petugas ? (
                        <span className="text-emerald-600 font-bold">✓ Ya</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {row.klien ? (
                        <span className="text-sky-600 font-bold">✓ Portal</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
