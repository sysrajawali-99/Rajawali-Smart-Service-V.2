import React, { useState } from 'react';
import { X, AlertCircle, Camera, Check } from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { PriorityLevel } from '../../types';

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({ isOpen, onClose }) => {
  const { areas, submitNewComplaint, userRole } = useCleaning();

  const [reporterName, setReporterName] = useState(
    userRole === 'klien' ? 'Ibu Ratna Dewi (PT Mega Finansial)' : 'Pengguna Gedung'
  );
  const [areaId, setAreaId] = useState(areas[0]?.id || '');
  const [category, setCategory] = useState('Kebersihan Lantai / Tumpahan');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [description, setDescription] = useState('');
  const [photoBefore, setPhotoBefore] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Mohon isi deskripsi komplain');
      return;
    }

    submitNewComplaint({
      reporterName,
      reporterRole: userRole === 'klien' ? 'Tenant Gedung' : 'Pengawas Internal',
      areaId,
      category,
      priority,
      description,
      photoBefore: photoBefore || undefined,
    });

    onClose();
  };

  const samplePhotos = [
    { label: 'Tumpahan Kopi', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80' },
    { label: 'Toilet Kotor/Kran', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80' },
    { label: 'Sampah Penuh', url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=80' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Buat Tiket Komplain Kebersihan</h3>
              <p className="text-[11px] text-slate-500">Laporkan kendala kebersihan ke tim operasional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Pelapor & Unit</label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lokasi Area</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.floor})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori Masalah</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
              >
                <option value="Kebersihan Lantai / Tumpahan">Kebersihan Lantai / Tumpahan</option>
                <option value="Stok Habis & Air Kran">Stok Habis (Sabun/Tisu/Air)</option>
                <option value="Tempat Sampah Penuh">Tempat Sampah Penuh / Bau</option>
                <option value="Aroma & Sirkulasi Udara">Aroma & Bau Tak Sedap</option>
                <option value="Kaca / Jendela Kotor">Kaca / Jendela Kotor</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tingkat Urgensi / SLA</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'low', label: 'Rendah (60m)', color: 'border-slate-200 text-slate-700' },
                { id: 'medium', label: 'Sedang (45m)', color: 'border-blue-200 text-blue-700' },
                { id: 'high', label: 'Tinggi (30m)', color: 'border-amber-200 text-amber-700' },
                { id: 'urgent', label: 'Darurat (15m)', color: 'border-rose-200 text-rose-700' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setPriority(lvl.id as PriorityLevel)}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-all ${
                    priority === lvl.id
                      ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold ring-1 ring-rose-400'
                      : lvl.color + ' hover:bg-slate-50'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Deskripsi Detail Keluhan</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan kendala kebersihan yang ditemukan secara spesifik..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Lampiran Foto Bukti (Opsional)</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={photoBefore}
                onChange={(e) => setPhotoBefore(e.target.value)}
                placeholder="URL foto komplain atau pilih sampel di bawah"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
              <button
                type="button"
                onClick={() => setPhotoBefore(samplePhotos[0].url)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium text-[11px] flex items-center gap-1 shrink-0"
              >
                <Camera className="w-3.5 h-3.5" />
                Ambil Foto
              </button>
            </div>

            <div className="flex gap-2">
              {samplePhotos.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoBefore(item.url)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] ${
                    photoBefore === item.url
                      ? 'bg-rose-50 border-rose-400 text-rose-700 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {photoBefore === item.url && <Check className="w-2.5 h-2.5" />}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors shadow-xs"
            >
              Kirim Tiket Komplain
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
