import React from 'react';
import { VITE_API_URL } from '../../services/apiService';
import { AlertTriangle } from 'lucide-react';

export const TestModeBanner: React.FC = () => {
  if (!VITE_API_URL) {
    return null;
  }

  return (
    <aside
      aria-label="Peringatan Server Uji"
      className="w-full bg-rose-600 text-white text-xs font-semibold py-1 px-3 text-center flex items-center justify-center gap-1.5 shadow-sm z-50 shrink-0 select-none"
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-200 animate-pulse" />
      <span>MODE UJI - terhubung ke server uji</span>
      <span className="text-[10px] text-rose-200 font-mono hidden sm:inline">
        ({VITE_API_URL})
      </span>
    </aside>
  );
};
