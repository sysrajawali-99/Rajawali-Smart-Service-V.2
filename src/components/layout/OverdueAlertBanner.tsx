import React, { useState } from 'react';
import { AlertCircle, Clock, ChevronRight, X, BellRing } from 'lucide-react';
import { useCleaning } from '../../context/CleaningContext';

export const OverdueAlertBanner: React.FC = () => {
  const { notifications, setActiveTab, dismissNotification } = useCleaning();
  const [isDismissed, setIsDismissed] = useState(false);

  // Find urgent / overdue notifications
  const overdueNotifs = notifications.filter(
    (n) => (n.type === 'urgent' || n.type === 'warning') && !n.read
  );

  if (isDismissed || overdueNotifs.length === 0) {
    return null;
  }

  const primaryNotif = overdueNotifs[0];

  return (
    <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white px-3 sm:px-4 py-2 text-xs shadow-md border-b border-rose-700 animate-in fade-in slide-in-from-top-1 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 rounded-lg bg-white/20 shrink-0 animate-pulse">
            <BellRing className="w-4 h-4 text-white" />
          </span>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-rose-900/60 px-1.5 py-0.5 rounded border border-white/20">
              Peringatan Jadwal Area
            </span>
            <span className="font-semibold truncate">
              {primaryNotif.title}: {primaryNotif.message}
            </span>
            {overdueNotifs.length > 1 && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                +{overdueNotifs.length - 1} area lainnya
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('ceklist')}
            className="px-2.5 py-1 bg-white text-rose-700 hover:bg-rose-50 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <span>Buka Ceklist Area</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              dismissNotification(primaryNotif.id);
              setIsDismissed(true);
            }}
            className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup banner peringatan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
