import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Award,
  Calendar,
  User,
  MapPin,
  Camera,
  ZoomIn,
} from 'lucide-react';
import { QCInspection } from '../../types';
import { evaluateQcSuccessRating } from '../../utils/qcJobsAggregation';

interface QcAuditResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: QCInspection | null;
}

export const QcAuditResultModal: React.FC<QcAuditResultModalProps> = ({
  isOpen,
  onClose,
  inspection,
}) => {
  const [copied, setCopied] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedPhoto) {
          setZoomedPhoto(null);
        } else {
          onClose();
        }
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
  }, [isOpen, onClose, zoomedPhoto]);

  if (!isOpen || !inspection) return null;

  const successRating = evaluateQcSuccessRating(inspection.score);
  const isPassed = inspection.score >= 85;
  const statusText = inspection.score >= 85 ? 'SESUAI STANDAR (≥ 85%)' : inspection.score >= 70 ? 'MENDEKATI (70% - 84%)' : 'TIDAK TERCAPAI (< 70%)';

  // Determine scale (1-5) and category
  const activeScale = inspection.qualityScale ?? Math.min(5, Math.max(1, Math.round(inspection.score / 20)));
  const SCALE_INFO: Record<number, { label: string; percent: number; desc: string; color: string }> = {
    1: { label: 'Sangat Kotor', percent: 20, desc: 'Kondisi sangat kotor, berantakan, tidak layak, dan perlu rework total segera.', color: 'bg-rose-50 text-rose-800 border-rose-200' },
    2: { label: 'Kurang Bersih', percent: 40, desc: 'Di bawah standar, masih ada sisa noda, debu, atau tumpahan yang tertinggal.', color: 'bg-orange-50 text-orange-800 border-orange-200' },
    3: { label: 'Cukup Bersih', percent: 60, desc: 'Memenuhi standar minimal kebersihan namun ada catatan perbaikan minor.', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    4: { label: 'Bersih', percent: 80, desc: 'Bersih, rapi, kering, higienis, dan sesuai standar SOP kebersihan fasilitas.', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    5: { label: 'Sangat Bersih', percent: 100, desc: 'Sangat istimewa, bersih sempurna, wangi, kinclong, dan melampaui SOP.', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  };

  const scaleInfo = SCALE_INFO[activeScale] || SCALE_INFO[4];
  const sessionWeight = inspection.sessionWeight ?? 100;
  const sessionContribution = inspection.sessionContribution ?? ((scaleInfo.percent / 100) * sessionWeight);

  // Markdown output generation
  const generateMarkdown = () => {
    let md = `## RESULT QC AUDIT\n\n`;
    md += `| Parameter / Uraian | Skala (1-5) | Kategori Penilaian | Distribusi Bobot Sesi | Kontribusi Nilai Sesi |\n`;
    md += `| :--- | :---: | :--- | :---: | :---: |\n`;
    md += `| ${inspection.areaName} | ${activeScale} | ${scaleInfo.label} (${scaleInfo.percent}%) | ${sessionWeight.toFixed(1)}% | ${sessionContribution.toFixed(1)}% |\n`;
    md += `\n**TOTAL SKOR MUTU: ${inspection.score} / 100**\n`;
    md += `**STATUS: ${statusText}**\n\n`;
    md += `**Catatan Evaluasi / Temuan:**\n`;
    md += `- ${inspection.notes || 'Area telah diaudit sesuai standar mutu kebersihan fasilitas.'}\n\n`;
    md += `**Rekomendasi Tindakan:**\n`;
    if (inspection.recommendations && inspection.recommendations.length > 0) {
      inspection.recommendations.forEach((rec) => {
        md += `- ${rec}\n`;
      });
    } else {
      md += `- Pertahankan kepatuhan SOP kebersihan dan sanitasi berkala.\n`;
    }
    return md;
  };

  const handleCopy = () => {
    const text = generateMarkdown();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="qc-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="qc-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94dvh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Topbar: Fully responsive for mobile phones */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-slate-50/90 flex flex-col gap-2.5 shrink-0">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                  Laporan Resmi Evaluasi QC Audit
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {inspection.areaName} • Auditor: {inspection.inspectorName}
                </p>
              </div>
            </div>

            {/* Prominent, touch-friendly close button */}
            <button
              id="close-qc-modal-btn"
              type="button"
              onClick={onClose}
              aria-label="Tutup Laporan QC"
              className="p-2 rounded-full text-slate-500 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 active:bg-slate-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Row: Copy Markdown & Print */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
            <span className="text-[11px] text-slate-600 font-mono">
              Skor Mutu: <strong className="text-blue-700 font-bold">{inspection.score}/100</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer min-h-[36px]"
                title="Salin tabel format Markdown"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin Markdown</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer min-h-[36px]"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Cetak</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Output table */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-5 print:p-0 overscroll-contain flex-1">
          {/* Metadata row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px]">Lokasi Area</span>
              <strong className="text-slate-800">{inspection.areaName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Petugas Pelaksana</span>
              <strong className="text-slate-800">{inspection.cleanerName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Auditor Pengawas</span>
              <strong className="text-slate-800">{inspection.inspectorName}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Waktu Inspeksi</span>
              <strong className="text-slate-800">{inspection.inspectedAt}</strong>
            </div>
          </div>

          {/* Table Container: RESULT QC AUDIT */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h4 className="font-bold text-sm tracking-wide">## RESULT QC AUDIT</h4>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${successRating.badgeClass}`}
              >
                {successRating.statusLabel}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Parameter / Deskripsi Pekerjaan</th>
                    <th className="py-2.5 px-3 text-center">Skala (1-5)</th>
                    <th className="py-2.5 px-3">Kategori Mutu</th>
                    <th className="py-2.5 px-3 text-center">Distribusi Bobot Sesi</th>
                    <th className="py-2.5 px-3 text-center">Kontribusi Skor</th>
                    <th className="py-2.5 px-3 text-center">Status Mutu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <div>{inspection.areaName}</div>
                      {inspection.evaluatedInputSummary && (
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                          {inspection.evaluatedInputSummary}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs">
                        {activeScale}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold border ${scaleInfo.color}`}>
                        {scaleInfo.label} ({scaleInfo.percent}%)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                      {sessionWeight.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                      {sessionContribution.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inspection.score >= 85
                          ? 'bg-emerald-100 text-emerald-800'
                          : inspection.score >= 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inspection.score >= 85 ? 'Sesuai Standar' : inspection.score >= 70 ? 'Mendekati' : 'Kurang'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Score Summary Footer in Table */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-700 font-medium block">
                  Sistem Penilaian: <span className="font-semibold">Skala 1 - 5 Berbasis Kategori (1: Sangat Kotor, 2: Kurang Bersih, 3: Cukup Bersih, 4: Bersih, 5: Sangat Bersih)</span>
                </span>
                <span className="text-[11px] text-slate-400">Standar: &lt;70% (Tidak Tercapai) • 70%-84% (Mendekati) • ≥85% (Sesuai Yang Diharapkan & Dipertahankan)</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900 text-sm">
                  TOTAL SKOR MUTU: <span className={`text-lg font-black ${successRating.colorClass}`}>{inspection.score}%</span> / 100%
                </div>
                <div className="text-xs font-bold mt-0.5">
                  KESIMPULAN:{' '}
                  <span className={`${successRating.colorClass} font-black`}>
                    [{successRating.statusLabel}]
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tingkat Keberhasilan Pekerjaan Hari Ini */}
          <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
            inspection.score >= 85
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : inspection.score >= 70
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <span>🎯 Tingkat Keberhasilan Pekerjaan Hari Ini:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${successRating.badgeClass}`}>
                {inspection.score}%
              </span>
            </div>
            <p>{successRating.conclusion}</p>
          </div>

          {/* Catatan Evaluasi & Temuan */}
          <div className="space-y-1 text-xs">
            <h5 className="font-bold text-slate-800">Catatan Evaluasi / Temuan:</h5>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
              <p>- {inspection.notes || 'Kondisi area memenuhi standar kebersihan SOP.'}</p>
            </div>
          </div>

          {/* Rekomendasi Tindakan */}
          <div className="space-y-1 text-xs">
            <h5 className="font-bold text-slate-800">Rekomendasi Tindakan:</h5>
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-amber-900 space-y-1">
              {inspection.recommendations && inspection.recommendations.length > 0 ? (
                inspection.recommendations.map((rec, i) => (
                  <p key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{rec}</span>
                  </p>
                ))
              ) : (
                <p className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>Pertahankan kepatuhan SOP kebersihan dan sanitasi berkala.</span>
                </p>
              )}
            </div>
          </div>

          {/* Foto Bukti / Dokumentasi 3 Tahap Kerja */}
          {(inspection.photoBefore || inspection.photoProgress || inspection.photoAfter || inspection.photoProof) && (
            <div className="space-y-2 text-xs">
              <h5 className="font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Dokumentasi Kerja 3 Tahap (Sebelum, Proses & Sesudah):</span>
                </span>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Terverifikasi Tim QC
                </span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div
                  onClick={() => setZoomedPhoto({
                    url: inspection.photoBefore || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80',
                    title: '1. SEBELUM (Kondisi Awal / Masalah)'
                  })}
                  className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col cursor-pointer group hover:border-blue-300 transition-colors"
                >
                  <div className="h-32 bg-slate-100 overflow-hidden relative">
                    <img
                      src={inspection.photoBefore || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80'}
                      alt="Sebelum Pengerjaan"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-rose-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      1. SEBELUM
                    </span>
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-md text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="p-1.5 text-center text-[10px] font-medium text-slate-600 bg-white border-t border-slate-100">
                    Kondisi Awal / Masalah
                  </div>
                </div>

                <div
                  onClick={() => setZoomedPhoto({
                    url: inspection.photoProgress || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
                    title: '2. PROSES (Eksekusi SOP & Treatment)'
                  })}
                  className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col cursor-pointer group hover:border-blue-300 transition-colors"
                >
                  <div className="h-32 bg-slate-100 overflow-hidden relative">
                    <img
                      src={inspection.photoProgress || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80'}
                      alt="Saat Proses Pengerjaan"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-amber-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      2. PROSES
                    </span>
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-md text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="p-1.5 text-center text-[10px] font-medium text-slate-600 bg-white border-t border-slate-100">
                    Eksekusi SOP & Treatment
                  </div>
                </div>

                <div
                  onClick={() => setZoomedPhoto({
                    url: inspection.photoAfter || inspection.photoProof || 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600&auto=format&fit=crop&q=80',
                    title: '3. SESUDAH (Hasil Akhir Standar QC)'
                  })}
                  className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col cursor-pointer group hover:border-blue-300 transition-colors"
                >
                  <div className="h-32 bg-slate-100 overflow-hidden relative">
                    <img
                      src={inspection.photoAfter || inspection.photoProof || 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600&auto=format&fit=crop&q=80'}
                      alt="Sesudah Pengerjaan Selesai"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-1.5 left-1.5 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      3. SESUDAH
                    </span>
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-md text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="p-1.5 text-center text-[10px] font-medium text-slate-600 bg-white border-t border-slate-100">
                    Hasil Akhir Standar QC
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer: Touch-friendly */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 text-xs text-slate-500">
          <span className="text-center sm:text-left">Verifikasi resmi Auditor QC bersertifikat fasilitas.</span>
          <button
            id="dismiss-qc-modal-btn"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-black active:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Photo Preview Lightbox */}
      {zoomedPhoto && (
        <div
          id="qc-zoomed-photo-modal"
          onClick={() => setZoomedPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6"
        >
          <div className="w-full max-w-3xl flex items-center justify-between text-white pb-3">
            <h4 className="text-sm sm:text-base font-bold text-white">{zoomedPhoto.title}</h4>
            <button
              id="close-qc-zoomed-photo-btn"
              type="button"
              onClick={() => setZoomedPhoto(null)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Tutup Perbesaran"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 max-w-3xl w-full flex items-center justify-center overflow-hidden p-2"
          >
            <img
              src={zoomedPhoto.url}
              alt={zoomedPhoto.title}
              className="max-w-full max-h-[80dvh] object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="w-full max-w-3xl pt-3 text-right">
            <button
              type="button"
              onClick={() => setZoomedPhoto(null)}
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl min-h-[44px] cursor-pointer"
            >
              Tutup Perbesaran
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
