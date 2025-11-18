import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Calendar } from "lucide-react";
import { Shuren } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

interface ShurenCardProps {
  shuren: Shuren;
  onComplete?: () => void;
  onClick?: () => void;
}

const genreLabels: Record<string, string> = {
  hobby: "趣味",
  study: "勉強",
  exercise: "運動",
  work: "仕事",
  housework: "家事",
  fun: "遊び",
};

export function ShurenCard({ shuren, onComplete, onClick }: ShurenCardProps) {
  const lastCompleted = shuren.lastCompletedAt ? new Date(shuren.lastCompletedAt) : null;

  return (
    <Card
      className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`shuren-card-${shuren.id}`}
    >
      <div className="flex gap-3 items-center">
        {/* 修練画像 */}
        <div className="flex-shrink-0 relative">
          {shuren.trainingImageUrl ? (
            <div className="relative">
              <img
                src={shuren.trainingImageUrl}
                alt={shuren.trainingName}
                className="w-16 h-16 rounded-full object-cover bg-muted ring-2 ring-primary/20"
                data-testid="training-image"
              />
              {/* 継続日数のリング */}
              <div className="absolute -inset-1">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${(shuren.continuousDays % 30) * 6.28} 188.4`}
                    className="text-primary transition-all duration-700"
                  />
                </svg>
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-chart-4/20 to-chart-4/10 flex items-center justify-center">
              <span className="text-2xl">🧘</span>
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* 修練名 */}
          <div className="font-serif font-bold text-sm text-chart-4" data-testid="training-name">
            {shuren.trainingName}
          </div>

          {/* タスク名 */}
          <h3 className="font-semibold text-base line-clamp-1 leading-snug" data-testid="training-title">
            {shuren.title}
          </h3>

          {/* 継続日数 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-exp" />
              <span className="text-xs font-semibold text-muted-foreground">連続</span>
              <span className="text-sm font-bold font-mono text-exp" data-testid="continuous-days">
                {shuren.continuousDays}
              </span>
              <span className="text-xs text-muted-foreground">日</span>
            </div>

            <Badge variant="secondary" className="text-xs" data-testid="genre-badge">
              {genreLabels[shuren.genre]}
            </Badge>
          </div>

          {/* 最終実施日 */}
          {lastCompleted && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span data-testid="last-completed">
                {formatDistanceToNow(lastCompleted, { addSuffix: true, locale: ja })}
              </span>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        {onComplete && shuren.active && (
          <div className="flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              data-testid="button-complete-training"
            >
              記録
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
