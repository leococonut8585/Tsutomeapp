import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ShoppingBag, Coins, Package, Gem } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Item, Player } from "@shared/schema";
import { useLocation } from "wouter";
import { useBuyItem } from "@/hooks/use-tasks";

export default function ShopPage() {
  const [, setLocation] = useLocation();
  const buyItem = useBuyItem();

  // プレイヤー情報取得
  const { data: player } = useQuery<Player>({
    queryKey: ["/api/player"],
  });

  // アイテム一覧取得
  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const consumables = items?.filter((i) => i.itemType === "consumable") || [];
  const materials = items?.filter((i) => i.itemType === "material") || [];
  const equipment = items?.filter((i) => i.itemType === "equipment") || [];

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-serif font-bold text-primary">商店</h1>
          </div>
          {player && (
            <div className="flex items-center gap-2 px-4 py-2">
              <Coins className="w-4 h-4 text-accent" />
              <span className="text-lg font-mono" data-testid="player-coins">
                {player.coins.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">両</span>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-6 py-8">
        <Tabs defaultValue="consumable" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="consumable" data-testid="tab-consumable">
              消耗品
            </TabsTrigger>
            <TabsTrigger value="equipment" data-testid="tab-equipment">
              装備
            </TabsTrigger>
            <TabsTrigger value="material" data-testid="tab-material">
              素材
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="consumable" className="space-y-4">
                {consumables.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {consumables.map((item) => (
                      <ItemCard 
                        key={item.id} 
                        item={item} 
                        playerCoins={player?.coins || 0} 
                        onBuy={() => buyItem.mutate(item.id)}
                        buying={buyItem.isPending}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="消耗品がありません" />
                )}
              </TabsContent>

              <TabsContent value="equipment" className="space-y-4">
                {equipment.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {equipment.map((item) => (
                      <ItemCard 
                        key={item.id} 
                        item={item} 
                        playerCoins={player?.coins || 0} 
                        onBuy={() => buyItem.mutate(item.id)}
                        buying={buyItem.isPending}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="装備がありません" />
                )}
              </TabsContent>

              <TabsContent value="material" className="space-y-3">
                {materials.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {materials.map((item) => (
                      <MaterialCard 
                        key={item.id} 
                        item={item} 
                        playerCoins={player?.coins || 0} 
                        onBuy={() => buyItem.mutate(item.id)}
                        buying={buyItem.isPending}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="素材がありません" />
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function ItemCard({ 
  item, 
  playerCoins, 
  onBuy, 
  buying 
}: { 
  item: Item; 
  playerCoins: number; 
  onBuy: () => void; 
  buying: boolean;
}) {
  const canAfford = playerCoins >= item.price;

  return (
    <Card
      className="p-3 space-y-2 hover-elevate active-elevate-2 cursor-pointer"
      data-testid={`item-card-${item.id}`}
    >
      {/* アイテム画像 */}
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover rounded-lg"
            data-testid="item-image"
          />
        ) : (
          <Package className="w-12 h-12 text-muted-foreground" />
        )}
      </div>

      {/* アイテム名 */}
      <h3 className="text-xs font-semibold line-clamp-2 leading-tight min-h-[2rem]" data-testid="item-name">
        {item.name}
      </h3>

      {/* 価格 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Coins className="w-3 h-3 text-accent-foreground" />
          <span className={`text-xs font-mono font-bold ${canAfford ? "" : "text-destructive"}`} data-testid="item-price">
            {item.price}
          </span>
        </div>
        <Button
          size="sm"
          variant={canAfford ? "default" : "secondary"}
          className="h-7 px-2 text-xs"
          disabled={!canAfford || buying}
          onClick={(e) => {
            e.stopPropagation();
            onBuy();
          }}
          data-testid="button-buy-item"
        >
          {buying ? "..." : "購入"}
        </Button>
      </div>
    </Card>
  );
}

function MaterialCard({ 
  item, 
  playerCoins, 
  onBuy, 
  buying 
}: { 
  item: Item; 
  playerCoins: number; 
  onBuy: () => void; 
  buying: boolean;
}) {
  const canAfford = playerCoins >= item.price;

  return (
    <Card
      className="p-2 space-y-1.5 hover-elevate active-elevate-2 cursor-pointer"
      data-testid={`material-card-${item.id}`}
    >
      <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <Gem className="w-8 h-8 text-muted-foreground" />
        )}
      </div>
      <p className="text-[10px] font-semibold text-center line-clamp-1">{item.name}</p>
      <div className="flex items-center justify-center gap-0.5">
        <Coins className="w-2.5 h-2.5 text-accent-foreground" />
        <span className={`text-[10px] font-mono font-bold ${canAfford ? "" : "text-destructive"}`}>
          {item.price}
        </span>
      </div>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-card rounded-lg p-12 text-center border border-dashed border-border">
      <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
