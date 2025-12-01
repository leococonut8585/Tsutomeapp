import { useEffect, type ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { OfflineIndicator } from "@/components/offline-indicator";
import { ErrorBoundary } from "@/components/error-boundary";
import { useServiceWorker } from "@/hooks/use-pwa";
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
import EquipmentPage from "@/pages/equipment";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import AdminPage from "@/pages/admin";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

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
      <Route path="/equipment" component={EquipmentPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/story" component={StoryPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <PWAProvider>
              <AuthShell />
              <Toaster />
            </PWAProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AuthShell() {
  const { authenticated, isLoading, user } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!authenticated) {
      if (location !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    const isAdmin = user?.role === "admin";
    if (isAdmin) {
      if (location !== "/admin") {
        navigate("/admin", { replace: true });
      }
      return;
    }

    if (location === "/login" || location === "/admin") {
      navigate("/", { replace: true });
    }
  }, [authenticated, isLoading, location, navigate, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <p>冒険者を呼び出しています...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route>
            <Redirect to="/login" />
          </Route>
        </Switch>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="relative min-h-screen">
      <OfflineIndicator />
      <Router />
      {!isAdmin && <BottomNav />}
      {!isAdmin && <InstallPrompt />}
    </div>
  );
}

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  return null;
}

// PWA Provider component for service worker management
function PWAProvider({ children }: { children: ReactNode }) {
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
