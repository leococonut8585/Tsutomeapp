import { useLocation, Link } from "wouter";
import { ToriiIcon, KatanaIcon, OniMaskIcon, ScrollIcon } from "./icons/japanese-icons";

export function BottomNav() {
  const [location] = useLocation();

  // 日本的なアイコンとラベル
  const navItems = [
    { path: "/", Icon: ToriiIcon, label: "務メ", testId: "nav-tsutome" },
    { path: "/shuren", Icon: KatanaIcon, label: "修練", testId: "nav-shuren" },
    { path: "/boss", Icon: OniMaskIcon, label: "大敵", testId: "nav-boss" },
    { path: "/profile", Icon: ScrollIcon, label: "記録", testId: "nav-profile" },
  ];

  return (
    <nav className="relative fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t-2 border-foreground/20 japanese-shadow-lg">
      {/* 障子風格子 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute h-full w-px bg-foreground/10 left-1/4" />
        <div className="absolute h-full w-px bg-foreground/10 left-2/4" />
        <div className="absolute h-full w-px bg-foreground/10 left-3/4" />
      </div>
      
      {/* ナビゲーションアイテム */}
      <div className="relative flex items-center justify-around h-20 px-6">
        {navItems.map(({ path, Icon, label, testId }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button
                data-testid={testId}
                className={`relative flex flex-col items-center justify-center p-4 transition-all duration-300 group ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {/* アクティブ時の朱印風マーク */}
                {isActive && (
                  <div className="absolute inset-x-0 top-1 flex justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/50 animate-pulse" />
                  </div>
                )}
                <div className="transition-all duration-300 group-hover:scale-110 group-active:scale-95">
                  <Icon />
                </div>
                <span className={`text-xs font-serif mt-1 ${isActive ? "font-bold" : ""}`}>{label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-primary" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}