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
  const { data: inventories = [] } = useQuery<Inventory[]>({
    queryKey: ["/api/inventories"],
  });
  
  // Get equipped items by slot
  const getEquippedItem = (slot: 'weapon' | 'armor' | 'accessory') => {
    return equippedItems.find(item => {
      if (slot === 'weapon' && item.itemType === 'weapon') return true;
      if (slot === 'armor' && item.itemType === 'armor') return true;
      if (slot === 'accessory' && item.itemType === 'accessory') return true;
      return false;
    });
  };
  
  // Get equippable items from inventory
  const getEquippableItems = (type: 'weapon' | 'armor' | 'accessory') => {
    return inventories
      .filter(inv => inv.item.itemType === type && !inv.equipped)
      .map(inv => inv.item);
  };
  
  const weaponItem = getEquippedItem('weapon');
  const armorItem = getEquippedItem('armor');
  const accessoryItem = getEquippedItem('accessory');
  
  const weapons = getEquippableItems('weapon');
  const armors = getEquippableItems('armor');
  const accessories = getEquippableItems('accessory');
  
  // Calculate equipment bonuses
  const equipmentBonus = {
    strength: player?.equipmentBonus?.strength || 0,
    defense: player?.equipmentBonus?.defense || 0,
    vitality: player?.equipmentBonus?.vitality || 0,
    intelligence: player?.equipmentBonus?.intelligence || 0,
    agility: player?.equipmentBonus?.agility || 0,
  };
  
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
                      攻撃力 +{weaponItem.effects?.strength || 0}
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
                      防御力 +{armorItem.effects?.defense || 0}
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
                      {accessoryItem.effects?.vitality && `活力 +${accessoryItem.effects.vitality}`}
                      {accessoryItem.effects?.intelligence && ` 知力 +${accessoryItem.effects.intelligence}`}
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
            <h3 className="font-bold mb-3">装備効果</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>攻撃力</span>
                <span>
                  {player.strength - equipmentBonus.strength} 
                  <span className="text-accent"> +{equipmentBonus.strength}</span> 
                  <span className="font-bold"> = {player.strength}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>防御力</span>
                <span>
                  {player.defense - equipmentBonus.defense} 
                  <span className="text-accent"> +{equipmentBonus.defense}</span> 
                  <span className="font-bold"> = {player.defense}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>活力</span>
                <span>
                  {player.vitality - equipmentBonus.vitality} 
                  <span className="text-accent"> +{equipmentBonus.vitality}</span> 
                  <span className="font-bold"> = {player.vitality}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>知力</span>
                <span>
                  {player.intelligence - equipmentBonus.intelligence} 
                  <span className="text-accent"> +{equipmentBonus.intelligence}</span> 
                  <span className="font-bold"> = {player.intelligence}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span>敏捷性</span>
                <span>
                  {player.agility - equipmentBonus.agility} 
                  <span className="text-accent"> +{equipmentBonus.agility}</span> 
                  <span className="font-bold"> = {player.agility}</span>
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
                        攻撃力 +{item.effects?.strength || 0}
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
                        防御力 +{item.effects?.defense || 0}
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
                        {item.effects?.vitality && `活力 +${item.effects.vitality}`}
                        {item.effects?.intelligence && ` 知力 +${item.effects.intelligence}`}
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