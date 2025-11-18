import { Home, Dumbbell, Skull, ShoppingBag, User } from "lucide-react";
import { useLocation, Link } from "wouter";

export function BottomNav() {
  const [location] = useLocation();

  // 日本的なアイコンとラベル
  const navItems = [
    { path: "/", emoji: "⛩️", label: "務メ", testId: "nav-tsutome" },
    { path: "/shuren", emoji: "⚔️", label: "修練", testId: "nav-shuren" },
    { path: "/boss", emoji: "👺", label: "大敵", testId: "nav-boss" },
    { path: "/profile", emoji: "📜", label: "記録", testId: "nav-profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-4 border-foreground shoji-grid">
      <div className="flex items-center justify-around h-20 px-6">
        {navItems.map(({ path, emoji, label, testId }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button
                data-testid={testId}
                className={`relative flex flex-col items-center justify-center p-4 transition-all duration-700 ease-in-out ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="text-2xl mb-1">{emoji}</span>
                <span className={`text-xs font-serif ${isActive ? "font-bold" : ""}`}>{label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-primary" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
