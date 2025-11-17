import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from "date-fns";
import { ja } from "date-fns/locale";

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ja });
  const calendarEnd = endOfWeek(monthEnd, { locale: ja });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

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

              return (
                <button
                  key={i}
                  className={`
                    aspect-square p-1 rounded-lg text-sm font-semibold transition-colors
                    hover-elevate active-elevate-2
                    ${isCurrentMonth ? "" : "opacity-30"}
                    ${isCurrentDay ? "bg-primary text-primary-foreground" : ""}
                  `}
                  data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{format(day, "d")}</span>
                    {/* タスクインジケーター（今後実装） */}
                    {isCurrentMonth && !isCurrentDay && (
                      <div className="flex gap-0.5 mt-1">
                        {/* 例: 点でタスクを表示 */}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 説明 */}
        <div className="text-center text-sm text-muted-foreground">
          <p>日付をタップすると、その日のタスクが表示されます</p>
        </div>
      </main>
    </div>
  );
}
