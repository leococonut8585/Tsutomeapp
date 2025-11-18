import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Check } from "lucide-react";
import { OniMaskIcon, ShurikenIcon } from "./icons/japanese-icons";
import { Tsutome } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { useState, useRef } from "react";
import { ImageWithFallback } from "./image-with-fallback";

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
    <div
      className="relative bg-card japanese-shadow-lg scroll-design cursor-pointer 
        transition-all duration-300 ease-in-out overflow-hidden"
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
      }}
      data-testid={`tsutome-card-${tsutome.id}`}
    >
      {/* 巻物風の上下装飾（高品質版） */}
      <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-foreground/20 to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-foreground/20 to-transparent z-10" />
      
      {/* 巻物の端の丸み */}
      <div className="absolute -left-3 top-0 bottom-0 w-6 
        bg-gradient-to-r from-transparent via-background/30 to-background/50 z-0" />
      <div className="absolute -right-3 top-0 bottom-0 w-6 
        bg-gradient-to-l from-transparent via-background/30 to-background/50 z-0" />
      
      {/* 和紙テクスチャオーバーレイ */}
      <div className="absolute inset-0 washi-texture pointer-events-none opacity-30" />
      
      {/* スワイプ時の背景 */}
      {swipeOffset > 0 && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 
            flex items-center px-6 z-20"
          style={{ opacity: Math.min(swipeOffset / 60, 1) }}
        >
          <Check className="w-6 h-6 text-primary animate-pulse" />
        </div>
      )}
      
      {/* コンテンツ */}
      <div className="relative flex gap-4 px-8 py-6 z-10">
        {/* モンスター画像 - 墨絵風フレーム */}
        <div className="flex-shrink-0">
          <div className="relative">
            {/* フレーム装飾 */}
            <div className="absolute -inset-1 bg-gradient-to-br from-foreground/20 to-foreground/10 
              japanese-shadow transform rotate-1" />
            
            <ImageWithFallback
              src={tsutome.monsterImageUrl}
              alt={tsutome.monsterName}
              className="relative w-16 h-16 object-cover bg-muted border-2 border-foreground/30 
                japanese-shadow"
              containerClassName="relative w-16 h-16"
              loadingClassName="japanese-shadow"
              fallback={
                <div className="relative w-16 h-16 bg-muted flex items-center justify-center 
                  border-2 border-foreground/30 japanese-shadow">
                  <OniMaskIcon />
                </div>
              }
              testId="monster-image"
            />
            
            {/* 難易度バッジ（手裏剣風） */}
            <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full 
              bg-primary flex items-center justify-center japanese-shadow">
              <span className="text-xs font-bold text-primary-foreground">{stars}</span>
            </div>
          </div>
        </div>

        {/* コンテンツ本体 */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* モンスター名 - 朱印風 */}
          <div className="inline-flex items-center gap-2">
            <div className="font-serif font-bold text-sm text-primary gold-accent" 
              data-testid="monster-name">
              {tsutome.monsterName}
            </div>
            <div className="w-4 h-4 opacity-50">
              <ShurikenIcon />
            </div>
          </div>

          {/* タスク名 - 筆文字風 */}
          <h3 className="font-semibold text-base line-clamp-2 leading-snug brush-stroke" 
            data-testid="task-title">
            {tsutome.title}
          </h3>

          {/* メタ情報 - 横スクロール風配置 */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <Badge variant="secondary" className="text-xs shrink-0 japanese-shadow" 
              data-testid="genre-badge">
              {genreLabels[tsutome.genre]}
            </Badge>

            {/* 難易度表示（刀の数） */}
            <div className="flex items-center gap-0.5 shrink-0" data-testid="difficulty-stars">
              {Array.from({ length: stars }).map((_, i) => (
                <div key={i} className="w-3 h-3 text-accent opacity-80">⚔</div>
              ))}
            </div>

            <div className={`flex items-center gap-1 text-xs shrink-0 ${
              isOverdue ? "text-destructive font-bold" : "text-muted-foreground"
            }`}>
              <Calendar className="w-3 h-3" />
              <span data-testid="deadline-text">
                {formatDistanceToNow(deadline, { addSuffix: true, locale: ja })}
              </span>
            </div>
          </div>

          {/* アクションボタン - 和風スタイル */}
          {onComplete && !tsutome.completed && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full japanese-shadow border-foreground/30 hover:border-primary/50 
                transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              data-testid="button-complete-task"
            >
              <Check className="w-4 h-4 mr-2" />
              <span className="font-serif">討伐完了</span>
            </Button>
          )}

          {tsutome.completed && (
            <div className="inline-flex items-center gap-2 px-3 py-1 
              bg-primary/10 border border-primary/30 japanese-shadow">
              <Check className="w-3 h-3 text-primary" />
              <span className="text-xs font-serif text-primary">討伐済み</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}