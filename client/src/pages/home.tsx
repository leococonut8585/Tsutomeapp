import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsBar } from "@/components/stats-bar";
import { TsutomeCard } from "@/components/tsutome-card";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Menu, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Player, Tsutome } from "@shared/schema";
import { useCompleteTsutome } from "@/hooks/use-tasks";

export default function Home() {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const completeTsutome = useCompleteTsutome();
  // プレイヤー情報取得
  const { data: player, isLoading: playerLoading } = useQuery<Player>({
    queryKey: ["/api/player"],
  });

  // 務メ（タスク）一覧取得
  const { data: tsutomes, isLoading: tsutomesLoading } = useQuery<Tsutome[]>({
    queryKey: ["/api/tsutomes"],
  });

  const activeTsutomes = tsutomes?.filter((t) => !t.completed && !t.cancelled) || [];

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-6 h-16">
          <h1 className="text-3xl font-serif font-bold text-primary">務メ討魔録</h1>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" data-testid="button-settings">
              <Settings className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="ghost" data-testid="button-menu">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-6 py-8 space-y-8">
        {/* ステータスバー */}
        {playerLoading ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : player ? (
          <StatsBar
            level={player.level}
            exp={player.exp}
            expToNext={player.level * 100}
            hp={player.hp}
            maxHp={player.maxHp}
            coins={player.coins}
          />
        ) : (
          <div className="bg-card rounded-lg p-8 text-center">
            <p className="text-muted-foreground">プレイヤーデータを読み込めません</p>
          </div>
        )}

        {/* 務メ一覧セクション */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-serif">今日の務メ</h2>
            <Button 
              size="sm" 
              variant="outline"
              className="gap-2" 
              data-testid="button-add-tsutome"
              onClick={() => setShowTaskForm(true)}
            >
              <Plus className="w-4 h-4" />
              新規
            </Button>
          </div>

          {tsutomesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : activeTsutomes.length > 0 ? (
            <div className="space-y-4">
              {activeTsutomes.map((tsutome) => (
                <TsutomeCard
                  key={tsutome.id}
                  tsutome={tsutome}
                  onComplete={() => {
                    completeTsutome.mutate(tsutome.id);
                  }}
                  onClick={() => {
                    // 詳細表示（将来実装）
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg p-12 text-center border border-dashed border-border">
              <p className="text-muted-foreground mb-4">討伐すべき妖怪はいません</p>
              <Button 
                size="sm" 
                variant="outline" 
                data-testid="button-add-first-tsutome"
                onClick={() => setShowTaskForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                最初の務メを追加
              </Button>
            </div>
          )}
        </div>

        {/* 刺客（緊急タスク）セクション - TODO */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-serif text-destructive">急襲！刺客</h2>
          <div className="bg-card rounded-lg p-8 text-center border border-dashed border-border">
            <p className="text-muted-foreground text-sm">現在、刺客の襲撃はありません</p>
          </div>
        </div>
      </main>

      {/* タスク作成ダイアログ */}
      <TaskFormDialog 
        open={showTaskForm} 
        onOpenChange={setShowTaskForm}
        taskType="tsutome"
      />
    </div>
  );
}
