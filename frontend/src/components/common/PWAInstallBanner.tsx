import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed before
    const isDismissed = sessionStorage.getItem('runzone_pwa_dismissed');
    if (isDismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS Safari / desktop manual instruction
      alert('To install RunZone on iOS: Tap Share ➔ "Add to Home Screen"');
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('runzone_pwa_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-night/95 backdrop-blur-md border border-hairline-strong p-3.5 shadow-2xl space-y-2.5 font-sans">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-cinder/20 border border-cinder/40 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-cinder" />
          </div>
          <div>
            <h4 className="font-display font-bold text-xs text-chalk">
              Install RunZone Native App
            </h4>
            <p className="text-[10px] text-chalk-muted leading-tight mt-0.5">
              Add to Home Screen for 60 FPS offline GPS tracking and screen wake lock.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-chalk-dim hover:text-chalk transition-colors"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-2 pt-1 hairline-t">
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 bg-panel hover:bg-panel-light text-chalk-muted hover:text-chalk text-[11px] font-medium border border-hairline transition-colors"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 px-3 py-1.5 bg-cinder hover:bg-cinder-hover text-chalk text-[11px] font-display font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Download className="w-3 h-3" />
          <span>INSTALL APP</span>
        </button>
      </div>
    </div>
  );
};
