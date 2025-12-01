import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ジャンル定義
export const genreEnum = z.enum(["hobby", "study", "exercise", "work", "housework", "fun"]);
export type Genre = z.infer<typeof genreEnum>;

// 難易度定義
export const difficultyEnum = z.enum(["easy", "normal", "hard", "veryHard", "extreme"]);
export type Difficulty = z.infer<typeof difficultyEnum>;

// タスクタイプ定義
export const taskTypeEnum = z.enum(["tsutome", "shuren", "shihan", "shikaku"]);
export type TaskType = z.infer<typeof taskTypeEnum>;

// AI審査レベル定義
export const aiStrictnessEnum = z.enum(["very_lenient", "lenient", "balanced", "strict", "very_strict"]);
export type AIStrictness = z.infer<typeof aiStrictnessEnum>;

// Player (プレイヤー)
export const players = pgTable(
  "players",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    username: varchar("username", { length: 80 }).notNull(),
    passwordPlain: text("password_plain").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("player"),
    suspended: boolean("suspended").notNull().default(false),
    level: integer("level").notNull().default(1),
    exp: integer("exp").notNull().default(0),
    hp: integer("hp").notNull().default(100),
    maxHp: integer("maxHp").notNull().default(100),
    coins: integer("coins").notNull().default(0),
    monthlyApiCalls: integer("monthly_api_calls").notNull().default(0),
    monthlyApiCost: real("monthly_api_cost").notNull().default(0),
    apiUsageResetAt: timestamp("api_usage_reset_at").defaultNow(),
    // 5�̃X�e�[�^�X
    wisdom: integer("wisdom").notNull().default(10), // �m��
    strength: integer("strength").notNull().default(10), // ���E
    agility: integer("agility").notNull().default(10), // �q��
    vitality: integer("vitality").notNull().default(10), // �ϋv
    luck: integer("luck").notNull().default(10), // �^�C
    // Job system fields
    job: varchar("job").notNull().default("novice"),
    jobLevel: integer("job_level").notNull().default(1),
    jobXp: integer("job_xp").notNull().default(0),
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    streak: integer("streak").notNull().default(0), // Daily completion streak
    // Settings
    aiStrictness: varchar("ai_strictness").notNull().default("lenient"), // AI�R���̌�����
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    usernameIdx: uniqueIndex("players_username_unique").on(table.username),
  })
);

