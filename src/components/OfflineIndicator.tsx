import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg border border-amber-300/60 no-print">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>កំពុងប្រើប្រាស់ក្រៅបណ្ដាញ (Offline) — កំពុងប្រើទិន្នន័យរក្សាទុកក្នុងម៉ាស៊ីន</span>
    </div>
  );
};
