import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissedTime, setDismissedTime] = useState<number | null>(null);

  useEffect(() => {
    // Check if app is already installed
    const checkStandalone = () => {
      const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches;
      const isStandaloneIOS = (window.navigator as any).standalone === true;
      setIsStandalone(isStandalonePWA || isStandaloneIOS);
    };
    
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // Check if prompt was dismissed
    const lastDismissed = localStorage.getItem('pwa-install-dismissed');
    if (lastDismissed) {
      const dismissedDate = parseInt(lastDismissed);
      setDismissedTime(dismissedDate);
      
      // Check if 7 days have passed
      const daysSinceDismissed = (Date.now() - dismissedDate) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS && !isStandalone) {
      // Show iOS instructions after 3 minutes
      const timer = setTimeout(() => {
        setShowIOSInstructions(true);
        setShowPrompt(true);
      }, 180000); // 3 minutes
      
      return () => clearTimeout(timer);
    }

    // Listen for install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 3 minutes or when user completes first task
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 180000); // 3 minutes
      
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Trigger prompt when user completes a task
  useEffect(() => {
    const handleTaskComplete = () => {
      if (deferredPrompt && !showPrompt && !isStandalone) {
        const lastDismissed = localStorage.getItem('pwa-install-dismissed');
        if (lastDismissed) {
          const daysSinceDismissed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
          if (daysSinceDismissed < 7) return;
        }
        setShowPrompt(true);
      }
    };

    window.addEventListener('task-completed', handleTaskComplete);
    return () => window.removeEventListener('task-completed', handleTaskComplete);
  }, [deferredPrompt, showPrompt, isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      localStorage.setItem('pwa-installed', 'true');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-20 left-0 right-0 z-50 p-4"
        data-testid="install-prompt-container"
      >
        {showIOSInstructions ? (
          <Card className="mx-auto max-w-md p-6 shadow-lg border-2 washi-texture">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg font-semibold mb-2">
                  アプリをインストール
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  ホーム画面に追加して、いつでも素早くアクセスできます
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-mono">1.</span>
                    <span>Safari下部の共有ボタンをタップ</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-mono">2.</span>
                    <span>「ホーム画面に追加」を選択</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-mono">3.</span>
                    <span>「追加」をタップして完了</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="flex-shrink-0"
                data-testid="button-dismiss-ios"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="mx-auto max-w-md p-6 shadow-lg border-2 washi-texture">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center seal-stamp">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg font-semibold mb-2">
                  務メ討魔録をインストール
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  ホーム画面に追加して、オフラインでも妖怪退治を続けましょう
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="flex-1"
                    data-testid="button-install"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    インストール
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    size="sm"
                    data-testid="button-dismiss"
                  >
                    後で
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="flex-shrink-0"
                data-testid="button-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  );
}