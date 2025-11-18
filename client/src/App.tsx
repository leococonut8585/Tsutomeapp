import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/bottom-nav";
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
        <div className="relative min-h-screen">
          <Router />
          <BottomNav />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
