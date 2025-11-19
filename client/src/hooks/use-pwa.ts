import { useState, useEffect } from 'react';

interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  canInstall: boolean;
  updateAvailable: boolean;
  isOnline: boolean;
}

export function usePWA(): PWAStatus {
  const [status, setStatus] = useState<PWAStatus>({
    isInstalled: false,
    isStandalone: false,
    isIOS: false,
    isAndroid: false,
    canInstall: false,
    updateAvailable: false,
    isOnline: navigator.onLine,
  });

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalonePWA = window.matchMedia('(display-mode: standalone)').matches;
    const isStandaloneIOS = (window.navigator as any).standalone === true;
    
    // Check platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/.test(userAgent);
    
    // Check if installed
    const isInstalled = localStorage.getItem('pwa-installed') === 'true' || 
                       isStandalonePWA || isStandaloneIOS;

    setStatus(prev => ({
      ...prev,
      isInstalled,
      isStandalone: isStandalonePWA || isStandaloneIOS,
      isIOS,
      isAndroid,
    }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = () => {
      setStatus(prev => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setStatus(prev => ({ ...prev, isInstalled: true, canInstall: false }));
      localStorage.setItem('pwa-installed', 'true');
    });

    // Listen for online/offline
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setStatus(prev => ({ ...prev, updateAvailable: true }));
              }
            });
          }
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        setRegistration(reg);
        console.log('Service Worker registered');

        // Check for updates every hour
        setInterval(() => {
          reg.update();
        }, 3600000);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });

    // Handle controller change
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        window.location.reload();
        refreshing = true;
      }
    });
  }, []);

  const skipWaiting = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return {
    registration,
    updateAvailable,
    skipWaiting,
  };
}

export function useOfflineQueue() {
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    if (!('indexedDB' in window)) return;

    const checkQueue = async () => {
      try {
        const db = await openDB();
        const tx = db.transaction('pendingTasks', 'readonly');
        const store = tx.objectStore('pendingTasks');
        const count = await new Promise<number>((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        setQueueSize(count);
      } catch (error) {
        console.error('Failed to check offline queue:', error);
      }
    };

    checkQueue();
    
    // Check queue periodically
    const interval = setInterval(checkQueue, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TsutomeToumaDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('pendingTasks')) {
          db.createObjectStore('pendingTasks', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  };

  return queueSize;
}