import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { ScrollIcon } from "@/components/icons/japanese-icons";
import { ShihanCard } from "@/components/shihan-card";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { Shihan } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { TsutomeGenerateDialog } from "@/components/tsutome-generate-dialog";

export default function ShihanPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedShihan, setSelectedShihan] = useState<Shihan | null>(null);

  // 師範一覧を取得
  const { data: shihans, isLoading } = useQuery<Shihan[]>({
    queryKey: ["/api/shihans"],
  });

  // 師範を完了
  const completeShihan = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/shihans/${id}/complete`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shihans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      toast({
        title: "師範の教えを達成！",
        description: `${data.rewardXp}XPと${data.rewardCoins}金を獲得しました`,
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "師範の完了に失敗しました",
        variant: "destructive",
      });
    },
  });

  const activeShihans = shihans?.filter((s) => !s.completed) || [];
  const completedShihans = shihans?.filter((s) => s.completed) || [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <ScrollIcon />
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-b">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
                <Target className="w-6 h-6" />
                師範の教え
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                長期目標を設定し、師範の導きを受けましょう
              </p>
            </div>
            <Button
              onClick={() => {
                // フォームダイアログを開く（後で実装）
                setCreateDialogOpen(true);
              }}
              size="icon"
              className="rounded-full japanese-shadow"
              data-testid="button-add-shihan"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-background/60 rounded-lg">
              <p className="text-2xl font-bold">{activeShihans.length}</p>
              <p className="text-xs text-muted-foreground">進行中</p>
            </div>
            <div className="text-center p-3 bg-background/60 rounded-lg">
              <p className="text-2xl font-bold">{completedShihans.length}</p>
              <p className="text-xs text-muted-foreground">達成済み</p>
            </div>
          </div>
        </div>
      </div>

      {/* 進行中の師範 */}
      {activeShihans.length > 0 && (
        <div className="px-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground">進行中の師範</h2>
          <div className="space-y-4">
            {activeShihans.map((shihan) => (
              <ShihanCard
                key={shihan.id}
                shihan={shihan}
                onComplete={() => completeShihan.mutate(shihan.id)}
                onGenerateTsutome={() => {
                  setSelectedShihan(shihan);
                  setGenerateDialogOpen(true);
                }}
                onClick={() => {
                  // 詳細表示（将来実装）
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 達成済みの師範 */}
      {completedShihans.length > 0 && (
        <div className="px-4 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground">達成済みの師範</h2>
          <div className="space-y-4 opacity-60">
            {completedShihans.map((shihan) => (
              <ShihanCard
                key={shihan.id}
                shihan={shihan}
                onClick={() => {
                  // 詳細表示（将来実装）
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 空状態 */}
      {shihans?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-chart-3/20 to-chart-3/10 
            flex items-center justify-center mb-4">
            <ScrollIcon />
          </div>
          <h3 className="font-semibold text-lg mb-2">まだ師範がいません</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            長期目標を設定して、師範の導きを受けましょう
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            data-testid="button-add-first-shihan"
          >
            <Plus className="w-4 h-4 mr-2" />
            最初の師範を追加
          </Button>
        </div>
      )}

      {/* 作成ダイアログ */}
      <TaskFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        taskType="shihan"
      />
      
      {/* 務メ生成ダイアログ */}
      {selectedShihan && (
        <TsutomeGenerateDialog
          open={generateDialogOpen}
          onOpenChange={setGenerateDialogOpen}
          source={selectedShihan}
          sourceType="shihan"
        />
      )}
    </div>
  );
}