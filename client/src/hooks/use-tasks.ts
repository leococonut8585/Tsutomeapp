import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { InsertTsutome, InsertShuren, InsertShihan, InsertShikaku } from "@shared/schema";
import { toast } from "@/hooks/use-toast";

// 務メ作成
export function useCreateTsutome() {
  return useMutation({
    mutationFn: async (data: InsertTsutome) => {
      const res = await apiRequest("POST", "/api/tsutomes", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tsutomes"] });
      
      // 画像生成エラーの警告がある場合
      if (data.warning) {
        toast({
          title: "務メを追加しました",
          description: data.warning,
        });
      } else {
        toast({
          title: "務メを追加しました",
          description: "新たな妖怪が出現しました！",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "務メの追加に失敗しました",
        variant: "destructive",
      });
    },
  });
}

// 務メ完了
export function useCompleteTsutome() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/tsutomes/${id}/complete`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tsutomes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      
      const rewards = data.rewards;
      if (rewards) {
        if (rewards.levelUp) {
          toast({
            title: "レベルアップ！",
            description: `レベル${rewards.newLevel}になりました！`,
          });
        } else {
          toast({
            title: "討伐完了！",
            description: `経験値+${rewards.exp} コイン+${rewards.coins}`,
          });
        }
      }
    },
    onError: (error: any) => {
      const message = error.error || "務メの完了に失敗しました";
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      });
    },
  });
}

// 修練作成
export function useCreateShuren() {
  return useMutation({
    mutationFn: async (data: Partial<InsertShuren>) => {
      // 必須フィールドの追加
      const completeData = {
        ...data,
        startDate: data.startDate || new Date(),
        trainingName: data.trainingName || "", // AIが生成
        playerId: data.playerId || "", // サーバー側で設定
      };
      const res = await apiRequest("POST", "/api/shurens", completeData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shurens"] });
      
      // 画像生成エラーの警告がある場合
      if (data.warning) {
        toast({
          title: "修練を開始しました",
          description: data.warning,
        });
      } else {
        toast({
          title: "修練を開始しました",
          description: "継続は力なり！",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "修練の開始に失敗しました",
        variant: "destructive",
      });
    },
  });
}

// 修練記録
export function useRecordShuren() {
  return useMutation({
    mutationFn: async ({ id, dataValue }: { id: string; dataValue: number }) => {
      const res = await apiRequest("PATCH", `/api/shurens/${id}/record`, { dataValue });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shurens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      
      const rewards = data.rewards;
      const shuren = data.shuren;
      toast({
        title: "修練を記録しました",
        description: `${shuren.continuousDays}日連続！ 経験値+${rewards.exp} コイン+${rewards.coins}`,
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "修練の記録に失敗しました",
        variant: "destructive",
      });
    },
  });
}

// ボス攻撃
export function useAttackBoss() {
  return useMutation({
    mutationFn: async (bossId: string) => {
      const res = await apiRequest("POST", `/api/boss/${bossId}/attack`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/boss/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      
      if (data.bossDefeated) {
        toast({
          title: "大敵撃破！",
          description: `報酬: 経験値+${data.rewards.exp} コイン+${data.rewards.coins}`,
        });
      } else {
        toast({
          title: "攻撃成功",
          description: `${data.damage}ダメージを与えた！ (受けたダメージ: ${data.playerDamage})`,
        });
      }
    },
    onError: (error: any) => {
      const message = error.error || "攻撃に失敗しました";
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      });
    },
  });
}

// アイテム購入
export function useBuyItem() {
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("POST", `/api/items/${itemId}/buy`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      
      toast({
        title: "購入完了",
        description: `${data.item.name}を購入しました`,
      });
    },
    onError: (error: any) => {
      const message = error.error || "購入に失敗しました";
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      });
    },
  });
}

// 職業変更
export function useChangeJob() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("POST", "/api/player/change-job", { jobId });
      if (!res.ok) {
        const error = await res.json();
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      toast({
        title: "転職完了",
        description: "新しい職業に就きました！",
      });
    },
    onError: (error: any) => {
      const message = error.error || "転職に失敗しました";
      toast({
        title: "エラー",
        description: message,
        variant: "destructive",
      });
    },
  });
}

// 師範作成
export function useCreateShihan() {
  return useMutation({
    mutationFn: async (data: Partial<InsertShihan>) => {
      const completeData = {
        ...data,
        targetDate: data.targetDate || new Date(),
        masterName: data.masterName || "", // AIが生成
        playerId: data.playerId || "", // サーバー側で設定
      };
      const res = await apiRequest("POST", "/api/shihans", completeData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shihans"] });
      
      // 画像生成エラーの警告がある場合
      if (data.warning) {
        toast({
          title: "師範の教えを設定しました",
          description: data.warning,
        });
      } else {
        toast({
          title: "師範の教えを設定しました",
          description: "長期目標に向かって精進しましょう！",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "師範の設定に失敗しました",
        variant: "destructive",
      });
    },
  });
}

// 刺客作成
export function useCreateShikaku() {
  return useMutation({
    mutationFn: async (data: Partial<InsertShikaku>) => {
      const completeData = {
        ...data,
        expiresAt: data.expiresAt || new Date(),
        assassinName: data.assassinName || "", // AIが生成
        playerId: data.playerId || "", // サーバー側で設定
      };
      const res = await apiRequest("POST", "/api/shikakus", completeData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shikakus"] });
      
      // 画像生成エラーの警告がある場合
      if (data.warning) {
        toast({
          title: "刺客が現れました",
          description: data.warning,
        });
      } else {
        toast({
          title: "刺客が現れました",
          description: "緊急任務を速やかに完了してください！",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "刺客の設定に失敗しました",
        variant: "destructive",
      });
    },
  });
}