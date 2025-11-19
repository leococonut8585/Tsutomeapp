import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTsutomeSchema, insertShurenSchema, insertShihanSchema, insertShikakuSchema, TsutomeWithLinkSource, LinkSource, calculateShurenBonus, calculateShihanBonus, Tsutome } from "@shared/schema";
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
import {
  triggerDailyReset,
  triggerHourlyCheck,
  getCronStatus,
} from "./cron";

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
      
      // Enrich tsutomes with linked source information
      const enrichedTsutomes = await Promise.all(
        tsutomes.map(async (tsutome) => {
          let linkSource = null;
          let bonusPercentage = 0;
          
          if (tsutome.linkedShurenId) {
            // Get linked Shuren
            const shuren = await storage.getShuren(tsutome.linkedShurenId);
            if (shuren) {
              // Calculate bonus based on continuous days
              // 5 days = +10%, 10 days = +20%, 15 days = +30%, max +50%
              const continuousDays = shuren.continuousDays;
              bonusPercentage = Math.min(50, Math.floor(continuousDays / 5) * 10);
              
              linkSource = {
                type: "shuren",
                id: shuren.id,
                name: shuren.trainingName,
                title: shuren.title,
                bonus: bonusPercentage,
                continuousDays: shuren.continuousDays,
              };
            }
          } else if (tsutome.linkedShihanId) {
            // Get linked Shihan
            const shihan = await storage.getShihan(tsutome.linkedShihanId);
            if (shihan) {
              // Get all completed tsutomes for this shihan to calculate progress
              const shihanTsutomes = await storage.getTsutomesByShihanId(shihan.id);
              const completedCount = shihanTsutomes.filter(t => t.completed).length;
              const totalCount = shihanTsutomes.length || 1;
              const progress = Math.floor((completedCount / totalCount) * 100);
              
              // Fixed 20% bonus for Shihan-linked tasks
              bonusPercentage = 20;
              
              console.log(`Shihan bonus calculation for task ${tsutome.id}:`, {
                shihanId: shihan.id,
                shihanName: shihan.masterName,
                progress: `${progress}% (${completedCount}/${totalCount} completed)`,
                bonusPercentage: `${bonusPercentage}% (fixed)`,
                rewardBonus: bonusPercentage / 100,
              });
              
              linkSource = {
                type: "shihan",
                id: shihan.id,
                name: shihan.masterName,
                title: shihan.title,
                bonus: bonusPercentage,
                progress: progress,
              };
            }
          }
          
          return {
            ...tsutome,
            linkSource,
            rewardBonus: bonusPercentage / 100, // Convert percentage to decimal (20% → 0.2)
          };
        })
      );
      
      res.json(enrichedTsutomes);
    } catch (error) {
      console.error("Error fetching tsutomes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tsutomes", async (req, res) => {
    console.log("POST /api/tsutomes - Request received");
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        console.log("POST /api/tsutomes - Player not found");
        return res.status(404).json({ error: "Player not found" });
      }

      console.log("POST /api/tsutomes - Player found:", player.id);

      // 日付文字列をDateオブジェクトに変換
      const data = {
        ...req.body,
        playerId: player.id, // playerIdを追加
        deadline: req.body.deadline ? new Date(req.body.deadline) : new Date(),
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(), // デフォルトは現在時刻
      };

      // バリデーション
      const validation = insertTsutomeSchema.safeParse(data);
      if (!validation.success) {
        console.log("POST /api/tsutomes - Validation failed:", validation.error);
        return res.status(400).json({ error: "Invalid input", details: validation.error });
      }

      const validatedData = validation.data;
      console.log("POST /api/tsutomes - Data validated, difficulty:", validatedData.difficulty);

      // AI判定: 難易度（提供されていない場合、または"auto"が指定された場合）
      let finalDifficulty = validatedData.difficulty;
      if (!finalDifficulty || finalDifficulty === "auto") {
        console.log(`POST /api/tsutomes - Auto-assessing difficulty for task: ${validatedData.title}`);
        try {
          console.log("POST /api/tsutomes - Loading AI module...");
          const { assessTaskDifficulty } = await import("./ai");
          console.log("POST /api/tsutomes - Calling AI assessment...");
          const aiDifficulty = await assessTaskDifficulty(
            validatedData.title,
            undefined, // descriptionフィールドは存在しない
            validatedData.genre
          );
          console.log(`POST /api/tsutomes - AI assessed difficulty: ${aiDifficulty}`);
          
          // AI結果をDBのenumにマッピング
          const difficultyMap: Record<string, string> = {
            "easy": "easy",
            "medium": "normal",
            "hard": "hard",
            "legendary": "extreme"
          };
          finalDifficulty = difficultyMap[aiDifficulty] || "normal";
          console.log(`POST /api/tsutomes - Mapped to DB enum: ${finalDifficulty}`);
        } catch (aiError) {
          console.error("AI難易度判定エラー:", aiError);
          // AIエラーの場合はデフォルト難易度を設定し、警告を返す
          finalDifficulty = "normal";
          res.locals.aiDifficultyError = "AI難易度判定に失敗したため、通常難易度で設定しました";
        }
      }

      // AI生成: 妖怪名
      const monsterName = await generateMonsterName(validatedData.title, validatedData.genre, finalDifficulty);

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
        difficulty: finalDifficulty, // AI判定後の難易度を使用
        playerId: player.id,
        monsterName: monsterName || "妖怪", // デフォルト値を設定
        monsterImageUrl,
      });

      // レスポンスにエラー警告を含める
      const response: any = tsutome;
      const warnings = [];
      
      if (imageGenerationWarning) {
        warnings.push("妖怪画像の生成に失敗しました");
      }
      
      if (res.locals.aiDifficultyError) {
        warnings.push(res.locals.aiDifficultyError);
      }
      
      if (warnings.length > 0) {
        response.warning = warnings.join("。") + "。タスクは作成されました。";
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
      const { completionReport } = req.body; // 完了報告を受け取る
      
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

      // AI審査を実行（完了報告がある場合）
      let aiVerificationResult = {
        approved: true,
        feedback: "自動承認",
        bonusMultiplier: 1.0
      };

      if (completionReport && completionReport.trim()) {
        console.log(`AI verification for task ${id}: Starting...`);
        
        try {
          const { verifyTaskCompletionAdvanced } = await import("./ai");
          
          aiVerificationResult = await verifyTaskCompletionAdvanced(
            tsutome.title,
            null, // tsutomeテーブルにdescriptionフィールドはない
            completionReport,
            tsutome.monsterName || "妖怪",
            tsutome.difficulty
          );
          
          console.log(`AI verification result for task ${id}:`, aiVerificationResult);
          
          // 審査に不合格の場合
          if (!aiVerificationResult.approved) {
            return res.status(400).json({
              error: "タスク完了が承認されませんでした",
              feedback: aiVerificationResult.feedback,
              requiresRevision: true
            });
          }
        } catch (aiError) {
          console.error("AI審査エラー:", aiError);
          // AI審査が失敗した場合は、警告付きでデフォルト承認
          aiVerificationResult = {
            approved: true,
            feedback: "AI審査が利用できないため、通常承認しました",
            bonusMultiplier: 1.0
          };
          res.locals.aiVerificationError = true;
        }
      }

      // 報酬計算 - 難易度ごとにランダムな範囲で報酬を設定
      const getRandomRewards = (difficulty: string): { exp: number; coins: number } => {
        switch (difficulty) {
          case "easy":
            return {
              exp: 10 + Math.floor(Math.random() * 11), // 10-20
              coins: 20 + Math.floor(Math.random() * 21), // 20-40
            };
          case "normal":
            return {
              exp: 30 + Math.floor(Math.random() * 21), // 30-50
              coins: 60 + Math.floor(Math.random() * 41), // 60-100
            };
          case "hard":
            return {
              exp: 70 + Math.floor(Math.random() * 31), // 70-100
              coins: 140 + Math.floor(Math.random() * 61), // 140-200
            };
          case "veryHard":
            return {
              exp: 100 + Math.floor(Math.random() * 51), // 100-150
              coins: 200 + Math.floor(Math.random() * 101), // 200-300
            };
          case "extreme":
            return {
              exp: 150 + Math.floor(Math.random() * 51), // 150-200
              coins: 300 + Math.floor(Math.random() * 101), // 300-400
            };
          default:
            return {
              exp: 30 + Math.floor(Math.random() * 21), // default to normal
              coins: 60 + Math.floor(Math.random() * 41),
            };
        }
      };

      const rewards = getRandomRewards(tsutome.difficulty);
      let expGain = rewards.exp;
      let coinsGain = rewards.coins;
      
      // Calculate link bonus
      let linkBonusMultiplier = 1.0;
      let bonusInfo = null;
      
      if (tsutome.linkedShurenId) {
        // Get linked Shuren for bonus calculation
        const shuren = await storage.getShuren(tsutome.linkedShurenId);
        if (shuren) {
          // Bonus based on continuous days
          const continuousDays = shuren.continuousDays;
          const bonusPercentage = Math.min(50, Math.floor(continuousDays / 5) * 10);
          linkBonusMultiplier = 1 + (bonusPercentage / 100);
          
          bonusInfo = {
            type: "shuren",
            name: shuren.trainingName,
            title: shuren.title,
            bonus: bonusPercentage,
            continuousDays: continuousDays,
          };
        }
      } else if (tsutome.linkedShihanId) {
        // Get linked Shihan for bonus calculation
        const shihan = await storage.getShihan(tsutome.linkedShihanId);
        if (shihan) {
          // Calculate progress
          const shihanTsutomes = await storage.getTsutomesByShihanId(shihan.id);
          const completedCount = shihanTsutomes.filter(t => t.completed).length;
          const totalCount = shihanTsutomes.length || 1;
          const progress = Math.floor((completedCount / totalCount) * 100);
          
          // Fixed 20% bonus for Shihan-linked tasks
          const bonusPercentage = 20;
          linkBonusMultiplier = 1 + (bonusPercentage / 100);
          
          console.log(`Task completion - Shihan bonus for task ${tsutome.id}:`, {
            shihanId: shihan.id,
            shihanName: shihan.masterName,
            progress: `${progress}% (${completedCount}/${totalCount} completed)`,
            bonusPercentage: `${bonusPercentage}% (fixed)`,
            linkBonusMultiplier: linkBonusMultiplier,
            baseRewards: { exp: expGain, coins: coinsGain },
          });
          
          bonusInfo = {
            type: "shihan",
            name: shihan.masterName,
            title: shihan.title,
            bonus: bonusPercentage,
            progress: progress,
          };
        }
      }
      
      // Apply link bonus to base rewards
      expGain = Math.floor(expGain * linkBonusMultiplier);
      coinsGain = Math.floor(coinsGain * linkBonusMultiplier);
      
      // Apply AI verification bonus/penalty
      expGain = Math.floor(expGain * aiVerificationResult.bonusMultiplier);
      coinsGain = Math.floor(coinsGain * aiVerificationResult.bonusMultiplier);

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

      // アイテムドロップ処理
      let drops: any[] = [];
      try {
        const { calculateItemDrops, prepareInventoryItems } = await import("./drop-system");
        
        // ドロップ可能なアイテムを取得
        const allItems = await storage.getAllItems();
        const droppableItems = allItems.filter(item => item.droppable);
        
        if (droppableItems.length > 0) {
          // ドロップ計算
          const itemDrops = calculateItemDrops(tsutome, player, droppableItems);
          
          // インベントリに追加
          if (itemDrops.length > 0) {
            const inventoryItems = prepareInventoryItems(itemDrops, player.id);
            
            // 各アイテムをインベントリに追加
            for (const invItem of inventoryItems) {
              // 既存のアイテムがあるか確認
              const existingInventory = await storage.getPlayerInventory(player.id);
              const existing = existingInventory.find(inv => inv.itemId === invItem.itemId && !inv.equipped);
              
              if (existing) {
                // 既存のアイテムに数量を追加
                await storage.updateInventory(existing.id, {
                  quantity: existing.quantity + invItem.quantity,
                });
              } else {
                // 新しいアイテムとして追加
                await storage.addToInventory(invItem);
              }
            }
            
            // レスポンス用のドロップ情報を整形
            drops = itemDrops.map(drop => ({
              item: {
                id: drop.item.id,
                name: drop.item.name,
                description: drop.item.description,
                rarity: drop.item.rarity,
                itemType: drop.item.itemType,
                imageUrl: drop.item.imageUrl,
              },
              quantity: drop.quantity,
              isBonus: drop.isBonus,
            }));
            
            console.log(`Task ${id} completion drops:`, drops);
          }
        }
      } catch (dropError) {
        console.error("Drop processing error:", dropError);
        // ドロップ処理が失敗してもタスク完了は継続
      }

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
          bonusInfo: bonusInfo,
        },
        aiVerification: {
          feedback: aiVerificationResult.feedback,
          bonusMultiplier: aiVerificationResult.bonusMultiplier,
        },
        drops: drops, // ドロップアイテムを追加
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

  // ============ Task Linking System (連携システム) ============
  
  // 師範から務メを生成
  app.post("/api/shihans/:id/generate-tsutome", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Generating tsutome for shihan:", id);
      
      const shihan = await storage.getShihan(id);
      if (!shihan) {
        console.error("Shihan not found:", id);
        return res.status(404).json({ error: "Shihan not found" });
      }

      const player = await storage.getCurrentPlayer();
      if (!player) {
        console.error("Player not found");
        return res.status(404).json({ error: "Player not found" });
      }

      const { title, deadline, difficulty = "normal" } = req.body;
      console.log("Request body:", { title, deadline, difficulty });
      
      // Validate required fields
      if (!title || !deadline) {
        console.error("Missing required fields:", { title, deadline });
        return res.status(400).json({ 
          error: "タイトルと期限は必須です",
          message: "タイトルと期限を入力してください" 
        });
      }
      
      // AI生成: モンスター名
      const monsterName = await generateMonsterName(title, shihan.genre, difficulty);
      
      // AI生成: モンスター画像（オプション）
      let monsterImageUrl = "";
      try {
        monsterImageUrl = await generateImage(
          `${monsterName}, Japanese yokai monster, ${difficulty} difficulty`,
          "monster"
        );
      } catch (error) {
        console.error("Monster image generation error:", error);
      }

      const tsutome = await storage.createTsutome({
        playerId: player.id,
        title,
        deadline: new Date(deadline),
        genre: shihan.genre,
        startDate: new Date(),
        difficulty,
        monsterName,
        monsterImageUrl,
        linkedShurenId: null,
        linkedShihanId: shihan.id, // 師範と連携
      });

      // Enrich with linkSource and rewardBonus for response
      const enrichedTsutome = {
        ...tsutome,
        linkSource: {
          type: "shihan",
          id: shihan.id,
          name: shihan.masterName,
          title: shihan.title,
          bonus: 20, // 師範からは固定20%ボーナス
          progress: 0, // 新規作成時は進捗0
        },
        rewardBonus: 0.2, // 20% bonus as decimal
      };

      console.log(`Generated tsutome from shihan:`, {
        tsutomeId: tsutome.id,
        shihanId: shihan.id,
        shihanName: shihan.masterName,
        fixedBonus: "20%",
        rewardBonus: 0.2,
        linkSource: enrichedTsutome.linkSource,
      });

      res.status(201).json(enrichedTsutome);
    } catch (error) {
      console.error("Error generating tsutome from shihan:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 修練から務メを生成
  app.post("/api/shurens/:id/generate-tsutome", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Generating tsutome for shuren:", id);
      
      const shuren = await storage.getShuren(id);
      if (!shuren) {
        console.error("Shuren not found:", id);
        return res.status(404).json({ error: "Shuren not found" });
      }

      const player = await storage.getCurrentPlayer();
      if (!player) {
        console.error("Player not found");
        return res.status(404).json({ error: "Player not found" });
      }

      // 今日の務メがすでに作成されているかチェック
      const linkedTsutomes = await storage.getTsutomesByShurenId(shuren.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTsutome = linkedTsutomes.find(t => {
        const tsutomeDate = new Date(t.createdAt!);
        tsutomeDate.setHours(0, 0, 0, 0);
        return tsutomeDate.getTime() === today.getTime() && !t.cancelled;
      });

      if (todayTsutome) {
        return res.status(400).json({ error: "今日の修練タスクはすでに作成されています" });
      }

      // 期限を今日の23:59に設定
      const deadline = new Date();
      deadline.setHours(23, 59, 59, 999);
      
      // AI生成: モンスター名
      const monsterName = await generateMonsterName(shuren.title, shuren.genre, "normal");
      
      // AI生成: モンスター画像（オプション）
      let monsterImageUrl = "";
      try {
        monsterImageUrl = await generateImage(
          `${monsterName}, training yokai spirit, daily practice`,
          "monster"
        );
      } catch (error) {
        console.error("Monster image generation error:", error);
      }

      const tsutome = await storage.createTsutome({
        playerId: player.id,
        title: `【修練】${shuren.title}`,
        deadline,
        genre: shuren.genre,
        startDate: new Date(),
        difficulty: "easy", // 修練は習慣化が目的なので難易度は低め
        monsterName,
        monsterImageUrl,
        linkedShurenId: shuren.id, // 修練と連携
        linkedShihanId: null,
      });

      // Calculate bonus based on continuous days
      const continuousDays = shuren.continuousDays;
      const bonusPercentage = Math.min(50, Math.floor(continuousDays / 5) * 10);
      
      // Enrich with linkSource and rewardBonus for response
      const enrichedTsutome = {
        ...tsutome,
        linkSource: {
          type: "shuren",
          id: shuren.id,
          name: shuren.trainingName,
          title: shuren.title,
          bonus: bonusPercentage,
          continuousDays: shuren.continuousDays,
        },
        rewardBonus: bonusPercentage / 100, // Convert percentage to decimal
      };

      res.status(201).json(enrichedTsutome);
    } catch (error) {
      console.error("Error generating tsutome from shuren:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 連携元の務メ一覧取得
  app.get("/api/tsutomes/linked/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;
      let tsutomes: Tsutome[] = [];

      if (type === "shihan") {
        tsutomes = await storage.getTsutomesByShihanId(id);
      } else if (type === "shuren") {
        tsutomes = await storage.getTsutomesByShurenId(id);
      } else {
        return res.status(400).json({ error: "Invalid type. Must be 'shihan' or 'shuren'" });
      }

      res.json(tsutomes);
    } catch (error) {
      console.error("Error fetching linked tsutomes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 師範の進捗状況取得
  app.get("/api/shihans/:id/progress", async (req, res) => {
    try {
      const { id } = req.params;
      const shihan = await storage.getShihan(id);
      if (!shihan) {
        return res.status(404).json({ error: "Shihan not found" });
      }

      const linkedTsutomes = await storage.getTsutomesByShihanId(id);
      const totalTasks = linkedTsutomes.length;
      const completedTasks = linkedTsutomes.filter(t => t.completed).length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      res.json({
        shihan,
        linkedTasks: {
          total: totalTasks,
          completed: completedTasks,
          progress,
        },
      });
    } catch (error) {
      console.error("Error fetching shihan progress:", error);
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

      const shikaku = await storage.createShikaku({
        ...validatedData,
        playerId: player.id,
        assassinName,
        assassinImageUrl,
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

  // ============ Cron/Periodic Processing ============
  // Manual trigger for daily reset (for testing)
  app.post("/api/cron/daily-reset", async (req, res) => {
    try {
      console.log("[API] Manual trigger for daily reset requested");
      await triggerDailyReset();
      res.json({ 
        success: true, 
        message: "Daily reset triggered successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error triggering daily reset:", error);
      res.status(500).json({ 
        error: "Failed to trigger daily reset",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manual trigger for hourly check (for testing)
  app.post("/api/cron/hourly-check", async (req, res) => {
    try {
      console.log("[API] Manual trigger for hourly check requested");
      await triggerHourlyCheck();
      res.json({ 
        success: true, 
        message: "Hourly check triggered successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error triggering hourly check:", error);
      res.status(500).json({ 
        error: "Failed to trigger hourly check",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get cron status
  app.get("/api/cron/status", async (req, res) => {
    try {
      const status = await getCronStatus();
      res.json({
        success: true,
        dailyReset: {
          lastRun: status.dailyReset.lastRun,
          nextRun: status.dailyReset.nextRun,
          lastRunFormatted: status.dailyReset.lastRun 
            ? new Date(status.dailyReset.lastRun).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
            : "Never",
          nextRunFormatted: new Date(status.dailyReset.nextRun).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        },
        hourlyCheck: {
          lastRun: status.hourlyCheck.lastRun,
          nextRun: status.hourlyCheck.nextRun,
          lastRunFormatted: status.hourlyCheck.lastRun 
            ? new Date(status.hourlyCheck.lastRun).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
            : "Never",
          nextRunFormatted: new Date(status.hourlyCheck.nextRun).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        },
        serverTime: new Date().toISOString(),
        serverTimeJST: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      });
    } catch (error) {
      console.error("Error fetching cron status:", error);
      res.status(500).json({ 
        error: "Failed to fetch cron status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Inventory routes
  app.get("/api/inventories", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      // Get player's inventory items
      const inventories = await storage.getPlayerInventory(player.id);
      
      // Fetch item details for each inventory entry
      const inventoriesWithItems = await Promise.all(
        inventories.map(async (inv) => {
          const item = await storage.getItem(inv.itemId);
          return {
            ...inv,
            item
          };
        })
      );
      
      res.json(inventoriesWithItems);
    } catch (error) {
      console.error("Error fetching inventories:", error);
      res.status(500).json({ error: "Failed to fetch inventories" });
    }
  });

  // Equipment routes
  app.get("/api/equipment", async (req, res) => {
    try {
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      // Get equipped items from inventory
      const inventories = await storage.getPlayerInventory(player.id);
      const equippedInventories = inventories.filter(inv => inv.equipped);
      
      // Fetch item details for equipped items
      const equippedItems = await Promise.all(
        equippedInventories.map(async (inv) => {
          const item = await storage.getItem(inv.itemId);
          return item;
        })
      );
      
      res.json(equippedItems);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  });

  app.post("/api/equipment/equip", async (req, res) => {
    try {
      const { itemId } = req.body;
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      // Get item details
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      // Determine slot based on item type
      let slot: 'weapon' | 'armor' | 'accessory';
      if (item.itemType === 'weapon') {
        slot = 'weapon';
      } else if (item.itemType === 'armor') {
        slot = 'armor';
      } else if (item.itemType === 'accessory') {
        slot = 'accessory';
      } else {
        return res.status(400).json({ error: "Item cannot be equipped" });
      }
      
      await storage.equipItem(player.id, itemId, slot);
      const updatedPlayer = await storage.getPlayer(player.id);
      res.json({ success: true, player: updatedPlayer });
    } catch (error) {
      console.error("Error equipping item:", error);
      res.status(500).json({ error: "Failed to equip item" });
    }
  });

  app.post("/api/equipment/unequip", async (req, res) => {
    try {
      const { slot } = req.body;
      const player = await storage.getCurrentPlayer();
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      await storage.unequipItem(player.id, slot);
      const updatedPlayer = await storage.getPlayer(player.id);
      res.json({ success: true, player: updatedPlayer });
    } catch (error) {
      console.error("Error unequipping item:", error);
      res.status(500).json({ error: "Failed to unequip item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
