import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Calendar,
  Clock,
  Camera,
  Layers,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useCleaning } from '../../../context/CleaningContext';
import {
  KlienChecklistCategory,
  KlienChecklistItem,
  KlienChecklistInspection,
} from '../../../types';

export const KlienChecklistSection: React.FC = () => {
  const {
    klienChecklistItems,
    addKlienChecklistItem,
    updateKlienChecklistItem,
    deleteKlienChecklistItem,
    resetKlienChecklistItems,
    klienChecklistInspections,
    submitKlienChecklistInspection,
    deleteKlienChecklistInspection,
    activeProject,
    currentUser,
    userRole,
  } = useCleaning();

  // Active Category Tab: 'toilet' | 'public_area' | 'parking'
  const [selectedCategory, setSelectedCategory] = useState<KlienChecklistCategory>('toilet');

  // Modal: Kelola Item Ceklist Manual
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KlienChecklistItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemStandard, setNewItemStandard] = useState('');

  // Modal: Form Inspeksi Baru
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectAreaLocation, setInspectAreaLocation] = useState('');
  const [inspectShift, setInspectShift] = useState('Shift 1 ( satu )');
  const [inspectInspector, setInspectInspector] = useState(currentUser?.name || 'Pengawas Lapangan');
  const [inspectNotes, setInspectNotes] = useState('');
  const [inspectPhotoUrl, setInspectPhotoUrl] = useState('');
  const [checkedItemIds, setCheckedItemIds] = useState<Record<string, boolean>>({});

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filter items for current category
  const categoryItems = klienChecklistItems
    .filter((item) => item.category === selectedCategory)
    .sort((a, b) => a.order - b.order);

  // Filter inspections for current category
  const categoryInspections = klienChecklistInspections.filter(
    (insp) => insp.category === selectedCategory
  );

  // Quick category options
  const categoryMeta: Record<
    KlienChecklistCategory,
    { label: string; icon: string; defaultAreas: string[] }
  > = {
    toilet: {
      label: 'Toilet & Restroom',
      icon: '🚻',
      defaultAreas: [
        'Toilet Pria Lantai 1',
        'Toilet Wanita Lantai 1',
        'Toilet Pria Lantai 2',
        'Toilet Wanita Lantai 2',
        'Toilet Eksekutif Direksi',
      ],
    },
    public_area: {
      label: 'Area Public',
      icon: '🏢',
      defaultAreas: [
        'Lobby Utama & Receptionist',
        'Waiting Lounge & Koridor GF',
        'Drop-Off & Teras Entrance',
        'Atrium Utama Lantai 1',
        'Koridor Tenant Lift Hall',
      ],
    },
    parking: {
      label: 'Parking Area',
      icon: '🅿️',
      defaultAreas: [
        'Basement Parking B1 (Mobil)',
        'Basement Parking B2 (Mobil & Logistik)',
        'Area Parkir Sepeda Motor Luar',
        'Drop-Off Area & Pos Barrier Gate',
        'Ramp Akses Masuk & Keluar Parkir',
      ],
    },
  };

  // Calculate statistics for current category
  const totalInspections = categoryInspections.length;
  const avgScore =
    totalInspections > 0
      ? Math.round(
          categoryInspections.reduce((acc, i) => acc + i.scorePercent, 0) / totalInspections
        )
      : 100;

  // Add / Edit Manual Checklist Item
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    if (editingItem) {
      updateKlienChecklistItem(editingItem.id, {
        name: newItemName,
        standard: newItemStandard,
      });
      showToast(`Item checklist "${newItemName}" berhasil diperbarui.`);
      setEditingItem(null);
    } else {
      addKlienChecklistItem({
        projectId: activeProject.id,
        category: selectedCategory,
        name: newItemName,
        standard: newItemStandard,
        order: categoryItems.length + 1,
      });
      showToast(`Item checklist baru ditambahkan ke kategori ${categoryMeta[selectedCategory].label}.`);
    }

    setNewItemName('');
    setNewItemStandard('');
  };

  // Open Inspection Modal with all items initially checked
  const openNewInspection = () => {
    const initialChecked: Record<string, boolean> = {};
    categoryItems.forEach((item) => {
      initialChecked[item.id] = true; // Default checklist to clean/OK
    });
    setCheckedItemIds(initialChecked);
    setInspectAreaLocation(categoryMeta[selectedCategory].defaultAreas[0] || '');
    setInspectNotes('');
    setInspectPhotoUrl(
      selectedCategory === 'toilet'
        ? 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80'
        : selectedCategory === 'public_area'
        ? 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&auto=format&fit=crop&q=80'
    );
    setShowInspectModal(true);
  };

  // Submit Inspection Form
  const handleSubmitInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectAreaLocation.trim()) {
      alert('Pilih lokasi area yang diinspeksi.');
      return;
    }

    const checkedList = Object.keys(checkedItemIds).filter((id) => checkedItemIds[id]);
    const total = categoryItems.length || 1;
    const score = Math.round((checkedList.length / total) * 100);

    const condition: 'clean' | 'fair' | 'dirty' =
      score >= 85 ? 'clean' : score >= 60 ? 'fair' : 'dirty';

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr =
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    submitKlienChecklistInspection({
      projectId: activeProject.id,
      category: selectedCategory,
      areaLocation: inspectAreaLocation,
      inspectionDate: dateStr,
      inspectionTime: timeStr,
      shiftName: inspectShift,
      inspectorName: inspectInspector,
      checkedItemIds: checkedList,
      totalItems: total,
      scorePercent: score,
      conditionStatus: condition,
      notes: inspectNotes,
      photoUrl: inspectPhotoUrl,
    });

    showToast(`Inspeksi ${categoryMeta[selectedCategory].label} berhasil disimpan (Skor: ${score}%).`);
    setShowInspectModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* SECTION HEADER & CATEGORY TABS (TOILET, AREA PUBLIC, PARKING AREA) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-sky-600" />
            <span>Checklist Kebersihan (Toilet, Area Public, Parking Area)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Parameter item checklist di bawah dapat diatur secara manual oleh Klien dan Supervisor
          </p>
        </div>

        {/* Action Buttons: Manage Items Manual & New Inspection */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowManageModal(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Atur item checklist secara manual untuk kategori ini"
          >
            <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>⚙️ Atur Item Manual</span>
          </button>

          <button
            type="button"
            onClick={openNewInspection}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lakukan Ceklist Baru</span>
          </button>
        </div>
      </div>

      {/* 3 Main Category Selector Buttons: Toilet | Area Public | Parking Area */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['toilet', 'public_area', 'parking'] as KlienChecklistCategory[]).map((cat) => {
          const meta = categoryMeta[cat];
          const countItems = klienChecklistItems.filter((i) => i.category === cat).length;
          const countInspections = klienChecklistInspections.filter((i) => i.category === cat).length;
          const isSelected = selectedCategory === cat;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{meta.label}</h4>
                  <p className="text-[11px] text-slate-500">
                    {countItems} item checklist manual • {countInspections} inspeksi
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  isSelected ? 'text-sky-600 translate-x-0.5' : 'text-slate-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* CURRENT CATEGORY ITEMS OVERVIEW (MANUAL CONFIGURABLE ITEMS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="text-lg">{categoryMeta[selectedCategory].icon}</span>
              <span>Daftar Parameter Ceklist Manual: {categoryMeta[selectedCategory].label}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Standar kebersihan yang dievaluasi saat pemeriksaan operasional harian
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Skor Rata-Rata:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                avgScore >= 85
                  ? 'bg-emerald-100 text-emerald-800'
                  : avgScore >= 65
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {avgScore}% Kepatuhan
            </span>
          </div>
        </div>

        {/* Grid of Manual Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoryItems.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 text-[10.5px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h5 className="font-bold text-slate-900 text-xs leading-snug">{item.name}</h5>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setNewItemName(item.name);
                        setNewItemStandard(item.standard);
                        setShowManageModal(true);
                      }}
                      className="text-slate-400 hover:text-sky-600 p-0.5 cursor-pointer"
                      title="Edit item ini"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Hapus item checklist "${item.name}"?`)) {
                          deleteKlienChecklistItem(item.id);
                          showToast('Item checklist dihapus.');
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      title="Hapus item ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed pl-7">
                  {item.standard}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/60 pl-7 flex items-center justify-between text-[10px] text-slate-400">
                <span>Standard Klien</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Aktif
                </span>
              </div>
            </div>
          ))}

          {categoryItems.length === 0 && (
            <div className="col-span-full p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
              Belum ada item checklist manual untuk kategori ini.
            </div>
          )}
        </div>
      </div>

      {/* RECENT INSPECTIONS & MONITORING REPORT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Hasil Ceklist {categoryMeta[selectedCategory].label}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemeriksaan terkini yang telah dilakukan dan dievaluasi di lapangan
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Total {categoryInspections.length} pemeriksaan tercatat
          </span>
        </div>

        <div className="space-y-3">
          {categoryInspections.map((insp) => (
            <div
              key={insp.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                {insp.photoUrl && (
                  <img
                    src={insp.photoUrl}
                    alt={insp.areaLocation}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150&auto=format&fit=crop&q=80';
                    }}
                  />
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                      {insp.areaLocation}
                    </h5>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        insp.conditionStatus === 'clean'
                          ? 'bg-emerald-100 text-emerald-800'
                          : insp.conditionStatus === 'fair'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {insp.conditionStatus === 'clean'
                        ? 'Sangat Bersih'
                        : insp.conditionStatus === 'fair'
                        ? 'Cukup'
                        : 'Perlu Dikerjakan Ulang'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    📅 {insp.inspectionDate} • {insp.inspectionTime} • {insp.shiftName} • Pemeriksa: <strong>{insp.inspectorName}</strong>
                  </p>

                  {insp.notes && (
                    <p className="text-[11px] text-slate-500 italic max-w-xl truncate">
                      Catatan: &quot;{insp.notes}&quot;
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                <div className="text-right">
                  <div className="text-xl font-extrabold text-slate-900">
                    {insp.scorePercent}%
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {insp.checkedItemIds.length} / {insp.totalItems} Standar Lolos
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Hapus riwayat inspeksi ini?')) {
                      deleteKlienChecklistInspection(insp.id);
                      showToast('Riwayat inspeksi dihapus.');
                    }
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  title="Hapus riwayat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {categoryInspections.length === 0 && (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl">
              Belum ada riwayat hasil ceklist untuk kategori {categoryMeta[selectedCategory].label}. Klik tombol &quot;+ Lakukan Ceklist Baru&quot; di atas untuk memulai.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: KELOLA ITEM CEKLIST SECARA MANUAL */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>⚙️ Atur Item Ceklist Manual</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({categoryMeta[selectedCategory].label})
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tambah, edit, atau hapus item parameter kebersihan manual
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Input Item Baru / Edit */}
            <form onSubmit={handleSaveItem} className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-xl space-y-3">
              <h5 className="font-bold text-sky-950 text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>{editingItem ? 'Edit Item Checklist' : 'Tambah Parameter Item Baru'}</span>
              </h5>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Parameter Checklist *
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Misal: Kebersihan Keran Wastafel & Cermin"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Standar Kebersihan yang Diharapkan
                </label>
                <input
                  type="text"
                  required
                  value={newItemStandard}
                  onChange={(e) => setNewItemStandard(e.target.value)}
                  placeholder="Misal: Bebas bercak air, mengkilap, dan saluran pembuangan lancar"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setNewItemName('');
                      setNewItemStandard('');
                    }}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Batal Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingItem ? 'Perbarui Item' : '+ Tambah ke Daftar'}
                </button>
              </div>
            </form>

            {/* List Existing Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Daftar Parameter Aktif ({categoryItems.length}):</span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Kembalikan seluruh item kategori ini ke template default?')) {
                      resetKlienChecklistItems();
                      showToast('Item checklist dikembalikan ke template awal.');
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-normal flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {categoryItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {i + 1}. {item.name}
                      </div>
                      <div className="text-[10.5px] text-slate-500 truncate">{item.standard}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setNewItemName(item.name);
                          setNewItemStandard(item.standard);
                        }}
                        className="text-slate-400 hover:text-sky-600 p-1 cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteKlienChecklistItem(item.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FORM LAKUKAN INSPEKSI CEKLIST BARU */}
      {showInspectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>📝 Form Inspeksi Ceklist Baru</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    {categoryMeta[selectedCategory].label}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Centang parameter yang telah memenuhi standar kebersihan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInspectModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi Area Spesifik *
                  </label>
                  <input
                    type="text"
                    required
                    list="default-areas-list"
                    value={inspectAreaLocation}
                    onChange={(e) => setInspectAreaLocation(e.target.value)}
                    placeholder="Pilih atau ketik lokasi area..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500"
                  />
                  <datalist id="default-areas-list">
                    {categoryMeta[selectedCategory].defaultAreas.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Shift Inspeksi
                  </label>
                  <select
                    value={inspectShift}
                    onChange={(e) => setInspectShift(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Shift 1 ( satu )">Shift 1 ( satu )</option>
                    <option value="Shift 2 ( Midle )">Shift 2 ( Midle )</option>
                    <option value="Shift 3 ( Malam )">Shift 3 ( Malam )</option>
                    <option value="All Shift">All Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Pengawas / Pemeriksa
                </label>
                <input
                  type="text"
                  required
                  value={inspectInspector}
                  onChange={(e) => setInspectInspector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Checklist Parameters Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Parameter Evaluasi ({categoryItems.length} Standar):</span>
                  <span className="text-[11px] text-sky-700 font-semibold">
                    {Object.values(checkedItemIds).filter(Boolean).length} / {categoryItems.length} Lolos
                  </span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                  {categoryItems.map((item) => {
                    const isChecked = Boolean(checkedItemIds[item.id]);
                    return (
                      <label
                        key={item.id}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setCheckedItemIds((prev) => ({
                              ...prev,
                              [item.id]: e.target.checked,
                            }));
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs block">{item.name}</span>
                          <span className="text-[11px] opacity-80 block">{item.standard}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Temuan / Rekomendasi
                </label>
                <textarea
                  rows={2}
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  placeholder="Misal: Kondisi wangi, refill sabun sudah dilakukan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInspectModal(false)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Hasil Ceklist</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
