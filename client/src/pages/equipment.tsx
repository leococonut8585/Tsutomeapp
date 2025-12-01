import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sword, Shield, Gem, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Player, Item, Inventory } from "@shared/schema";
import { useLocation } from "wouter";
import { useEquipItem, useUnequipItem, useEquipment } from "@/hooks/use-equipment";
import { ImageWithFallback } from "@/components/image-with-fallback";

type InventoryWithItem = Inventory & { item?: Item };

const resolveSlot = (item: Item): "weapon" | "armor" | "accessory" | null => {
  if (item.itemType === "weapon") return "weapon";
  if (item.itemType === "armor") return "armor";
  if (item.itemType === "accessory") return "accessory";
  if (item.itemType === "equipment") return "weapon"; // generic equipment扱い
  return null;
};

const parseStatBoost = (boost?: string | null): Record<string, number> => {
  if (!boost) return {};
  try {
    const parsed = typeof boost === "string" ? JSON.parse(boost) : boost;
    return parsed ?? {};
  } catch {
    return {};
  }
};

const formatEffects = (effects: Record<string, number>): string => {
  const labelMap: Record<string, string> = {
    wisdom: "知略",
    strength: "武勇",
    agility: "敏捷",
    vitality: "耐久",
    luck: "運気",
  };
  const entries = Object.entries(effects).filter(([, v]) => typeof v === "number");
  if (entries.length === 0) return "補正なし";
  return entries
    .map(([key, value]) => `${labelMap[key] ?? key} +${value}`)
    .join(" / ");
};

const computeEquipmentBonus = (items: Item[]) => {
  const bonus = { wisdom: 0, strength: 0, agility: 0, vitality: 0, luck: 0 };
  for (const item of items) {
    const effects = parseStatBoost(item.statBoost);
    for (const [key, value] of Object.entries(effects)) {
      if (key in bonus) {
        bonus[key as keyof typeof bonus] += value as number;
      }
    }
  }
  return bonus;
};

