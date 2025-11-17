import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Star, Check } from "lucide-react";
import { Tsutome } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

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

  return (
    <Card
      className="p-4 hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`tsutome-card-${tsutome.id}`}
    >
      <div className="flex gap-3">
        {/* モンスター画像 */}
        <div className="flex-shrink-0">
          {tsutome.monsterImageUrl ? (
            <img
              src={tsutome.monsterImageUrl}
              alt={tsutome.monsterName}
              className="w-20 h-20 rounded-lg object-cover bg-muted"
              data-testid="monster-image"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <span className="text-2xl">👹</span>
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
              className="mt-2 w-full"
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              data-testid="button-complete-task"
            >
              <Check className="w-4 h-4 mr-1.5" />
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
