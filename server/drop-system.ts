import { Item, Player, Tsutome, Inventory, InsertInventory } from "../shared/schema";

// レアリティ別の基本ドロップ率調整
const RARITY_MULTIPLIERS: Record<string, number> = {
  common: 1.0,
  rare: 0.6,
  epic: 0.3,
  legendary: 0.1,
};

// 難易度別の基本ドロップチャンス（より段階的な調整）
const DIFFICULTY_DROP_CHANCE: Record<string, number> = {
  easy: 20,      // 20% chance - 初心者向けに控えめ
  normal: 30,    // 30% chance - 適度な報酬
  hard: 40,      // 40% chance - 努力に見合う報酬
  veryHard: 50,  // 50% chance - 高難度への挑戦報酬
  extreme: 60,   // 60% chance - 最高難度の達成感
};

// 難易度別のレアリティウェイト
const DIFFICULTY_RARITY_WEIGHTS: Record<string, Record<string, number>> = {
  easy: { common: 85, rare: 14, epic: 1, legendary: 0 },
  normal: { common: 70, rare: 25, epic: 4, legendary: 1 },
  hard: { common: 50, rare: 35, epic: 12, legendary: 3 },
  veryHard: { common: 30, rare: 40, epic: 25, legendary: 5 },
  extreme: { common: 20, rare: 35, epic: 35, legendary: 10 },
};

// 職業別のドロップボーナス
const JOB_DROP_BONUSES: Record<string, { chanceBonus: number; rarityBonus: Record<string, number> }> = {
  samurai: {
    chanceBonus: 0,
    rarityBonus: { weapon: 15 }, // 武器ドロップ率 +15%
  },
  monk: {
    chanceBonus: 5,
    rarityBonus: { consumable: 20 }, // 消耗品ドロップ率 +20%
  },
  ninja: {
    chanceBonus: 10,
    rarityBonus: { material: 25 }, // 素材ドロップ率 +25%
  },
  scholar: {
    chanceBonus: 0, // 学者はドロップ率ボーナスなし（コインボーナスは別途処理）
    rarityBonus: {},
  },
  guardian: {
    chanceBonus: 0,
    rarityBonus: { armor: 15 }, // 防具ドロップ率 +15%
  },
  mystic: {
    chanceBonus: 0,
    rarityBonus: { rare: 100, epic: 100, legendary: 100 }, // レアドロップ率2倍（rare以上すべて2倍）
  },
};

export interface ItemDrop {
  item: Item;
  quantity: number;
  isBonus?: boolean; // 追加ドロップかどうか
}

/**
 * タスク完了時のアイテムドロップを計算
 */
export function calculateItemDrops(
  task: Tsutome,
  player: Player,
  droppableItems: Item[]
): ItemDrop[] {
  const drops: ItemDrop[] = [];
  
  // 基本ドロップチャンスを計算
  const baseChance = DIFFICULTY_DROP_CHANCE[task.difficulty] || 40;
  const jobBonus = JOB_DROP_BONUSES[player.job]?.chanceBonus || 0;
  const totalChance = baseChance + jobBonus;
  
  // メインドロップの判定
  if (Math.random() * 100 < totalChance) {
    const droppedItem = selectRandomItem(task.difficulty, player.job, droppableItems);
    if (droppedItem) {
      drops.push({
        item: droppedItem,
        quantity: getItemQuantity(droppedItem.rarity),
        isBonus: false,
      });
    }
  }
  
  // 学者の追加ドロップチャンス（25%）
  if (player.job === 'scholar' && Math.random() * 100 < 25) {
    const bonusItem = selectRandomItem(task.difficulty, player.job, droppableItems);
    if (bonusItem) {
      drops.push({
        item: bonusItem,
        quantity: getItemQuantity(bonusItem.rarity),
        isBonus: true,
      });
    }
  }
  
  return drops;
}

/**
 * レアリティと職業を考慮してアイテムを選択
 */
