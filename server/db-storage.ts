import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, or, desc, isNull } from "drizzle-orm";
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
  type Player,
  type Tsutome,
  type Shuren,
  type Shihan,
  type Shikaku,
  type Boss,
  type Story,
  type Item,
  type Inventory,
  type InsertPlayer,
  type InsertTsutome,
  type InsertShuren,
  type InsertShihan,
  type InsertShikaku,
  type InsertBoss,
  type InsertStory,
  type InsertItem,
  type InsertInventory,
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
}