import { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncPending, setSyncPending] = useState(false);
  const [cachedDataMode, setCachedDataMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setCachedDataMode(false);
      
      // Trigger background sync when coming back online
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          return (registration as any).sync.register('sync-tasks');
        }).then(() => {
          toast({
            title: "オンラインに復帰",
            description: "保留中のタスクを同期しています...",
            duration: 3000,
          });
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setCachedDataMode(true);
      toast({
        title: "オフラインモード",
        description: "インターネット接続が失われました。キャッシュされたデータを表示します。",
        variant: "destructive",
        duration: 5000,
      });
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        setSyncPending(false);
        toast({
          title: "同期完了",
          description: event.data.message,
          duration: 3000,
        });
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    // Check IndexedDB for pending tasks
    checkPendingTasks();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [toast]);

  const checkPendingTasks = async () => {
    if (!('indexedDB' in window)) return;

    try {
      const db = await openDB();
      const tx = db.transaction('pendingTasks', 'readonly');
      const store = tx.objectStore('pendingTasks');
      const count = await new Promise<number>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      setSyncPending(count > 0);
    } catch (error) {
      console.error('Failed to check pending tasks:', error);
    }
  };

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

  // Always show indicator when offline
  if (!isOnline) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 p-2"
          data-testid="offline-indicator"
        >
          <Alert className="mx-auto max-w-md border-destructive/50 bg-destructive/10 washi-texture">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="font-serif flex items-center gap-2">
              <span>オフラインモード</span>
              {syncPending && (
                <Badge variant="outline" className="text-xs">
                  同期待ち
                </Badge>
              )}
            </AlertDescription>
          </Alert>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Show sync pending indicator when online but have pending tasks
  if (isOnline && syncPending) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-40 p-2"
          data-testid="sync-indicator"
        >
          <div className="mx-auto max-w-md">
            <Badge variant="secondary" className="w-full justify-center py-1 font-serif">
              <Cloud className="h-3 w-3 mr-2 animate-pulse" />
              同期中...
            </Badge>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}

// Utility function to queue tasks when offline
export async function queueOfflineTask(taskData: any) {
  if (!('indexedDB' in window)) {
    throw new Error('IndexedDB not supported');
  }

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
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

  const tx = db.transaction('pendingTasks', 'readwrite');
  const store = tx.objectStore('pendingTasks');
  
  await store.add({
    data: taskData,
    timestamp: Date.now()
  });

  // Register for background sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-tasks');
  }
}
