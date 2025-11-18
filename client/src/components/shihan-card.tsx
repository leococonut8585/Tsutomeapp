import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Target, Trophy, Plus, Swords } from "lucide-react";
import { DragonIcon } from "./icons/japanese-icons";
import { Shihan } from "@shared/schema";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import { ImageWithFallback } from "./image-with-fallback";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface ShihanCardProps {
  shihan: Shihan;
  onComplete?: () => void;
  onClick?: () => void;
  onGenerateTsutome?: () => void;
}

const genreLabels: Record<string, string> = {
  hobby: "趣味",
  study: "勉強",
  exercise: "運動",
  work: "仕事",
  housework: "家事",
  fun: "遊び",
};

export function ShihanCard({ shihan, onComplete, onClick, onGenerateTsutome }: ShihanCardProps) {
  const targetDate = new Date(shihan.targetDate);
  const daysRemaining = differenceInDays(targetDate, new Date());
  
  // 師範の進捗状況を取得
  const { data: progressData } = useQuery({
    queryKey: [`/api/shihans/${shihan.id}/progress`],
    enabled: !shihan.completed,
  });

  // 進捗計算（連携タスクベース or 時間ベース）
  const linkedProgress = progressData?.linkedTasks?.progress ?? 0;
  const timeProgress = shihan.completed ? 100 : Math.max(0, Math.min(100, ((30 - daysRemaining) / 30) * 100));
  const progress = linkedProgress > 0 ? linkedProgress : timeProgress;

  return (
    <Card
      className="p-6 hover-elevate active-elevate-2 cursor-pointer transition-all 
        bg-gradient-to-br from-chart-3/5 to-chart-3/10 border-chart-3/30"
      onClick={onClick}
      data-testid={`shihan-card-${shihan.id}`}
    >
      <div className="flex gap-4 items-start">
        {/* 師範画像 */}
        <div className="flex-shrink-0 relative">
          <ImageWithFallback
            src={shihan.masterImageUrl}
            alt={shihan.masterName}
            className="w-20 h-20 rounded-full object-cover bg-muted ring-4 ring-chart-3/20 japanese-shadow"
            containerClassName="relative w-20 h-20"
            fallback={
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-chart-3/20 to-chart-3/10 
                flex items-center justify-center japanese-shadow ring-4 ring-chart-3/20">
                <DragonIcon />
              </div>
            }
            testId="master-image"
          />
          {/* 完了バッジ */}
          {shihan.completed && (
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full 
              bg-primary flex items-center justify-center japanese-shadow">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* 師範名 */}
          <div className="flex items-center gap-2">
            <div className="font-serif font-bold text-sm text-chart-3 gold-accent" 
              data-testid="master-name">
              {shihan.masterName}
            </div>
            <Badge variant="outline" className="text-xs shrink-0 border-chart-3/50" 
              data-testid="genre-badge">
              {genreLabels[shihan.genre]}
            </Badge>
          </div>

          {/* 目標タイトル */}
          <h3 className="font-semibold text-base line-clamp-2 leading-snug" 
            data-testid="goal-title">
            {shihan.title}
          </h3>

          {/* 進捗バー */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                進捗 
                {progressData?.linkedTasks?.total ? 
                  ` (務メ: ${progressData.linkedTasks.completed}/${progressData.linkedTasks.total})` : 
                  ''}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-chart-3 to-chart-3/70 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* メタ情報 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span data-testid="target-date">
                目標: {format(targetDate, 'M月d日', { locale: ja })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span data-testid="days-remaining">
                {shihan.completed ? '達成済み' : 
                  daysRemaining > 0 ? `残り${daysRemaining}日` : '期限切れ'}
              </span>
            </div>
          </div>

          {/* アクションボタン */}
          {!shihan.completed && (
            <div className="flex gap-2 mt-2">
              {onGenerateTsutome && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateTsutome();
                  }}
                  className="flex-1 border-primary/50 hover:bg-primary/10"
                  data-testid="button-generate-tsutome"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  務メを生成
                </Button>
              )}
              {onComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete();
                  }}
                  className="flex-1 border-chart-3/50 hover:bg-chart-3/10"
                  data-testid="button-complete-shihan"
                >
                  <Trophy className="w-3 h-3 mr-1" />
                  目標達成
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}