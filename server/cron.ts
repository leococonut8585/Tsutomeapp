import { storage } from "./storage";
import {
  generateAssassinName,
  generateImage,
} from "./ai";
import { InsertShikaku } from "@shared/schema";
import { logger } from "./utils/logger";

// Create a child logger for cron module
const cronLogger = logger.child("CRON");

interface StatBonus {
  wisdom: number;
  strength: number;
  agility: number;
  vitality: number;
  luck: number;
}

function parseStatBoost(boost?: string | null): Partial<StatBonus> {
  if (!boost) return {};
  try {
    const parsed = typeof boost === "string" ? JSON.parse(boost) : boost;
    return parsed || {};
  } catch {
    return {};
  }
}

async function getEquipmentBonus(playerId: string): Promise<StatBonus> {
  const inventories = await storage.getPlayerInventory(playerId);
  const equipped = inventories.filter((inv) => inv.equipped);
  const bonus: StatBonus = { wisdom: 0, strength: 0, agility: 0, vitality: 0, luck: 0 };

  for (const inv of equipped) {
    const item = await storage.getItem(inv.itemId);
    if (!item) continue;
    const effects = parseStatBoost(item.statBoost);
    for (const [key, value] of Object.entries(effects)) {
      if (key in bonus && typeof value === "number") {
        bonus[key as keyof StatBonus] += value;
      }
    }
  }
  return bonus;
}

// Convert current time to JST (UTC+9)
function toJST(date: Date = new Date()): Date {
  const jstOffset = 9 * 60; // JST is UTC+9
  const localOffset = date.getTimezoneOffset();
  const jstTime = new Date(date.getTime() + (jstOffset + localOffset) * 60000);
  return jstTime;
}

// Check if it's midnight in JST
function isMidnightJST(date: Date = new Date()): boolean {
  const jstTime = toJST(date);
  return jstTime.getHours() === 0 && jstTime.getMinutes() < 5; // Allow 5 minute window
}

// Generate random number between min and max (inclusive)
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Get a random task theme for assassin tasks
function getRandomAssassinTheme(): string {
  const themes = [
    "緊急レポート提出",
    "重要メール返信",
    "急ぎの買い物",
    "部屋の片付け",
    "運動チャレンジ",
    "勉強セッション",
    "プロジェクト作業",
    "家事タスク",
    "健康チェック",
    "スキル練習",
  ];
  return themes[Math.floor(Math.random() * themes.length)];
}

// Get random difficulty for assassin tasks
function getRandomDifficulty(): "easy" | "normal" | "hard" | "veryHard" {
  const difficulties: ("easy" | "normal" | "hard" | "veryHard")[] = ["easy", "normal", "hard", "veryHard"];
  const weights = [30, 40, 25, 5];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return difficulties[i];
    }
  }
  return "normal";
}

const miniTasksForBoss: string[] = [
  "腹筋10回",
  "腕立て5回",
  "水を一杯飲む",
  "誰かにありがとうを伝える",
  "深呼吸を3回",
  "ストレッチを2分",
  "部屋を1分片付ける",
];

