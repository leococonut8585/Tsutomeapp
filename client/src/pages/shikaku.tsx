import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Plus, Zap, AlertTriangle } from "lucide-react";
import { ShurikenIcon } from "@/components/icons/japanese-icons";
import { ShikakuCard } from "@/components/shikaku-card";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { Shikaku } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function ShikakuPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 刺客一覧を取得
  const { data: shikakus, isLoading } = useQuery<Shikaku[]>({
    queryKey: ["/api/shikakus"],
    refetchInterval: 60000, // 1分ごとに更新（期限切れ確認のため）
  });

  // 刺客を完了
  const completeShikaku = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/shikakus/${id}/complete`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shikakus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      toast({
        title: "刺客を撃退！",
        description: `${data.rewardXp}XPと${data.rewardCoins}金を獲得しました`,
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "刺客の完了に失敗しました",
        variant: "destructive",
      });
    },
  });

  // 刺客を分類
  const activeShikakus = shikakus?.filter((s) => {
    const expiresAt = new Date(s.expiresAt);
    return !s.completed && expiresAt > new Date();
  }) || [];

  const expiredShikakus = shikakus?.filter((s) => {
    const expiresAt = new Date(s.expiresAt);
    return !s.completed && expiresAt <= new Date();
  }) || [];

  const completedShikakus = shikakus?.filter((s) => s.completed) || [];

  // 緊急度でソート（期限が近い順）
  activeShikakus.sort((a, b) => 
    new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <ShurikenIcon />
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-b">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
                <Zap className="w-6 h-6" />
                刺客の挑戦
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                緊急タスクを素早く処理しましょう
              </p>
            </div>
            <Button
              onClick={() => {
                // フォームダイアログを開く（後で実装）
                setCreateDialogOpen(true);
              }}
              size="icon"
              className="rounded-full japanese-shadow"
              data-testid="button-add-shikaku"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 bg-background/60 rounded-lg">
              <p className="text-2xl font-bold">{activeShikakus.length}</p>
              <p className="text-xs text-muted-foreground">進行中</p>
            </div>
            <div className="text-center p-3 bg-destructive/20 rounded-lg">
              <p className="text-2xl font-bold">{expiredShikakus.length}</p>
              <p className="text-xs text-muted-foreground">期限切れ</p>
            </div>
            <div className="text-center p-3 bg-background/60 rounded-lg">
              <p className="text-2xl font-bold">{completedShikakus.length}</p>
              <p className="text-xs text-muted-foreground">撃退済み</p>
            </div>
          </div>

          {/* 緊急警告 */}
          {activeShikakus.some(s => {
            const hours = Math.floor((new Date(s.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60));
            return hours < 6;
          }) && (
            <div className="mt-4 p-3 bg-destructive/20 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
              <p className="text-sm text-destructive font-semibold">
                緊急！6時間以内に期限切れになるタスクがあります
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 進行中の刺客 */}
      {activeShikakus.length > 0 && (
        <div className="px-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground">進行中の刺客</h2>
          <div className="space-y-4">
            {activeShikakus.map((shikaku) => (
              <ShikakuCard
                key={shikaku.id}
                shikaku={shikaku}
                onComplete={() => completeShikaku.mutate(shikaku.id)}
                onClick={() => {
                  // 詳細表示（将来実装）
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 期限切れの刺客 */}
      {expiredShikakus.length > 0 && (
        <div className="px-4 space-y-4">
          <h2 className="font-semibold text-sm text-destructive">期限切れの刺客</h2>
          <div className="space-y-4 opacity-60">
            {expiredShikakus.map((shikaku) => (
              <ShikakuCard
                key={shikaku.id}
                shikaku={shikaku}
                onClick={() => {
                  // 詳細表示（将来実装）
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 撃退済みの刺客 */}
      {completedShikakus.length > 0 && (
        <div className="px-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground">撃退済みの刺客</h2>
          <div className="space-y-4 opacity-60">
            {completedShikakus.map((shikaku) => (
              <ShikakuCard
                key={shikaku.id}
                shikaku={shikaku}
                onClick={() => {
                  // 詳細表示（将来実装）
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 空状態 */}
      {shikakus?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 
            flex items-center justify-center mb-4">
            <ShurikenIcon />
          </div>
          <h3 className="font-semibold text-lg mb-2">まだ刺客がいません</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            緊急タスクを追加して、素早く撃退しましょう
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            data-testid="button-add-first-shikaku"
          >
            <Plus className="w-4 h-4 mr-2" />
            最初の刺客を追加
          </Button>
        </div>
      )}

      {/* 作成ダイアログ */}
      <TaskFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        taskType="shikaku"
      />
    </div>
  );
}