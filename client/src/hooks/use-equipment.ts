import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Item } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useEquipItem() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      return apiRequest('/api/equipment/equip', {
        method: 'POST',
        body: JSON.stringify({ itemId })
      });
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/player'] });
      queryClient.invalidateQueries({ queryKey: ['/api/equipment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventories'] });
      
      toast({
        title: "装備しました",
        description: "アイテムを装備しました",
      });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "装備に失敗しました",
        variant: "destructive",
      });
    }
  });
}

export function useUnequipItem() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ slot }: { slot: 'weapon' | 'armor' | 'accessory' }) => {
      return apiRequest('/api/equipment/unequip', {
        method: 'POST',
        body: JSON.stringify({ slot })
      });
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/player'] });
      queryClient.invalidateQueries({ queryKey: ['/api/equipment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventories'] });
      
      toast({
        title: "装備を外しました",
        description: "アイテムを外しました",
      });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "装備解除に失敗しました",
        variant: "destructive",
      });
    }
  });
}

export function useEquipment() {
  return useQuery<Item[]>({
    queryKey: ['/api/equipment'],
  });
}