function selectRandomItem(
  difficulty: string,
  job: string,
  droppableItems: Item[]
): Item | null {
  if (droppableItems.length === 0) return null;
  
  // レアリティを決定
  const targetRarity = selectRarity(difficulty, job);
  
  // 職業ボーナスを取得
  const jobBonuses = JOB_DROP_BONUSES[job];
  
  // 候補アイテムをフィルタリング
  let candidateItems = droppableItems.filter(item => item.rarity === targetRarity);
  
  // 該当レアリティのアイテムがない場合、全アイテムから選択
  if (candidateItems.length === 0) {
    candidateItems = droppableItems;
  }
  
  // アイテムごとのウェイトを計算
  const weightedItems = candidateItems.map(item => {
    let weight = item.dropRate || 10;
    
    // 職業ボーナスを適用
    if (jobBonuses) {
      // アイテムタイプボーナス
      if (jobBonuses.rarityBonus[item.itemType]) {
        weight += jobBonuses.rarityBonus[item.itemType];
      }
      // レアリティボーナス（陰陽師）
      if (jobBonuses.rarityBonus[item.rarity]) {
        weight = Math.floor(weight * (1 + jobBonuses.rarityBonus[item.rarity] / 100));
      }
    }
    
    return { item, weight };
  });
  
  // ウェイテッドランダム選択
  const totalWeight = weightedItems.reduce((sum, wi) => sum + wi.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const wi of weightedItems) {
    random -= wi.weight;
    if (random <= 0) {
      return wi.item;
    }
  }
  
  // フォールバック
  return candidateItems[Math.floor(Math.random() * candidateItems.length)];
}

/**
 * レアリティを選択
 */
function selectRarity(difficulty: string, job: string): string {
  const weights = DIFFICULTY_RARITY_WEIGHTS[difficulty] || DIFFICULTY_RARITY_WEIGHTS.normal;
  
  // 陰陽師のレアリティボーナスを適用
  const adjustedWeights = { ...weights };
  if (job === 'mystic') {
    adjustedWeights.legendary = Math.min(adjustedWeights.legendary * 2, 20);
    adjustedWeights.epic = Math.min(adjustedWeights.epic * 2, 40);
  }
  
  const totalWeight = Object.values(adjustedWeights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (const [rarity, weight] of Object.entries(adjustedWeights)) {
    random -= weight;
    if (random <= 0) {
      return rarity;
    }
  }
  
  return 'common'; // フォールバック
}

/**
 * アイテムの個数を決定
 */
function getItemQuantity(rarity: string): number {
  switch (rarity) {
    case 'common':
      return Math.random() < 0.3 ? 2 : 1; // 30%で2個
    case 'rare':
      return 1;
    case 'epic':
      return 1;
    case 'legendary':
      return 1;
    default:
      return 1;
  }
}

/**
 * ドロップアイテムをインベントリに追加するための準備
 */
export function prepareInventoryItems(
  drops: ItemDrop[],
  playerId: string
): Omit<InsertInventory, "id" | "createdAt">[] {
  return drops.map(drop => ({
    playerId,
    itemId: drop.item.id,
    quantity: drop.quantity,
    equipped: false,
  }));
}

/**
 * ドロップ結果のサマリーを生成
 */
export function generateDropSummary(drops: ItemDrop[]): string {
  if (drops.length === 0) {
    return "";
  }
  
  const mainDrops = drops.filter(d => !d.isBonus);
  const bonusDrops = drops.filter(d => d.isBonus);
  
  let summary = "【ドロップアイテム】\n";
  
  mainDrops.forEach(drop => {
    const rarityEmoji = getRarityEmoji(drop.item.rarity);
    summary += `${rarityEmoji} ${drop.item.name} x${drop.quantity}\n`;
  });
  
  if (bonusDrops.length > 0) {
    summary += "\n【ボーナスドロップ】\n";
    bonusDrops.forEach(drop => {
      const rarityEmoji = getRarityEmoji(drop.item.rarity);
      summary += `${rarityEmoji} ${drop.item.name} x${drop.quantity}\n`;
    });
  }
  
  return summary;
}

/**
 * レアリティに応じた絵文字を返す
 */
function getRarityEmoji(rarity: string): string {
  switch (rarity) {
    case 'legendary':
      return '🌟'; // 金色
    case 'epic':
      return '💜'; // 紫
    case 'rare':
      return '💙'; // 青
    case 'common':
    default:
      return '⚪'; // 白
  }
}