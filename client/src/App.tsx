import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { OfflineIndicator } from "@/components/offline-indicator";
import { useServiceWorker } from "@/hooks/use-pwa";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Home from "@/pages/home";
import ShurenPage from "@/pages/shuren";
import ShihanPage from "@/pages/shihan";
import ShikakuPage from "@/pages/shikaku";
import BossPage from "@/pages/boss";
import ShopPage from "@/pages/shop";
import ProfilePage from "@/pages/profile";
import CalendarPage from "@/pages/calendar";
import StoryPage from "@/pages/story";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shuren" component={ShurenPage} />
      <Route path="/shihan" component={ShihanPage} />
      <Route path="/shikaku" component={ShikakuPage} />
      <Route path="/boss" component={BossPage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/story" component={StoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PWAProvider>
          <div className="relative min-h-screen">
            <OfflineIndicator />
            <Router />
            <BottomNav />
            <InstallPrompt />
          </div>
          <Toaster />
        </PWAProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// PWA Provider component for service worker management
function PWAProvider({ children }: { children: React.ReactNode }) {
  const { updateAvailable, skipWaiting } = useServiceWorker();
  const { toast } = useToast();

  useEffect(() => {
    if (updateAvailable) {
      toast({
        title: "アップデート利用可能",
        description: "新しいバージョンが利用可能です。更新しますか？",
        action: (
          <Button
            size="sm"
            onClick={() => {
              skipWaiting();
              window.location.reload();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
        ),
        duration: 10000,
      });
    }
  }, [updateAvailable, skipWaiting, toast]);

  return <>{children}</>;
}

export default App;
