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
      // Job system fields
      job: "novice",
      jobLevel: 1,
      jobXp: 0,
      skills: [],
      streak: 0,
    });
    this.defaultPlayerId = defaultPlayer.id;

    // ========== アイテム作成 ==========
    // 消耗品
    const healingPotion = await this.createItem({
      name: "傷薬",
      description: "HPを50回復する",
      itemType: "consumable",
      price: 100,
      hpRestore: 50,
      statBoost: null,
      imageUrl: null,
    });

    const fullPotion = await this.createItem({
      name: "万能薬",
      description: "HPを全回復する",
      itemType: "consumable",
      price: 500,
      hpRestore: 9999,
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

    await this.createItem({
      name: "知恵の書",
      description: "知略を+5する",
      itemType: "consumable",
      price: 300,
      hpRestore: 0,
      statBoost: JSON.stringify({ wisdom: 5 }),
      imageUrl: null,
    });

    await this.createItem({
      name: "疾風の護符",
      description: "敏捷を+3する",
      itemType: "consumable",
      price: 200,
      hpRestore: 0,
      statBoost: JSON.stringify({ agility: 3 }),
      imageUrl: null,
    });

    // 装備品
    await this.createItem({
      name: "鉄の剣",
      description: "武勇を+10する基本的な剣",
      itemType: "equipment",
      price: 1000,
      hpRestore: 0,
      statBoost: JSON.stringify({ strength: 10 }),
      imageUrl: null,
    });

    await this.createItem({
      name: "鋼の鎧",
      description: "耐久を+15する頑丈な鎧",
      itemType: "equipment",
      price: 1500,
      hpRestore: 0,
      statBoost: JSON.stringify({ vitality: 15 }),
      imageUrl: null,
    });

    await this.createItem({
      name: "賢者の帽子",
      description: "知略を+12する魔法の帽子",
      itemType: "equipment",
      price: 1200,
      hpRestore: 0,
      statBoost: JSON.stringify({ wisdom: 12 }),
      imageUrl: null,
    });

    // 素材
    await this.createItem({
      name: "妖怪の牙",
      description: "武器強化に使う素材",
      itemType: "material",
      price: 50,
      hpRestore: 0,
      statBoost: null,
      imageUrl: null,
    });

    await this.createItem({
      name: "霊石の欠片",
      description: "装備強化に使う神秘的な石",
      itemType: "material",
      price: 75,
      hpRestore: 0,
      statBoost: null,
      imageUrl: null,
    });

    // ========== プレイヤーの初期インベントリ ==========
    await this.addToInventory({
      playerId: defaultPlayer.id,
      itemId: healingPotion.id,
      quantity: 3,
      equipped: false,
    });

    // ========== ボス作成 ==========
    const firstBoss = await this.createBoss({
      playerId: defaultPlayer.id,
      bossNumber: 1,
      bossName: "鬼蜘蛛",
      bossImageUrl: null,
      hp: 1000,
      maxHp: 1000,
      attackPower: 20,
      challengeStartDate: new Date(),
    });

    // ========== ストーリー作成 ==========
    await this.createStory({
      playerId: defaultPlayer.id,
      bossNumber: 1,
      storyText: "かつて平和だったこの地に、突如として妖怪たちが現れ始めた。最初に現れたのは巨大な鬼蜘蛛。村人たちは恐怖に怯えている。勇敢な剣士として、あなたは立ち上がった...",
      storyImageUrl: null,
    });

    // ========== サンプルタスク作成 ==========
    // 務メの例
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await this.createTsutome({
      playerId: defaultPlayer.id,
      title: "プロジェクト企画書を作成",
      deadline: tomorrow,
      genre: "work",
      startDate: new Date(),
      difficulty: "normal",
      monsterName: "締切妖怪デッドライナー",
      monsterImageUrl: null,
      linkedShurenId: null,
      linkedShihanId: null,
    });

    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    
    await this.createTsutome({
      playerId: defaultPlayer.id,
      title: "部屋の大掃除",
      deadline: threeDaysLater,
      genre: "housework",
      startDate: new Date(),
      difficulty: "easy",
      monsterName: "ホコリ妖怪ダストン",
      monsterImageUrl: null,
      linkedShurenId: null,
      linkedShihanId: null,
    });

    // 修練の例
    await this.createShuren({
      playerId: defaultPlayer.id,
      title: "毎日10分瞑想",
      genre: "hobby",
      repeatInterval: 1,
      startDate: new Date(),
      dataTitle: "瞑想時間",
      dataUnit: "分",
      trainingName: "精神統一の修行",
      trainingImageUrl: null,
    });

    await this.createShuren({
      playerId: defaultPlayer.id,
      title: "週3回ランニング",
      genre: "exercise",
      repeatInterval: 2,
      startDate: new Date(),
      dataTitle: "走行距離",
      dataUnit: "km",
      trainingName: "疾風の足腰鍛錬",
      trainingImageUrl: null,
    });

    // 師範の例
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    
    await this.createShihan({
      playerId: defaultPlayer.id,
      title: "TOEICスコア800点達成",
      targetDate: sixMonthsLater,
      genre: "study",
      startDate: new Date(),
      masterName: "言霊師範イングリッシュ",
      masterImageUrl: null,
    });

    // 刺客の例
    const tomorrow24Hours = new Date();
    tomorrow24Hours.setDate(tomorrow24Hours.getDate() + 1);
    
    await this.createShikaku({
      playerId: defaultPlayer.id,
      title: "緊急レポート提出",
      difficulty: "hard",
      assassinName: "締切刺客アージェント",
      assassinImageUrl: null,
      expiresAt: tomorrow24Hours,
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
      id,
      name: insertPlayer.name,
      level: insertPlayer.level ?? 1,
      exp: insertPlayer.exp ?? 0,
      hp: insertPlayer.hp ?? 100,
      maxHp: insertPlayer.maxHp ?? 100,
      coins: insertPlayer.coins ?? 0,
      wisdom: insertPlayer.wisdom ?? 10,
      strength: insertPlayer.strength ?? 10,
      agility: insertPlayer.agility ?? 10,
      vitality: insertPlayer.vitality ?? 10,
      luck: insertPlayer.luck ?? 10,
      // Ensure job system fields have defaults if not provided
      job: insertPlayer.job || "novice",
      jobLevel: insertPlayer.jobLevel ?? 1,
      jobXp: insertPlayer.jobXp ?? 0,
      skills: insertPlayer.skills || [],
      streak: insertPlayer.streak ?? 0,
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
      id,
      playerId: insertTsutome.playerId,
      title: insertTsutome.title,
      deadline: insertTsutome.deadline,
      genre: insertTsutome.genre,
      startDate: insertTsutome.startDate,
      difficulty: insertTsutome.difficulty,
      monsterName: insertTsutome.monsterName,
      monsterImageUrl: insertTsutome.monsterImageUrl ?? null,
      linkedShurenId: insertTsutome.linkedShurenId ?? null,
      linkedShihanId: insertTsutome.linkedShihanId ?? null,
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
      id,
      playerId: insertShuren.playerId,
      title: insertShuren.title,
      genre: insertShuren.genre,
      repeatInterval: insertShuren.repeatInterval,
      startDate: insertShuren.startDate,
      dataTitle: insertShuren.dataTitle,
      dataUnit: insertShuren.dataUnit,
      trainingName: insertShuren.trainingName,
      trainingImageUrl: insertShuren.trainingImageUrl ?? null,
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
      id,
      playerId: insertShihan.playerId,
      title: insertShihan.title,
      targetDate: insertShihan.targetDate,
      genre: insertShihan.genre,
      startDate: insertShihan.startDate,
      masterName: insertShihan.masterName,
      masterImageUrl: insertShihan.masterImageUrl ?? null,
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
      id,
      playerId: insertShikaku.playerId,
      title: insertShikaku.title,
      difficulty: insertShikaku.difficulty,
      assassinName: insertShikaku.assassinName,
      assassinImageUrl: insertShikaku.assassinImageUrl ?? null,
      expiresAt: insertShikaku.expiresAt,
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
      id,
      playerId: insertBoss.playerId,
      bossNumber: insertBoss.bossNumber,
      bossName: insertBoss.bossName,
      bossImageUrl: insertBoss.bossImageUrl ?? null,
      hp: insertBoss.hp,
      maxHp: insertBoss.maxHp,
      attackPower: insertBoss.attackPower,
      challengeStartDate: insertBoss.challengeStartDate ?? null,
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
      id,
      playerId: insertStory.playerId,
      bossNumber: insertStory.bossNumber,
      storyText: insertStory.storyText,
      storyImageUrl: insertStory.storyImageUrl ?? null,
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
      id,
      name: insertItem.name,
      description: insertItem.description,
      itemType: insertItem.itemType,
      price: insertItem.price,
      hpRestore: insertItem.hpRestore ?? null,
      statBoost: insertItem.statBoost ?? null,
      imageUrl: insertItem.imageUrl ?? null,
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
      id,
      playerId: insertInventory.playerId,
      itemId: insertInventory.itemId,
      quantity: insertInventory.quantity ?? 1,
      equipped: insertInventory.equipped ?? false,
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
