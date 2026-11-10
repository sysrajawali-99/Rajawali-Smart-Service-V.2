import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wrench,
  ChevronRight,
  X,
  MessageSquareWarning,
  Award,
  ClipboardList,
} from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';
import { onRecordChange } from '../../services/apiService';
import { COLLECTIONS } from '../../services/apiService';

export type TopPopupCategory =
  | 'checklist_overdue' // Jadwal Ceklist Terlewat
  | 'deadline_reminder' // Pengingat Batas Waktu!
  | 'new_complaint'     // Komplain Baru Diterima!
  | 'qc_approved'       // Inspeksi QC Disetujui
  | 'damage_report';    // Laporan Kerusakan

export interface TopPopupItem {
  id: string;
  category: TopPopupCategory;
  title: string;
  message: string;
  timestamp: string;
  projectName?: string;
  targetTab: string;
  metaId?: string;
}

// Gentle Web Audio tone for mobile & web
function playNotificationTone(category: TopPopupCategory) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (category === 'new_complaint' || category === 'checklist_overdue') {
      // High-priority dual chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (category === 'qc_approved') {
      // Harmonious success chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.18); // C6
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else {
      // Warm alert chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}
}

// Mobile device haptic feedback
function triggerHaptic(category: TopPopupCategory) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (category === 'new_complaint' || category === 'checklist_overdue') {
        navigator.vibrate([100, 50, 100, 50, 150]);
      } else {
        navigator.vibrate([80, 40, 80]);
      }
    }
  } catch {}
}

