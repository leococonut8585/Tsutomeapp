import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Star, Sparkles, Gem, TrendingUp } from "lucide-react";

// レアリティ設定
const rarityConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  common: { icon: Package, color: "text-gray-500", label: "コモン" },
  rare: { icon: Star, color: "text-blue-500", label: "レア" },
  epic: { icon: Sparkles, color: "text-purple-500", label: "エピック" },
  legendary: { icon: Gem, color: "text-yellow-500", label: "レジェンダリー" },
};

export function DropStatistics() {
  const { data: statistics, isLoading } = useQuery({
    queryKey: ["/api/drop-statistics"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            ドロップ統計
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!statistics) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          ドロップ統計
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 総ドロップ数 */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-3xl font-bold">{statistics.totalDrops}</div>
          <div className="text-sm text-muted-foreground">総ドロップ数</div>
        </div>

        {/* レアリティ別統計 */}
        <div>
          <h4 className="font-semibold mb-3">レアリティ別</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(statistics.byRarity).map(([rarity, count]) => {
              const config = rarityConfig[rarity];
              if (!config) return null;
              const Icon = config.icon;
              
              return (
                <div
                  key={rarity}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="text-sm">{config.label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* よく獲得するアイテム */}
        {statistics.mostCommon && statistics.mostCommon.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">よく獲得するアイテム</h4>
            <div className="space-y-2">
              {statistics.mostCommon.map((entry: any) => (
                <div
                  key={entry.itemId}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2">
                    {entry.item && (
                      <>
                        {(() => {
                          const config = rarityConfig[entry.item.rarity || 'common'];
                          const Icon = config.icon;
                          return (
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          );
                        })()}
                        <span className="text-sm font-medium">{entry.item.name}</span>
                      </>
                    )}
                  </div>
                  <Badge>{entry.count}個</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近のドロップ */}
        {statistics.recentDrops && statistics.recentDrops.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">最近のドロップ</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {statistics.recentDrops.map((drop: any) => (
                <div
                  key={drop.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card text-sm"
                >
                  <div className="flex items-center gap-2">
                    {drop.item && (
                      <>
                        {(() => {
                          const config = rarityConfig[drop.rarity || 'common'];
                          const Icon = config.icon;
                          return (
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          );
                        })()}
                        <span>{drop.item.name}</span>
                        {drop.quantity > 1 && (
                          <span className="text-muted-foreground">x{drop.quantity}</span>
                        )}
                        {drop.isBonus && (
                          <Badge variant="secondary" className="text-xs">
                            ボーナス
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(drop.droppedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}