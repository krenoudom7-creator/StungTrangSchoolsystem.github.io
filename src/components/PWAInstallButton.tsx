import React, { useState } from 'react';
import { MonitorDown, Download, X, Laptop, Smartphone, CheckCircle2, Keyboard } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'login';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, isMac, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  const buttonClasses =
    variant === 'sidebar'
      ? 'w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md transition-all cursor-pointer'
      : variant === 'login'
      ? 'inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-400/40 shadow-md transition-all cursor-pointer'
      : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold bg-blue-900 hover:bg-blue-800 text-white rounded-lg shadow-xs transition-all cursor-pointer';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="ដំឡើងកម្មវិធីលើកុំព្យូទ័រ ឬទូរស័ព្ទ (Install Desktop App)"
        className={buttonClasses}
      >
        {isInstallable ? (
          <Download className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <MonitorDown className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className={variant === 'header' ? 'hidden md:inline' : ''}>
          {isIOS ? 'ដំឡើងលើ iPhone / iPad' : 'ដំឡើងលើកុំព្យូទ័រ (PC)'}
        </span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 font-khmer"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-amber-300/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-950 text-amber-400 flex items-center justify-center shrink-0">
                  {isIOS ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isIOS ? 'របៀបដំឡើងលើ iPhone / iPad' : 'ដំឡើងជាកម្មវិធីលើកុំព្យូទ័រ (Desktop App)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    វិទ្យាល័យសម្ដេចតេជោហ៊ុនសែនស្ទឹងត្រង់ · Windows / macOS / Chrome / Edge
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="បិទ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="mt-4 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <p>១. បើកតំណនេះក្នុងកម្មវិធី <strong>Safari</strong> លើ iPhone ឬ iPad។</p>
                <p>២. ចុចប៊ូតុង <strong>Share (ចែករំលែក)</strong> នៅផ្នែកខាងក្រោមអេក្រង់។</p>
                <p>៣. អូសចុះក្រោម រួចចុច <strong>Add to Home Screen</strong> ហើយចុច <strong>Add</strong>។</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
                  <div className="font-bold text-blue-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Google Chrome ឬ Microsoft Edge (Windows / Mac)</span>
                  </div>
                  <p>
                    ១. បើកកម្មវិធីនេះនៅក្នុង Tab ថ្មីពេញអេក្រង់ (Open in New Tab)។
                  </p>
                  <p>
                    ២. ចុចរូបតំណាង <strong>Install (កុំព្យូទ័រមានសញ្ញាព្រួញចុះ)</strong> នៅជ្រុងខាងស្ដាំនៃរបារ Address Bar ឬចូលម៉ឺនុយ <strong>⋮ → Cast, save, and share → Install page as app</strong>។
                  </p>
                  <p>
                    ៣. ចុច <strong>Install</strong> ដើម្បីដាក់រូបតំណាងសាលាលើ Desktop & Taskbar កុំព្យូទ័រ។
                  </p>
                </div>

                {isMac && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900">Safari លើ macOS</div>
                    <p>ចុចម៉ឺនុយ <strong>File → Add to Dock</strong> ដើម្បីដំឡើងជាកម្មវិធីផ្ទាល់លើ Mac។</p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Keyboard className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>ផ្លូវកាត់ក្តារចុចសម្រាប់កុំព្យូទ័រ (PC Shortcuts)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-amber-200/60">
                      <span>ស្វែងរករហ័ស</span>
                      <kbd className="font-mono font-bold text-blue-900">Ctrl+K</kbd>
                    </div>
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-amber-200/60">
                      <span>បង្រួម/ពង្រីកម៉ឺនុយ</span>
                      <kbd className="font-mono font-bold text-blue-900">Alt+B</kbd>
                    </div>
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-amber-200/60">
                      <span>ផ្ទាំងដើម / វត្តមាន</span>
                      <kbd className="font-mono font-bold text-blue-900">Alt+1 / 2</kbd>
                    </div>
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded border border-amber-200/60">
                      <span>បើក Telegram Bot</span>
                      <kbd className="font-mono font-bold text-blue-900">Alt+T</kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-blue-950 py-2.5 text-xs font-bold text-white hover:bg-blue-900 transition-colors cursor-pointer"
            >
              យល់ព្រម / បិទ
            </button>
          </div>
        </div>
      )}
    </>
  );
};
