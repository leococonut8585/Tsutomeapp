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

  // 漢数字変換
  const kanjiNumbers = ["零", "壱", "弐", "参", "肆", "伍", "陸", "漆", "捌", "玖", "拾"];
  const levelKanji = level <= 10 ? kanjiNumbers[level] : level.toString();

  return (
    <div className="bg-card p-6 space-y-4 border-y-2 border-foreground washi-texture">
      {/* レベルとコイン */}
      <div className="flex items-center justify-between">
        {/* 朱印スタンプ風レベル表示 */}
        <div className="relative">
          <div className="w-20 h-20 seal-stamp">
            <span className="text-2xl font-black text-primary" data-testid="player-level">
              {levelKanji}
            </span>
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
            階位
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-background/50">
          <span className="text-xl font-mono text-foreground" data-testid="player-coins">
            {coins.toLocaleString()}
          </span>
          <span className="text-sm text-foreground font-serif">両</span>
        </div>
      </div>

      {/* HPバー */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-destructive" />
            <span className="text-sm text-muted-foreground">体力</span>
          </div>
          <span className="text-sm font-mono" data-testid="player-hp">
            {hp} / {maxHp}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded overflow-hidden">
          <div
            className="h-full bg-destructive transition-all duration-700 ease-in-out"
            style={{ width: `${hpPercent}%` }}
            data-testid="hp-bar"
          />
        </div>
      </div>

      {/* 経験値バー */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm text-muted-foreground">経験値</span>
          </div>
          <span className="text-sm font-mono" data-testid="player-exp">
            {exp} / {expToNext}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-700 ease-in-out"
            style={{ width: `${expPercent}%` }}
            data-testid="exp-bar"
          />
        </div>
      </div>
    </div>
  );
}