// Daily Reset - Runs at 0:00 JST
export async function executeDailyReset(): Promise<void> {
  cronLogger.info("Starting daily reset at", new Date().toISOString());
  
  try {
    const player = await storage.getCurrentPlayer();
    if (!player) {
      cronLogger.error("No player found for daily reset");
      return;
    }

    // Check if already executed today
    const lastExecution = await storage.getLastCronExecution("daily-reset", player.id);
    const now = new Date();
    
    if (lastExecution) {
      const lastDate = new Date(lastExecution);
      const sameDay = 
        lastDate.getDate() === now.getDate() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getFullYear() === now.getFullYear();
        
      if (sameDay) {
        cronLogger.info("Daily reset already executed today");
        return;
      }
    }

    // 1. Reset daily Shuren completions
    await storage.resetDailyShurenCompletions(player.id);

    // 2. Generate new Shikaku (assassin) tasks
    const shikakuCount = randomBetween(1, 3); // 1-3 assassin tasks per day
    cronLogger.info(`Generating ${shikakuCount} new assassin tasks`);
    
    for (let i = 0; i < shikakuCount; i++) {
      try {
        const theme = getRandomAssassinTheme();
        const difficulty = getRandomDifficulty();
        const hoursToExpire = randomBetween(1, 24); // 1-24 hours deadline
        const expiresAt = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000);
        
        // Generate AI assassin name
        const assassinName = await generateAssassinName(theme, difficulty, {
          playerId: player.id,
        });
        
        // Generate assassin image
        let assassinImageUrl = null;
        try {
          assassinImageUrl = await generateImage(`${assassinName} - ${theme}`, "assassin", {
            playerId: player.id,
          });
        } catch (error) {
          cronLogger.error("Failed to generate assassin image:", error);
        }
        
        const shikaku: InsertShikaku = {
          playerId: player.id,
          title: theme,
          difficulty,
          assassinName,
          assassinImageUrl,
        };
        
        await storage.createShikaku({ ...shikaku, expiresAt } as any);
        cronLogger.info(`Created assassin task: ${assassinName} - ${theme}`);
      } catch (error) {
        cronLogger.error("Failed to create assassin task:", error);
      }
    }

    // 3. Check boss battle progression
    const currentBoss = await storage.getCurrentBoss(player.id);
    
    if (!currentBoss) {
      // No boss exists, create the first boss
      cronLogger.info("No boss found, creating first boss");
      // Boss creation is handled elsewhere
    } else if (currentBoss.defeated) {
      // Current boss is defeated, generate next boss
      cronLogger.info("Current boss defeated, ready for next boss");
      // Boss generation is handled when player challenges next boss
    } else {
      // Boss auto attack once per day
      const equipBonus = await getEquipmentBonus(player.id);
      const effectiveVitality = player.vitality + equipBonus.vitality;
      const playerDamage = Math.max(1, Math.floor(currentBoss.attackPower * 0.85) - Math.floor(effectiveVitality * 0.65));
      if (playerDamage > 0) {
        const newHp = Math.max(0, player.hp - playerDamage);
        await storage.updatePlayer(player.id, { hp: newHp });
        cronLogger.info(`Boss auto-attack dealt ${playerDamage} damage to player (HP ${player.hp} -> ${newHp})`);
        if (newHp <= 0) {
          cronLogger.info("Player died from boss auto-attack, handling death");
          await storage.handlePlayerDeath(player.id);
        }
      }

      // Check if boss challenge period expired
      const challengeStartDate = currentBoss.challengeStartDate;
      if (challengeStartDate) {
        const daysSinceChallenge = Math.floor((now.getTime() - new Date(challengeStartDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceChallenge >= 7) {
          // After 7 days, impose a simple mini-task (as shikaku) each day
          const existingShikakus = await storage.getAllShikakus(player.id);
          const activeBossMiniTask = existingShikakus.find((s) => {
            if (s.assassinName !== "ボスの試練") return false;
            if (s.completed) return false;
            if (!s.expiresAt) return true;
            return new Date(s.expiresAt) > now;
          });
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentlyCreated = existingShikakus.find((s) => {
            if (s.assassinName !== "ボスの試練") return false;
            const createdAt = (s as any).createdAt ? new Date((s as any).createdAt) : null;
            return createdAt ? createdAt > twentyFourHoursAgo : false;
          });

          if (!activeBossMiniTask && !recentlyCreated) {
            const miniTaskTitle = miniTasksForBoss[Math.floor(Math.random() * miniTasksForBoss.length)];
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const difficulty = currentBoss.bossNumber >= 5 ? "normal" : "easy";
            await storage.createShikaku({
              playerId: player.id,
              title: miniTaskTitle,
              difficulty,
              assassinName: "ボスの試練",
              assassinImageUrl: null,
              expiresAt,
            } as any);
            cronLogger.info(`Generated boss mini-task: ${miniTaskTitle} (${difficulty})`);
          } else {
            cronLogger.info("Boss mini-task already active, skipping creation");
          }
        }
      }
    }

    // Log successful execution
    await storage.logCronExecution(
      "daily-reset",
      player.id,
      true,
      {
        shikakusGenerated: shikakuCount,
        timestamp: now.toISOString(),
      }
    );

    cronLogger.info("Daily reset completed successfully");
  } catch (error) {
    cronLogger.error("Daily reset failed:", error);
    await storage.logCronExecution(
      "daily-reset",
      null,
      false,
      null,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// Hourly Check - Process overdue tasks and penalties
export async function executeHourlyCheck(): Promise<void> {
  cronLogger.info("Starting hourly check at", new Date().toISOString());
  
  try {
    const player = await storage.getCurrentPlayer();
    if (!player) {
      cronLogger.error("No player found for hourly check");
      return;
    }

    // Check if already executed this hour
    const lastExecution = await storage.getLastCronExecution("hourly-check", player.id);
    const now = new Date();
    
    if (lastExecution) {
      const hoursSinceLastExecution = (now.getTime() - lastExecution.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastExecution < 0.9) { // Allow 54 minutes minimum between executions
        cronLogger.info("Hourly check already executed recently");
        return;
      }
    }

    // Process overdue tasks and calculate penalties
    const { hpDamage, deadTasks } = await storage.processOverdueTasks(player.id);
    
    if (hpDamage > 0) {
      cronLogger.info(`Applying ${hpDamage} HP damage for overdue tasks`);
      
      // Apply HP damage
      const newHp = Math.max(0, player.hp - hpDamage);
      await storage.updatePlayer(player.id, { hp: newHp });
      
      // Check for player death
      if (newHp <= 0) {
        cronLogger.info("Player died! Handling death...");
        await storage.handlePlayerDeath(player.id);
        
        // Log death event
        await storage.logCronExecution(
          "player-death",
          player.id,
          true,
          {
            hpDamage,
            deadTasks,
            previousCoins: player.coins,
            previousJobLevel: player.jobLevel,
            timestamp: now.toISOString(),
          }
        );
      }
    }

    // Process Shuren (habit) misses
    const shurens = await storage.getAllShurens(player.id);
    for (const shuren of shurens) {
      if (!shuren.active) continue;
      
      const lastCompleted = shuren.lastCompletedAt ? new Date(shuren.lastCompletedAt) : new Date(shuren.startDate);
      const daysSinceLastCompleted = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if missed based on repeat interval
      if (daysSinceLastCompleted > shuren.repeatInterval) {
        const newMissedCount = shuren.missedCount + 1;
        
        if (newMissedCount >= 5) {
          // Apply penalty for abandoning the habit
          const coinPenalty = Math.max(10, Math.floor(player.coins * 0.1));
          const expPenalty = Math.min(player.exp, 50);
          await storage.updatePlayer(player.id, {
            coins: Math.max(0, player.coins - coinPenalty),
            exp: Math.max(0, player.exp - expPenalty),
          });
          // Delete shuren after 5 misses
          await storage.deleteShuren(shuren.id);
          cronLogger.info(`Deleted shuren "${shuren.title}" after 5 misses`);
        } else {
          // Increment miss count
          await storage.updateShuren(shuren.id, { 
            missedCount: newMissedCount,
            continuousDays: 0, // Reset streak
          });
          cronLogger.info(`Shuren "${shuren.title}" missed (${newMissedCount}/5)`);
        }
      }
    }

    // Log successful execution
    await storage.logCronExecution(
      "hourly-check",
      player.id,
      true,
      {
        hpDamage,
        deadTasks: deadTasks.length,
        timestamp: now.toISOString(),
      }
    );

    cronLogger.info("Hourly check completed successfully");
  } catch (error) {
    cronLogger.error("Hourly check failed:", error);
    await storage.logCronExecution(
      "hourly-check",
      null,
      false,
      null,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// Get status of all cron jobs
export async function getCronStatus(): Promise<{
  dailyReset: { lastRun: Date | null; nextRun: Date };
  hourlyCheck: { lastRun: Date | null; nextRun: Date };
}> {
  const player = await storage.getCurrentPlayer();
  if (!player) {
    throw new Error("No player found");
  }

  const dailyResetLastRun = await storage.getLastCronExecution("daily-reset", player.id);
  const hourlyCheckLastRun = await storage.getLastCronExecution("hourly-check", player.id);

  // Calculate next run times
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Midnight

  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0); // Next hour

  return {
    dailyReset: {
      lastRun: dailyResetLastRun || null,
      nextRun: tomorrow,
    },
    hourlyCheck: {
      lastRun: hourlyCheckLastRun || null,
      nextRun: nextHour,
    },
  };
}

// Manual trigger functions for testing
export async function triggerDailyReset(): Promise<void> {
  cronLogger.info("Manual trigger: Daily Reset");
  await executeDailyReset();
}

export async function triggerHourlyCheck(): Promise<void> {
  cronLogger.info("Manual trigger: Hourly Check");
  await executeHourlyCheck();
}