// 務メ (Tsutome - 消化タスク)
export const tsutomes = pgTable("tsutomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  title: text("title").notNull(),
  deadline: timestamp("deadline").notNull(),
  genre: text("genre").notNull(), // hobby, study, exercise, work, housework, fun
  startDate: timestamp("start_date").notNull(),
  difficulty: text("difficulty").notNull(), // easy, normal, hard, veryHard, extreme
  // AI生成フィールド
  monsterName: text("monster_name").notNull(),
  monsterImageUrl: text("monster_image_url"),
  // 紐付け
  linkedShurenId: varchar("linked_shuren_id"),
  linkedShihanId: varchar("linked_shihan_id"),
  // ステータス
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  cancelled: boolean("cancelled").notNull().default(false),
  strengthLevel: integer("strength_level").notNull().default(1), // 放置による強化レベル
  lastPenaltyDate: timestamp("last_penalty_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 修練 (Shuren - 習慣タスク)
export const shurens = pgTable("shurens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  title: text("title").notNull(),
  genre: text("genre").notNull(),
  repeatInterval: integer("repeat_interval").notNull(), // 日数
  startDate: timestamp("start_date").notNull(),
  dataTitle: text("data_title").notNull(), // 保存データタイトル
  dataUnit: text("data_unit").notNull(), // 単位
  // AI生成フィールド
  trainingName: text("training_name").notNull(),
  trainingImageUrl: text("training_image_url"),
  // 継続記録
  continuousDays: integer("continuous_days").notNull().default(0),
  totalDays: integer("total_days").notNull().default(0),
  lastCompletedAt: timestamp("last_completed_at"),
  missedCount: integer("missed_count").notNull().default(0), // 5回で削除
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// 師範 (Shihan - 長期目標)
export const shihans = pgTable("shihans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  title: text("title").notNull(),
  targetDate: timestamp("target_date").notNull(),
  genre: text("genre").notNull(),
  startDate: timestamp("start_date").notNull(),
  // AI生成フィールド
  masterName: text("master_name").notNull(),
  masterImageUrl: text("master_image_url"),
  // ステータス
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 刺客 (Shikaku - 緊急タスク)
export const shikakus = pgTable("shikakus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull(),
  // AI生成フィールド
  assassinName: text("assassin_name").notNull(),
  assassinImageUrl: text("assassin_image_url"),
  // ステータス
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at").notNull(), // 24時間後
  createdAt: timestamp("created_at").defaultNow(),
});

// Boss (ボスモンスター)
export const bosses = pgTable("bosses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  bossNumber: integer("boss_number").notNull(), // ストーリー進行番号
  // AI生成フィールド
  bossName: text("boss_name").notNull(),
  bossImageUrl: text("boss_image_url"),
  hp: integer("hp").notNull(),
  maxHp: integer("maxHp").notNull(),
  attackPower: integer("attack_power").notNull(),
  lastAttackDate: timestamp("last_attack_date"),
  challengeStartDate: timestamp("challenge_start_date"),
  defeated: boolean("defeated").notNull().default(false),
  defeatedAt: timestamp("defeated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Story (ストーリー)
export const stories = pgTable("stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  bossNumber: integer("boss_number").notNull(),
  // AI生成フィールド
  storyText: text("story_text").notNull(),
  storyImageUrl: text("story_image_url"),
  viewed: boolean("viewed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Items (アイテム)
export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  itemType: text("item_type").notNull(), // consumable, material, equipment, weapon, armor, accessory
  price: integer("price").notNull(),
  // ドロップシステム
  rarity: text("rarity").notNull().default("common"), // common, rare, epic, legendary
  droppable: boolean("droppable").notNull().default(false), // ドロップ可能かどうか
  dropRate: integer("drop_rate").default(10), // 基本ドロップ率(%)
  // 効果
  hpRestore: integer("hp_restore").default(0),
  statBoost: text("stat_boost"), // JSON: {wisdom: 5, strength: 3}
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Player Inventory
export const inventories = pgTable("inventories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  itemId: varchar("item_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  equipped: boolean("equipped").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cron Logs (for tracking periodic task executions)
export const cronLogs = pgTable("cron_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskType: varchar("task_type").notNull(), // daily-reset, hourly-check, boss-check
  playerId: varchar("player_id"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
  success: boolean("success").notNull().default(true),
  details: text("details"), // JSON string with execution details
  error: text("error"), // Error message if failed
});

// Drop History (for tracking item drops from tasks)
export const dropHistory = pgTable("drop_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id),
  itemId: varchar("item_id").notNull().references(() => items.id),
  tsutomeId: varchar("tsutome_id").references(() => tsutomes.id), // Task that dropped this item
  quantity: integer("quantity").notNull().default(1),
  rarity: varchar("rarity", { length: 20 }).notNull(), // common, rare, epic, legendary
  isBonus: boolean("is_bonus").notNull().default(false), // Was this a bonus drop?
  droppedAt: timestamp("dropped_at").notNull().defaultNow(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => players.id),
  targetUserId: varchar("target_user_id").references(() => players.id),
  action: varchar("action", { length: 64 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Insert Schemas
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, createdAt: true });
export const insertTsutomeSchema = createInsertSchema(tsutomes)
  .omit({ id: true, createdAt: true, completed: true, completedAt: true, cancelled: true, strengthLevel: true, lastPenaltyDate: true })
  .extend({
    monsterName: z.string().optional(), // AI生成フィールドなのでオプショナルにする
    monsterImageUrl: z.string().nullable().optional(),
  });
export const insertShurenSchema = createInsertSchema(shurens).omit({ id: true, createdAt: true, continuousDays: true, totalDays: true, lastCompletedAt: true, missedCount: true, active: true });
export const insertShihanSchema = createInsertSchema(shihans).omit({ id: true, createdAt: true, completed: true, completedAt: true });
export const insertShikakuSchema = createInsertSchema(shikakus).omit({ id: true, createdAt: true, completed: true, completedAt: true, expiresAt: true });
export const insertBossSchema = createInsertSchema(bosses).omit({ id: true, createdAt: true, lastAttackDate: true, defeated: true, defeatedAt: true });
export const insertStorySchema = createInsertSchema(stories).omit({ id: true, createdAt: true, viewed: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true, createdAt: true });
export const insertInventorySchema = createInsertSchema(inventories).omit({ id: true, createdAt: true });
export const insertCronLogSchema = createInsertSchema(cronLogs).omit({ id: true, executedAt: true, success: true });
export const insertDropHistorySchema = createInsertSchema(dropHistory).omit({ id: true, droppedAt: true });
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({ id: true, createdAt: true });

// Types
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type PublicPlayer = Omit<Player, "passwordPlain">;
export function toPublicPlayer(player: Player): PublicPlayer {
  const { passwordPlain, ...rest } = player;
  return rest;
}
export type Tsutome = typeof tsutomes.$inferSelect;
export type InsertTsutome = z.infer<typeof insertTsutomeSchema>;
export type Shuren = typeof shurens.$inferSelect;
export type InsertShuren = z.infer<typeof insertShurenSchema>;
export type Shihan = typeof shihans.$inferSelect;
export type InsertShihan = z.infer<typeof insertShihanSchema>;
export type Shikaku = typeof shikakus.$inferSelect;
export type InsertShikaku = z.infer<typeof insertShikakuSchema>;
export type Boss = typeof bosses.$inferSelect;
export type InsertBoss = z.infer<typeof insertBossSchema>;
export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Inventory = typeof inventories.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type CronLog = typeof cronLogs.$inferSelect;
export type InsertCronLog = z.infer<typeof insertCronLogSchema>;
export type DropHistory = typeof dropHistory.$inferSelect;
export type InsertDropHistory = z.infer<typeof insertDropHistorySchema>;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;

// DTOs for enriched responses
export interface LinkSource {
  type: "shuren" | "shihan";
  id: string;
  name: string;  // trainingName for shuren, masterName for shihan
  title: string; // The source task title
  continuousDays?: number; // For shuren
  progress?: number; // For shihan (percentage)
  totalDays?: number;
  bonus?: number;
  breakdown?: Record<string, number>;
  total?: number;
}

export interface TsutomeWithLinkSource extends Tsutome {
  linkSource?: LinkSource;
  rewardBonus: number; // Percentage as decimal (0.2 = 20%)
}

export interface LinkBonusResult {
  total: number;
  breakdown: Record<string, number>;
}

function clampBonus(value: number, min = 0, max = 0.6) {
  return Math.min(max, Math.max(min, value));
}

// Bonus calculation helpers
export function calculateShurenBonus(continuousDays: number, totalDays = 0): LinkBonusResult {
  const streakBonus = Math.min(0.5, Math.floor(continuousDays / 5) * 0.1);
  const milestoneBonus = totalDays >= 120 ? 0.1 : totalDays >= 60 ? 0.05 : 0;
  const total = clampBonus(streakBonus + milestoneBonus, 0, 0.6);
  return {
    total,
    breakdown: {
      streak: Number(streakBonus.toFixed(4)),
      milestone: Number(milestoneBonus.toFixed(4)),
    },
  };
}

export function calculateShihanBonus(progressRatio = 0, daysUntilTarget?: number): LinkBonusResult {
  const baseBonus = 0.2;
  const progressBonus = progressRatio > 0.5 ? Math.min(0.15, (progressRatio - 0.5) * 0.5) : 0;
  let urgencyBonus = 0;
  if (typeof daysUntilTarget === "number") {
    if (daysUntilTarget <= 3) {
      urgencyBonus = 0.1;
    } else if (daysUntilTarget <= 7) {
      urgencyBonus = 0.05;
    }
  }
  const total = clampBonus(baseBonus + progressBonus + urgencyBonus, 0, 0.6);
  return {
    total,
    breakdown: {
      base: Number(baseBonus.toFixed(4)),
      progress: Number(progressBonus.toFixed(4)),
      urgency: Number(urgencyBonus.toFixed(4)),
    },
  };
}

