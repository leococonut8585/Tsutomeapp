import { Heart, Zap } from "lucide-react";
import { SealStampIcon } from "./icons/japanese-icons";

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

  // 漢数字変換（拡張版）
  const getKanjiNumber = (num: number) => {
    const kanjiNumbers = ["零", "壱", "弐", "参", "肆", "伍", "陸", "漆", "捌", "玖", "拾"];
    const kanjiTens = ["", "拾", "弐拾", "参拾", "肆拾", "伍拾", "陸拾", "漆拾", "捌拾", "玖拾"];
    
    if (num <= 10) return kanjiNumbers[num];
    if (num < 20) return kanjiTens[1] + kanjiNumbers[num - 10];
    if (num < 100) {
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      return kanjiTens[tens] + (ones > 0 ? kanjiNumbers[ones] : "");
    }
    return num.toString(); // Fallback for large numbers
  };

  const levelKanji = getKanjiNumber(level);

  return (
    <div className="bg-card p-6 space-y-4 border-y-2 border-foreground washi-texture japanese-shadow-lg">
      {/* レベルとコイン */}
      <div className="flex items-center justify-between">
        {/* 朱印スタンプ風レベル表示（高品質版） */}
        <div className="relative inline-block">
          {/* 背景の印影 */}
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-sm transform scale-110" />
          
          {/* 朱印本体 */}
          <div className="relative w-20 h-20 rounded-full border-3 border-primary 
            flex items-center justify-center transform rotate-3 transition-transform
            hover:rotate-6 bg-background japanese-shadow">
            <span className="text-2xl font-black text-primary font-serif" data-testid="player-level">
              {levelKanji}
            </span>
            
            {/* 装飾的な角印 */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary/20 
              transform rotate-45 japanese-shadow" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary/15 
              transform rotate-12" />
          </div>
          
          {/* 階位ラベル */}
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground 
            font-serif px-2 bg-background">
            階位
          </span>
        </div>
        
        {/* 両（コイン）表示 - 高品質版 */}
        <div className="relative">
          <div className="flex items-center gap-2 px-4 py-2 border-2 border-foreground/30 
            bg-gradient-to-br from-background to-background/50 japanese-shadow">
            <span className="text-xl font-mono text-foreground gold-accent" data-testid="player-coins">
              {coins.toLocaleString()}
            </span>
            <span className="text-sm text-foreground font-serif">両</span>
          </div>
          {/* 装飾線 */}
          <div className="absolute -top-px left-2 right-2 h-px bg-gradient-to-r 
            from-transparent via-primary/50 to-transparent" />
        </div>
      </div>

      {/* HPバー - 高品質版 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Heart className="w-4 h-4 text-destructive" />
              <Heart className="w-4 h-4 text-destructive absolute inset-0 animate-pulse opacity-50" />
            </div>
            <span className="text-sm text-muted-foreground font-serif">体力</span>
          </div>
          <span className="text-sm font-mono" data-testid="player-hp">
            {hp} / {maxHp}
          </span>
        </div>
        <div className="h-2 bg-muted overflow-hidden japanese-shadow relative">
          <div
            className="h-full bg-gradient-to-r from-destructive to-destructive/80 
              transition-all duration-700 ease-in-out relative"
            style={{ width: `${hpPercent}%` }}
            data-testid="hp-bar"
          >
            {/* 光沢エフェクト */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </div>
      </div>

      {/* 経験値バー - 高品質版 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Zap className="w-4 h-4 text-accent" />
              <Zap className="w-4 h-4 text-accent absolute inset-0 animate-pulse opacity-50" />
            </div>
            <span className="text-sm text-muted-foreground font-serif">経験値</span>
          </div>
          <span className="text-sm font-mono" data-testid="player-exp">
            {exp} / {expToNext}
          </span>
        </div>
        <div className="h-2 bg-muted overflow-hidden japanese-shadow relative">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent/80 
              transition-all duration-700 ease-in-out relative"
            style={{ width: `${expPercent}%` }}
            data-testid="exp-bar"
          >
            {/* 光沢エフェクト */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}