export const TopNotificationPopup: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    userRole,
    activeProject,
    dailyChecklists,
    tasks,
    acknowledgeComplaintNotifications,
  } = useCleaning();

  const [popups, setPopups] = useState<TopPopupItem[]>([]);
  const processedKeysRef = useRef<Set<string>>(new Set());
  const touchStartYRef = useRef<number | null>(null);

  // Helper to add a popup and play sensory feedback
  const pushPopup = (item: Omit<TopPopupItem, 'id' | 'timestamp'>) => {
    const dedupeKey = `${item.category}-${item.title}-${item.metaId || ''}`;
    if (processedKeysRef.current.has(dedupeKey)) return;
    processedKeysRef.current.add(dedupeKey);

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const newPopup: TopPopupItem = {
      ...item,
      id: `top-pop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowStr,
      projectName: item.projectName || activeProject?.name || 'Proyek Aktif',
    };

    setPopups((prev) => [newPopup, ...prev.slice(0, 2)]);
    playNotificationTone(item.category);
    triggerHaptic(item.category);
  };

  const removePopup = (id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  };

  const handleOpenPopupAction = (popup: TopPopupItem) => {
    removePopup(popup.id);
    if (userRole === 'klien') {
      if (popup.category === 'new_complaint') {
        acknowledgeComplaintNotifications();
        setActiveTab('klien-keluhan');
      } else if (popup.category === 'damage_report') {
        setActiveTab('klien-kerusakan');
      } else if (popup.category === 'checklist_overdue' || popup.targetTab?.includes('ceklist')) {
        setActiveTab('klien-checklist');
      } else {
        setActiveTab('klien-mode');
      }
      return;
    }
    if (popup.category === 'new_complaint') {
      acknowledgeComplaintNotifications();
      const target = activeTab.startsWith('klien-') ? 'klien-keluhan' : 'complaint';
      setActiveTab(target);
    } else {
      setActiveTab(popup.targetTab);
    }
  };

  // 1. Listen for global custom events (e.g. from tests or internal triggers)
  useEffect(() => {
    const handleCustomPopupEvent = (e: any) => {
      if (e.detail) {
        pushPopup(e.detail);
      }
    };
    window.addEventListener('sco-top-popup', handleCustomPopupEvent);
    return () => window.removeEventListener('sco-top-popup', handleCustomPopupEvent);
  }, [activeProject?.name]);

  // 2. Real-time Socket.IO Broadcast Listener for incoming operational records from other devices
  useEffect(() => {
    const unsubscribe = onRecordChange((evt) => {
      const { collection, data, action, isDeleted } = evt;
      if (action === 'delete' || isDeleted || !data) return;

      const projId = data.projectId;
      const isTargetProject = !activeProject?.id || !projId || projId === activeProject.id;
      if (!isTargetProject) return;

      if (collection === COLLECTIONS.COMPLAINTS && data.status === 'open') {
        pushPopup({
          category: 'new_complaint',
          title: 'Komplain Baru Diterima!',
          message: `${data.reporterName || 'Klien'}: "${data.description || 'Ada keluhan baru yang perlu ditangani'}" di ${data.areaName || 'Area'}`,
          targetTab: userRole === 'klien' ? 'klien-keluhan' : 'complaint',
          metaId: data.id,
          projectName: activeProject?.name,
        });
      } else if (collection === COLLECTIONS.DAMAGE_REPORTS && (data.status === 'dilaporkan' || data.status === 'dalam_perbaikan')) {
        pushPopup({
          category: 'damage_report',
          title: `Laporan Kerusakan: ${data.ticketNo || 'Baru'}`,
          message: `${data.reporterName || 'Petugas'} melaporkan kerusakan "${data.itemName || 'Fasilitas'}" di ${data.locationName || 'Area'}`,
          targetTab: 'kerusakan',
          metaId: data.id,
          projectName: activeProject?.name,
        });
      } else if (collection === COLLECTIONS.INSPECTIONS && data.status === 'passed') {
        pushPopup({
          category: 'qc_approved',
          title: 'Inspeksi QC Disetujui!',
          message: `Inspeksi mutu di ${data.areaName || 'Area'} berhasil lolos dengan nilai memuaskan ${data.score || 100}/100.`,
          targetTab: 'inspeksi',
          metaId: data.id,
          projectName: activeProject?.name,
        });
      } else if (collection === COLLECTIONS.TASKS && data.qcStatus === 'approved') {
        pushPopup({
          category: 'qc_approved',
          title: 'Inspeksi QC Disetujui!',
          message: `Pekerjaan "${data.workDescription || data.areaName}" telah diverifikasi dan disetujui auditor QC.`,
          targetTab: 'inspeksi',
          metaId: data.id,
          projectName: activeProject?.name,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeProject?.id, userRole]);

  // 3. Periodic Background Check (Every 45s) for:
  //    - "Jadwal Ceklist Terlewat" (Missed hourly slots before current hour)
  //    - "Pengingat Batas Waktu!" (Tasks with deadline nearing within 30 min)
  useEffect(() => {
    const checkOverdueAndDeadlines = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();

      // A. Ceklist Terlewat Check
      let missedSlotCount = 0;
      let sampleLocation = '';
      const todayYmd = now.toISOString().split('T')[0];

      dailyChecklists.forEach((dc) => {
        if (dc.date === todayYmd && (!activeProject?.id || dc.projectId === activeProject.id)) {
          dc.hourlySlots.forEach((slot) => {
            if (slot.hour < currentHour && slot.status === 'pending') {
              missedSlotCount++;
              if (!sampleLocation) sampleLocation = dc.locationName;
            }
          });
        }
      });

      if (missedSlotCount > 0) {
        const hourKey = `overdue-${todayYmd}-${currentHour}`;
        if (!processedKeysRef.current.has(hourKey)) {
          processedKeysRef.current.add(hourKey);
          pushPopup({
            category: 'checklist_overdue',
            title: `Jadwal Ceklist Terlewat (${missedSlotCount} Slot)!`,
            message: `Terdapat ${missedSlotCount} slot pemeriksaan di ${sampleLocation || 'area gedung'} yang belum diisi melewati jadwal.`,
            targetTab: 'ceklist',
            metaId: hourKey,
          });
        }
      }

      // B. Pengingat Batas Waktu Tasks Check (Within 30 mins from deadline)
      tasks.forEach((task) => {
        if (
          task.status !== 'completed' &&
          task.status !== 'pending_qc' &&
          task.deadlineTime &&
          (!activeProject?.id || task.projectId === activeProject.id)
        ) {
          const parts = task.deadlineTime.split(':');
          if (parts.length >= 2) {
            const dlHour = parseInt(parts[0], 10);
            const dlMinute = parseInt(parts[1], 10);
            if (!isNaN(dlHour) && !isNaN(dlMinute)) {
              const diffMinutes = (dlHour - currentHour) * 60 + (dlMinute - currentMinutes);
              if (diffMinutes > 0 && diffMinutes <= 30) {
                const dlKey = `deadline-${task.id}-${todayYmd}`;
                if (!processedKeysRef.current.has(dlKey)) {
                  processedKeysRef.current.add(dlKey);
                  pushPopup({
                    category: 'deadline_reminder',
                    title: 'Pengingat Batas Waktu!',
                    message: `Tugas "${task.areaName}" tinggal ${diffMinutes} menit lagi sebelum deadline (${task.deadlineTime} WIB). Segera rampungkan!`,
                    targetTab: 'activity',
                    metaId: task.id,
                  });
                }
              }
            }
          }
        }
      });
    };

    // Run check after initial delay and every 45 seconds
    const initialTimer = setTimeout(checkOverdueAndDeadlines, 3000);
    const intervalTimer = setInterval(checkOverdueAndDeadlines, 45000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [dailyChecklists, tasks, activeProject?.id]);

  if (popups.length === 0) return null;

  return (
    <div
      id="top-notification-popup-portal"
      className="fixed top-2 sm:top-4 inset-x-2 sm:inset-x-auto sm:right-4 sm:max-w-md z-[9999] pointer-events-none flex flex-col gap-2.5"
    >
      {popups.map((popup) => (
        <TopPopupCard
          key={popup.id}
          popup={popup}
          onClose={() => removePopup(popup.id)}
          onAction={() => handleOpenPopupAction(popup)}
          touchStartYRef={touchStartYRef}
        />
      ))}
    </div>
  );
};

// Individual popup card with auto-dismiss progress and swipe up to dismiss
const TopPopupCard: React.FC<{
  popup: TopPopupItem;
  onClose: () => void;
  onAction: () => void;
  touchStartYRef: React.MutableRefObject<number | null>;
}> = ({ popup, onClose, onAction, touchStartYRef }) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const DURATION_MS = 8000;

  useEffect(() => {
    if (isPaused) return;
    const interval = 80;
    const step = (interval / DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(timer);
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused]);

  // Trigger onClose safely outside of render / state updater
  useEffect(() => {
    if (progress <= 0) {
      onClose();
    }
  }, [progress, onClose]);

  const config = getCategoryConfig(popup.category);
  const IconComponent = config.icon;

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchStartYRef.current = e.touches[0].clientY;
        setIsPaused(true);
      }}
      onTouchEnd={(e) => {
        setIsPaused(false);
        if (touchStartYRef.current !== null) {
          const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
          if (deltaY < -35) {
            // Swiped up
            onClose();
          }
          touchStartYRef.current = null;
        }
      }}
      className={`pointer-events-auto rounded-2xl border shadow-2xl backdrop-blur-md transition-all transform animate-in slide-in-from-top-4 duration-300 overflow-hidden ${config.bgClass} ${config.borderClass}`}
    >
      {/* Mobile Dynamic Pull Capsule */}
      <div className="flex justify-center pt-1.5 pb-0.5 sm:hidden">
        <div className="w-8 h-1 rounded-full bg-slate-300/80" />
      </div>

      <div className="p-3 sm:p-3.5">
        <div className="flex items-start gap-3">
          {/* Category Icon Badge */}
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${config.iconWrapClass}`}>
            <IconComponent className="w-5 h-5" />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase border shadow-2xs ${config.badgeClass}`}>
                {config.label}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {popup.timestamp}
              </span>
              {popup.projectName && (
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px] hidden xs:inline">
                  • {popup.projectName}
                </span>
              )}
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 leading-snug">
              {popup.title}
            </h4>

            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
              {popup.message}
            </p>

            {/* Quick Action Button */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={onAction}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${config.buttonClass}`}
              >
                <span>{config.actionLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Geser ke atas untuk tutup
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Line Indicator */}
      <div className="w-full bg-slate-200/50 h-1">
        <div
          className={`h-full transition-all duration-75 ${config.progressClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// Color palettes and configurations per category
function getCategoryConfig(category: TopPopupCategory) {
  switch (category) {
    case 'checklist_overdue':
      return {
        label: 'Ceklist Terlewat',
        icon: ClipboardList,
        iconWrapClass: 'bg-rose-600 text-white shadow-rose-200',
        bgClass: 'bg-white/95 border-rose-300/80',
        borderClass: 'ring-1 ring-rose-400/30',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        buttonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
        progressClass: 'bg-rose-500',
        actionLabel: 'Buka Ceklist Area',
      };
    case 'deadline_reminder':
      return {
        label: 'Pengingat Batas Waktu!',
        icon: Clock,
        iconWrapClass: 'bg-amber-500 text-white shadow-amber-200',
        bgClass: 'bg-white/95 border-amber-300/80',
        borderClass: 'ring-1 ring-amber-400/30',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
        progressClass: 'bg-amber-500',
        actionLabel: 'Lihat Tugas',
      };
    case 'new_complaint':
      return {
        label: 'Komplain Baru Diterima!',
        icon: MessageSquareWarning,
        iconWrapClass: 'bg-rose-600 text-white shadow-rose-200 animate-pulse',
        bgClass: 'bg-white/95 border-rose-400/90',
        borderClass: 'ring-2 ring-rose-500/30',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-black',
        buttonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
        progressClass: 'bg-rose-600',
        actionLabel: 'Tindak Lanjuti Komplain',
      };
    case 'qc_approved':
      return {
        label: 'Inspeksi QC Disetujui',
        icon: Award,
        iconWrapClass: 'bg-emerald-600 text-white shadow-emerald-200',
        bgClass: 'bg-white/95 border-emerald-300/80',
        borderClass: 'ring-1 ring-emerald-400/30',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        progressClass: 'bg-emerald-500',
        actionLabel: 'Buka Hasil QC',
      };
    case 'damage_report':
      return {
        label: 'Laporan Kerusakan',
        icon: Wrench,
        iconWrapClass: 'bg-indigo-600 text-white shadow-indigo-200',
        bgClass: 'bg-white/95 border-indigo-300/80',
        borderClass: 'ring-1 ring-indigo-400/30',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        progressClass: 'bg-indigo-500',
        actionLabel: 'Buka Tiket Kerusakan',
      };
    default:
      return {
        label: 'Notifikasi',
        icon: AlertTriangle,
        iconWrapClass: 'bg-sky-600 text-white shadow-sky-200',
        bgClass: 'bg-white/95 border-slate-300',
        borderClass: 'ring-1 ring-slate-300',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        buttonClass: 'bg-sky-600 hover:bg-sky-700 text-white',
        progressClass: 'bg-sky-500',
        actionLabel: 'Buka Menu',
      };
  }
}

// Global utility helper to trigger pop-up from anywhere in the application
export function triggerTopNotification(payload: Omit<TopPopupItem, 'id' | 'timestamp'>) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sco-top-popup', { detail: payload }));
  }
}
