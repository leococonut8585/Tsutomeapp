import { Home, Dumbbell, Skull, ShoppingBag, User } from "lucide-react";
import { useLocation, Link } from "wouter";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "務メ", testId: "nav-tsutome" },
    { path: "/shuren", icon: Dumbbell, label: "修練", testId: "nav-shuren" },
    { path: "/boss", icon: Skull, label: "大敵", testId: "nav-boss" },
    { path: "/profile", icon: User, label: "記録", testId: "nav-profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center justify-around h-20 px-6">
        {navItems.map(({ path, icon: Icon, label, testId }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button
                data-testid={testId}
                className={`relative flex items-center justify-center p-4 transition-all duration-700 ease-in-out ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? "stroke-[2]" : "stroke-[1.5]"}`} />
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-primary" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
