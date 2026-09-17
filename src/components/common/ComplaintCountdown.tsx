import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ComplaintCountdownProps {
  deadlineTimestamp?: number;
  slaHours?: number;
  status: 'open' | 'in_progress' | 'resolved';
  resolvedAt?: string;
  size?: 'sm' | 'md';
}

export const ComplaintCountdown: React.FC<ComplaintCountdownProps> = ({
  deadlineTimestamp,
  slaHours,
  status,
  resolvedAt,
  size = 'md',
}) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (status === 'resolved') return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  if (status === 'resolved') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold ${
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        }`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Selesai ({resolvedAt || 'Tepat Waktu'})</span>
      </div>
    );
  }

  // If no deadline timestamp is set, fallback to default or calculating
  const targetTime = deadlineTimestamp || (slaHours ? now + slaHours * 3600 * 1000 : now + 3600 * 1000);
  const diffMs = targetTime - now;

  if (diffMs <= 0) {
    // Overdue
    const overdueMs = Math.abs(diffMs);
    const overdueHours = Math.floor(overdueMs / (3600 * 1000));
    const overdueMins = Math.floor((overdueMs % (3600 * 1000)) / 60000);
    const overdueSecs = Math.floor((overdueMs % 60000) / 1000);

    const overdueStr =
      overdueHours > 0
        ? `${overdueHours}j ${overdueMins}m`
        : `${overdueMins}m ${overdueSecs}d`;

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 font-bold animate-pulse ${
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        }`}
        title="Batas waktu SLA telah terlampaui"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>SLA Terlewat: -{overdueStr}</span>
      </div>
    );
  }

  // Count down
  const hours = Math.floor(diffMs / (3600 * 1000));
  const minutes = Math.floor((diffMs % (3600 * 1000)) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Urgency styling based on remaining minutes
  const totalRemainingMinutes = Math.floor(diffMs / 60000);
  let badgeStyle = 'bg-emerald-50 border-emerald-200 text-emerald-800';
  let dotColor = 'bg-emerald-500';

  if (totalRemainingMinutes < 15) {
    badgeStyle = 'bg-rose-50 border-rose-200 text-rose-800 ring-1 ring-rose-300';
    dotColor = 'bg-rose-500 animate-ping';
  } else if (totalRemainingMinutes < 45) {
    badgeStyle = 'bg-amber-50 border-amber-200 text-amber-800';
    dotColor = 'bg-amber-500';
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border ${badgeStyle} font-semibold transition-all ${
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      }`}
    >
      <div className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
        <Clock className="w-3.5 h-3.5 shrink-0 opacity-80" />
      </div>
      <div className="flex items-baseline gap-1 font-mono font-bold tracking-tight">
        {hours > 0 && (
          <>
            <span>{hours}</span>
            <span className="text-[10px] font-sans font-medium text-slate-500">jam</span>
          </>
        )}
        <span>{pad(minutes)}</span>
        <span className="text-[10px] font-sans font-medium text-slate-500">mnt</span>
        <span>{pad(seconds)}</span>
        <span className="text-[10px] font-sans font-medium text-slate-500">dtk</span>
      </div>
    </div>
  );
};
