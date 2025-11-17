import {
  type Player, type InsertPlayer,
  type Tsutome, type InsertTsutome,
  type Shuren, type InsertShuren,
  type Shihan, type InsertShihan,
  type Shikaku, type InsertShikaku,
  type Boss, type InsertBoss,
  type Story, type InsertStory,
  type Item, type InsertItem,
  type Inventory, type InsertInventory,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Player
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByName(name: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined>;
  getCurrentPlayer(): Promise<Player | undefined>;

  // Tsutome (務メ)
  getTsutome(id: string): Promise<Tsutome | undefined>;
  getAllTsutomes(playerId: string): Promise<Tsutome[]>;
  createTsutome(tsutome: InsertTsutome): Promise<Tsutome>;
  updateTsutome(id: string, updates: Partial<Tsutome>): Promise<Tsutome | undefined>;
  deleteTsutome(id: string): Promise<boolean>;

  // Shuren (修練)
  getShuren(id: string): Promise<Shuren | undefined>;
  getAllShurens(playerId: string): Promise<Shuren[]>;
  createShuren(shuren: InsertShuren): Promise<Shuren>;
  updateShuren(id: string, updates: Partial<Shuren>): Promise<Shuren | undefined>;
  deleteShuren(id: string): Promise<boolean>;

  // Shihan (師範)
  getShihan(id: string): Promise<Shihan | undefined>;
  getAllShihans(playerId: string): Promise<Shihan[]>;
  createShihan(shihan: InsertShihan): Promise<Shihan>;
  updateShihan(id: string, updates: Partial<Shihan>): Promise<Shihan | undefined>;
  deleteShihan(id: string): Promise<boolean>;

  // Shikaku (刺客)
  getShikaku(id: string): Promise<Shikaku | undefined>;
  getAllShikakus(playerId: string): Promise<Shikaku[]>;
  createShikaku(shikaku: InsertShikaku): Promise<Shikaku>;
  updateShikaku(id: string, updates: Partial<Shikaku>): Promise<Shikaku | undefined>;
  deleteShikaku(id: string): Promise<boolean>;

  // Boss
  getBoss(id: string): Promise<Boss | undefined>;
  getCurrentBoss(playerId: string): Promise<Boss | undefined>;
  createBoss(boss: InsertBoss): Promise<Boss>;
  updateBoss(id: string, updates: Partial<Boss>): Promise<Boss | undefined>;

  // Story
  getStory(id: string): Promise<Story | undefined>;
  getAllStories(playerId: string): Promise<Story[]>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: string, updates: Partial<Story>): Promise<Story | undefined>;

  // Item
  getItem(id: string): Promise<Item | undefined>;
  getAllItems(): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;

  // Inventory
  getInventory(id: string): Promise<Inventory | undefined>;
  getPlayerInventory(playerId: string): Promise<Inventory[]>;
  addToInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: string, updates: Partial<Inventory>): Promise<Inventory | undefined>;
}

export class MemStorage implements IStorage {
  private players: Map<string, Player>;
  private tsutomes: Map<string, Tsutome>;
  private shurens: Map<string, Shuren>;
  private shihans: Map<string, Shihan>;
  private shikakus: Map<string, Shikaku>;
  private bosses: Map<string, Boss>;
  private stories: Map<string, Story>;
  private items: Map<string, Item>;
  private inventories: Map<string, Inventory>;
  private defaultPlayerId: string | null = null;

  constructor() {
    this.players = new Map();
    this.tsutomes = new Map();
    this.shurens = new Map();
    this.shihans = new Map();
    this.shikakus = new Map();
    this.bosses = new Map();
    this.stories = new Map();
    this.items = new Map();
    this.inventories = new Map();
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // デフォルトプレイヤー作成
    const defaultPlayer = await this.createPlayer({
      name: "剣士",
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      coins: 500,
      wisdom: 10,
      strength: 10,
      agility: 10,
      vitality: 10,
      luck: 10,
    });
    this.defaultPlayerId = defaultPlayer.id;

    // サンプルアイテム作成
    await this.createItem({
      name: "傷薬",
      description: "HPを50回復する",
      itemType: "consumable",
      price: 100,
      hpRestore: 50,
      statBoost: null,
      imageUrl: null,
    });

    await this.createItem({
      name: "強化の巻物",
      description: "武勇を+5する",
      itemType: "consumable",
      price: 300,
      hpRestore: 0,
      statBoost: JSON.stringify({ strength: 5 }),
      imageUrl: null,
    });
  }

