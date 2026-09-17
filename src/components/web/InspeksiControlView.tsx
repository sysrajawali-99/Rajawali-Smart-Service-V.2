import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
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
  Copy,
  Check,
  Printer,
  Camera,
  Upload,
  Calendar,
  Layers,
  Filter,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { BeforeAfterModal } from '../modals/BeforeAfterModal';
import { QcAuditResultModal } from './QcAuditResultModal';
import { QCInspection, QCAuditParameterResult } from '../../types';
import {
  AuditableCompletedJob,
  AuditableJobSource,
  getCompletedJobsLast7Days,
  evaluateQcSuccessRating,
} from '../../utils/qcJobsAggregation';
import { PhotoWatermarkUploader } from '../common/PhotoWatermarkUploader';

// Standar Skala Mutu Kebersihan (1 - 5) Berbasis Kategori
export const QUALITY_SCALE_CATEGORIES: Record<
  number,
  {
    scale: 1 | 2 | 3 | 4 | 5;
    label: string;
    percent: number;
    desc: string;
    colorClass: string;
    badgeClass: string;
    activeClass: string;
    recommendation: string;
  }
> = {
  1: {
    scale: 1,
    label: 'Sangat Kotor',
    percent: 20,
    desc: 'Hasil pengerjaan sangat kotor, berantakan, tidak layak, dan perlu pengerjaan ulang total segera.',
    colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    activeClass: 'bg-rose-600 text-white shadow-md border-rose-600 ring-2 ring-rose-300',
    recommendation: 'Wajib pengerjaan ulang (rework) total segera dan lakukan peneguran SOP pendampingan.',
  },
  2: {
    scale: 2,
    label: 'Kurang Bersih',
    percent: 40,
    desc: 'Hasil pengerjaan di bawah standar, masih ada noda, debu, atau sisa kotoran yang tertinggal.',
    colorClass: 'text-orange-700 bg-orange-50 border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    activeClass: 'bg-orange-600 text-white shadow-md border-orange-600 ring-2 ring-orange-300',
    recommendation: 'Lakukan pembersihan ulang pada sisa noda/kotoran yang belum tuntas dan re-inspeksi.',
  },
  3: {
    scale: 3,
    label: 'Cukup Bersih',
    percent: 60,
    desc: 'Hasil pengerjaan cukup bersih memenuhi standar minimal, namun ada catatan perbaikan minor.',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    activeClass: 'bg-amber-600 text-white shadow-md border-amber-600 ring-2 ring-amber-300',
    recommendation: 'Hasil pengerjaan dapat diterima, namun tingkatkan ketelitian agar mencapai standar bintang 5.',
  },
  4: {
    scale: 4,
    label: 'Bersih',
    percent: 80,
    desc: 'Hasil pengerjaan bersih, rapi, kering, higienis, dan sesuai standar SOP operasional kebersihan.',
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    activeClass: 'bg-blue-600 text-white shadow-md border-blue-600 ring-2 ring-blue-300',
    recommendation: 'Hasil pengerjaan bersih dan sesuai SOP standar. Pertahankan konsistensi kinerja.',
  },
  5: {
    scale: 5,
    label: 'Sangat Bersih',
    percent: 100,
    desc: 'Hasil pengerjaan sangat istimewa, bersih sempurna, wangi, kinclong, dan melampaui standar SOP.',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    activeClass: 'bg-emerald-600 text-white shadow-md border-emerald-600 ring-2 ring-emerald-300',
    recommendation: 'Kualitas istimewa bintang 5! Pertahankan standar unggul ini dan berikan apresiasi kepada petugas.',
  },
};

