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
  // ============ Image Generation ============
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, type } = req.body;
      
      if (!prompt || !type) {
        return res.status(400).json({ error: "prompt and type are required" });
      }
      
      const validTypes = ["monster", "training", "master", "assassin", "boss", "story"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "Invalid type. Must be one of: " + validTypes.join(", ") });
      }
      
      const imageUrl = await generateImage(prompt, type);
      
      if (!imageUrl) {
        return res.status(500).json({ error: "Failed to generate image" });
      }
      
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

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

  // ============ Job Change ============
  app.post("/api/player/change-job", async (req, res) => {
    try {
      const { jobId } = req.body;
      
      if (!jobId) {
        return res.status(400).json({ error: "Job ID is required" });
      }
      
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      // Check if changing to the same job
      if (player.job === jobId) {
        return res.status(400).json({ error: "Already in this job" });
      }
      
      // Check cost (first job change is free)
      const isFirstJob = player.job === "novice";
      const cost = isFirstJob ? 0 : 500;
      
      if (player.coins < cost) {
        return res.status(400).json({ error: "所持金が不足しています" });
      }
      
      // Apply job-specific bonuses
      let updates: any = {
        job: jobId,
        jobLevel: 1,
        jobXp: 0,
        coins: player.coins - cost,
      };
      
      // Job-specific stat adjustments
      if (jobId === "monk") {
        // Monk gets +50 max HP
        updates.maxHp = 150;
        // Restore HP if below new max
        if (player.hp < 150) {
          updates.hp = Math.min(player.hp + 50, 150);
        }
      } else if (jobId === "guardian") {
        // Guardian gets +25 vitality
        updates.vitality = player.vitality + 25;
      } else if (jobId === "mystic") {
        // Mystic gets +5 to all stats and +10 luck
        updates.wisdom = player.wisdom + 5;
        updates.strength = player.strength + 5;
        updates.agility = player.agility + 5;
        updates.vitality = player.vitality + 5;
        updates.luck = player.luck + 15; // +5 base + 10 extra
      } else {
        // Reset to base max HP for other jobs if changing from monk
        if (player.job === "monk") {
          updates.maxHp = 100;
          updates.hp = Math.min(player.hp, 100);
        }
      }
      
      // Update player
      const updatedPlayer = await storage.updatePlayer(player.id, updates);
      
      res.json({
        success: true,
        player: updatedPlayer,
        cost,
      });
    } catch (error) {
      console.error("Error changing job:", error);
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
      let monsterImageUrl = "";
      let imageGenerationWarning = false;
      
      try {
        monsterImageUrl = await generateImage(
          `${monsterName}, ${validatedData.genre} themed yokai monster`,
          "monster"
        );
        
        // 空文字列が返ってきた場合は画像生成が失敗
        if (!monsterImageUrl) {
          imageGenerationWarning = true;
          console.warn("妖怪画像の生成に失敗しました。タスクは作成されますが画像なしで保存されます。");
        }
      } catch (error) {
        console.error("妖怪画像生成エラー:", error);
        imageGenerationWarning = true;
        monsterImageUrl = "";
      }

      const tsutome = await storage.createTsutome({
        ...validatedData,
        playerId: player.id,
        monsterName,
        monsterImageUrl,
      });

      // 画像生成エラーがあった場合は警告フラグを含めてレスポンス
      const response: any = tsutome;
      if (imageGenerationWarning) {
        response.warning = "妖怪画像の生成に失敗しました。タスクは作成されました。";
      }

      res.status(201).json(response);
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

      let expGain = difficultyExp[tsutome.difficulty] || 100;
      let coinsGain = difficultyCoins[tsutome.difficulty] || 50;

      // Job-specific bonuses
      if (player.job === "samurai" && ["exercise", "work"].includes(tsutome.genre)) {
        // Samurai gets +20% XP from combat-related tasks
        expGain = Math.floor(expGain * 1.2);
      } else if (player.job === "monk" && tsutome.genre === "exercise") {
        // Monk gets bonus from training tasks
        expGain = Math.floor(expGain * 1.25);
      } else if (player.job === "scholar" && tsutome.genre === "study") {
        // Scholar gets +30% XP from study tasks
        expGain = Math.floor(expGain * 1.3);
      } else if (player.job === "ninja") {
        // Ninja completes tasks 20% faster (simulated as bonus)
        expGain = Math.floor(expGain * 1.1);
      }
      
      // Scholar gets +25% coins
      if (player.job === "scholar") {
        coinsGain = Math.floor(coinsGain * 1.25);
      }

      // ボーナス: 早期完了
      const deadline = new Date(tsutome.deadline);
      const now = new Date();
      const earlyBonus = deadline > now ? 1.2 : 1.0;

      const finalExp = Math.floor(expGain * earlyBonus);
      const finalCoins = Math.floor(coinsGain * earlyBonus);
      
      // Job XP (50% of regular XP)
      const jobXpGain = Math.floor(finalExp * 0.5);

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
      
      // Job XP and level up
      const newJobXp = player.jobXp + jobXpGain;
      let newJobLevel = player.jobLevel;
      let remainingJobXp = newJobXp;
      
      // Job level up (100 XP per level)
      while (remainingJobXp >= 100) {
        remainingJobXp -= 100;
        newJobLevel++;
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
        jobXp: remainingJobXp,
        jobLevel: newJobLevel,
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
      let trainingImageUrl = "";
      let imageGenerationWarning = false;
      
      try {
        trainingImageUrl = await generateImage(
          `${trainingName}, ${validatedData.genre} martial arts training`,
          "training"
        );
        
        // 空文字列が返ってきた場合は画像生成が失敗
        if (!trainingImageUrl) {
          imageGenerationWarning = true;
          console.warn("修練画像の生成に失敗しました。修練は作成されますが画像なしで保存されます。");
        }
      } catch (error) {
        console.error("修練画像生成エラー:", error);
        imageGenerationWarning = true;
        trainingImageUrl = "";
      }

      const shuren = await storage.createShuren({
        ...validatedData,
        playerId: player.id,
        trainingName,
        trainingImageUrl,
      });

      // 画像生成エラーがあった場合は警告フラグを含めてレスポンス
      const response: any = shuren;
      if (imageGenerationWarning) {
        response.warning = "修練画像の生成に失敗しました。修練は作成されました。";
      }

      res.status(201).json(response);
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

  // ============ Shihan (師範 - Long-term goals) ============
  app.get("/api/shihans", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      const shihans = await storage.getAllShihans(player.id);
      res.json(shihans);
    } catch (error) {
      console.error("Error fetching shihans:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/shihans", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // 日付文字列をDateオブジェクトに変換
      const data = {
        ...req.body,
        targetDate: new Date(req.body.targetDate),
        startDate: new Date(req.body.startDate),
      };

      const validation = insertShihanSchema.safeParse(data);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error });
      }

      const validatedData = validation.data;

      // AI生成: 師範名
      const masterName = await generateMasterName(validatedData.title, validatedData.genre);

      // AI生成: 師範画像（オプション）
      let masterImageUrl = "";
      let imageGenerationWarning = false;
      
      try {
        masterImageUrl = await generateImage(
          `${masterName}, wise Japanese martial arts master, ${validatedData.genre} specialist`,
          "master"
        );
        
        // 空文字列が返ってきた場合は画像生成が失敗
        if (!masterImageUrl) {
          imageGenerationWarning = true;
          console.warn("師範画像の生成に失敗しました。師範は作成されますが画像なしで保存されます。");
        }
      } catch (error) {
        console.error("師範画像生成エラー:", error);
        imageGenerationWarning = true;
        masterImageUrl = "";
      }

      const shihan = await storage.createShihan({
        ...validatedData,
        playerId: player.id,
        masterName,
        masterImageUrl,
      });

      // 画像生成エラーがあった場合は警告フラグを含めてレスポンス
      const response: any = shihan;
      if (imageGenerationWarning) {
        response.warning = "師範画像の生成に失敗しました。師範は作成されました。";
      }

      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating shihan:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/shihans/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const shihan = await storage.getShihan(id);
      if (!shihan) {
        return res.status(404).json({ error: "Shihan not found" });
      }

      if (shihan.completed) {
        return res.status(400).json({ error: "Goal already completed" });
      }

      const player = await storage.getPlayer(shihan.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // 長期目標完了の報酬（大きめ）
      const expGain = 1000;
      const coinsGain = 500;
      const statBonus = 5;

      await storage.updatePlayer(player.id, {
        exp: player.exp + expGain,
        coins: player.coins + coinsGain,
        wisdom: player.wisdom + statBonus,
        strength: player.strength + statBonus,
      });

      const updated = await storage.updateShihan(id, {
        completed: true,
        completedAt: new Date(),
      });

      res.json({
        shihan: updated,
        rewards: {
          exp: expGain,
          coins: coinsGain,
          statBonus,
        },
      });
    } catch (error) {
      console.error("Error completing shihan:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ Shikaku (刺客 - Urgent tasks) ============
  app.get("/api/shikakus", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      const shikakus = await storage.getAllShikakus(player.id);
      res.json(shikakus);
    } catch (error) {
      console.error("Error fetching shikakus:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/shikakus", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const validation = insertShikakuSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error });
      }

      const validatedData = validation.data;

      // AI生成: 刺客名
      const assassinName = await generateAssassinName(validatedData.title, validatedData.difficulty);

      // AI生成: 刺客画像（オプション）
      let assassinImageUrl = "";
      let imageGenerationWarning = false;
      
      try {
        assassinImageUrl = await generateImage(
          `${assassinName}, mysterious Japanese ninja assassin, ${validatedData.difficulty} level threat`,
          "assassin"
        );
        
        // 空文字列が返ってきた場合は画像生成が失敗
        if (!assassinImageUrl) {
          imageGenerationWarning = true;
          console.warn("刺客画像の生成に失敗しました。刺客は作成されますが画像なしで保存されます。");
        }
      } catch (error) {
        console.error("刺客画像生成エラー:", error);
        imageGenerationWarning = true;
        assassinImageUrl = "";
      }

      // 24時間後に期限切れ
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const shikaku = await storage.createShikaku({
        ...validatedData,
        playerId: player.id,
        assassinName,
        assassinImageUrl,
        expiresAt,
      });

      // 画像生成エラーがあった場合は警告フラグを含めてレスポンス
      const response: any = shikaku;
      if (imageGenerationWarning) {
        response.warning = "刺客画像の生成に失敗しました。刺客は作成されました。";
      }

      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating shikaku:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/shikakus/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const shikaku = await storage.getShikaku(id);
      if (!shikaku) {
        return res.status(404).json({ error: "Shikaku not found" });
      }

      if (shikaku.completed) {
        return res.status(400).json({ error: "Task already completed" });
      }

      // 期限切れチェック
      if (new Date() > new Date(shikaku.expiresAt)) {
        return res.status(400).json({ error: "Task has expired" });
      }

      const player = await storage.getPlayer(shikaku.playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      // 緊急タスク完了の報酬（高報酬）
      const difficultyMultiplier: Record<string, number> = {
        easy: 1.5,
        normal: 2,
        hard: 3,
        veryHard: 4,
        extreme: 5,
      };

      const multiplier = difficultyMultiplier[shikaku.difficulty] || 2;
      const expGain = Math.floor(100 * multiplier);
      const coinsGain = Math.floor(50 * multiplier);

      await storage.updatePlayer(player.id, {
        exp: player.exp + expGain,
        coins: player.coins + coinsGain,
        agility: player.agility + 2, // 刺客タスクは敏捷性を上げる
      });

      const updated = await storage.updateShikaku(id, {
        completed: true,
        completedAt: new Date(),
      });

      res.json({
        shikaku: updated,
        rewards: {
          exp: expGain,
          coins: coinsGain,
          agilityBonus: 2,
        },
      });
    } catch (error) {
      console.error("Error completing shikaku:", error);
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
