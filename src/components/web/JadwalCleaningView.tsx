import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Calendar,
  X,
  ListChecks,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { CleaningSchedule } from '../../types';

export const JadwalCleaningView: React.FC = () => {
  const { schedules, areas, cleaners } = useCleaning();

  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'harian' | 'mingguan' | 'bulanan'>('all');
  const [scheduleList, setScheduleList] = useState<CleaningSchedule[]>(schedules);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Schedule State
  const [newTitle, setNewTitle] = useState('');
  const [newAreaId, setNewAreaId] = useState(areas[0]?.id || '');
  const [newCleanerId, setNewCleanerId] = useState(cleaners[0]?.id || '');
  const [newFrequency, setNewFrequency] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [newTimeSlot, setNewTimeSlot] = useState('08:00 - 09:00 WIB');
  const [newChecklistText, setNewChecklistText] = useState('Sapu dan pel bersih\nDisinfeksi gagang pintu\nKosongkan tempat sampah');

  const filtered = scheduleList.filter(
    (s) => frequencyFilter === 'all' || s.frequency === frequencyFilter
  );

  const toggleSchedule = (id: string) => {
    setScheduleList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const area = areas.find((a) => a.id === newAreaId);
    const cleaner = cleaners.find((c) => c.id === newCleanerId);

    const newSched: CleaningSchedule = {
      id: `sch-${Date.now()}`,
      title: newTitle,
      areaId: newAreaId,
      areaName: area?.name || 'Area Gedung',
      cleanerId: newCleanerId,
      cleanerName: cleaner?.name || 'Asep Supriyadi',
      frequency: newFrequency,
      timeSlot: newTimeSlot,
      shiftId: 'shift-1',
      checklistTemplates: newChecklistText.split('\n').filter((t) => t.trim()),
      isActive: true,
    };

    setScheduleList([newSched, ...scheduleList]);
    setNewTitle('');
    setShowAddModal(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Penjadwalan Rutinitas Pembersihan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen jadwal berkala: rutinitas harian, mingguan, dan deep cleaning bulanan
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadwal Rutin</span>
        </button>
      </div>

      {/* Frequency Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        {[
          { id: 'all', label: 'Semua Jadwal' },
          { id: 'harian', label: 'Harian (Daily Routine)' },
          { id: 'mingguan', label: 'Mingguan (Weekly Routine)' },
          { id: 'bulanan', label: 'Bulanan (Monthly Deep Clean)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFrequencyFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              frequencyFilter === tab.id
                ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs border border-sky-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Schedules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const freqBadge = {
            harian: { label: 'Harian', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
            mingguan: { label: 'Mingguan', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
            bulanan: { label: 'Bulanan', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          }[item.frequency];

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
                item.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${freqBadge.bg}`}
                  >
                    {freqBadge.label}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={() => toggleSchedule(item.id)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-2">{item.title}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">{item.areaName}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span className="text-slate-700">{item.timeSlot}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-700">Petugas: {item.cleanerName}</span>
                  </div>
                </div>

                {/* SOP Checklist Templates preview */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Standard Checklist SOP ({item.checklistTemplates.length}):
                  </span>
                  <ul className="space-y-1">
                    {item.checklistTemplates.slice(0, 3).map((tpl, i) => (
                      <li key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{tpl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Status: {item.isActive ? 'Aktif Terjadwal' : 'Dinonaktifkan'}</span>
                <span className="font-semibold text-sky-600 cursor-pointer hover:underline">
                  Edit Checklist &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Jadwal Rutinitas Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Rutinitas</label>
                <input
                  type="text"
                  placeholder="Misal: Sanitasi Kloset & Refill Sabun Lt. 2"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area Lokasi</label>
                  <select
                    value={newAreaId}
                    onChange={(e) => setNewAreaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.floor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frekuensi</label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="harian">Harian (Daily)</option>
                    <option value="mingguan">Mingguan (Weekly)</option>
                    <option value="bulanan">Bulanan (Monthly)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Petugas Pelaksana</label>
                  <select
                    value={newCleanerId}
                    onChange={(e) => setNewCleanerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    {cleaners.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Pelaksanaan</label>
                  <input
                    type="text"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Checklist SOP (Pisahkan dengan baris baru)
                </label>
                <textarea
                  rows={3}
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none"
                />
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
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
