import { Progress } from "@/components/ui/progress";
import { Heart, Zap } from "lucide-react";

interface StatsBarProps {
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  maxHp: number;
  coins: number;
}

export function StatsBar({ level, exp, expToNext, hp, maxHp, coins }: StatsBarProps) {
  const hpPercent = (hp / maxHp) * 100;
  const expPercent = (exp / expToNext) * 100;

  return (
    <div className="bg-card rounded-xl p-4 space-y-3 shadow-md border border-card-border">
      {/* レベルとコイン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-semibold">Lv</span>
          <span className="text-2xl font-bold font-serif text-primary" data-testid="player-level">
            {level}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-accent/30 px-3 py-1 rounded-lg">
          <span className="text-lg font-mono font-semibold text-accent-foreground" data-testid="player-coins">
            {coins.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">両</span>
        </div>
      </div>

      {/* HPバー */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-destructive fill-destructive" />
            <span className="text-xs font-semibold text-muted-foreground">体力</span>
          </div>
          <span className="text-xs font-mono font-semibold" data-testid="player-hp">
            {hp} / {maxHp}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-destructive to-destructive/80 transition-all duration-300"
            style={{ width: `${hpPercent}%` }}
            data-testid="hp-bar"
          />
        </div>
      </div>

      {/* 経験値バー */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-exp fill-exp" />
            <span className="text-xs font-semibold text-muted-foreground">経験値</span>
          </div>
          <span className="text-xs font-mono font-semibold" data-testid="player-exp">
            {exp} / {expToNext}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-exp to-amber-400 transition-all duration-300"
            style={{ width: `${expPercent}%` }}
            data-testid="exp-bar"
          />
        </div>
      </div>
    </div>
  );
}
