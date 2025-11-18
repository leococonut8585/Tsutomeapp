import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsBar } from "@/components/stats-bar";
import { TsutomeCard } from "@/components/tsutome-card";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Menu, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Player, TsutomeWithLinkSource } from "@shared/schema";
import { useCompleteTsutome } from "@/hooks/use-tasks";

export default function Home() {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const completeTsutome = useCompleteTsutome();
  // プレイヤー情報取得
  const { data: player, isLoading: playerLoading } = useQuery<Player>({
    queryKey: ["/api/player"],
  });

  // 務メ（タスク）一覧取得 - with linked source info
  const { data: tsutomes, isLoading: tsutomesLoading } = useQuery<TsutomeWithLinkSource[]>({
    queryKey: ["/api/tsutomes"],
  });

  const activeTsutomes = tsutomes?.filter((t) => !t.completed && !t.cancelled) || [];

  return (
    <div className="min-h-screen pb-24 bg-background pattern-seigaiha">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-card border-b-4 border-foreground washi-texture">
        <div className="flex items-center justify-between px-6 h-20 relative">
          <h1 className="text-5xl font-serif font-black text-primary brush-stroke tracking-wider">
            務メ討魔録
          </h1>
          {/* 和風装飾線 */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
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
                  linkSource={tsutome.linkSource ? {
                    type: tsutome.linkSource.type,
                    name: tsutome.linkSource.name,
                    bonus: Math.round(tsutome.rewardBonus * 100)
                  } : undefined}
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