  // Player
  async getPlayer(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayerByName(name: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find((p) => p.name === name);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = {
      ...insertPlayer,
      id,
      createdAt: new Date(),
    };
    this.players.set(id, player);
    return player;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    const updated = { ...player, ...updates };
    this.players.set(id, updated);
    return updated;
  }

  async getCurrentPlayer(): Promise<Player | undefined> {
    if (this.defaultPlayerId) {
      return this.players.get(this.defaultPlayerId);
    }
    return Array.from(this.players.values())[0];
  }

  // Tsutome
  async getTsutome(id: string): Promise<Tsutome | undefined> {
    return this.tsutomes.get(id);
  }

  async getAllTsutomes(playerId: string): Promise<Tsutome[]> {
    return Array.from(this.tsutomes.values()).filter((t) => t.playerId === playerId);
  }

  async createTsutome(insertTsutome: InsertTsutome): Promise<Tsutome> {
    const id = randomUUID();
    const tsutome: Tsutome = {
      ...insertTsutome,
      id,
      completed: false,
      completedAt: null,
      cancelled: false,
      strengthLevel: 1,
      createdAt: new Date(),
    };
    this.tsutomes.set(id, tsutome);
    return tsutome;
  }

  async updateTsutome(id: string, updates: Partial<Tsutome>): Promise<Tsutome | undefined> {
    const tsutome = this.tsutomes.get(id);
    if (!tsutome) return undefined;
    const updated = { ...tsutome, ...updates };
    this.tsutomes.set(id, updated);
    return updated;
  }

  async deleteTsutome(id: string): Promise<boolean> {
    return this.tsutomes.delete(id);
  }

  // Shuren
  async getShuren(id: string): Promise<Shuren | undefined> {
    return this.shurens.get(id);
  }

  async getAllShurens(playerId: string): Promise<Shuren[]> {
    return Array.from(this.shurens.values()).filter((s) => s.playerId === playerId);
  }

  async createShuren(insertShuren: InsertShuren): Promise<Shuren> {
    const id = randomUUID();
    const shuren: Shuren = {
      ...insertShuren,
      id,
      continuousDays: 0,
      totalDays: 0,
      lastCompletedAt: null,
      missedCount: 0,
      active: true,
      createdAt: new Date(),
    };
    this.shurens.set(id, shuren);
    return shuren;
  }

  async updateShuren(id: string, updates: Partial<Shuren>): Promise<Shuren | undefined> {
    const shuren = this.shurens.get(id);
    if (!shuren) return undefined;
    const updated = { ...shuren, ...updates };
    this.shurens.set(id, updated);
    return updated;
  }

  async deleteShuren(id: string): Promise<boolean> {
    return this.shurens.delete(id);
  }

  // Shihan
  async getShihan(id: string): Promise<Shihan | undefined> {
    return this.shihans.get(id);
  }

  async getAllShihans(playerId: string): Promise<Shihan[]> {
    return Array.from(this.shihans.values()).filter((s) => s.playerId === playerId);
  }

  async createShihan(insertShihan: InsertShihan): Promise<Shihan> {
    const id = randomUUID();
    const shihan: Shihan = {
      ...insertShihan,
      id,
      completed: false,
      completedAt: null,
      createdAt: new Date(),
    };
    this.shihans.set(id, shihan);
    return shihan;
  }

  async updateShihan(id: string, updates: Partial<Shihan>): Promise<Shihan | undefined> {
    const shihan = this.shihans.get(id);
    if (!shihan) return undefined;
    const updated = { ...shihan, ...updates };
    this.shihans.set(id, updated);
    return updated;
  }

  async deleteShihan(id: string): Promise<boolean> {
    return this.shihans.delete(id);
  }

  // Shikaku
  async getShikaku(id: string): Promise<Shikaku | undefined> {
    return this.shikakus.get(id);
  }

  async getAllShikakus(playerId: string): Promise<Shikaku[]> {
    return Array.from(this.shikakus.values()).filter((s) => s.playerId === playerId);
  }

  async createShikaku(insertShikaku: InsertShikaku): Promise<Shikaku> {
    const id = randomUUID();
    const shikaku: Shikaku = {
      ...insertShikaku,
      id,
      completed: false,
      completedAt: null,
      createdAt: new Date(),
    };
    this.shikakus.set(id, shikaku);
    return shikaku;
  }

  async updateShikaku(id: string, updates: Partial<Shikaku>): Promise<Shikaku | undefined> {
    const shikaku = this.shikakus.get(id);
    if (!shikaku) return undefined;
    const updated = { ...shikaku, ...updates };
    this.shikakus.set(id, updated);
    return updated;
  }

  async deleteShikaku(id: string): Promise<boolean> {
    return this.shikakus.delete(id);
  }

  // Boss
  async getBoss(id: string): Promise<Boss | undefined> {
    return this.bosses.get(id);
  }

  async getCurrentBoss(playerId: string): Promise<Boss | undefined> {
    const bosses = Array.from(this.bosses.values())
      .filter((b) => b.playerId === playerId && !b.defeated)
      .sort((a, b) => a.bossNumber - b.bossNumber);
    return bosses[0];
  }

  async createBoss(insertBoss: InsertBoss): Promise<Boss> {
    const id = randomUUID();
    const boss: Boss = {
      ...insertBoss,
      id,
      lastAttackDate: null,
      defeated: false,
      defeatedAt: null,
      createdAt: new Date(),
    };
    this.bosses.set(id, boss);
    return boss;
  }

  async updateBoss(id: string, updates: Partial<Boss>): Promise<Boss | undefined> {
    const boss = this.bosses.get(id);
    if (!boss) return undefined;
    const updated = { ...boss, ...updates };
    this.bosses.set(id, updated);
    return updated;
  }

  // Story
  async getStory(id: string): Promise<Story | undefined> {
    return this.stories.get(id);
  }

  async getAllStories(playerId: string): Promise<Story[]> {
    return Array.from(this.stories.values()).filter((s) => s.playerId === playerId);
  }

  async createStory(insertStory: InsertStory): Promise<Story> {
    const id = randomUUID();
    const story: Story = {
      ...insertStory,
      id,
      viewed: false,
      createdAt: new Date(),
    };
    this.stories.set(id, story);
    return story;
  }

  async updateStory(id: string, updates: Partial<Story>): Promise<Story | undefined> {
    const story = this.stories.get(id);
    if (!story) return undefined;
    const updated = { ...story, ...updates };
    this.stories.set(id, updated);
    return updated;
  }

  // Item
  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async getAllItems(): Promise<Item[]> {
    return Array.from(this.items.values());
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const id = randomUUID();
    const item: Item = {
      ...insertItem,
      id,
      createdAt: new Date(),
    };
    this.items.set(id, item);
    return item;
  }

  // Inventory
  async getInventory(id: string): Promise<Inventory | undefined> {
    return this.inventories.get(id);
  }

  async getPlayerInventory(playerId: string): Promise<Inventory[]> {
    return Array.from(this.inventories.values()).filter((i) => i.playerId === playerId);
  }

  async addToInventory(insertInventory: InsertInventory): Promise<Inventory> {
    const id = randomUUID();
    const inventory: Inventory = {
      ...insertInventory,
      id,
      createdAt: new Date(),
    };
    this.inventories.set(id, inventory);
    return inventory;
  }

  async updateInventory(id: string, updates: Partial<Inventory>): Promise<Inventory | undefined> {
    const inventory = this.inventories.get(id);
    if (!inventory) return undefined;
    const updated = { ...inventory, ...updates };
    this.inventories.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
