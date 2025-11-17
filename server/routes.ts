import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTsutomeSchema, insertShurenSchema, insertShihanSchema, insertShikakuSchema } from "@shared/schema";
import {
  generateMonsterName,
  generateTrainingName,
  generateMasterName,
  generateAssassinName,
  generateBossName,
  generateStoryText,
  generateImage,
  assessDifficulty,
} from "./ai";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============ Player ============
  app.get("/api/player", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/player/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const player = await storage.updatePlayer(id, updates);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      console.error("Error updating player:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ Tsutome (務メ) ============
  app.get("/api/tsutomes", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      const tsutomes = await storage.getAllTsutomes(player.id);
      res.json(tsutomes);
    } catch (error) {
      console.error("Error fetching tsutomes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tsutomes", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // 日付文字列をDateオブジェクトに変換
      const data = {
        ...req.body,
        deadline: new Date(req.body.deadline),
        startDate: new Date(req.body.startDate),
      };

      // バリデーション
      const validation = insertTsutomeSchema.safeParse(data);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error });
      }

      const validatedData = validation.data;

      // AI生成: 妖怪名
      const monsterName = await generateMonsterName(validatedData.title, validatedData.genre, validatedData.difficulty);

      // AI生成: 妖怪画像（オプション、時間がかかる場合はスキップ可能）
      const monsterImageUrl = await generateImage(
        `${monsterName}, ${validatedData.genre} themed yokai monster`,
        "monster"
      );

      const tsutome = await storage.createTsutome({
        ...validatedData,
        playerId: player.id,
        monsterName,
        monsterImageUrl,
      });

      res.status(201).json(tsutome);
    } catch (error) {
      console.error("Error creating tsutome:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/tsutomes/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const tsutome = await storage.getTsutome(id);
      if (!tsutome) {
        return res.status(404).json({ error: "Tsutome not found" });
      }

      // 既に完了済みまたはキャンセル済みのチェック
      if (tsutome.completed) {
        return res.status(400).json({ error: "Task already completed" });
      }
      if (tsutome.cancelled) {
        return res.status(400).json({ error: "Task was cancelled" });
      }

      const player = await storage.getPlayer(tsutome.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // 報酬計算
      const difficultyExp: Record<string, number> = {
        easy: 50,
        normal: 100,
        hard: 200,
        veryHard: 400,
        extreme: 800,
      };
      const difficultyCoins: Record<string, number> = {
        easy: 25,
        normal: 50,
        hard: 100,
        veryHard: 200,
        extreme: 400,
      };

      const expGain = difficultyExp[tsutome.difficulty] || 100;
      const coinsGain = difficultyCoins[tsutome.difficulty] || 50;

      // ボーナス: 早期完了
      const deadline = new Date(tsutome.deadline);
      const now = new Date();
      const earlyBonus = deadline > now ? 1.2 : 1.0;

      const finalExp = Math.floor(expGain * earlyBonus);
      const finalCoins = Math.floor(coinsGain * earlyBonus);

      // プレイヤー更新
      const newExp = player.exp + finalExp;
      const newCoins = player.coins + finalCoins;
      let newLevel = player.level;
      let remainingExp = newExp;

      // レベルアップ処理
      while (remainingExp >= newLevel * 100) {
        remainingExp -= newLevel * 100;
        newLevel++;
      }

      // ステータス成長（ジャンルに応じて）
      const statGrowth: Record<string, Partial<typeof player>> = {
        study: { wisdom: player.wisdom + 2 },
        exercise: { strength: player.strength + 1, vitality: player.vitality + 1 },
        work: { wisdom: player.wisdom + 1, strength: player.strength + 1 },
        hobby: { luck: player.luck + 1, agility: player.agility + 1 },
        housework: { vitality: player.vitality + 1, agility: player.agility + 1 },
        fun: { luck: player.luck + 2 },
      };

      const growth = statGrowth[tsutome.genre] || {};

      await storage.updatePlayer(player.id, {
        exp: remainingExp,
        level: newLevel,
        coins: newCoins,
        ...growth,
      });

      // タスク完了
      const updated = await storage.updateTsutome(id, {
        completed: true,
        completedAt: new Date(),
      });

      res.json({
        tsutome: updated,
        rewards: {
          exp: finalExp,
          coins: finalCoins,
          levelUp: newLevel > player.level,
          newLevel,
        },
      });
    } catch (error) {
      console.error("Error completing tsutome:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/tsutomes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTsutome(id);
      if (!deleted) {
        return res.status(404).json({ error: "Tsutome not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tsutome:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ Shuren (修練) ============
  app.get("/api/shurens", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      const shurens = await storage.getAllShurens(player.id);
      res.json(shurens);
    } catch (error) {
      console.error("Error fetching shurens:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/shurens", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // 日付文字列をDateオブジェクトに変換
      const data = {
        ...req.body,
        startDate: new Date(req.body.startDate),
      };

      const validation = insertShurenSchema.safeParse(data);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error });
      }

      const validatedData = validation.data;

      // AI生成: 修練名
      const trainingName = await generateTrainingName(validatedData.title, validatedData.genre);

      // AI生成: 修練画像（オプション）
      const trainingImageUrl = await generateImage(
        `${trainingName}, ${validatedData.genre} martial arts training`,
        "training"
      );

      const shuren = await storage.createShuren({
        ...validatedData,
        playerId: player.id,
        trainingName,
        trainingImageUrl,
      });

      res.status(201).json(shuren);
    } catch (error) {
      console.error("Error creating shuren:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/shurens/:id/record", async (req, res) => {
    try {
      const { id } = req.params;
      const { dataValue } = req.body; // 記録データ

      const shuren = await storage.getShuren(id);
      if (!shuren) {
        return res.status(404).json({ error: "Shuren not found" });
      }

      const player = await storage.getPlayer(shuren.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // 継続日数計算
      const now = new Date();
      const lastCompleted = shuren.lastCompletedAt ? new Date(shuren.lastCompletedAt) : null;
      let newContinuousDays = shuren.continuousDays;
      let newMissedCount = shuren.missedCount;

      if (lastCompleted) {
        const daysDiff = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= shuren.repeatInterval) {
          // 継続中
          newContinuousDays++;
        } else {
          // 途切れた
          newContinuousDays = 1;
          newMissedCount++;
        }
      } else {
        newContinuousDays = 1;
      }

      // 報酬
      const expGain = 30 + newContinuousDays * 5;
      const coinsGain = 15 + newContinuousDays * 2;

      await storage.updatePlayer(player.id, {
        exp: player.exp + expGain,
        coins: player.coins + coinsGain,
      });

      // 修練更新
      const updated = await storage.updateShuren(id, {
        continuousDays: newContinuousDays,
        totalDays: shuren.totalDays + 1,
        lastCompletedAt: now,
        missedCount: newMissedCount,
        active: newMissedCount < 5, // 5回ミスで非アクティブ
      });

      res.json({
        shuren: updated,
        rewards: {
          exp: expGain,
          coins: coinsGain,
        },
      });
    } catch (error) {
      console.error("Error recording shuren:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ Boss ============
  app.get("/api/boss/current", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      let boss = await storage.getCurrentBoss(player.id);

      // ボスが存在しない場合は新規作成
      if (!boss) {
        const bossNumber = 1;
        const bossName = await generateBossName(bossNumber);
        const bossImageUrl = await generateImage(
          `${bossName}, epic demon boss`,
          "boss"
        );

        boss = await storage.createBoss({
          playerId: player.id,
          bossNumber,
          bossName,
          bossImageUrl,
          hp: 1000,
          maxHp: 1000,
          attackPower: 50,
          challengeStartDate: new Date(),
        });
      }

      res.json(boss);
    } catch (error) {
      console.error("Error fetching boss:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/boss/:id/attack", async (req, res) => {
    try {
      const { id } = req.params;
      const boss = await storage.getBoss(id);
      if (!boss) {
        return res.status(404).json({ error: "Boss not found" });
      }

      const player = await storage.getPlayer(boss.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // 1日1回制限チェック
      const today = new Date().toDateString();
      const lastAttack = boss.lastAttackDate ? new Date(boss.lastAttackDate).toDateString() : null;
      if (lastAttack === today) {
        return res.status(400).json({ error: "Already attacked today" });
      }

      // ダメージ計算
      const damage = Math.floor(player.strength * 2 + player.level * 3);
      const newBossHp = Math.max(0, boss.hp - damage);

      // プレイヤーダメージ
      const playerDamage = Math.max(0, boss.attackPower - player.vitality);
      const newPlayerHp = Math.max(0, player.hp - playerDamage);

      await storage.updatePlayer(player.id, { hp: newPlayerHp });

      // ボス撃破チェック
      if (newBossHp === 0) {
        await storage.updateBoss(id, {
          hp: 0,
          defeated: true,
          defeatedAt: new Date(),
          lastAttackDate: new Date(),
        });

        // ストーリー生成
        const storyText = await generateStoryText(boss.bossNumber, boss.bossName);
        const storyImageUrl = await generateImage(
          `Epic battle victory scene, ${boss.bossName} defeated`,
          "story"
        );

        await storage.createStory({
          playerId: player.id,
          bossNumber: boss.bossNumber,
          storyText,
          storyImageUrl,
        });

        // 報酬
        const expGain = boss.bossNumber * 500;
        const coinsGain = boss.bossNumber * 200;

        await storage.updatePlayer(player.id, {
          exp: player.exp + expGain,
          coins: player.coins + coinsGain,
        });

        // 次のボス生成
        const nextBossNumber = boss.bossNumber + 1;
        const nextBossName = await generateBossName(nextBossNumber);
        const nextBossImageUrl = await generateImage(
          `${nextBossName}, epic demon boss`,
          "boss"
        );

        await storage.createBoss({
          playerId: player.id,
          bossNumber: nextBossNumber,
          bossName: nextBossName,
          bossImageUrl: nextBossImageUrl,
          hp: 1000 + nextBossNumber * 500,
          maxHp: 1000 + nextBossNumber * 500,
          attackPower: 50 + nextBossNumber * 20,
          challengeStartDate: new Date(),
        });

        res.json({
          message: "Boss defeated!",
          damage,
          playerDamage,
          bossDefeated: true,
          rewards: { exp: expGain, coins: coinsGain },
        });
      } else {
        await storage.updateBoss(id, {
          hp: newBossHp,
          lastAttackDate: new Date(),
        });

        res.json({
          message: "Attack successful",
          damage,
          playerDamage,
          bossHp: newBossHp,
          bossDefeated: false,
        });
      }
    } catch (error) {
      console.error("Error attacking boss:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ Items & Shop ============
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/items/:id/buy", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      if (player.coins < item.price) {
        return res.status(400).json({ error: "Not enough coins" });
      }

      await storage.updatePlayer(player.id, {
        coins: player.coins - item.price,
      });

      // インベントリに追加
      const inventory = await storage.addToInventory({
        playerId: player.id,
        itemId: item.id,
        quantity: 1,
        equipped: false,
      });

      res.json({ item, inventory });
    } catch (error) {
      console.error("Error buying item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ Stories ============
  app.get("/api/stories", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      const stories = await storage.getAllStories(player.id);
      res.json(stories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/stories/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      const story = await storage.getStory(id);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      const updatedStory = await storage.updateStory(id, { viewed: true });
      res.json(updatedStory);
    } catch (error) {
      console.error("Error marking story as viewed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
