import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
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

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install KaamBridgeNepal (KBN) App"
        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#263449] bg-slate-100/80 dark:bg-[#172338] text-slate-800 dark:text-[#F8FAFC] hover:border-[#16C784] hover:text-[#16C784] transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'px-2.5 py-1.5 text-xs font-medium' : 'px-3 py-1.5 text-xs font-semibold'
        }`}
      >
        <Download className="w-3.5 h-3.5 text-[#16C784]" aria-hidden="true" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#16C784]/15 text-[#16C784] flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pwa-install-guide-title" className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Install KaamBridgeNepal (KBN)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Run KBN as a standalone app
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="text-xs text-slate-600 dark:text-[#94A3B8] space-y-2 list-decimal pl-4 leading-relaxed">
                <li>Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.</li>
                <li>Scroll down and choose <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong> to launch KaamBridgeNepal (KBN) full-screen.</li>
              </ol>
            ) : (
              <ol className="text-xs text-slate-600 dark:text-[#94A3B8] space-y-2 list-decimal pl-4 leading-relaxed">
                <li>Open your browser menu (<strong>⋮</strong>) or look for the <strong>Install</strong> icon in the address bar.</li>
                <li>Select <strong>Install KaamBridgeNepal (KBN)</strong> (or <strong>Add to Home Screen</strong> on mobile).</li>
                <li>If viewing inside an embedded preview frame, open the app directly in its own browser tab to trigger one-click install.</li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2 rounded-xl bg-[#16C784] text-[#0B1220] text-xs font-semibold hover:bg-[#13b074] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#F59E0B] px-3.5 py-2 text-xs font-semibold text-[#0B1220] shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Offline Mode — Cached data is active</span>
    </div>
  );
};