export const InspeksiControlView: React.FC = () => {
  const {
    tasks,
    inspections,
    complaints,
    masterPrograms,
    submitQCInspection,
    selectedTaskId,
    setSelectedTaskId,
  } = useCleaning();

  // Reference date: current day baseline (15 Sep 2026)
  const [currentDateAnchor] = useState<Date>(new Date(2026, 8, 15));

  // Retrieve completed jobs from last 7 days across Weekly, Monthly, Special Job, and Complaints
  const completedJobsLast7Days = useMemo(() => {
    return getCompletedJobsLast7Days(tasks, complaints, masterPrograms, currentDateAnchor);
  }, [tasks, complaints, masterPrograms, currentDateAnchor]);

  // Source filters for 7-day completed jobs table
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchJobQuery, setSearchJobQuery] = useState<string>('');

  // Active job currently focused in evaluator
  const [activeJobId, setActiveJobId] = useState<string>(() => {
    return completedJobsLast7Days[0]?.id || '';
  });

  // Per-job audit ratings: Record<jobId, { scale, notes, photoBefore, photoProgress, photoAfter }>
  const [jobRatings, setJobRatings] = useState<
    Record<
      string,
      {
        scale: 1 | 2 | 3 | 4 | 5;
        notes?: string;
        photoBefore?: string;
        photoProgress?: string;
        photoAfter?: string;
      }
    >
  >({});

  // Helper to get or initialize rating for a job
  const getJobRating = (jobId: string, fallbackJob?: AuditableCompletedJob) => {
    if (jobRatings[jobId]) {
      return jobRatings[jobId];
    }
    // Set sensible initial scale per job (1 - 5)
    let initScale: 1 | 2 | 3 | 4 | 5 = 4;
    if (fallbackJob) {
      const hash = jobId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      if (hash % 4 === 0) {
        initScale = 5;
      } else if (hash % 4 === 1) {
        initScale = 4;
      } else if (hash % 4 === 2) {
        initScale = 4;
      } else {
        initScale = 3;
      }
    }

    return {
      scale: initScale,
      notes: '',
      photoBefore: fallbackJob?.photoBefore || 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&auto=format&fit=crop&q=80',
      photoProgress: fallbackJob?.photoProgress || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
      photoAfter: fallbackJob?.photoAfter || 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&auto=format&fit=crop&q=80',
    };
  };

  const setJobScale = (jobId: string, scale: 1 | 2 | 3 | 4 | 5) => {
    const current = getJobRating(jobId);
    setJobRatings((prev) => ({
      ...prev,
      [jobId]: {
        ...current,
        scale,
      },
    }));
  };

  const updateActiveJobRatingField = (
    field: 'scale' | 'notes' | 'photoBefore' | 'photoProgress' | 'photoAfter',
    value: any
  ) => {
    if (!activeJobId) return;
    const current = getJobRating(activeJobId, activeJob);
    setJobRatings((prev) => ({
      ...prev,
      [activeJobId]: {
        ...current,
        [field]: value,
      },
    }));
  };

  // Filtered jobs based on user selection in toolbar
  const filteredCompletedJobs = useMemo(() => {
    return completedJobsLast7Days.filter((job) => {
      if (sourceFilter !== 'all' && job.source !== sourceFilter) return false;
      if (searchJobQuery.trim()) {
        const q = searchJobQuery.toLowerCase();
        const matchTitle = job.title.toLowerCase().includes(q);
        const matchLoc = job.location.toLowerCase().includes(q);
        const matchCleaner = job.cleanerName.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchCleaner) return false;
      }
      return true;
    });
  }, [completedJobsLast7Days, sourceFilter, searchJobQuery]);

  // The active job currently being scored
  const activeJob = useMemo(() => {
    return (
      completedJobsLast7Days.find((j) => j.id === activeJobId) ||
      completedJobsLast7Days[0] ||
      null
    );
  }, [completedJobsLast7Days, activeJobId]);

  // All completed jobs from last 7 days are included for quality assurance audit
  const auditedJobList = completedJobsLast7Days;

  // SCORING & BOBOT SESI CALCULATION
  // Distribusi Bobot Sesi (Total 100%):
  // Bobot sesi per pekerjaan = 100% / Jumlah pekerjaan selesai
  // Setiap pekerjaan dinilai langsung dengan Skala 1 - 5 Berbasis Kategori:
  // 1: Sangat Kotor (20%)
  // 2: Kurang Bersih (40%)
  // 3: Cukup Bersih (60%)
  // 4: Bersih (80%)
  // 5: Sangat Bersih (100%)
  const totalJobsCount = auditedJobList.length;
  const sessionWeightPerJob = totalJobsCount > 0 ? 100 / totalJobsCount : 100;

  // Calculate detailed scores for each job in auditedJobList
  const jobDetailedScores = useMemo(() => {
    return auditedJobList.map((job) => {
      const r = getJobRating(job.id, job);
      const cat = QUALITY_SCALE_CATEGORIES[r.scale] || QUALITY_SCALE_CATEGORIES[4];
      const jobScore100 = cat.percent;
      const sessionContribution = (jobScore100 / 100) * sessionWeightPerJob;

      return {
        job,
        ratings: r,
        scale: r.scale,
        cat,
        jobScore100,
        sessionWeight: sessionWeightPerJob,
        sessionContribution,
      };
    });
  }, [auditedJobList, jobRatings, sessionWeightPerJob]);

  // Quick lookup map for job scores / bobot
  const jobScoresMap = useMemo(() => {
    const map: Record<string, { jobScore100: number; scale: 1 | 2 | 3 | 4 | 5; sessionContribution: number }> = {};
    jobDetailedScores.forEach((item) => {
      map[item.job.id] = {
        jobScore100: item.jobScore100,
        scale: item.scale,
        sessionContribution: item.sessionContribution,
      };
    });
    return map;
  }, [jobDetailedScores]);

  // Cumulative Quality Score of the Session (0 - 100%)
  const cumulativeFinalScore = useMemo(() => {
    if (jobDetailedScores.length === 0) return 0;
    const sum = jobDetailedScores.reduce((acc, curr) => acc + curr.sessionContribution, 0);
    return Math.min(100, Math.round(sum));
  }, [jobDetailedScores]);

  // Overall session success rating based on thresholds:
  // < 70% : Tidak Berhasil Tercapai
  // < 85% : Mendekati Hasil Yang Diharapkan
  // >= 85%: Sesuai Dengan Yang Diharapkan dan Bisa Dipertahankan
  const sessionSuccessRating = useMemo(() => {
    return evaluateQcSuccessRating(cumulativeFinalScore);
  }, [cumulativeFinalScore]);

  // Active Job Rating & Info
  const currentActiveJobRating = activeJob ? getJobRating(activeJob.id, activeJob) : null;
  const currentActiveJobItem = activeJob ? jobDetailedScores.find((item) => item.job.id === activeJob.id) : null;
  const activeCategoryInfo = currentActiveJobRating
    ? QUALITY_SCALE_CATEGORIES[currentActiveJobRating.scale] || QUALITY_SCALE_CATEGORIES[4]
    : null;
  const currentActiveJobScore100 = activeCategoryInfo ? activeCategoryInfo.percent : 80;

  // Recommendations for active job
  const activeJobRecommendations = useMemo(() => {
    if (!activeCategoryInfo) return [];
    return [activeCategoryInfo.recommendation];
  }, [activeCategoryInfo]);

  // State for Modals
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedInspectionForModal, setSelectedInspectionForModal] = useState<QCInspection | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // AI Smart Assistant Evaluator for active job
  const handleSmartEvaluateActiveJob = () => {
    if (!activeJob) return;
    const textToAnalyze = `${activeJob.title} ${activeJob.description} ${activeJob.location}`.toLowerCase();

    let targetScale: 1 | 2 | 3 | 4 | 5 = 4;
    let rationale = '';

    if (
      textToAnalyze.includes('tumpahan') ||
      textToAnalyze.includes('tumpah') ||
      textToAnalyze.includes('licin') ||
      textToAnalyze.includes('cairan') ||
      textToAnalyze.includes('minuman')
    ) {
      targetScale = 5;
      rationale = `Tumpahan cairan di ${activeJob.location} telah dibersihkan secara tuntas, lantai sudah kering dan aman dari resiko licin.`;
    } else if (
      textToAnalyze.includes('kristalisasi') ||
      textToAnalyze.includes('buffing') ||
      textToAnalyze.includes('poles') ||
      textToAnalyze.includes('kinclong')
    ) {
      targetScale = 5;
      rationale = `Pekerjaan khusus di ${activeJob.location} berhasil dengan hasil kilau optimal dan bersih sempurna.`;
    } else if (textToAnalyze.includes('bau') || textToAnalyze.includes('mampet') || textToAnalyze.includes('kerak')) {
      targetScale = 3;
      rationale = `Area ${activeJob.location} telah ditangani namun memerlukan pengecekan lanjutan agar tidak timbul kembali.`;
    } else {
      targetScale = 4;
      rationale = `Pekerjaan ${activeJob.title} di ${activeJob.location} telah selesai sesuai standar SOP kebersihan.`;
    }

    setJobRatings((prev) => ({
      ...prev,
      [activeJob.id]: {
        ...getJobRating(activeJob.id, activeJob),
        scale: targetScale,
        notes: `Evaluasi Otomatis AI: ${rationale}`,
      },
    }));
  };

  // Generate markdown of full session
  const generateMarkdownTable = () => {
    let md = `## RESULT QC AUDIT & KONTROL MUTU KEBERSIHAN\n\n`;
    md += `Tanggal Audit: ${currentDateAnchor.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}\n`;
    md += `Jumlah Pekerjaan Selesai: ${jobDetailedScores.length} Pekerjaan\n`;
    md += `Distribusi Bobot Sesi (Total 100%): ${sessionWeightPerJob.toFixed(1)}% per pekerjaan\n\n`;

    md += `### DAFTAR EVALUASI PEKERJAAN & BOBOT MUTU\n\n`;
    md += `| No | Sumber | Pekerjaan | Lokasi | Petugas | Tanggal | Skala (1-5) | Bobot Sesi | Kontribusi | Status Mutu |\n`;
    md += `| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |\n`;
    jobDetailedScores.forEach((item, idx) => {
      const status = item.jobScore100 >= 85 ? 'Sesuai & Pertahankan' : item.jobScore100 >= 70 ? 'Mendekati Harapan' : 'Tidak Tercapai';
      md += `| ${idx + 1} | ${item.job.sourceLabel} | ${item.job.title} | ${item.job.location} | ${item.job.cleanerName} | ${item.job.completedDate} | ${item.scale} (${item.cat.label}) | ${sessionWeightPerJob.toFixed(1)}% | ${item.sessionContribution.toFixed(1)}% | ${status} |\n`;
    });

    md += `\n**DISTRIBUSI BOBOT SESI: Total 100%**\n`;
    md += `**TOTAL NILAI AKHIR MUTU: ${cumulativeFinalScore}% / 100%**\n`;
    md += `**KESIMPULAN: [${sessionSuccessRating.statusLabel}]**\n\n`;
    md += `**Ringkasan Evaluasi:**\n`;
    md += `- ${sessionSuccessRating.conclusion}\n\n`;
    md += `**Standar Ambang Batas:**\n`;
    md += `- < 70% : Pekerjaan tidak berhasil tercapai\n`;
    md += `- 70% - 84% : Pekerjaan mendekati hasil yang diharapkan\n`;
    md += `- ≥ 85% : Pekerjaan sesuai dengan apa yang diharapkan dan bisa dipertahankan\n`;

    return md;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownTable();
    navigator.clipboard.writeText(md);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handlePrintAudit = () => {
    window.print();
  };

  // Submit Official QC Inspection
  const handleSaveAudit = () => {
    if (auditedJobList.length === 0) {
      alert('Tidak ada pekerjaan selesai yang ditemukan dalam 7 hari terakhir!');
      return;
    }

    jobDetailedScores.forEach((item) => {
      const r = item.ratings;
      submitQCInspection({
        taskId: item.job.originalId,
        areaName: item.job.location,
        cleanerName: item.job.cleanerName,
        score: item.jobScore100,
        status: item.jobScore100 >= 85 ? 'passed' : item.jobScore100 >= 70 ? 'needs_rework' : 'failed',
        criteriaScores: {
          floor: Math.round(item.jobScore100 / 5),
          glassAndMirrors: Math.round(item.jobScore100 / 5),
          odorAndAir: Math.round(item.jobScore100 / 5),
          wasteManagement: Math.round(item.jobScore100 / 5),
          suppliesCompleteness: Math.round(item.jobScore100 / 5),
        },
        notes: r.notes || `Audit mutu kebersihan: ${item.job.title} • Skala ${item.scale}: ${item.cat.label}.`,
        recommendations: [
          item.cat.recommendation,
          sessionSuccessRating.conclusion,
        ],
        photoProof: r.photoAfter,
        photoBefore: r.photoBefore,
        photoProgress: r.photoProgress,
        photoAfter: r.photoAfter,
        qualityScale: item.scale,
        qualityCategory: item.cat.label,
        sessionWeight: sessionWeightPerJob,
        sessionContribution: item.sessionContribution,
        inspectionSource: item.job.source,
        evaluatedInputSummary: `Audit QC (${item.job.sourceLabel}): ${item.job.title} • Skala ${item.scale} (${item.cat.label}) • Bobot Sesi ${sessionWeightPerJob.toFixed(1)}% (Kontribusi: ${item.sessionContribution.toFixed(1)}%).`,
      });
    });

    alert(
      `✅ Hasil Audit QC Berhasil Disimpan!\n` +
        `Jumlah Pekerjaan: ${totalJobsCount}\n` +
        `Distribusi Bobot Sesi: ${sessionWeightPerJob.toFixed(1)}% per pekerjaan (Total 100%)\n` +
        `Nilai Mutu Sesi: ${cumulativeFinalScore}%\n` +
        `Kesimpulan: [${sessionSuccessRating.statusLabel}]\n\n` +
        `${sessionSuccessRating.conclusion}`
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Inspeksi & Penjaminan Mutu Kebersihan (Quality Control)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit Pekerjaan Selesai 7 Hari Terakhir • Multi-Pilihan Pekerjaan • Bobot Terbagi Rata 100% • Standar Ambang Batas: 70% & 85%
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Periode: 7 Hari Terakhir s/d Hari Ini (15 Sep 2026)</span>
          </span>

          <button
            type="button"
            onClick={handleSmartEvaluateActiveJob}
            disabled={!activeJob}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Analisa otomatis kondisi pekerjaan terpilih"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ AI Evaluasi Otomatis</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: SELEKSI PEKERJAAN SELESAI 7 HARI TERAKHIR (Weekly, Monthly, Special Job & Komplain) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                1. Pilih Pekerjaan Selesai (7 Hari Terakhir) untuk Diaudit
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik baris pekerjaan untuk menilai parameternya di bawah. Kolom <strong>Bobot</strong> akan otomatis terupdate secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Rata-rata Bobot Mutu:</span>
            <span className={`font-mono font-bold px-2.5 py-1 rounded-lg border ${
              cumulativeFinalScore >= 85
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : cumulativeFinalScore >= 70
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {cumulativeFinalScore}%
            </span>
          </div>
        </div>

        {/* Filters and search for jobs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
              <Filter className="w-3 h-3 text-slate-400" /> Filter Sumber:
            </span>
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                sourceFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({completedJobsLast7Days.length})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('weekly')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                sourceFilter === 'weekly'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Weekly Activity
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('monthly')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                sourceFilter === 'monthly'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Monthly Activity
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('special_job')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                sourceFilter === 'special_job'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              Special Job
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('complaint')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                sourceFilter === 'complaint'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Komplain & Keluhan
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchJobQuery}
              onChange={(e) => setSearchJobQuery(e.target.value)}
              placeholder="Cari pekerjaan, area, atau petugas..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Mobile View: Completed Jobs Cards */}
        <div className="md:hidden space-y-3">
          {filteredCompletedJobs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              Tidak ada data pekerjaan yang ditemukan untuk kriteria filter ini.
            </div>
          ) : (
            filteredCompletedJobs.map((job) => {
              const isActive = activeJobId === job.id;
              const jobInfo = jobScoresMap[job.id] || {
                jobScore100: 80,
                scale: 4,
                sessionContribution: sessionWeightPerJob * 0.8,
              };
              const cat = QUALITY_SCALE_CATEGORIES[jobInfo.scale] || QUALITY_SCALE_CATEGORIES[4];

              return (
                <div
                  key={job.id}
                  onClick={() => setActiveJobId(job.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                    isActive
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${job.sourceBadgeClass}`}
                    >
                      {job.sourceLabel}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {job.completedDate}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">
                      {job.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {job.location} • {job.cleanerName}
                    </p>
                  </div>

                  {/* Rating Selector Strip on Card */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {([1, 2, 3, 4, 5] as const).map((val) => {
                        const isValSelected = jobInfo.scale === val;
                        const valCat = QUALITY_SCALE_CATEGORIES[val];
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setJobScale(job.id, val);
                              setActiveJobId(job.id);
                            }}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                              isValSelected
                                ? `${valCat.activeClass} shadow-xs scale-105`
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 block">
                        {jobInfo.sessionContribution.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Bobot: {sessionWeightPerJob.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveJobId(job.id);
                    }}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    {isActive ? '✓ Sedang Dinilai di Bawah' : 'Pilih & Nilai Pekerjaan Ini'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Completed Jobs Table */}
        <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Sumber Pekerjaan</th>
                  <th className="py-2.5 px-3">Uraian Pekerjaan Selesai</th>
                  <th className="py-2.5 px-3">Lokasi / Area</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-3 text-center">Tgl Selesai</th>
                  <th className="py-2.5 px-3 text-center">Distribusi Bobot Sesi</th>
                  <th className="py-2.5 px-3 text-center">Skala Kualitas (1 - 5)</th>
                  <th className="py-2.5 px-3 text-center">Kontribusi Skor</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCompletedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Tidak ada data pekerjaan yang ditemukan untuk kriteria filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredCompletedJobs.map((job) => {
                    const isActive = activeJobId === job.id;
                    const jobInfo = jobScoresMap[job.id] || {
                      jobScore100: 80,
                      scale: 4,
                      sessionContribution: sessionWeightPerJob * 0.8,
                    };
                    const cat = QUALITY_SCALE_CATEGORIES[jobInfo.scale] || QUALITY_SCALE_CATEGORIES[4];

                    return (
                      <tr
                        key={job.id}
                        className={`transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-50/90 ring-1 ring-blue-500 font-semibold shadow-2xs'
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setActiveJobId(job.id)}
                      >
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${job.sourceBadgeClass}`}
                          >
                            {job.sourceLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 line-clamp-1">
                            {job.title}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            {job.description}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {job.location}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                          {job.cleanerName}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {job.completedDate}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                          {sessionWeightPerJob.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            {([1, 2, 3, 4, 5] as const).map((val) => {
                              const isValSelected = jobInfo.scale === val;
                              const valCat = QUALITY_SCALE_CATEGORIES[val];
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setJobScale(job.id, val);
                                    setActiveJobId(job.id);
                                  }}
                                  title={`Skala ${val}: ${valCat.label} (${valCat.percent}%)`}
                                  className={`w-6 h-6 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                                    isValSelected
                                      ? `${valCat.activeClass} scale-105`
                                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-[10px] font-bold text-slate-600 mt-0.5">
                            {cat.label} ({cat.percent}%)
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                          <span className="text-slate-900 font-black">{jobInfo.sessionContribution.toFixed(1)}%</span>
                          <span className="text-[9px] text-slate-400 block font-normal">
                            dari {sessionWeightPerJob.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              jobInfo.jobScore100 >= 85
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : jobInfo.jobScore100 >= 70
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {jobInfo.jobScore100 >= 85 ? 'Sesuai' : jobInfo.jobScore100 >= 70 ? 'Mendekati' : 'Tidak Tercapai'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveJobId(job.id);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                          >
                            {isActive ? 'Sedang Dinilai' : 'Nilai & Foto'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table summary banner */}
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">
                Total Pekerjaan: <strong className="text-blue-700">{filteredCompletedJobs.length}</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-slate-700">
                Distribusi Bobot Sesi: <strong className="text-blue-700">{sessionWeightPerJob.toFixed(1)}% per pekerjaan</strong> (Total 100%)
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">
                Total Nilai Sesi: <strong className={sessionSuccessRating.colorClass}>{cumulativeFinalScore}% / 100%</strong>
              </span>
            </div>

            <div className="text-slate-500 text-[11px]">
              Klik skala <strong>1 - 5</strong> langsung pada baris atau pilih untuk input catatan & foto dokumentasi.
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: FORMULIR PENILAIAN QC PEKERJAAN & DOKUMENTASI 3 TAHAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: 5 Parameters Evaluation Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Active Job Card Banner */}
          {activeJob ? (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${activeJob.sourceBadgeClass}`}
                  >
                    {activeJob.sourceLabel}
                  </span>
                  <span className="text-xs text-slate-500">
                    Tgl Selesai: <strong>{activeJob.completedDate}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                    <span className="text-slate-500 font-semibold">Bobot Sesi:</span>
                    <strong className="font-mono text-blue-700">{sessionWeightPerJob.toFixed(1)}%</strong>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span className="text-slate-500 font-semibold">Kontribusi:</span>
                    <strong className="font-mono text-slate-900">
                      {currentActiveJobItem ? currentActiveJobItem.sessionContribution.toFixed(1) : 0}%
                    </strong>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentActiveJobScore100 >= 85
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentActiveJobScore100 >= 70
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {currentActiveJobScore100 >= 85 ? 'Sesuai Standar' : currentActiveJobScore100 >= 70 ? 'Mendekati Harapan' : 'Tidak Tercapai'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {activeJob.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Lokasi: <strong className="text-slate-800">{activeJob.location}</strong> • Petugas:{' '}
                  <strong className="text-slate-800">{activeJob.cleanerName}</strong>
                </p>
                {activeJob.description && (
                  <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                    {activeJob.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              Silakan pilih salah satu pekerjaan dari tabel di atas untuk dinilai.
            </div>
          )}

          {/* DOKUMENTASI KERJA 3 TAHAP (SEBELUM, PROSES, SESUDAH) */}
          {activeJob && currentActiveJobRating && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-sky-100 text-sky-700 rounded-lg">
                    <Camera className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Dokumentasi Visual 3 Tahap Kerja (Wajib QC)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Petugas wajib menyertakan foto Sebelum, Saat Proses, dan Sesudah Pengerjaan
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  3 Tahap Standar SOP
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Sebelum */}
                <PhotoWatermarkUploader
                  label="1. Sebelum (Before)"
                  sublabel="Kondisi Awal / Masalah"
                  stage="before"
                  currentPhoto={currentActiveJobRating.photoBefore || ''}
                  onPhotoAccepted={(url) => updateActiveJobRatingField('photoBefore', url)}
                  areaName={activeJob.location}
                  cleanerName={activeJob.cleanerName}
                />

                {/* 2. Proses */}
                <PhotoWatermarkUploader
                  label="2. Proses (Progress)"
                  sublabel="Pelaksanaan SOP"
                  stage="progress"
                  currentPhoto={currentActiveJobRating.photoProgress || ''}
                  onPhotoAccepted={(url) => updateActiveJobRatingField('photoProgress', url)}
                  areaName={activeJob.location}
                  cleanerName={activeJob.cleanerName}
                />

                {/* 3. Sesudah */}
                <PhotoWatermarkUploader
                  label="3. Sesudah (After)"
                  sublabel="Hasil Bersih Standar"
                  stage="after"
                  currentPhoto={currentActiveJobRating.photoAfter || ''}
                  onPhotoAccepted={(url) => updateActiveJobRatingField('photoAfter', url)}
                  areaName={activeJob.location}
                  cleanerName={activeJob.cleanerName}
                />
              </div>
            </div>
          )}

          {/* PENILAIAN MUTU PEKERJAAN (SKALA 1 - 5 BERBASIS KATEGORI) */}
          {activeJob && currentActiveJobRating && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Penilaian Mutu Pekerjaan (Skala 1 - 5 Berbasis Kategori)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Pilih kategori skala hasil pengerjaan. Distribusi bobot sesi (Total 100%) dan kontribusi skor terhitung otomatis.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                      Distribusi Bobot Sesi
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-700">
                      {sessionWeightPerJob.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                      Kontribusi Skor
                    </span>
                    <span className="text-sm font-mono font-black text-slate-900">
                      {currentActiveJobItem ? currentActiveJobItem.sessionContribution.toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 5 CATEGORIES (1 to 5) BUTTON SELECTOR */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {([1, 2, 3, 4, 5] as const).map((val) => {
                  const itemCat = QUALITY_SCALE_CATEGORIES[val];
                  const isSelected = currentActiveJobRating.scale === val;

                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => updateActiveJobRatingField('scale', val)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? `${itemCat.activeClass} scale-[1.02]`
                          : 'bg-slate-50 hover:bg-white hover:border-slate-300 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {val}
                        </span>
                        <span
                          className={`text-[11px] font-mono font-bold ${
                            isSelected ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          {itemCat.percent}%
                        </span>
                      </div>
                      <div>
                        <div
                          className={`font-bold text-xs sm:text-[13px] ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {itemCat.label}
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 line-clamp-2 leading-tight ${
                            isSelected ? 'text-white/90' : 'text-slate-500'
                          }`}
                        >
                          {itemCat.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Category Guideline Banner */}
              {activeCategoryInfo && (
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${activeCategoryInfo.colorClass}`}>
                  <span className="font-bold shrink-0 mt-0.5">
                    Skala {activeCategoryInfo.scale}: {activeCategoryInfo.label} ({activeCategoryInfo.percent}%)
                  </span>
                  <span className="text-slate-700 font-medium flex-1">
                    {activeCategoryInfo.desc}
                  </span>
                </div>
              )}

              {/* Catatan Evaluasi & Rekomendasi */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Catatan Evaluasi / Temuan Lapangan:
                  </label>
                  <textarea
                    rows={2}
                    value={currentActiveJobRating.notes || ''}
                    onChange={(e) => updateActiveJobRatingField('notes', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                    placeholder="Masukkan catatan spesifik hasil audit kebersihan pekerjaan ini..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Rekomendasi Tindakan Lanjut SOP:
                    </label>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-950">
                    <p className="flex items-start gap-1.5">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{activeCategoryInfo?.recommendation || 'Pertahankan standar kebersihan dan SOP berkala.'}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REKAPITULASI AUDIT HARI INI & TINGKAT KEBERHASILAN (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card: Tingkat Keberhasilan Pekerjaan Hari Ini */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Award className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Rekapitulasi Mutu & Keberhasilan
                </h3>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${sessionSuccessRating.badgeClass}`}>
                {sessionSuccessRating.statusLabel}
              </span>
            </div>

            {/* Big Score Display */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                  Rata-rata Bobot Mutu
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-3xl font-black font-heading ${sessionSuccessRating.colorClass}`}>
                    {cumulativeFinalScore}%
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 100%</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                  Total Diaudit
                </span>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">
                  {completedJobsLast7Days.length} Pekerjaan Selesai
                </span>
              </div>
            </div>

            {/* Threshold Guidelines Indicator */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Standar Tingkat Keberhasilan:</span>
                <span className={sessionSuccessRating.colorClass}>
                  Posisi: {cumulativeFinalScore}%
                </span>
              </div>

              <div className="space-y-1.5 font-medium">
                {/* < 70% */}
                <div
                  className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                    cumulativeFinalScore < 70
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px]">Nilai &lt; 70% : Tidak Berhasil Tercapai</div>
                    <p className="text-[10px] mt-0.5 leading-tight">
                      Pekerjaan tidak berhasil tercapai. Kualitas di bawah standar minimal dan memerlukan pengerjaan ulang.
                    </p>
                  </div>
                </div>

                {/* 70% - 84% */}
                <div
                  className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                    cumulativeFinalScore >= 70 && cumulativeFinalScore < 85
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60'
                  }`}
                >
                  <Percent className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px]">Nilai 70% - 84% : Mendekati Hasil Yang Diharapkan</div>
                    <p className="text-[10px] mt-0.5 leading-tight">
                      Pekerjaan mendekati hasil yang diharapkan dengan catatan penyempurnaan minor.
                    </p>
                  </div>
                </div>

                {/* >= 85% */}
                <div
                  className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                    cumulativeFinalScore >= 85
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[11px]">Nilai ≥ 85% : Sesuai Yang Diharapkan & Bisa Dipertahankan</div>
                    <p className="text-[10px] mt-0.5 leading-tight">
                      Pekerjaan sesuai dengan apa yang diharapkan dan standar mutu dapat dipertahankan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between text-xs">
                <span className="font-mono font-bold tracking-wide">## RESULT QC AUDIT</span>
                <span className="text-[11px] text-slate-300">Total: {completedJobsLast7Days.length} Pekerjaan</span>
              </div>

              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[9px] border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">Pekerjaan</th>
                      <th className="py-2 px-2">Petugas</th>
                      <th className="py-2 px-2 text-center">Skala</th>
                      <th className="py-2 px-2 text-center">Bobot Sesi</th>
                      <th className="py-2 px-2 text-center">Kontribusi</th>
                      <th className="py-2 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {jobDetailedScores.map((item) => (
                      <tr
                        key={item.job.id}
                        onClick={() => setActiveJobId(item.job.id)}
                        className={`cursor-pointer transition-colors ${
                          activeJobId === item.job.id ? 'bg-blue-50 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2 px-2.5 font-medium text-slate-800">
                          <div className="line-clamp-1">{item.job.title}</div>
                          <span className="text-[9px] text-slate-400 block">{item.job.sourceLabel}</span>
                        </td>
                        <td className="py-2 px-2 text-slate-600 whitespace-nowrap">
                          {item.job.cleanerName}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                            {item.scale}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                          {sessionWeightPerJob.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.sessionContribution.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.jobScore100 >= 85
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.jobScore100 >= 70
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.jobScore100 >= 85 ? 'Sesuai' : item.jobScore100 >= 70 ? 'Mendekati' : 'Kurang'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Distribusi Bobot Sesi (Total 100%)</span>
                  <span className="text-[10px] text-slate-500">{sessionWeightPerJob.toFixed(1)}% per pekerjaan</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Nilai Mutu</span>
                  <span className={`text-base font-black ${sessionSuccessRating.colorClass}`}>
                    {cumulativeFinalScore}% / 100%
                  </span>
                </div>
              </div>
            </div>

            {/* Kesimpulan Resmi Card */}
            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              cumulativeFinalScore >= 85
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : cumulativeFinalScore >= 70
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <strong className="block mb-1 text-[11px] font-bold">
                Kesimpulan Resmi Auditor QC:
              </strong>
              <p>{sessionSuccessRating.conclusion}</p>
            </div>

            {/* Action Buttons: Copy Markdown & Save Audit */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Salin tabel format Markdown persis sesuai spesifikasi"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Markdown Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Salin Format Markdown Audit</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrintAudit}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title="Cetak Laporan Audit"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>

              {/* Submit Approval */}
              <button
                type="button"
                onClick={handleSaveAudit}
                className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                  cumulativeFinalScore >= 85
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : cumulativeFinalScore >= 70
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {cumulativeFinalScore >= 85 ? (
                  <>
                    <ThumbsUp className="w-4 h-4" />
                    <span>Setujui & Simpan Audit QC (SESUAI & PERTAHANKAN)</span>
                  </>
                ) : cumulativeFinalScore >= 70 ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Simpan Audit (MENDEKATI HASIL YANG DIHARAPKAN)</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Simpan & Kirim Ulang (TIDAK BERHASIL TERCAPAI)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Riwayat Audit QC Terbaru */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Riwayat Audit QC Terbaru ({inspections.length})</span>
            </h4>

            <div className="space-y-2.5">
              {inspections.slice(0, 4).map((insp) => {
                const inspRating = evaluateQcSuccessRating(insp.score);
                return (
                  <div
                    key={insp.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 line-clamp-1">{insp.areaName}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${inspRating.badgeClass}`}
                        >
                          {inspRating.statusLabel}
                        </span>
                        <span className="font-black text-slate-900 font-heading">
                          {insp.score}%
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Petugas: <strong className="text-slate-700">{insp.cleanerName}</strong> • Auditor: {insp.inspectorName}
                    </p>

                    <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200">
                      "{insp.notes}"
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <span>{insp.inspectedAt}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedInspectionForModal(insp)}
                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat Detail QC &rarr;</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Full RESULT QC AUDIT Modal for viewing past inspection */}
      <QcAuditResultModal
        isOpen={!!selectedInspectionForModal}
        onClose={() => setSelectedInspectionForModal(null)}
        inspection={selectedInspectionForModal}
      />
    </div>
  );
};
