import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Zap, AlertTriangle } from "lucide-react";
import { ShurikenIcon } from "./icons/japanese-icons";
import { Shikaku } from "@shared/schema";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { ja } from "date-fns/locale";
import { ImageWithFallback } from "./image-with-fallback";

interface ShikakuCardProps {
  shikaku: Shikaku;
  onComplete?: () => void;
  onClick?: () => void;
}

const difficultyStars: Record<string, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
  veryHard: 4,
  extreme: 5,
};

const difficultyLabels: Record<string, string> = {
  easy: "簡単",
  normal: "普通",
  hard: "困難",
  veryHard: "非常に困難",
  extreme: "極限",
};

export function ShikakuCard({ shikaku, onComplete, onClick }: ShikakuCardProps) {
  const expiresAt = new Date(shikaku.expiresAt);
  const hoursRemaining = differenceInHours(expiresAt, new Date());
  const isExpired = hoursRemaining < 0;
  const isUrgent = hoursRemaining < 6 && hoursRemaining >= 0;
  const stars = difficultyStars[shikaku.difficulty] || 3;

  return (
    <Card
      className={`p-6 hover-elevate active-elevate-2 cursor-pointer transition-all 
        ${isExpired ? 'opacity-60 bg-destructive/5' : 
          isUrgent ? 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30' : 
          'bg-gradient-to-br from-chart-5/5 to-chart-5/10 border-chart-5/30'}`}
      onClick={onClick}
      data-testid={`shikaku-card-${shikaku.id}`}
    >
      {/* 緊急バッジ */}
      {isUrgent && !isExpired && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 
          bg-destructive text-destructive-foreground text-xs font-bold rounded-full japanese-shadow">
          <AlertTriangle className="w-3 h-3" />
          緊急
        </div>
      )}

      <div className="flex gap-4 items-start">
        {/* 刺客画像 */}
        <div className="flex-shrink-0 relative">
          <ImageWithFallback
            src={shikaku.assassinImageUrl}
            alt={shikaku.assassinName}
            className="w-16 h-16 rounded-full object-cover bg-muted ring-2 ring-destructive/20 japanese-shadow"
            containerClassName="relative w-16 h-16"
            fallback={
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 
                flex items-center justify-center japanese-shadow ring-2 ring-destructive/20">
                <ShurikenIcon />
              </div>
            }
            testId="assassin-image"
          />
          {/* 完了バッジ */}
          {shikaku.completed && (
            <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full 
              bg-primary flex items-center justify-center japanese-shadow">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* 刺客名 */}
          <div className="flex items-center gap-2">
            <div className="font-serif font-bold text-sm text-destructive gold-accent" 
              data-testid="assassin-name">
              {shikaku.assassinName}
            </div>
            {/* 難易度表示（手裏剣の数） */}
            <div className="flex items-center gap-0.5 shrink-0" data-testid="difficulty-stars">
              {Array.from({ length: stars }).map((_, i) => (
                <div key={i} className="w-3 h-3">
                  <ShurikenIcon />
                </div>
              ))}
            </div>
          </div>

          {/* タスクタイトル */}
          <h3 className="font-semibold text-base line-clamp-2 leading-snug" 
            data-testid="task-title">
            {shikaku.title}
          </h3>

          {/* メタ情報 */}
          <div className="flex items-center gap-3 text-xs">
            <Badge 
              variant={isExpired ? "destructive" : isUrgent ? "secondary" : "outline"} 
              className={isUrgent && !isExpired ? "animate-pulse" : ""} 
              data-testid="difficulty-badge"
            >
              {difficultyLabels[shikaku.difficulty]}
            </Badge>
            
            <div className={`flex items-center gap-1 ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Clock className="w-3 h-3" />
              <span data-testid="time-remaining">
                {shikaku.completed ? '完了済み' :
                  isExpired ? '期限切れ' :
                  hoursRemaining > 0 ? `残り${hoursRemaining}時間` : '間もなく期限'}
              </span>
            </div>
          </div>

          {/* 完了ボタン */}
          {!shikaku.completed && !isExpired && onComplete && (
            <Button
              size="sm"
              variant={isUrgent ? "destructive" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              className="w-full mt-2"
              data-testid="button-complete-shikaku"
            >
              任務完了
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}