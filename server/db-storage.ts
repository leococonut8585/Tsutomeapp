import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, or, desc, isNull, lt, lte } from "drizzle-orm";
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
} from "@shared/schema";
import { IStorage } from "./storage";

// PostgreSQL接続
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

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

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const result = await db.insert(players).values([player]).returning();
    return result[0];
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    const result = await db.update(players).set(updates).where(eq(players.id, id)).returning();
    return result[0];
  }

  async getCurrentPlayer(): Promise<Player | undefined> {
    // 最初のプレイヤーを返す（シングルプレイヤーゲーム）
    const result = await db.select().from(players).limit(1);
    return result[0];
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
    const result = await db.insert(tsutomes).values([tsutome]).returning();
    return result[0];
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
    const result = await db.insert(shikakus).values([shikaku]).returning();
    return result[0];
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
    // 未撃破のボスの中で最小のbossNumberを持つボスを返す
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
    const result = await db.insert(items).values([item]).returning();
    return result[0];
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

    // Process overdue Tsutomes
    const tsutomes = await this.getAllTsutomes(playerId);
    for (const tsutome of tsutomes) {
      if (!tsutome.completed && !tsutome.cancelled) {
        const deadline = new Date(tsutome.deadline);
        if (deadline < now) {
          const daysOverdue = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOverdue > 0) {
            totalDamage += daysOverdue * 10; // 10 HP per day
            deadTasks.push(`務メ: ${tsutome.title} (${daysOverdue}日遅延)`);
          }
        }
      }
    }

    // Process overdue Shihans
    const shihans = await this.getAllShihans(playerId);
    for (const shihan of shihans) {
      if (!shihan.completed) {
        const targetDate = new Date(shihan.targetDate);
        if (targetDate < now) {
          const daysOverdue = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOverdue > 0) {
            totalDamage += daysOverdue * 20; // 20 HP per day
            deadTasks.push(`師範: ${shihan.title} (${daysOverdue}日遅延)`);
          }
        }
      }
    }

    // Process expired Shikakus
    const shikakus = await this.getAllShikakus(playerId);
    for (const shikaku of shikakus) {
      if (!shikaku.completed) {
        const expiresAt = new Date(shikaku.expiresAt);
        if (expiresAt < now) {
          totalDamage += 30; // 30 HP immediately
          deadTasks.push(`刺客: ${shikaku.title} (期限切れ)`);
          // Mark as expired/cancelled
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
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1.getTime() === d2.getTime();
}