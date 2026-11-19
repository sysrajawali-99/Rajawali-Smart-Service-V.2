import React, { useEffect, useRef } from 'react';
import { useCleaning } from '../../context/CleaningContext';
import { triggerTopNotification } from './TopNotificationPopup';
import {
  buildUncheckedReminderSummary,
  getLocalDateParts,
  getTodayScheduledMcpItems,
  getUncheckedTodayMcpItems,
} from '../../utils/mcpChecklist';
import { getActiveAppIcon } from '../../utils/dynamicFavicon';

const ONE_HOUR_MS = 60 * 60 * 1000;
const DATE_CHECK_INTERVAL_MS = 30 * 1000;

export const McpHourlyReminderMonitor: React.FC = () => {
  const {
    uploadedMcpPrograms,
    mcpChecklistResults,
    checklistLocations,
    activeProject,
    setActiveTab,
    setSelectedChecklistLocationId,
    userRole,
    companyProfile,
  } = useCleaning();

  const latestRef = useRef({
    uploadedMcpPrograms,
    mcpChecklistResults,
    checklistLocations,
    activeProject,
    userRole,
    companyProfile,
    setActiveTab,
    setSelectedChecklistLocationId,
  });

  latestRef.current = {
    uploadedMcpPrograms,
    mcpChecklistResults,
    checklistLocations,
    activeProject,
    userRole,
    companyProfile,
    setActiveTab,
    setSelectedChecklistLocationId,
  };

  const currentDateRef = useRef<string>(getLocalDateParts(new Date()).dateStr);
  const lastCheckAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const runHourlyReminderCheck = () => {
      const state = latestRef.current;
      if (state.userRole === 'klien') return;

      const now = new Date();
      const today = getLocalDateParts(now);
      currentDateRef.current = today.dateStr;
      lastCheckAtRef.current = now.getTime();

      const scheduledToday = getTodayScheduledMcpItems(
        state.uploadedMcpPrograms,
        state.checklistLocations,
        now
      );
      if (scheduledToday.length === 0) return;

      const unchecked = getUncheckedTodayMcpItems(
        scheduledToday,
        state.mcpChecklistResults,
        today.dateStr
      );
      if (unchecked.length === 0) return;

      const summary = buildUncheckedReminderSummary(unchecked);
      const title = `Pengingat Ceklist Kebersihan Area`;

      triggerTopNotification({
        category: 'mcp_checklist_reminder',
        title,
        message: summary.summaryText,
        targetTab: 'ceklist',
        targetAreaId: summary.primaryAreaId,
        actionLabel: 'Buka ceklist',
        projectName: state.activeProject?.name,
        metaId: `mcp-hourly-${today.dateStr}-${now.getHours()}-${now.getMinutes()}-${now.getTime()}`,
      });

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          const notif = new Notification(title, {
            body: summary.summaryText,
            tag: `mcp-checklist-${today.dateStr}-${now.getHours()}`,
            icon: getActiveAppIcon(state.companyProfile?.logoUrl),
          });
          notif.onclick = () => {
            try {
              window.focus();
            } catch {}
            if (summary.primaryAreaId) {
              latestRef.current.setSelectedChecklistLocationId(summary.primaryAreaId);
            }
            latestRef.current.setActiveTab('ceklist');
            notif.close();
          };
        } catch {
          // Abaikan jika browser memblokir instance Notification di konteks tertentu
        }
      }
    };

    // 1. Cek setiap 1 jam sekali selama aplikasi terbuka
    const hourlyTimer = window.setInterval(runHourlyReminderCheck, ONE_HOUR_MS);

    // 2. Pantau pergantian tanggal agar jadwal hari baru dihitung ulang otomatis saat tengah malam
    const dateRolloverTimer = window.setInterval(() => {
      const now = new Date();
      const todayStr = getLocalDateParts(now).dateStr;
      if (todayStr !== currentDateRef.current) {
        currentDateRef.current = todayStr;
        lastCheckAtRef.current = now.getTime();
      } else if (now.getTime() - lastCheckAtRef.current >= ONE_HOUR_MS) {
        // Fallback jika tab sempat sleep/throttled melebihi 1 jam
        runHourlyReminderCheck();
      }
    }, DATE_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(hourlyTimer);
      window.clearInterval(dateRolloverTimer);
    };
  }, []);

  return null;
};
