import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ChevronLeft, ChevronRight, Target, Book, Swords, Flame } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { Tsutome, Shuren } from "@shared/schema";

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // タスクデータ取得
  const { data: tsutomes = [] } = useQuery<Tsutome[]>({
    queryKey: ["/api/tsutomes"],
  });

  const { data: shurens = [] } = useQuery<Shuren[]>({
    queryKey: ["/api/shurens"],
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ja });
  const calendarEnd = endOfWeek(monthEnd, { locale: ja });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  // 日付ごとのタスクを取得
  const getTasksForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    // 務メ（期限がその日のタスク）
    const dayTsutomes = tsutomes.filter(t => {
      const deadline = new Date(t.deadline);
      return format(deadline, "yyyy-MM-dd") === dateStr;
    });

    // 修練（その日に記録したタスク）
    const dayShurens = shurens.filter(s => {
      if (!s.lastCompletedAt) return false;
      const completedDate = new Date(s.lastCompletedAt);
      return format(completedDate, "yyyy-MM-dd") === dateStr;
    });

    return {
      tsutomes: dayTsutomes,
      shurens: dayShurens,
      total: dayTsutomes.length + dayShurens.length,
      hasCompleted: dayTsutomes.some(t => t.completed) || dayShurens.length > 0,
      hasIncomplete: dayTsutomes.some(t => !t.completed && !t.cancelled),
    };
  };

  const previousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const nextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border shadow-sm">
        <div className="flex items-center gap-2 px-4 h-14">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/profile")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-serif font-bold text-primary">暦</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-4 space-y-4">
        {/* 月選択 */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              onClick={previousMonth}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-serif font-bold" data-testid="current-month">
              {format(currentMonth, "yyyy年 M月", { locale: ja })}
            </h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={nextMonth}
              data-testid="button-next-month"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </Card>

        {/* カレンダー */}
        <Card className="p-4">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={`text-center text-xs font-semibold py-2 ${
                  i === 0 ? "text-destructive" : i === 6 ? "text-chart-3" : "text-muted-foreground"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const tasks = getTasksForDate(day);

              return (
                <button
                  key={i}
                  className={`
                    relative aspect-square p-1 rounded-lg text-sm font-semibold transition-colors
                    hover-elevate active-elevate-2
                    ${isCurrentMonth ? "" : "opacity-30"}
                    ${isCurrentDay ? "bg-primary text-primary-foreground" : ""}
                    ${tasks.total > 0 && !isCurrentDay ? "ring-1 ring-primary/20" : ""}
                  `}
                  onClick={() => {
                    if (isCurrentMonth && tasks.total > 0) {
                      setSelectedDate(day);
                      setShowDetailDialog(true);
                    }
                  }}
                  data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                >
                  <div className="flex flex-col items-center justify-center h-full gap-1">
                    <span>{format(day, "d")}</span>
                    {/* タスクインジケーター */}
                    {isCurrentMonth && tasks.total > 0 && (
                      <div className="flex gap-0.5">
                        {tasks.hasCompleted && (
                          <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        )}
                        {tasks.hasIncomplete && (
                          <div className="w-1.5 h-1.5 rounded-full bg-exp" />
                        )}
                      </div>
                    )}
                    {/* タスク数バッジ */}
                    {isCurrentMonth && tasks.total > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-primary/80 text-[10px] text-primary-foreground flex items-center justify-center px-1">
                        {tasks.total}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 凡例 */}
        <Card className="p-3">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-muted-foreground">完了</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-exp" />
              <span className="text-muted-foreground">未完了</span>
            </div>
          </div>
        </Card>
      </main>

      {/* 日付詳細ダイアログ */}
      <DayDetailDialog
        date={selectedDate}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        tsutomes={tsutomes}
        shurens={shurens}
      />
    </div>
  );
}

// 日付詳細ダイアログコンポーネント
function DayDetailDialog({
  date,
  open,
  onOpenChange,
  tsutomes,
  shurens,
}: {
  date: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tsutomes: Tsutome[];
  shurens: Shuren[];
}) {
  if (!date) return null;

  const dateStr = format(date, "yyyy-MM-dd");
  
  // その日のタスクを取得
  const dayTsutomes = tsutomes.filter(t => {
    const deadline = new Date(t.deadline);
    return format(deadline, "yyyy-MM-dd") === dateStr;
  });

  const dayShurens = shurens.filter(s => {
    if (!s.lastCompletedAt) return false;
    const completedDate = new Date(s.lastCompletedAt);
    return format(completedDate, "yyyy-MM-dd") === dateStr;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {format(date, "M月d日", { locale: ja })}の記録
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 務メ一覧 */}
          {dayTsutomes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Target className="w-4 h-4" />
                <span>務メ</span>
              </div>
              <div className="space-y-2">
                {dayTsutomes.map((tsutome) => (
                  <Card key={tsutome.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium line-clamp-2">{tsutome.title}</p>
                        <p className="text-xs text-muted-foreground">{tsutome.monsterName}</p>
                      </div>
                      <Badge variant={tsutome.completed ? "default" : tsutome.cancelled ? "secondary" : "outline"}>
                        {tsutome.completed ? "討伐" : tsutome.cancelled ? "中止" : "未完"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 修練一覧 */}
          {dayShurens.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-chart-4">
                <Flame className="w-4 h-4" />
                <span>修練</span>
              </div>
              <div className="space-y-2">
                {dayShurens.map((shuren) => (
                  <Card key={shuren.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium line-clamp-2">{shuren.title}</p>
                        <p className="text-xs text-muted-foreground">{shuren.trainingName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-exp" />
                        <span className="text-xs font-mono font-bold">{shuren.continuousDays}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* タスクがない場合 */}
          {dayTsutomes.length === 0 && dayShurens.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">この日の記録はありません</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
