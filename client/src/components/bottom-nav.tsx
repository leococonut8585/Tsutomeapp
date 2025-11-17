import { Home, Dumbbell, Skull, ShoppingBag, User } from "lucide-react";
import { useLocation, Link } from "wouter";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "務メ", testId: "nav-tsutome" },
    { path: "/shuren", icon: Dumbbell, label: "修練", testId: "nav-shuren" },
    { path: "/boss", icon: Skull, label: "大敵", testId: "nav-boss" },
    { path: "/shop", icon: ShoppingBag, label: "商店", testId: "nav-shop" },
    { path: "/profile", icon: User, label: "記録", testId: "nav-profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-card-border shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ path, icon: Icon, label, testId }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button
                data-testid={testId}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[56px] transition-colors rounded-md hover-elevate active-elevate-2 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
                <span className={`text-xs font-semibold ${isActive ? "font-bold" : ""}`}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
