import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { Area, AreaCleanlinessStatus } from '../../types';

export const AreaCleaningView: React.FC = () => {
  const { areas, cleaners, addArea, updateArea } = useCleaning();

  const [search, setSearch] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Area Form State
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaCode, setNewAreaCode] = useState('');
  const [newAreaFloor, setNewAreaFloor] = useState('Lantai 1');
  const [newAreaZone, setNewAreaZone] = useState('Zona Barat');
  const [newAreaType, setNewAreaType] = useState<Area['type']>('office');
  const [newAreaCleanerId, setNewAreaCleanerId] = useState(cleaners[0]?.id || '');
  const [newAreaDuration, setNewAreaDuration] = useState(30);

  const floors = ['all', 'Lantai LG', 'Lantai 1', 'Lantai 2', 'Lantai 3', 'Lantai 4'];

  const filteredAreas = areas.filter((area) => {
    const matchSearch =
      area.name.toLowerCase().includes(search.toLowerCase()) ||
      area.code.toLowerCase().includes(search.toLowerCase()) ||
      area.cleanerName.toLowerCase().includes(search.toLowerCase());
    const matchFloor = selectedFloor === 'all' || area.floor === selectedFloor;
    const matchStatus = selectedStatus === 'all' || area.status === selectedStatus;
    return matchSearch && matchFloor && matchStatus;
  });

  const handleCreateArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim() || !newAreaCode.trim()) {
      alert('Mohon isi nama dan kode area');
      return;
    }

    const assignedCleaner = cleaners.find((c) => c.id === newAreaCleanerId);

    addArea({
      name: newAreaName,
      code: newAreaCode,
      building: 'Menara Mandiri Tower A',
      floor: newAreaFloor,
      zone: newAreaZone,
      type: newAreaType,
      status: 'needs_cleaning',
      cleanerId: newAreaCleanerId,
      cleanerName: assignedCleaner?.name || 'Petugas Standby',
      targetDurationMinutes: Number(newAreaDuration),
      nextScheduled: 'Hari ini, 13:00 WIB',
    });

    setNewAreaName('');
    setNewAreaCode('');
    setShowAddModal(false);
  };

  const getStatusBadge = (status: AreaCleanlinessStatus) => {
    switch (status) {
      case 'clean':
        return {
          label: 'Bersih Terawat',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'inspected':
        return {
          label: 'Lolos QC Audit',
          classes: 'bg-teal-50 text-teal-700 border-teal-200',
          dot: 'bg-teal-500',
        };
      case 'in_progress':
        return {
          label: 'Sedang Dibersihkan',
          classes: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500 animate-pulse',
        };
      case 'needs_cleaning':
      default:
        return {
          label: 'Perlu Pembersihan',
          classes: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pemetaan & Manajemen Area Cleaning
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar zona, status sanitasi, dan alokasi petugas kebersihan per lantai
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Area Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari area, kode zona, atau nama petugas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">Semua Status Kebersihan</option>
              <option value="clean">Bersih Terawat</option>
              <option value="in_progress">Sedang Dibersihkan</option>
              <option value="needs_cleaning">Perlu Pembersihan</option>
              <option value="inspected">Lolos QC Audit</option>
            </select>
          </div>
        </div>

        {/* Floor Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mr-1">
            Lantai:
          </span>
          {floors.map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                selectedFloor === floor
                  ? 'bg-sky-500 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {floor === 'all' ? 'Semua Lantai' : floor}
            </button>
          ))}
        </div>
      </div>

      {/* Area Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAreas.map((area) => {
          const badge = getStatusBadge(area.status);
          return (
            <div
              key={area.id}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {area.code}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {area.floor} • {area.zone}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.classes}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                    {badge.label}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-2">{area.name}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Petugas Bertugas:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-sky-600" />
                      {area.cleanerName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Durasi:</span>
                    <span className="text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {area.targetDurationMinutes} Menit
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Pembersihan Terakhir:</span>
                    <span className="text-slate-700">{area.lastCleaned || 'Belum ada'}</span>
                  </div>
                </div>
              </div>

              {/* Area Card Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  ID: {area.code}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const next = area.status === 'clean' ? 'needs_cleaning' : 'clean';
                      updateArea(area.id, { status: next });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                    title="Ubah status sanitasi cepat"
                  >
                    Tandai {area.status === 'clean' ? 'Perlu Dicuci' : 'Bersih'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Area Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Area Cleaning Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateArea} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Area</label>
                <input
                  type="text"
                  placeholder="Misal: Lobby Barat, Ruang Server Lt. 3"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Area</label>
                  <input
                    type="text"
                    placeholder="Misal: LOB-02"
                    value={newAreaCode}
                    onChange={(e) => setNewAreaCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lantai</label>
                  <select
                    value={newAreaFloor}
                    onChange={(e) => setNewAreaFloor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="Lantai LG">Lantai LG</option>
                    <option value="Lantai 1">Lantai 1</option>
                    <option value="Lantai 2">Lantai 2</option>
                    <option value="Lantai 3">Lantai 3</option>
                    <option value="Lantai 4">Lantai 4</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zona</label>
                  <input
                    type="text"
                    placeholder="Misal: Zona Timur"
                    value={newAreaZone}
                    onChange={(e) => setNewAreaZone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipe Area</label>
                  <select
                    value={newAreaType}
                    onChange={(e) => setNewAreaType(e.target.value as Area['type'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="lobby">Lobby</option>
                    <option value="toilet">Toilet</option>
                    <option value="office">Ruang Kantor</option>
                    <option value="pantry">Pantry / Kantin</option>
                    <option value="corridor">Koridor / Lift</option>
                    <option value="outdoor">Outdoor / Parkir</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Petugas Bertanggung Jawab</label>
                  <select
                    value={newAreaCleanerId}
                    onChange={(e) => setNewAreaCleanerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.shiftName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Durasi (Menit)</label>
                  <input
                    type="number"
                    value={newAreaDuration}
                    onChange={(e) => setNewAreaDuration(Number(e.target.value))}
                    min={10}
                    max={180}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                >
                  Simpan Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