export default function EquipmentPage() {
  const [, setLocation] = useLocation();
  const equipItem = useEquipItem();
  const unequipItem = useUnequipItem();
  
  // Fetch player data
  const { data: player } = useQuery<Player>({
    queryKey: ["/api/player"],
  });
  
  // Fetch equipped items
  const { data: equippedItems = [], isLoading: loadingEquipped } = useEquipment();
  
  // Fetch inventory
  const { data: inventories = [] } = useQuery<InventoryWithItem[]>({
    queryKey: ["/api/inventories"],
  });
  
  // Get equipped items by slot
  const getEquippedItem = (slot: 'weapon' | 'armor' | 'accessory') => {
    return equippedItems.find(item => resolveSlot(item) === slot);
  };
  
  // Get equippable items from inventory
  const getEquippableItems = (type: 'weapon' | 'armor' | 'accessory') => {
    return inventories
      .filter(inv => inv.item && resolveSlot(inv.item) === type && !inv.equipped)
      .map(inv => inv.item!)
      .filter(Boolean);
  };
  
  const weaponItem = getEquippedItem('weapon');
  const armorItem = getEquippedItem('armor');
  const accessoryItem = getEquippedItem('accessory');
  
  const weapons = getEquippableItems('weapon');
  const armors = getEquippableItems('armor');
  const accessories = getEquippableItems('accessory');
  
  // Calculate equipment bonuses
  const equipmentBonus = computeEquipmentBonus(equippedItems);
  
  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/profile")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-serif font-bold text-primary">装備</h1>
          </div>
        </div>
      </header>
      
      <main className="px-4 py-4 space-y-4">
        {/* Equipment Slots */}
        <div className="grid grid-cols-1 gap-4">
          {/* Weapon Slot */}
          <Card className="p-4" data-testid="slot-weapon">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                {weaponItem ? (
                  <ImageWithFallback
                    src={weaponItem.imageUrl}
                    alt={weaponItem.name}
                    className="w-full h-full object-cover rounded-lg"
                    fallback={<Sword className="w-8 h-8 text-muted-foreground" />}
                  />
                ) : (
                  <Sword className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">武器</h3>
                  <Badge variant="outline" className="text-xs">
                    Weapon
                  </Badge>
                </div>
                {weaponItem ? (
                  <>
                    <p className="text-sm font-medium">{weaponItem.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEffects(parseStatBoost(weaponItem.statBoost))}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => unequipItem.mutate({ slot: 'weapon' })}
                      disabled={unequipItem.isPending}
                      data-testid="button-unequip-weapon"
                    >
                      外す
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">未装備</p>
                )}
              </div>
            </div>
          </Card>
          
          {/* Armor Slot */}
          <Card className="p-4" data-testid="slot-armor">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                {armorItem ? (
                  <ImageWithFallback
                    src={armorItem.imageUrl}
                    alt={armorItem.name}
                    className="w-full h-full object-cover rounded-lg"
                    fallback={<Shield className="w-8 h-8 text-muted-foreground" />}
                  />
                ) : (
                  <Shield className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">防具</h3>
                  <Badge variant="outline" className="text-xs">
                    Armor
                  </Badge>
                </div>
                {armorItem ? (
                  <>
                    <p className="text-sm font-medium">{armorItem.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEffects(parseStatBoost(armorItem.statBoost))}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => unequipItem.mutate({ slot: 'armor' })}
                      disabled={unequipItem.isPending}
                      data-testid="button-unequip-armor"
                    >
                      外す
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">未装備</p>
                )}
              </div>
            </div>
          </Card>
          
          {/* Accessory Slot */}
          <Card className="p-4" data-testid="slot-accessory">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                {accessoryItem ? (
                  <ImageWithFallback
                    src={accessoryItem.imageUrl}
                    alt={accessoryItem.name}
                    className="w-full h-full object-cover rounded-lg"
                    fallback={<Gem className="w-8 h-8 text-muted-foreground" />}
                  />
                ) : (
                  <Gem className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">装飾品</h3>
                  <Badge variant="outline" className="text-xs">
                    Accessory
                  </Badge>
                </div>
                {accessoryItem ? (
                  <>
                    <p className="text-sm font-medium">{accessoryItem.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEffects(parseStatBoost(accessoryItem.statBoost))}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => unequipItem.mutate({ slot: 'accessory' })}
                      disabled={unequipItem.isPending}
                      data-testid="button-unequip-accessory"
                    >
                      外す
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">未装備</p>
                )}
              </div>
            </div>
          </Card>
        </div>
        
        {/* Stats Preview */}
        {player && (
          <Card className="p-4">
            <h3 className="font-bold mb-3">装備後ステータス</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>武勇</span>
                <span>
                  {player.strength}
                  <span className="text-accent"> +{equipmentBonus.strength}</span>
                  <span className="font-bold"> = {player.strength + equipmentBonus.strength}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>耐久</span>
                <span>
                  {player.vitality}
                  <span className="text-accent"> +{equipmentBonus.vitality}</span>
                  <span className="font-bold"> = {player.vitality + equipmentBonus.vitality}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>知略</span>
                <span>
                  {player.wisdom}
                  <span className="text-accent"> +{equipmentBonus.wisdom}</span>
                  <span className="font-bold"> = {player.wisdom + equipmentBonus.wisdom}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>敏捷</span>
                <span>
                  {player.agility}
                  <span className="text-accent"> +{equipmentBonus.agility}</span>
                  <span className="font-bold"> = {player.agility + equipmentBonus.agility}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>運気</span>
                <span>
                  {player.luck}
                  <span className="text-accent"> +{equipmentBonus.luck}</span>
                  <span className="font-bold"> = {player.luck + equipmentBonus.luck}</span>
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Inventory Tabs */}
        <Card className="p-4">
          <h3 className="font-bold mb-3">所持装備</h3>
          <Tabs defaultValue="weapon" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weapon">武器</TabsTrigger>
              <TabsTrigger value="armor">防具</TabsTrigger>
              <TabsTrigger value="accessory">装飾品</TabsTrigger>
            </TabsList>
            
            <TabsContent value="weapon" className="space-y-2">
              {weapons.length > 0 ? (
                weapons.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEffects(parseStatBoost(item.statBoost))}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => equipItem.mutate({ itemId: item.id })}
                      disabled={equipItem.isPending}
                      data-testid={`button-equip-${item.id}`}
                    >
                      装備する
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  装備可能な武器がありません
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="armor" className="space-y-2">
              {armors.length > 0 ? (
                armors.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEffects(parseStatBoost(item.statBoost))}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => equipItem.mutate({ itemId: item.id })}
                      disabled={equipItem.isPending}
                      data-testid={`button-equip-${item.id}`}
                    >
                      装備する
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  装備可能な防具がありません
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="accessory" className="space-y-2">
              {accessories.length > 0 ? (
                accessories.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEffects(parseStatBoost(item.statBoost))}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => equipItem.mutate({ itemId: item.id })}
                      disabled={equipItem.isPending}
                      data-testid={`button-equip-${item.id}`}
                    >
                      装備する
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  装備可能な装飾品がありません
                </p>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
