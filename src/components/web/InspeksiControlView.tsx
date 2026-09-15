import React, { useState } from 'react';
import {
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  MapPin,
  Clock,
  Sparkles,
  Sliders,
  ThumbsUp,
  RotateCcw,
  Eye,
  Award,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { BeforeAfterModal } from '../modals/BeforeAfterModal';

export const InspeksiControlView: React.FC = () => {
  const { tasks, inspections, submitQCInspection, selectedTaskId, setSelectedTaskId } = useCleaning();

  // Tasks waiting for QC
  const pendingQCTasks = tasks.filter((t) => t.status === 'pending_qc');

  // Currently selected task to audit
  const activeTaskId = selectedTaskId || pendingQCTasks[0]?.id || tasks[0]?.id;
  const currentTask = tasks.find((t) => t.id === activeTaskId);

  // Criteria scoring state (each 0 - 20 pts)
  const [scoreFloor, setScoreFloor] = useState<number>(19);
  const [scoreGlass, setScoreGlass] = useState<number>(19);
  const [scoreOdor, setScoreOdor] = useState<number>(18);
  const [scoreWaste, setScoreWaste] = useState<number>(20);
  const [scoreSupplies, setScoreSupplies] = useState<number>(20);
  const [qcNotes, setQcNotes] = useState<string>('Pembersihan sangat rapi, wangi dan higienis.');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const totalScore = scoreFloor + scoreGlass + scoreOdor + scoreWaste + scoreSupplies;

  const handleAuditSubmit = (decision: 'passed' | 'needs_rework') => {
    if (!currentTask) return;

    submitQCInspection({
      taskId: currentTask.id,
      score: totalScore,
      status: decision,
      criteriaScores: {
        floor: scoreFloor,
        glassAndMirrors: scoreGlass,
        odorAndAir: scoreOdor,
        wasteManagement: scoreWaste,
        suppliesCompleteness: scoreSupplies,
      },
      notes: qcNotes,
      photoProof: currentTask.photoAfter,
    });

    alert(
      decision === 'passed'
        ? `✅ Audit Berhasil! Tugas di ${currentTask.areaName} disetujui dengan skor ${totalScore}/100.`
        : `⚠️ Tugas di ${currentTask.areaName} dikembalikan ke petugas untuk perbaikan ulang.`
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Inspeksi & Penjaminan Mutu Kebersihan (Quality Control)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit standar kebersihan bintang 5, evaluasi 5 pilar sanitasi, dan persetujuan hasil kerja petugas
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
            {pendingQCTasks.length} Tugas Menunggu Audit QC
          </span>
        </div>
      </div>

      {/* Main Grid: Left Audit Form, Right History & Pending list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Audit Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {currentTask ? (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              {/* Task Header being inspected */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Formulir Audit Standar Kebersihan
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{currentTask.areaName}</h3>
                  <p className="text-xs text-slate-500">
                    Petugas: <strong className="text-slate-800">{currentTask.cleanerName}</strong> • {currentTask.buildingFloor}
                  </p>
                </div>

                {currentTask.photoBefore && currentTask.photoAfter && (
                  <button
                    onClick={() => setPreviewModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs flex items-center gap-1.5 border border-sky-200"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Cek Foto Hasil</span>
                  </button>
                )}
              </div>

              {/* Total Score Display Badge */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Kalkulasi Skor Mutu (QC Score)
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Standar Lolos: Minimal 85 poin dari total 100 poin
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black font-heading text-emerald-400">
                    {totalScore}
                  </span>
                  <span className="text-xs text-slate-400"> / 100</span>
                </div>
              </div>

              {/* 5 Pillars Scoring Criteria */}
              <div className="space-y-3 pt-2 text-xs">
                <span className="font-bold text-slate-800 block">
                  Penilaian 5 Parameter Standar Kebersihan:
                </span>

                {/* 1. Lantai */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>1. Kebersihan & Kilap Lantai (Bebas noda/debu, kering, tidak licin)</span>
                    <span className="text-sky-600 font-bold">{scoreFloor} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={scoreFloor}
                    onChange={(e) => setScoreFloor(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>

                {/* 2. Kaca & Cermin */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>2. Kaca, Cermin, & Permukaan Meja (Bebas bercak air & sidik jari)</span>
                    <span className="text-sky-600 font-bold">{scoreGlass} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={scoreGlass}
                    onChange={(e) => setScoreGlass(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>

                {/* 3. Kesegaran & Aroma Udara */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>3. Kesegaran & Sirkulasi Udara (Aroma wangi, tidak lembab/apek)</span>
                    <span className="text-sky-600 font-bold">{scoreOdor} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={scoreOdor}
                    onChange={(e) => setScoreOdor(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>

                {/* 4. Pengelolaan Tempat Sampah */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>4. Pengelolaan Sampah (Kosong, bersih, plastik baru terpasang rapi)</span>
                    <span className="text-sky-600 font-bold">{scoreWaste} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={scoreWaste}
                    onChange={(e) => setScoreWaste(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>

                {/* 5. Kelengkapan Consumable Supplies */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>5. Kelengkapan Supplies (Sabun, tisu gulung, sanitizer terisi)</span>
                    <span className="text-sky-600 font-bold">{scoreSupplies} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={scoreSupplies}
                    onChange={(e) => setScoreSupplies(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Inspector Feedback Remarks */}
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-700">
                  Catatan Evaluasi Supervisor / Rekomendasi:
                </label>
                <textarea
                  rows={2}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Beri catatan apresiasi atau detail yang perlu diperbaiki petugas..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
                />
              </div>

              {/* Approval Decision Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleAuditSubmit('needs_rework')}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Perlu Perbaikan (Tolak)</span>
                </button>

                <button
                  onClick={() => handleAuditSubmit('passed')}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Setujui Hasil Kerja (Lolos Audit QC)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-400">
              Pilih tugas dari daftar di sebelah kanan untuk memulai audit QC.
            </div>
          )}
        </div>

        {/* Right Column: Pending QC Queue & Inspection History (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Pending Queue */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Antrean Verifikasi ({pendingQCTasks.length})
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">Tugas yang telah diselesaikan oleh petugas</p>

            <div className="space-y-2">
              {pendingQCTasks.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  Semua tugas telah terverifikasi!
                </div>
              ) : (
                pendingQCTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      task.id === activeTaskId
                        ? 'border-sky-500 bg-sky-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{task.areaName}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Pending QC
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Oleh: <span className="font-semibold text-slate-700">{task.cleanerName}</span> • Selesai: {task.completedTime || 'Baru saja'}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Inspection History Log */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Riwayat Audit QC Terbaru</h3>
            <p className="text-[11px] text-slate-400 mb-3">Hasil inspeksi pengawas lapangan</p>

            <div className="space-y-2.5">
              {inspections.map((insp) => (
                <div
                  key={insp.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{insp.areaName}</span>
                    <span className="font-black text-emerald-600 font-heading text-sm">
                      {insp.score}/100
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Petugas: {insp.cleanerName} • Auditor: {insp.inspectorName}
                  </p>

                  <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-200">
                    "{insp.notes}"
                  </p>

                  <span className="text-[10px] text-slate-400 block">{insp.inspectedAt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Before After Modal */}
      {currentTask && (
        <BeforeAfterModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={`Verifikasi Visual: ${currentTask.areaName}`}
          areaName={currentTask.areaName}
          cleanerName={currentTask.cleanerName}
          photoBefore={currentTask.photoBefore}
          photoAfter={currentTask.photoAfter}
          completedTime={currentTask.completedTime}
          remarks={currentTask.remarks}
        />
      )}
    </div>
  );
};
