import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Swords, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Boss, Player } from "@shared/schema";
import { useLocation } from "wouter";

export default function BossPage() {
  const [, setLocation] = useLocation();

  // プレイヤー情報取得
  const { data: player } = useQuery<Player>({
    queryKey: ["/api/player"],
  });

  // 現在のボス取得
  const { data: currentBoss, isLoading } = useQuery<Boss>({
    queryKey: ["/api/boss/current"],
  });

  const bossHpPercent = currentBoss
    ? (currentBoss.hp / currentBoss.maxHp) * 100
    : 0;

  // 推定ダメージ計算（簡易版）
  const estimatedDamage = player
    ? Math.floor(player.strength * 2 + player.level * 3)
    : 0;

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-card border-b border-card-border shadow-sm">
        <div className="flex items-center gap-2 px-4 h-14">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-serif font-bold text-destructive">大敵襲来</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-4 py-4 space-y-4">
        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : currentBoss ? (
          <div className="space-y-4">
            {/* ボス画像カード */}
            <Card className="overflow-hidden">
              {currentBoss.bossImageUrl ? (
                <div className="relative aspect-[4/5] bg-gradient-to-b from-destructive/20 to-destructive/5">
                  <img
                    src={currentBoss.bossImageUrl}
                    alt={currentBoss.bossName}
                    className="w-full h-full object-cover"
                    data-testid="boss-image"
                  />
                  {/* ボス名オーバーレイ */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <h2
                      className="text-2xl font-serif font-bold text-white text-center"
                      data-testid="boss-name"
                    >
                      {currentBoss.bossName}
                    </h2>
                  </div>
                </div>
              ) : (
                <div className="aspect-[4/5] bg-gradient-to-b from-destructive/20 to-destructive/5 flex items-center justify-center">
                  <span className="text-8xl">👺</span>
                </div>
              )}
            </Card>

            {/* ボスステータス */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="destructive" className="text-xs font-bold">
                  第{currentBoss.bossNumber}の大敵
                </Badge>
                <div className="text-sm text-muted-foreground">
                  推定討伐日数:{" "}
                  <span className="font-mono font-bold text-foreground">
                    {estimatedDamage > 0
                      ? Math.ceil(currentBoss.hp / estimatedDamage)
                      : "??"}
                  </span>
                  日
                </div>
              </div>

              {/* HP バー */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-muted-foreground">体力</span>
                  <span className="font-mono font-bold" data-testid="boss-hp">
                    {currentBoss.hp.toLocaleString()} /{" "}
                    {currentBoss.maxHp.toLocaleString()}
                  </span>
                </div>
                <div className="h-4 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-destructive via-destructive to-red-600 transition-all duration-500"
                    style={{ width: `${bossHpPercent}%` }}
                    data-testid="boss-hp-bar"
                  />
                </div>
              </div>

              {/* 攻撃力 */}
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    攻撃力
                  </span>
                </div>
                <span className="text-lg font-mono font-bold text-destructive" data-testid="boss-attack">
                  {currentBoss.attackPower}
                </span>
              </div>
            </Card>

            {/* プレイヤーステータス */}
            {player && (
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  あなたの戦力
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold">攻撃</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-primary">
                      {estimatedDamage}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-chart-4/10 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-chart-4" />
                      <span className="text-xs font-semibold">防御</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-chart-4">
                      {player.vitality}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* アクションボタン */}
            <div className="space-y-2">
              <Button className="w-full h-12" size="lg" data-testid="button-daily-attack">
                <Swords className="w-5 h-5 mr-2" />
                今日の攻撃を実行
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                毎日1回、自動で攻撃が行われます
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-12 text-center">
            <p className="text-muted-foreground mb-4">
              大敵はまだ現れていません
            </p>
            <p className="text-sm text-muted-foreground">
              務メを討伐してストーリーを進めましょう
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
