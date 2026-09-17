import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Camera, Check, Image as ImageIcon } from 'lucide-react';
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

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
    <div
      id="complaint-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="complaint-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94dvh]"
      >
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                Buat Tiket Komplain Kebersihan
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Laporkan kendala kebersihan ke tim operasional
              </p>
            </div>
          </div>
          <button
            id="close-complaint-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Tutup Tiket Komplain"
            className="p-2 rounded-full text-slate-500 hover:text-slate-900 bg-rose-100/70 hover:bg-rose-200 active:bg-rose-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto overscroll-contain flex-1">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Pelapor & Unit</label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lokasi Area</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white text-sm"
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
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white text-sm"
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
            <label className="block font-semibold text-slate-700 mb-1.5">Tingkat Urgensi / SLA</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all min-h-[40px] flex items-center justify-center cursor-pointer ${
                    priority === lvl.id
                      ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold ring-2 ring-rose-400'
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
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none text-sm"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Lampiran Foto Bukti (Opsional)</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
              <input
                type="text"
                value={photoBefore}
                onChange={(e) => setPhotoBefore(e.target.value)}
                placeholder="URL foto komplain atau pilih sampel..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="button"
                onClick={() => setPhotoBefore(samplePhotos[0].url)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 shrink-0 min-h-[38px] cursor-pointer"
              >
                <Camera className="w-4 h-4 text-slate-500" />
                Pilih Contoh Foto
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {samplePhotos.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoBefore(item.url)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer ${
                    photoBefore === item.url
                      ? 'bg-rose-50 border-rose-400 text-rose-700 font-bold ring-1 ring-rose-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {photoBefore === item.url ? (
                    <Check className="w-3 h-3 text-rose-600" />
                  ) : (
                    <ImageIcon className="w-3 h-3 text-slate-400" />
                  )}
                  {item.label}
                </button>
              ))}
            </div>

            {/* Photo preview if present */}
            {photoBefore && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-40 flex items-center justify-center group">
                <img
                  src={photoBefore}
                  alt="Pratinjau Bukti"
                  className="w-full h-36 object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setPhotoBefore('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs flex items-center gap-1 cursor-pointer"
                  title="Hapus foto"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
            <button
              id="cancel-complaint-btn"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              Batal / Tutup
            </button>
            <button
              id="submit-complaint-btn"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold transition-colors shadow-xs min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              Kirim Tiket Komplain
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
