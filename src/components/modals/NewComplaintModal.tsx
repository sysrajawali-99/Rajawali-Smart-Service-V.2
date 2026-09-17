import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Camera, Upload, Trash2, Clock, Check } from 'lucide-react';
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
  const [slaHours, setSlaHours] = useState<number>(2);
  const [description, setDescription] = useState('');
  const [photoBefore, setPhotoBefore] = useState('');
  const [isCustomHours, setIsCustomHours] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBefore(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      slaHours: Math.max(1, slaHours || 1),
      description,
      photoBefore: photoBefore.trim() || undefined,
    });

    onClose();
  };

  const slaOptions: { hours: number; priority: PriorityLevel; label: string; desc: string }[] = [
    { hours: 1, priority: 'urgent', label: '1 Jam', desc: 'Darurat / Kilat' },
    { hours: 2, priority: 'high', label: '2 Jam', desc: 'Prioritas Tinggi' },
    { hours: 4, priority: 'medium', label: '4 Jam', desc: 'Standar Sedang' },
    { hours: 8, priority: 'low', label: '8 Jam', desc: 'Reguler Harian' },
    { hours: 24, priority: 'low', label: '24 Jam', desc: 'Pengerjaan Ringan' },
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
                Laporkan kendala kebersihan dan tentukan batas waktu SLA penanganan
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

          {/* Tingkat Urgensi / SLA dengan durasi dalam hitungan jam */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-semibold text-slate-700">
                Tingkat Urgensi / SLA (Batas Waktu Penanganan)
              </label>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                Target: {slaHours} Jam
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {slaOptions.map((opt) => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={() => {
                    setSlaHours(opt.hours);
                    setPriority(opt.priority);
                    setIsCustomHours(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all min-h-[52px] flex flex-col justify-between cursor-pointer ${
                    slaHours === opt.hours && !isCustomHours
                      ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-400 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {opt.label}
                    </span>
                    {slaHours === opt.hours && !isCustomHours && (
                      <Check className="w-3.5 h-3.5 text-rose-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {opt.desc}
                  </span>
                </button>
              ))}

              {/* Custom Hours Button */}
              <button
                type="button"
                onClick={() => setIsCustomHours(true)}
                className={`p-2.5 rounded-xl border text-left transition-all min-h-[52px] flex flex-col justify-between cursor-pointer ${
                  isCustomHours
                    ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-400 font-bold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold">Kustom Jam...</span>
                <span className="text-[10px] text-slate-500 font-normal">Tentukan durasi bebas</span>
              </button>
            </div>

            {/* Custom Hours Input field */}
            {isCustomHours && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 animate-in fade-in duration-150">
                <span className="text-xs font-semibold text-slate-700">Durasi Penanganan:</span>
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={slaHours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setSlaHours(Math.max(1, val));
                      if (val <= 1) setPriority('urgent');
                      else if (val <= 2) setPriority('high');
                      else if (val <= 6) setPriority('medium');
                      else setPriority('low');
                    }}
                    className="w-14 text-sm font-bold text-slate-800 text-center outline-none"
                  />
                  <span className="text-xs font-semibold text-slate-600">Jam</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  (Countdown dihitung mundur dari waktu tiket dibuat)
                </span>
              </div>
            )}
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

          {/* Lampiran Foto Keluhan (Opsional) - Dihubungkan ke penanganan keluhan tanpa contoh foto */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                Foto Keluhan <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <span className="text-[10px] text-slate-500">
                Terhubung langsung dengan verifikasi penanganan
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {!photoBefore ? (
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center group"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center text-slate-500 group-hover:text-rose-600 transition-colors">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-rose-600">
                      Ambil Foto / Unggah dari Perangkat
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Mendukung kamera HP, tangkapan layar, JPG, PNG
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Atau Link URL:</span>
                  <input
                    type="text"
                    value={photoBefore}
                    onChange={(e) => setPhotoBefore(e.target.value)}
                    placeholder="https://contoh.com/foto-bukti.jpg (opsional)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-48 flex items-center justify-center group">
                <img
                  src={photoBefore}
                  alt="Foto Keluhan Bukti Awal"
                  className="w-full h-40 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-semibold hover:bg-white flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ganti Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoBefore('')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoBefore('')}
                  aria-label="Hapus foto"
                  className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white text-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
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

