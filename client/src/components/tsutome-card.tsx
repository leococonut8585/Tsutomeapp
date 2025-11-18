import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Star, Check, Skull } from "lucide-react";
import { Tsutome } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useState, useRef } from "react";

interface TsutomeCardProps {
  tsutome: Tsutome;
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

const genreLabels: Record<string, string> = {
  hobby: "趣味",
  study: "勉強",
  exercise: "運動",
  work: "仕事",
  housework: "家事",
  fun: "遊び",
};

export function TsutomeCard({ tsutome, onComplete, onClick }: TsutomeCardProps) {
  const stars = difficultyStars[tsutome.difficulty] || 3;
  const deadline = new Date(tsutome.deadline);
  const isOverdue = deadline < new Date();
  
  // スワイプ処理
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);

  // タッチイベントハンドラー
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // 右スワイプのみ許可（完了ジェスチャー）
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 100));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 60 && onComplete) {
      // 60px以上スワイプしたら完了
      onComplete();
      // ハプティックフィードバック（可能な場合）
      if (window.navigator && 'vibrate' in window.navigator) {
        window.navigator.vibrate(50);
      }
    }
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  return (
    <Card
      className="p-6 hover-elevate active-elevate-2 cursor-pointer transition-all duration-700 ease-in-out overflow-hidden relative bg-card border"
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: isSwiping ? 'none' : 'transform 0.7s ease-out',
      }}
      data-testid={`tsutome-card-${tsutome.id}`}
    >
      {/* スワイプ時の背景 */}
      {swipeOffset > 0 && (
        <div 
          className="absolute inset-0 bg-primary/10 flex items-center px-6"
          style={{ opacity: Math.min(swipeOffset / 60, 1) }}
        >
          <Check className="w-6 h-6 text-primary" />
        </div>
      )}
      <div className="flex gap-4">
        {/* モンスター画像 */}
        <div className="flex-shrink-0">
          {tsutome.monsterImageUrl ? (
            <img
              src={tsutome.monsterImageUrl}
              alt={tsutome.monsterName}
              className="w-16 h-16 rounded-lg object-cover bg-muted"
              data-testid="monster-image"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
              <Skull className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* モンスター名 */}
          <div className="font-serif font-bold text-sm text-primary" data-testid="monster-name">
            {tsutome.monsterName}
          </div>

          {/* タスク名 */}
          <h3 className="font-semibold text-base line-clamp-2 leading-snug" data-testid="task-title">
            {tsutome.title}
          </h3>

          {/* メタ情報 */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs" data-testid="genre-badge">
              {genreLabels[tsutome.genre]}
            </Badge>

            <div className="flex items-center gap-0.5" data-testid="difficulty-stars">
              {Array.from({ length: stars }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-exp text-exp" />
              ))}
            </div>

            <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
              <Calendar className="w-3 h-3" />
              <span data-testid="deadline-text">
                {formatDistanceToNow(deadline, { addSuffix: true, locale: ja })}
              </span>
            </div>
          </div>

          {/* アクションボタン */}
          {onComplete && !tsutome.completed && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              data-testid="button-complete-task"
            >
              <Check className="w-4 h-4 mr-2" />
              討伐完了
            </Button>
          )}

          {tsutome.completed && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
              討伐済み
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
