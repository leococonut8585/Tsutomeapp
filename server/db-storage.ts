import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import { eq, and, or, desc, isNull, lt, lte, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import {
  players,
  tsutomes,
  shurens,
  shihans,
  shikakus,
  bosses,
  stories,
  items,
  inventories,
  cronLogs,
  dropHistory,
  adminAuditLogs,
  type Player,
  type Tsutome,
  type Shuren,
  type Shihan,
  type Shikaku,
  type Boss,
  type Story,
  type Item,
  type Inventory,
  type CronLog,
  type DropHistory,
  type InsertPlayer,
  type InsertTsutome,
  type InsertShuren,
  type InsertShihan,
  type InsertShikaku,
  type InsertBoss,
  type InsertStory,
  type InsertItem,
  type InsertInventory,
  type InsertCronLog,
  type InsertDropHistory,
  type AdminAuditLog,
  type InsertAdminAuditLog,
} from "@shared/schema";
import type { ApiUsageDelta, IStorage } from "./storage";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

type StatBonus = {
  wisdom: number;
  strength: number;
  agility: number;
  vitality: number;
  luck: number;
};

function createEmptyBonus(): StatBonus {
  return { wisdom: 0, strength: 0, agility: 0, vitality: 0, luck: 0 };
}

function parseStatBoostValue(boost?: string | null): Partial<StatBonus> {
  if (!boost) return {};
  try {
    const parsed = typeof boost === "string" ? JSON.parse(boost) : boost;
    return parsed || {};
  } catch {
    return {};
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// PostgreSQL謗･邯・(node-postgres)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

export class DbStorage implements IStorage {
  public db = db;

  // Player
  async getPlayer(id: string): Promise<Player | undefined> {
    const result = await db.select().from(players).where(eq(players.id, id));
    return result[0];
  }

  async getPlayerByName(name: string): Promise<Player | undefined> {
    const result = await db.select().from(players).where(eq(players.name, name));
    return result[0];
  }

  async getPlayerByUsername(username: string): Promise<Player | undefined> {
    const result = await db.select().from(players).where(eq(players.username, username));
    return result[0];
  }

  async listPlayers(): Promise<Player[]> {
    return await db.select().from(players);
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const result = await db.insert(players).values([player]).returning();
    return result[0];
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    const result = await db.update(players).set(updates).where(eq(players.id, id)).returning();
    return result[0];
  }

  async getCurrentPlayer(): Promise<Player | undefined> {
    // 譛蛻昴・繝励Ξ繧､繝､繝ｼ繧定ｿ斐☆・医す繝ｳ繧ｰ繝ｫ繝励Ξ繧､繝､繝ｼ繧ｲ繝ｼ繝・・
    const result = await db.select().from(players).limit(1);
    return result[0];
  }
  async incrementApiUsage(playerId: string, delta: ApiUsageDelta): Promise<void> {
    const calls = delta.calls ?? 0;
    const cost = delta.costUsd ?? 0;
    if (!calls && !cost) {
      return;
    }
    await db
      .update(players)
      .set({
        monthlyApiCalls: sql<number>`${players.monthlyApiCalls} + ${calls}`,
        monthlyApiCost: sql<number>`${players.monthlyApiCost} + ${cost}`,
      })
      .where(eq(players.id, playerId));
  }



  // Tsutome
  async getTsutome(id: string): Promise<Tsutome | undefined> {
    const result = await db.select().from(tsutomes).where(eq(tsutomes.id, id));
    return result[0];
  }

  async getAllTsutomes(playerId: string): Promise<Tsutome[]> {
    return await db.select().from(tsutomes).where(eq(tsutomes.playerId, playerId));
  }

  async getTsutomesByShihanId(shihanId: string): Promise<Tsutome[]> {
    return await db.select().from(tsutomes).where(eq(tsutomes.linkedShihanId, shihanId));
  }

  async getTsutomesByShurenId(shurenId: string): Promise<Tsutome[]> {
    return await db.select().from(tsutomes).where(eq(tsutomes.linkedShurenId, shurenId));
  }

  async createTsutome(tsutome: InsertTsutome): Promise<Tsutome> {
    const payload = {
      ...tsutome,
      monsterName: tsutome.monsterName ?? "・ｽd・ｽ・ｽ",
      monsterImageUrl: tsutome.monsterImageUrl ?? null,
      lastPenaltyDate: (tsutome as any).lastPenaltyDate ?? null,
    };
    const [result] = await db.insert(tsutomes).values(payload).returning();
    return result;
  }

  async updateTsutome(id: string, updates: Partial<Tsutome>): Promise<Tsutome | undefined> {
    const result = await db.update(tsutomes).set(updates).where(eq(tsutomes.id, id)).returning();
    return result[0];
  }

  async deleteTsutome(id: string): Promise<boolean> {
    const result = await db.delete(tsutomes).where(eq(tsutomes.id, id)).returning();
    return result.length > 0;
  }

  // Shuren
  async getShuren(id: string): Promise<Shuren | undefined> {
    const result = await db.select().from(shurens).where(eq(shurens.id, id));
    return result[0];
  }

  async getAllShurens(playerId: string): Promise<Shuren[]> {
    return await db.select().from(shurens).where(eq(shurens.playerId, playerId));
  }

  async createShuren(shuren: InsertShuren): Promise<Shuren> {
    const result = await db.insert(shurens).values([shuren]).returning();
    return result[0];
  }

  async updateShuren(id: string, updates: Partial<Shuren>): Promise<Shuren | undefined> {
    const result = await db.update(shurens).set(updates).where(eq(shurens.id, id)).returning();
    return result[0];
  }

  async deleteShuren(id: string): Promise<boolean> {
    const result = await db.delete(shurens).where(eq(shurens.id, id)).returning();
    return result.length > 0;
  }

  // Shihan
  async getShihan(id: string): Promise<Shihan | undefined> {
    const result = await db.select().from(shihans).where(eq(shihans.id, id));
    return result[0];
  }

  async getAllShihans(playerId: string): Promise<Shihan[]> {
    return await db.select().from(shihans).where(eq(shihans.playerId, playerId));
  }

  async createShihan(shihan: InsertShihan): Promise<Shihan> {
    const result = await db.insert(shihans).values([shihan]).returning();
    return result[0];
  }

  async updateShihan(id: string, updates: Partial<Shihan>): Promise<Shihan | undefined> {
    const result = await db.update(shihans).set(updates).where(eq(shihans.id, id)).returning();
    return result[0];
  }

  async deleteShihan(id: string): Promise<boolean> {
    const result = await db.delete(shihans).where(eq(shihans.id, id)).returning();
    return result.length > 0;
  }

  // Shikaku
  async getShikaku(id: string): Promise<Shikaku | undefined> {
    const result = await db.select().from(shikakus).where(eq(shikakus.id, id));
    return result[0];
  }

  async getAllShikakus(playerId: string): Promise<Shikaku[]> {
    return await db.select().from(shikakus).where(eq(shikakus.playerId, playerId));
  }

  async createShikaku(shikaku: InsertShikaku): Promise<Shikaku> {
    const expiresAt = (shikaku as any).expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
    const payload = {
      ...shikaku,
      assassinImageUrl: shikaku.assassinImageUrl ?? null,
      expiresAt,
    } as any;
    const [result] = await db.insert(shikakus).values(payload).returning();
    return result;
  }

  async updateShikaku(id: string, updates: Partial<Shikaku>): Promise<Shikaku | undefined> {
    const result = await db.update(shikakus).set(updates).where(eq(shikakus.id, id)).returning();
    return result[0];
  }

  async deleteShikaku(id: string): Promise<boolean> {
    const result = await db.delete(shikakus).where(eq(shikakus.id, id)).returning();
    return result.length > 0;
  }

  // Boss
  async getBoss(id: string): Promise<Boss | undefined> {
    const result = await db.select().from(bosses).where(eq(bosses.id, id));
    return result[0];
  }

  async getCurrentBoss(playerId: string): Promise<Boss | undefined> {
    // 譛ｪ謦・ｴ縺ｮ繝懊せ縺ｮ荳ｭ縺ｧ譛蟆上・bossNumber繧呈戟縺､繝懊せ繧定ｿ斐☆
    const result = await db
      .select()
      .from(bosses)
      .where(and(eq(bosses.playerId, playerId), eq(bosses.defeated, false)))
      .orderBy(bosses.bossNumber)
      .limit(1);
    return result[0];
  }

  async getAllBosses(): Promise<Boss[]> {
    return await db.select().from(bosses);
  }

  async createBoss(boss: InsertBoss): Promise<Boss> {
    const result = await db.insert(bosses).values([boss]).returning();
    return result[0];
  }

  async updateBoss(id: string, updates: Partial<Boss>): Promise<Boss | undefined> {
    const result = await db.update(bosses).set(updates).where(eq(bosses.id, id)).returning();
    return result[0];
  }

  // Story
  async getStory(id: string): Promise<Story | undefined> {
    const result = await db.select().from(stories).where(eq(stories.id, id));
    return result[0];
  }

  async getAllStories(playerId: string): Promise<Story[]> {
    return await db.select().from(stories).where(eq(stories.playerId, playerId));
  }

  async createStory(story: InsertStory): Promise<Story> {
    const result = await db.insert(stories).values([story]).returning();
    return result[0];
  }

  async updateStory(id: string, updates: Partial<Story>): Promise<Story | undefined> {
    const result = await db.update(stories).set(updates).where(eq(stories.id, id)).returning();
    return result[0];
  }

  // Item
  async getItem(id: string): Promise<Item | undefined> {
    const result = await db.select().from(items).where(eq(items.id, id));
    return result[0];
  }

  async getAllItems(): Promise<Item[]> {
    return await db.select().from(items);
  }

  async createItem(item: InsertItem): Promise<Item> {
    const normalizedType = ["weapon", "armor", "accessory", "consumable", "material"].includes(item.itemType as string)
      ? item.itemType
      : item.itemType === "equipment"
        ? "weapon"
        : item.itemType;
    const payload = {
      ...item,
      itemType: normalizedType,
      rarity: (item as any).rarity ?? "common",
      droppable: (item as any).droppable ?? normalizedType !== "consumable",
      dropRate: (item as any).dropRate ?? 10,
      imageUrl: item.imageUrl ?? null,
      statBoost: item.statBoost ?? null,
    };
    const [result] = await db.insert(items).values(payload).returning();
    return result;
  }

  // Inventory
  async getInventory(id: string): Promise<Inventory | undefined> {
    const result = await db.select().from(inventories).where(eq(inventories.id, id));
    return result[0];
  }

  async getPlayerInventory(playerId: string): Promise<Inventory[]> {
    return await db.select().from(inventories).where(eq(inventories.playerId, playerId));
  }

  async addToInventory(inventory: InsertInventory): Promise<Inventory> {
    const result = await db.insert(inventories).values([inventory]).returning();
    return result[0];
  }

  async updateInventory(id: string, updates: Partial<Inventory>): Promise<Inventory | undefined> {
    const result = await db.update(inventories).set(updates).where(eq(inventories.id, id)).returning();
    return result[0];
  }

  private getSlotForItem(item: Item): "weapon" | "armor" | "accessory" | null {
    if (item.itemType === "weapon") return "weapon";
    if (item.itemType === "armor") return "armor";
    if (item.itemType === "accessory") return "accessory";
    if (item.itemType === "equipment") return "weapon"; // fallback for generic equipment
    return null;
  }

  async equipItem(playerId: string, itemId: string, slot: "weapon" | "armor" | "accessory"): Promise<void> {
    const playerInventories = await this.getPlayerInventory(playerId);
    const targetInventory = playerInventories.find((inv) => inv.itemId === itemId);
    if (!targetInventory) throw new Error("Inventory item not found");

    const items = await this.getAllItems();
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) throw new Error("Item not found");
    const resolvedSlot = this.getSlotForItem(targetItem);
    if (resolvedSlot && resolvedSlot !== slot) {
      throw new Error("Item cannot be equipped to this slot");
    }

    // Unequip other items in the same slot
    for (const inv of playerInventories) {
      const invItem = items.find((i) => i.id === inv.itemId);
      if (!invItem) continue;
      if (this.getSlotForItem(invItem) === slot && inv.equipped) {
        await db.update(inventories).set({ equipped: false }).where(eq(inventories.id, inv.id));
      }
    }

    await db.update(inventories).set({ equipped: true }).where(eq(inventories.id, targetInventory.id));
  }

  async unequipItem(playerId: string, slot: "weapon" | "armor" | "accessory"): Promise<void> {
    const playerInventories = await this.getPlayerInventory(playerId);
    const items = await this.getAllItems();

    for (const inv of playerInventories) {
      const invItem = items.find((i) => i.id === inv.itemId);
      if (!invItem) continue;
      if (this.getSlotForItem(invItem) === slot && inv.equipped) {
        await db.update(inventories).set({ equipped: false }).where(eq(inventories.id, inv.id));
      }
    }
  }

  private async getEquipmentBonus(playerId: string): Promise<StatBonus> {
    const bonus = createEmptyBonus();
    const playerInventories = await this.getPlayerInventory(playerId);
    for (const inv of playerInventories) {
      if (!inv.equipped) continue;
      const item = await this.getItem(inv.itemId);
      if (!item) continue;
      const effects = parseStatBoostValue(item.statBoost);
      for (const [key, value] of Object.entries(effects)) {
        if (key in bonus && typeof value === "number") {
          (bonus as any)[key] += value as number;
        }
      }
    }
    return bonus;
  }

  // Cron Operations
  async getLastCronExecution(taskType: string, playerId?: string): Promise<Date | undefined> {
    const conditions = [eq(cronLogs.taskType, taskType)];
    if (playerId) {
      conditions.push(eq(cronLogs.playerId, playerId));
    }
    
    const result = await db
      .select()
      .from(cronLogs)
      .where(and(...conditions))
      .orderBy(desc(cronLogs.executedAt))
      .limit(1);
    
    return result.length > 0 ? new Date(result[0].executedAt!) : undefined;
  }

  async logCronExecution(taskType: string, playerId: string | null, success: boolean, details?: any, error?: string): Promise<void> {
    await db.insert(cronLogs).values({
      taskType,
      playerId,
      success,
      details: details ? JSON.stringify(details) : null,
      error: error || null,
    });
  }

  // Periodic Operations
  async resetDailyShurenCompletions(playerId: string): Promise<void> {
    // In a real system, we'd track daily completions separately
    // For now, we just check if lastCompletedAt is today
    const shurens = await this.getAllShurens(playerId);
    const now = new Date();
    
    for (const shuren of shurens) {
      const lastCompleted = shuren.lastCompletedAt ? new Date(shuren.lastCompletedAt) : null;
      
      // If last completion was not today, reset the tracking
      if (!lastCompleted || !isSameDay(lastCompleted, now)) {
        // The actual daily completion is tracked in the frontend
        // Here we just ensure the backend is ready for new completions
      }
    }
  }

  async processOverdueTasks(playerId: string): Promise<{ hpDamage: number; deadTasks: string[] }> {
    const now = new Date();
    let totalDamage = 0;
    const deadTasks: string[] = [];

    const player = await this.getPlayer(playerId);
    if (!player) {
      return { hpDamage: 0, deadTasks };
    }

    const equipmentBonus = await this.getEquipmentBonus(playerId);
    const effectiveAgility = player.agility + (equipmentBonus.agility || 0);
    const dodgeChance = clamp(0.05 + effectiveAgility * 0.004, 0.05, 0.65);

    const difficultyScaling: Record<string, number> = {
      easy: 0.85,
      normal: 1,
      hard: 1.2,
      veryHard: 1.4,
      extreme: 1.6,
    };

    const playerTsutomes = await this.getAllTsutomes(playerId);
    for (const tsutome of playerTsutomes) {
      if (tsutome.completed || tsutome.cancelled) continue;

      const startDate = new Date(tsutome.startDate);
      const daysSinceStart = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / DAY_IN_MS));
      const deadline = new Date(tsutome.deadline);
      const overdueDays = deadline < now ? Math.max(1, Math.floor((now.getTime() - deadline.getTime()) / DAY_IN_MS)) : 0;

      let calculatedStrength = 1 + Math.floor(daysSinceStart / 4);
      if (overdueDays > 0) {
        calculatedStrength += Math.min(4, overdueDays);
      }
      calculatedStrength = clamp(calculatedStrength, 1, 10);

      const updates: Partial<Tsutome> = {};
      if (calculatedStrength !== tsutome.strengthLevel) {
        updates.strengthLevel = calculatedStrength;
      }

      if (overdueDays > 0) {
        const lastPenalty = tsutome.lastPenaltyDate ? new Date(tsutome.lastPenaltyDate) : null;
        const penalizedToday = lastPenalty ? isSameDay(lastPenalty, now) : false;
        if (penalizedToday) {
          if (Object.keys(updates).length) {
            await this.updateTsutome(tsutome.id, updates);
          }
          continue;
        }

        const difficultyMultiplier = difficultyScaling[tsutome.difficulty] ?? 1;
        const baseDamage = 4 + calculatedStrength * 2.5;
        const agilityMitigation = Math.floor(effectiveAgility / 14);
        const perStrikeDamage = Math.max(3, Math.ceil(baseDamage * difficultyMultiplier) - agilityMitigation);
        let taskDamage = 0;
        let dodged = 0;

        for (let i = 0; i < overdueDays; i++) {
          if (Math.random() < dodgeChance) {
            dodged++;
          } else {
            taskDamage += perStrikeDamage;
          }
        }

        if (taskDamage > 0) {
          totalDamage += taskDamage;
          const dodgeInfo = dodged ? ` / ${dodged}蝗槫屓驕ｿ` : "";
          deadTasks.push(`蜍吶Γ: ${tsutome.title} (Lv${calculatedStrength}, ${taskDamage}繝繝｡繝ｼ繧ｸ${dodgeInfo})`);
        } else {
          deadTasks.push(`蜍吶Γ: ${tsutome.title} 縺ｮ謾ｻ謦・ｒ${dodged}蝗槭☆縺ｹ縺ｦ蝗樣∩`);
        }

        updates.lastPenaltyDate = now;
      }

      if (Object.keys(updates).length) {
        await this.updateTsutome(tsutome.id, updates);
        Object.assign(tsutome, updates);
      }
    }

    const playerShihans = await this.getAllShihans(playerId);
    for (const shihan of playerShihans) {
      if (!shihan.completed) {
        const targetDate = new Date(shihan.targetDate);
        if (targetDate < now) {
          const daysOverdue = Math.floor((now.getTime() - targetDate.getTime()) / DAY_IN_MS);
          if (daysOverdue > 0) {
            totalDamage += daysOverdue * 20;
            deadTasks.push(`蟶ｫ遽・ ${shihan.title} (${daysOverdue}譌･驕・ｻｶ)`);
          }
        }
      }
    }

    const playerShikakus = await this.getAllShikakus(playerId);
    for (const shikaku of playerShikakus) {
      if (!shikaku.completed) {
        const expiresAt = new Date(shikaku.expiresAt);
        if (expiresAt < now) {
          totalDamage += 30;
          deadTasks.push(`蛻ｺ螳｢: ${shikaku.title} (譛滄剞蛻・ｌ)`);
          await this.deleteShikaku(shikaku.id);
        }
      }
    }

    return { hpDamage: totalDamage, deadTasks };
  }

  async generateDailyShikakus(playerId: string, count: number): Promise<void> {
    // This will be implemented in cron.ts using the AI service
    // We need to import and use the AI service for generating assassin names
  }

  async handlePlayerDeath(playerId: string): Promise<void> {
    const player = await this.getPlayer(playerId);
    if (!player) return;

    // Reset player stats on death
    const updates: Partial<Player> = {
      hp: player.maxHp, // Reset to max HP
      coins: Math.floor(player.coins / 2), // Lose 50% coins
      jobLevel: 1, // Reset job level to 1
      jobXp: 0, // Reset job XP
      streak: 0, // Reset streak
    };

    await this.updatePlayer(playerId, updates);

    // Clear all active tasks
    const tsutomes = await this.getAllTsutomes(playerId);
    for (const tsutome of tsutomes) {
      if (!tsutome.completed) {
        await this.updateTsutome(tsutome.id, { cancelled: true });
      }
    }
  }

  // ============ Drop History ============
  async recordDropHistory(drop: InsertDropHistory): Promise<DropHistory> {
    const [record] = await this.db
      .insert(dropHistory)
      .values(drop)
      .returning();
    return record;
  }

  async getPlayerDropHistory(playerId: string, limit: number = 50): Promise<DropHistory[]> {
    return await this.db
      .select()
      .from(dropHistory)
      .where(eq(dropHistory.playerId, playerId))
      .orderBy(desc(dropHistory.droppedAt))
      .limit(limit);
  }

  async getDropStatistics(playerId: string): Promise<{
    totalDrops: number;
    byRarity: Record<string, number>;
    mostCommon: { itemId: string; count: number }[];
    recentDrops: DropHistory[];
  }> {
    const allDrops = await this.db
      .select()
      .from(dropHistory)
      .where(eq(dropHistory.playerId, playerId));

    // Count by rarity
    const byRarity: Record<string, number> = {};
    const itemCounts: Record<string, number> = {};
    
    for (const drop of allDrops) {
      byRarity[drop.rarity] = (byRarity[drop.rarity] || 0) + drop.quantity;
      itemCounts[drop.itemId] = (itemCounts[drop.itemId] || 0) + drop.quantity;
    }

    // Find most common items
    const mostCommon = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([itemId, count]) => ({ itemId, count }));

    // Get recent drops
    const recentDrops = await this.getPlayerDropHistory(playerId, 10);

    return {
      totalDrops: allDrops.reduce((sum, drop) => sum + drop.quantity, 0),
      byRarity,
      mostCommon,
      recentDrops,
    };
  }

  async createAdminAuditLog(log: InsertAdminAuditLog): Promise<AdminAuditLog> {
    const [record] = await this.db.insert(adminAuditLogs).values(log).returning();
    return record;
  }

  async listAdminAuditLogs(limit: number = 100): Promise<AdminAuditLog[]> {
    return await this.db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit);
  }
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1.getTime() === d2.getTime();
}
