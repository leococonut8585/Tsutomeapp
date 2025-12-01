import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTsutomeSchema, insertShurenSchema, insertShihanSchema, insertShikakuSchema, TsutomeWithLinkSource, LinkSource, calculateShurenBonus, calculateShihanBonus, Tsutome, InsertInventory, DropHistory, Player, toPublicPlayer, AdminAuditLog } from "@shared/schema";
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
import { logger } from "./utils/logger";
import { randomBytes } from "crypto";
import { apiRateLimiters, validateInput } from "./middleware/security";

// Create a child logger for routes module
const routesLogger = logger.child("Routes");

const DAY_IN_MS = 1000 * 60 * 60 * 24;

type StatBonus = {
  wisdom: number;
  strength: number;
  agility: number;
  vitality: number;
  luck: number;
};

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

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("=== REGISTERING ROUTES ===");
  routesLogger.info("Starting route registration");

  const sanitizePlayer = (player: Player) => toPublicPlayer(player);

  const adminOnly: RequestHandler = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "管理者専用の操作です" });
    }
    next();
  };

  const mapAdminUser = (player: Player) => ({
    id: player.id,
    name: player.name,
    username: player.username,
    role: player.role,
    job: player.job,
    level: player.level,
    coins: player.coins,
    suspended: Boolean(player.suspended),
    passwordPlain: player.passwordPlain,
    monthlyApiCalls: player.monthlyApiCalls ?? 0,
    monthlyApiCost: Number(player.monthlyApiCost ?? 0),
    createdAt: player.createdAt ? new Date(player.createdAt).toISOString() : null,
  });

  const generateTempPassword = (length = 12) => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!?";
    const buf = randomBytes(length * 2);
    let password = "";
    for (let i = 0; i < buf.length && password.length < length; i++) {
      const index = buf[i] % alphabet.length;
      password += alphabet[index];
    }
  return password.slice(0, length);
};

  async function recordAdminAudit(
    admin: Player,
    action: string,
    targetUserId?: string | null,
    details?: Record<string, any>,
  ) {
    try {
      await storage.createAdminAuditLog({
        adminId: admin.id,
        targetUserId: targetUserId ?? null,
        action,
        details: details ?? null,
      });
    } catch (error) {
      routesLogger.warn("Failed to record admin audit log", { error: (error as Error).message });
    }
  }

  // 入力検証ミドルウェアをAPIに適用
  app.use("/api", validateInput);

  app.post("/api/login", apiRateLimiters.login, async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: "ユーザー名とパスワードを入力してください" });
      }
      const normalizedUsername = String(username).trim();
      const player = await storage.getPlayerByUsername(normalizedUsername);
      if (!player || player.passwordPlain !== password) {
        return res.status(401).json({ error: "ユーザー名またはパスワードが違います" });
      }
      if (player.suspended) {
        return res.status(403).json({ error: "アカウントが停止されています" });
      }
      req.session.userId = player.id;
      res.json({ player: sanitizePlayer(player) });
    } catch (error) {
      routesLogger.error("Login failed", { error });
      res.status(500).json({ error: "ログインに失敗しました" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        routesLogger.error("Logout failed", { error: err });
        return res.status(500).json({ error: "ログアウトに失敗しました" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/me", (req, res) => {
    if (!req.user) {
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, player: sanitizePlayer(req.user) });
  });

  app.use("/api", (req, res, next) => {
    const publicPaths = ["/login", "/logout", "/me"];
    if (publicPaths.includes(req.path)) {
      return next();
    }
    if (!req.user) {
      return res.status(401).json({ error: "ログインが必要です" });
    }
    if (req.user.suspended) {
      return res.status(403).json({ error: "アカウントが停止されています" });
    }
    next();
  });
  
  // ============ Image Generation ============
  app.post("/api/generate-image", apiRateLimiters.aiGeneration, async (req, res) => {
    try {
      const { prompt, type } = req.body;
      
      if (!prompt || !type) {
        return res.status(400).json({ error: "プロンプトとタイプは必須です" });
      }
      
      const validTypes = ["monster", "training", "master", "assassin", "boss", "story"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "無効なタイプです。次のいずれかを指定してください: " + validTypes.join(", ") });
      }
      
      const player = req.user!;
      const imageUrl = await generateImage(prompt, type, {
        playerId: player?.id,
      });
      
      if (!imageUrl) {
        return res.status(500).json({ error: "画像の生成に失敗しました" });
      }
      
      res.json({ imageUrl });
    } catch (error) {
      routesLogger.error("Error generating image:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // ============ Player ============
  app.get("/api/player", async (req, res) => {
    try {
      const player = req.user!;
      res.json(sanitizePlayer(player));
    } catch (error) {
      routesLogger.error("Error fetching player:", error);
      res.status(500).json({ error: "プレイヤー情報の取得に失敗しました" });
    }
  });

  app.patch("/api/player/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const requester = req.user!;
      if (requester.role !== "admin" && requester.id !== id) {
        return res.status(403).json({ error: "自分のアカウント以外は更新できません" });
      }
      const updates = req.body;
      const player = await storage.updatePlayer(id, updates);
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      res.json(sanitizePlayer(player));
    } catch (error) {
      routesLogger.error("Error updating player:", error);
      res.status(500).json({ error: "プレイヤー情報の更新に失敗しました" });
    }
  });

  app.post("/api/player/change-password", async (req, res) => {
    try {
      const player = req.user!;
      const { currentPassword, newPassword } = req.body || {};

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "現在のパスワードと新しいパスワードを入力してください" });
      }

      if (player.passwordPlain !== currentPassword) {
        return res.status(400).json({ error: "現在のパスワードが一致しません" });
      }

      if (typeof newPassword !== "string" || newPassword.length < 4) {
        return res.status(400).json({ error: "新しいパスワードは4文字以上で入力してください" });
      }

      const updatedPlayer = await storage.updatePlayer(player.id, { passwordPlain: newPassword });
      if (!updatedPlayer) {
        return res.status(500).json({ error: "パスワードの更新に失敗しました" });
      }

      req.user = updatedPlayer;
      res.json({ success: true });
    } catch (error) {
      routesLogger.error("Error changing password:", error);
      res.status(500).json({ error: "パスワードの変更に失敗しました" });
    }
  });

  // ============ Admin ============
  app.get("/api/admin/users", adminOnly, apiRateLimiters.admin, async (_req, res) => {
    try {
      const players = await storage.listPlayers();
      res.json({ users: players.map(mapAdminUser) });
    } catch (error) {
      routesLogger.error("Failed to fetch admin user list", { error });
      res.status(500).json({ error: "ユーザー一覧の取得に失敗しました" });
    }
  });

  app.get("/api/admin/summary", adminOnly, async (_req, res) => {
    try {
      const players = await storage.listPlayers();
      const totalUsers = players.length;
      const suspendedUsers = players.filter((player) => player.suspended).length;
      const totalMonthlyCost = players.reduce(
        (sum, player) => sum + Number(player.monthlyApiCost ?? 0),
        0,
      );
      const totalMonthlyCalls = players.reduce(
        (sum, player) => sum + Number(player.monthlyApiCalls ?? 0),
        0,
      );
      res.json({
        totalUsers,
        suspendedUsers,
        totalMonthlyCost,
        totalMonthlyCalls,
      });
    } catch (error) {
      routesLogger.error("Failed to fetch admin summary", { error });
      res.status(500).json({ error: "サマリーの取得に失敗しました" });
    }
  });

  app.get("/api/admin/logs", adminOnly, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 200, 500);
      const format = typeof req.query.format === "string" ? req.query.format : undefined;
      const logs = await storage.listAdminAuditLogs(limit);

      const playerCache = new Map<string, Player | undefined>();
      const getPlayer = async (id?: string | null) => {
        if (!id) return undefined;
        if (playerCache.has(id)) return playerCache.get(id);
        const player = await storage.getPlayer(id);
        playerCache.set(id, player);
        return player;
      };

      const decorated: Array<
        AdminAuditLog & {
          admin?: { id: string; name: string; username: string };
          targetUser?: { id: string; name: string; username: string };
        }
      > = [];

      for (const log of logs) {
        const admin = await getPlayer(log.adminId || null);
        const targetUser = await getPlayer(log.targetUserId || null);
        decorated.push({
          ...log,
          details: typeof log.details === "string" ? JSON.parse(log.details) : log.details,
          admin: admin ? { id: admin.id, name: admin.name, username: admin.username } : undefined,
          targetUser: targetUser ? { id: targetUser.id, name: targetUser.name, username: targetUser.username } : undefined,
        });
      }

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=\"admin-audit-${Date.now()}.csv\"`);
        const header = ["timestamp", "action", "admin_name", "admin_username", "target_name", "target_username", "details"];
        const lines = [header.join(",")];
        for (const log of decorated) {
          const row = [
            new Date(log.createdAt || "").toISOString(),
            log.action,
            log.admin?.name || "",
            log.admin?.username || "",
            log.targetUser?.name || "",
            log.targetUser?.username || "",
            JSON.stringify(log.details || {})?.replace(/"/g, '""'),
          ];
          lines.push(row.map((value) => `"${value ?? ""}"`).join(","));
        }
        return res.send(lines.join("\n"));
      }

      res.json({ logs: decorated });
    } catch (error) {
      routesLogger.error("Failed to fetch audit logs", { error });
      res.status(500).json({ error: "監査ログの取得に失敗しました" });
    }
  });

  app.post("/api/admin/users", adminOnly, apiRateLimiters.admin, async (req, res) => {
    try {
      const { username, password, role = "player", name } = req.body || {};
      const trimmedUsername = typeof username === "string" ? username.trim() : "";
      if (!trimmedUsername || typeof password !== "string" || password.length < 4) {
        return res.status(400).json({ error: "ユーザー名とパスワードは必須です（4文字以上）" });
      }
      if (!["player", "admin"].includes(role)) {
        return res.status(400).json({ error: "アカウント種別が不正です" });
      }

      const existing = await storage.getPlayerByUsername(trimmedUsername);
      if (existing) {
        return res.status(409).json({ error: "同じユーザー名が既に存在します" });
      }

      const created = await storage.createPlayer({
        name: name?.trim() || trimmedUsername,
        username: trimmedUsername,
        passwordPlain: password,
        role,
        suspended: false,
      });
      await recordAdminAudit(req.user!, "create_user", created.id, { username: trimmedUsername, role });
      res.status(201).json({ user: mapAdminUser(created) });
    } catch (error) {
      routesLogger.error("Failed to create admin user", { error });
      res.status(500).json({ error: "ユーザーの追加に失敗しました" });
    }
  });

  app.post("/api/admin/users/:id/suspend", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updatePlayer(id, { suspended: true });
      if (!updated) {
        return res.status(404).json({ error: "対象ユーザーが見つかりません" });
      }
      await recordAdminAudit(req.user!, "suspend_user", id, { username: updated.username });
      res.json({ user: mapAdminUser(updated) });
    } catch (error) {
      routesLogger.error("Failed to suspend user", { error });
      res.status(500).json({ error: "ユーザーの停止に失敗しました" });
    }
  });

  app.post("/api/admin/users/:id/resume", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updatePlayer(id, { suspended: false });
      if (!updated) {
        return res.status(404).json({ error: "対象ユーザーが見つかりません" });
      }
      await recordAdminAudit(req.user!, "resume_user", id, { username: updated.username });
      res.json({ user: mapAdminUser(updated) });
    } catch (error) {
      routesLogger.error("Failed to resume user", { error });
      res.status(500).json({ error: "ユーザーの停止解除に失敗しました" });
    }
  });

  app.post("/api/admin/users/:id/reset-password", adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const newPassword = generateTempPassword();
      const updated = await storage.updatePlayer(id, { passwordPlain: newPassword });
      if (!updated) {
        return res.status(404).json({ error: "対象ユーザーが見つかりません" });
      }
      await recordAdminAudit(req.user!, "reset_password", id, { username: updated.username });
      res.json({ user: mapAdminUser(updated), newPassword });
    } catch (error) {
      routesLogger.error("Failed to reset password", { error });
      res.status(500).json({ error: "パスワードリセットに失敗しました" });
    }
  });

  // ============ Player Settings ============
  // Test endpoint to verify settings route is working
  app.get("/api/player/settings/test", async (req, res) => {
    res.json({ message: "Settings test endpoint working" });
  });

  // New endpoint with different name to test
  console.log("Registering PATCH /api/player/update-ai-strictness")
  app.patch("/api/player/update-ai-strictness", async (req, res) => {
    console.log("=== HANDLER EXECUTED ===");
    try {
      const { aiStrictness } = req.body;
      console.log("PATCH /api/player/update-ai-strictness called with:", { aiStrictness });
      routesLogger.info("AI strictness update request:", { aiStrictness });

      const validStrictnessLevels = ["very_lenient", "lenient", "balanced", "strict", "very_strict"];
      if (aiStrictness && !validStrictnessLevels.includes(aiStrictness)) {
        return res.status(400).json({ error: "無効なAI審査レベルです" });
      }

      const player = req.user!;
      const updatedPlayer = await storage.updatePlayer(player.id, { aiStrictness });
      if (!updatedPlayer) {
        return res.status(404).json({ error: "プレイヤーの更新に失敗しました" });
      }

      res.json(toPublicPlayer(updatedPlayer));
    } catch (error) {
      console.error("Error updating AI strictness:", error);
      routesLogger.error("Error updating AI strictness:", error);
      res.status(500).json({ error: "設定の更新に失敗しました" });
    }
  });

  // Simple test endpoint that should definitely work
  app.post("/api/test-ai-update", async (req, res) => {
    console.log("POST /api/test-ai-update called!");
    const { strictness } = req.body;
    console.log("Received strictness:", strictness);
    
    // Hard-code the player ID for testing
    const PLAYER_ID = "d5a67321-e1bb-4b01-a62f-c7573d5b0c89";
    
    try {
      const player = await storage.getPlayer(PLAYER_ID);
      if (!player) {
        return res.status(404).json({ error: "Player not found with ID: " + PLAYER_ID });
      }
      
      const updated = await storage.updatePlayer(PLAYER_ID, { aiStrictness: strictness });
      res.json({ success: true, player: updated });
    } catch (error) {
      console.error("Error in test endpoint:", error);
      res.status(500).json({ error: "Failed to update" });
    }
  });

  // Keep the original endpoint but mark it as deprecated
  app.patch("/api/player/settings", async (req, res) => {
    console.log("WARNING: Using deprecated /api/player/settings endpoint");
    // Forward to the new endpoint handler
    return res.status(404).json({ error: "このエンドポイントは廃止されました。/api/player/update-ai-strictnessを使用してください" });
  });

  // ============ Job Change ============
  app.post("/api/player/change-job", async (req, res) => {
    try {
      const { jobId } = req.body;
      
      if (!jobId) {
        return res.status(400).json({ error: "職業IDは必須です" });
      }
      
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      
      // Check if changing to the same job
      if (player.job === jobId) {
        return res.status(400).json({ error: "既にこの職業に就いています" });
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
      routesLogger.error("Error changing job:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // Note: Removed duplicate /api/player/settings handler - using the one defined earlier

  // ============ Tsutome (務メ) ============
  app.get("/api/tsutomes", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      const tsutomes = await storage.getAllTsutomes(player.id);
      
      // Enrich tsutomes with linked source information
      const now = new Date();
      const enrichedTsutomes = await Promise.all(
        tsutomes.map(async (tsutome) => {
          let linkSource: LinkSource | null = null;
          let rewardBonus = 0;

          if (tsutome.linkedShurenId) {
            const shuren = await storage.getShuren(tsutome.linkedShurenId);
            if (shuren) {
              const shurenBonus = calculateShurenBonus(shuren.continuousDays, shuren.totalDays);
              rewardBonus = shurenBonus.total;
              linkSource = {
                type: "shuren",
                id: shuren.id,
                name: shuren.trainingName,
                title: shuren.title,
                continuousDays: shuren.continuousDays,
                totalDays: shuren.totalDays,
                bonus: Math.round(shurenBonus.total * 100),
                breakdown: shurenBonus.breakdown,
              };
            }
          } else if (tsutome.linkedShihanId) {
            const shihan = await storage.getShihan(tsutome.linkedShihanId);
            if (shihan) {
              const shihanTsutomes = await storage.getTsutomesByShihanId(shihan.id);
              const completedCount = shihanTsutomes.filter((t) => t.completed).length;
              const totalCount = shihanTsutomes.length || 1;
              const progressRatio = completedCount / totalCount;
              const progressPercent = Math.floor(progressRatio * 100);
              const daysUntilTarget = shihan.targetDate
                ? Math.ceil((new Date(shihan.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : undefined;
              const shihanBonus = calculateShihanBonus(progressRatio, daysUntilTarget);
              rewardBonus = shihanBonus.total;

              routesLogger.debug(`Shihan bonus calculation for task ${tsutome.id}:`, {
                shihanId: shihan.id,
                shihanName: shihan.masterName,
                progress: `${progressPercent}% (${completedCount}/${totalCount} completed)`,
                bonusPercentage: `${Math.round(shihanBonus.total * 100)}%`,
                rewardBonus,
              });

              linkSource = {
                type: "shihan",
                id: shihan.id,
                name: shihan.masterName,
                title: shihan.title,
                progress: progressPercent,
                bonus: Math.round(shihanBonus.total * 100),
                breakdown: shihanBonus.breakdown,
              } as LinkSource;
            }
          }

          return {
            ...tsutome,
            linkSource,
            rewardBonus,
          };
        })
      );

      res.json(enrichedTsutomes);
    } catch (error) {
      routesLogger.error("Error fetching tsutomes:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.post("/api/tsutomes", apiRateLimiters.taskCreation, async (req, res) => {
    routesLogger.debug("POST /api/tsutomes - Request received");
    try {
      const player = req.user!;
      if (!player) {
        routesLogger.debug("POST /api/tsutomes - Player not found");
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }

      routesLogger.debug("POST /api/tsutomes - Player found:", player.id);

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
        routesLogger.debug("POST /api/tsutomes - Validation failed:", validation.error);
        return res.status(400).json({ error: "入力が無効です", details: validation.error });
      }

      const validatedData = validation.data;
      routesLogger.debug("POST /api/tsutomes - Data validated, difficulty:", validatedData.difficulty);

      // 1年より先の期限は登録不可
      const now = new Date();
      const oneYearLater = new Date(now);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      if (validatedData.deadline > oneYearLater) {
        return res.status(400).json({ error: "期限は1年以内に設定してください" });
      }

      // AI判定: 難易度（提供されていない場合、または"auto"が指定された場合）
      let finalDifficulty = validatedData.difficulty;
      if (!finalDifficulty || finalDifficulty === "auto") {
        routesLogger.debug(`POST /api/tsutomes - Auto-assessing difficulty for task: ${validatedData.title}`);
        try {
          routesLogger.debug("POST /api/tsutomes - Loading AI module...");
          const { assessTaskDifficulty } = await import("./ai");
          routesLogger.debug("POST /api/tsutomes - Calling AI assessment...");
          const aiDifficulty = await assessTaskDifficulty(
            validatedData.title,
            undefined, // descriptionフィールドは存在しない
            validatedData.genre,
            { playerId: player.id }
          );
          routesLogger.debug(`POST /api/tsutomes - AI assessed difficulty: ${aiDifficulty}`);
          
          // AI結果をDBのenumにマッピング
          const difficultyMap: Record<string, string> = {
            "easy": "easy",
            "medium": "normal",
            "hard": "hard",
            "legendary": "extreme"
          };
          finalDifficulty = difficultyMap[aiDifficulty] || "normal";
          routesLogger.debug(`POST /api/tsutomes - Mapped to DB enum: ${finalDifficulty}`);
        } catch (aiError) {
          routesLogger.error("AI難易度判定エラー:", aiError);
          // AIエラーの場合はデフォルト難易度を設定し、警告を返す
          finalDifficulty = "normal";
          res.locals.aiDifficultyError = "AI難易度判定に失敗したため、通常難易度で設定しました";
        }
      }

      // AI生成: 妖怪名
      const monsterName = await generateMonsterName(validatedData.title, validatedData.genre, finalDifficulty, { playerId: player.id });

      // AI生成: 妖怪画像（オプション、時間がかかる場合はスキップ可能）
      let monsterImageUrl = "";
      let imageGenerationWarning = false;
      
      try {
        monsterImageUrl = await generateImage(
          `${monsterName}, ${validatedData.genre} themed yokai monster`,
          "monster",
          { playerId: player.id }
        );
        
        // 空文字列が返ってきた場合は画像生成が失敗
        if (!monsterImageUrl) {
          imageGenerationWarning = true;
          routesLogger.warn("妖怪画像の生成に失敗しました。タスクは作成されますが画像なしで保存されます。");
        }
      } catch (error) {
        routesLogger.error("妖怪画像生成エラー:", error);
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
      routesLogger.error("Error creating tsutome:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.patch("/api/tsutomes/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const { completionReport } = req.body; // 完了報告を受け取る
      
      const tsutome = await storage.getTsutome(id);
      if (!tsutome) {
        return res.status(404).json({ error: "務メが見つかりません" });
      }

      // 既に完了済みまたはキャンセル済みのチェック
      if (tsutome.completed) {
        return res.status(400).json({ error: "タスクは既に完了しています" });
      }
      if (tsutome.cancelled) {
        return res.status(400).json({ error: "タスクはキャンセルされています" });
      }

      const player = await storage.getPlayer(tsutome.playerId);
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }

      // AI審査を実行（完了報告がある場合）
      let aiVerificationResult = {
        approved: true,
        feedback: "自動承認",
        bonusMultiplier: 1.0
      };

      if (completionReport && completionReport.trim()) {
        routesLogger.debug(`AI verification for task ${id}: Starting...`);
        
        try {
          const { verifyTaskCompletionAdvanced } = await import("./ai");
          
          // プレイヤーのAI審査レベルを渡す
          const aiStrictness = (player as any).aiStrictness || "lenient";
          
          aiVerificationResult = await verifyTaskCompletionAdvanced(
            tsutome.title,
            null, // tsutomeテーブルにdescriptionフィールドはない
            completionReport,
            tsutome.monsterName || "妖怪",
            tsutome.difficulty,
            aiStrictness
          );
          
          routesLogger.debug(`AI verification result for task ${id}:`, aiVerificationResult);
          
          // 審査に不合格の場合
          if (!aiVerificationResult.approved) {
            return res.status(400).json({
              error: "タスク完了が承認されませんでした",
              feedback: aiVerificationResult.feedback,
              requiresRevision: true
            });
          }
        } catch (aiError) {
          routesLogger.error("AI審査エラー:", aiError);
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
              exp: 15 + Math.floor(Math.random() * 11), // 15-25 (増加)
              coins: 25 + Math.floor(Math.random() * 16), // 25-40
            };
          case "normal":
            return {
              exp: 35 + Math.floor(Math.random() * 21), // 35-55 (微増)
              coins: 60 + Math.floor(Math.random() * 41), // 60-100
            };
          case "hard":
            return {
              exp: 65 + Math.floor(Math.random() * 31), // 65-95 (微減)
              coins: 130 + Math.floor(Math.random() * 61), // 130-190
            };
          case "veryHard":
            return {
              exp: 95 + Math.floor(Math.random() * 41), // 95-135 (微減)
              coins: 190 + Math.floor(Math.random() * 91), // 190-280
            };
          case "extreme":
            return {
              exp: 130 + Math.floor(Math.random() * 51), // 130-180 (減少)
              coins: 280 + Math.floor(Math.random() * 101), // 280-380
            };
          default:
            return {
              exp: 35 + Math.floor(Math.random() * 21), // default to normal
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
          const shuren = await storage.getShuren(tsutome.linkedShurenId);
          if (shuren) {
            const shurenBonus = calculateShurenBonus(shuren.continuousDays, shuren.totalDays);
            linkBonusMultiplier = 1 + shurenBonus.total;

            bonusInfo = {
              type: "shuren",
              name: shuren.trainingName,
              title: shuren.title,
              bonus: Math.round(shurenBonus.total * 100),
              continuousDays: shuren.continuousDays,
              totalDays: shuren.totalDays,
              breakdown: shurenBonus.breakdown,
            };
          }
        } else if (tsutome.linkedShihanId) {
          const shihan = await storage.getShihan(tsutome.linkedShihanId);
          if (shihan) {
            const shihanTsutomes = await storage.getTsutomesByShihanId(shihan.id);
            const completedCount = shihanTsutomes.filter((t) => t.completed).length;
            const totalCount = shihanTsutomes.length || 1;
            const progressRatio = completedCount / totalCount;
            const progress = Math.floor(progressRatio * 100);
            const nowForBonus = new Date();
            const daysUntilTarget = shihan.targetDate
              ? Math.ceil((new Date(shihan.targetDate).getTime() - nowForBonus.getTime()) / DAY_IN_MS)
              : undefined;
            const shihanBonus = calculateShihanBonus(progressRatio, daysUntilTarget);
            linkBonusMultiplier = 1 + shihanBonus.total;

            routesLogger.debug(`Task completion - Shihan bonus for task ${tsutome.id}:`, {
              shihanId: shihan.id,
              shihanName: shihan.masterName,
              progress: `${progress}% (${completedCount}/${totalCount} completed)`,
              bonusPercentage: `${Math.round(shihanBonus.total * 100)}%`,
              linkBonusMultiplier,
              baseRewards: { exp: expGain, coins: coinsGain },
            });

            bonusInfo = {
              type: "shihan",
              name: shihan.masterName,
              title: shihan.title,
              bonus: Math.round(shihanBonus.total * 100),
              progress: progress,
              breakdown: shihanBonus.breakdown,
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

      // レベルアップ処理（改善された計算式）
      // レベル1-10: 100 * level
      // レベル11-20: 150 * level
      // レベル21-30: 200 * level
      // レベル31+: 250 * level
      const getExpToNext = (level: number) => {
        if (level <= 10) return level * 100;
        if (level <= 20) return level * 150;
        if (level <= 30) return level * 200;
        return level * 250;
      };
      
      while (remainingExp >= getExpToNext(newLevel)) {
        remainingExp -= getExpToNext(newLevel);
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
            const inventoryItems: Array<Omit<InsertInventory, "id" | "createdAt">> = prepareInventoryItems(itemDrops, player.id);
            
            // 各アイテムをインベントリに追加
            // ドロップアイテムをインベントリに追加
            for (const invItem of inventoryItems) {
              const qty = invItem.quantity ?? 1;
              // 既存のアイテムがあるか確認
              const existingInventory = await storage.getPlayerInventory(player.id);
              const existing = existingInventory.find(inv => inv.itemId === invItem.itemId && !inv.equipped);
              
              if (existing) {
                // 既存のアイテムに数量を追加
                await storage.updateInventory(existing.id, {
                  quantity: existing.quantity + qty,
                });
              } else {
                // 新規アイテムとして追加
                await storage.addToInventory({ ...invItem, quantity: qty });
              }
            }
            
            // ドロップ履歴を記録
            for (const drop of itemDrops) {
              await storage.recordDropHistory({
                playerId: player.id,
                itemId: drop.item.id,
                tsutomeId: id,
                quantity: drop.quantity,
                rarity: drop.item.rarity || 'common',
                isBonus: drop.isBonus || false,
              });
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
            
            routesLogger.debug(`Task ${id} completion drops:`, drops);
          }
        }
      } catch (dropError) {
        routesLogger.error("Drop processing error:", dropError);
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
      routesLogger.error("Error completing tsutome:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.delete("/api/tsutomes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTsutome(id);
      if (!deleted) {
        return res.status(404).json({ error: "務メが見つかりません" });
      }
      res.status(204).send();
    } catch (error) {
      routesLogger.error("Error deleting tsutome:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // ============ Tsutome Cancel (ペナルティ付きキャンセル) ============
  app.post("/api/tsutomes/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const tsutome = await storage.getTsutome(id);
      if (!tsutome) {
        return res.status(404).json({ error: "務メが見つかりません" });
      }
      if (tsutome.completed || tsutome.cancelled) {
        return res.status(400).json({ error: "すでに完了済みまたはキャンセル済みです" });
      }

      const player = await storage.getPlayer(tsutome.playerId);
      if (player) {
        const penaltyHp = Math.min(player.hp, 20);
        const penaltyCoins = Math.min(player.coins, 100);
        const penaltyExp = Math.min(player.exp, 50);
        await storage.updatePlayer(player.id, {
          hp: player.hp - penaltyHp,
          coins: player.coins - penaltyCoins,
          exp: player.exp - penaltyExp,
        });
      }

      const updated = await storage.updateTsutome(id, { cancelled: true, completed: false, completedAt: null });
      res.json({ tsutome: updated, penalties: true });
    } catch (error) {
      routesLogger.error("Error cancelling tsutome:", error);
      res.status(500).json({ error: "キャンセル処理でエラーが発生しました" });
    }
  });

  // ============ Shuren (修練) ============
  app.get("/api/shurens", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      const shurens = await storage.getAllShurens(player.id);
      res.json(shurens);
    } catch (error) {
      routesLogger.error("Error fetching shurens:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.post("/api/shurens", apiRateLimiters.taskCreation, async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }

      // 日付文字列をDateオブジェクトに変換
      const data = {
        ...req.body,
        startDate: new Date(req.body.startDate),
      };

      const validation = insertShurenSchema.safeParse(data);
      if (!validation.success) {
        return res.status(400).json({ error: "入力が無効です", details: validation.error });
      }

      const validatedData = validation.data;
      if (validatedData.repeatInterval > 30) {
        return res.status(400).json({ error: "繰り返し間隔は30日以内にしてください" });
      }

      // AI生成: 修練名
      const trainingName = await generateTrainingName(validatedData.title, validatedData.genre, { playerId: player.id });

      // AI生成: 修練画像（オプション）
      let trainingImageUrl = "";
      let imageGenerationWarning = false;
      
      try {
        trainingImageUrl = await generateImage(
          `${trainingName}, ${validatedData.genre} martial arts training`,
          "training",
          { playerId: player.id }
        );
        
        // 空文字列が返ってきた場合は画像生成が失敗
        if (!trainingImageUrl) {
          imageGenerationWarning = true;
          routesLogger.warn("修練画像の生成に失敗しました。修練は作成されますが画像なしで保存されます。");
        }
      } catch (error) {
        routesLogger.error("修練画像生成エラー:", error);
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
      routesLogger.error("Error creating shuren:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.patch("/api/shurens/:id/record", async (req, res) => {
    try {
      const { id } = req.params;
      const { dataValue } = req.body; // 記録データ

      const shuren = await storage.getShuren(id);
      if (!shuren) {
        return res.status(404).json({ error: "修練が見つかりません" });
      }

      const player = await storage.getPlayer(shuren.playerId);
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
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

      // 報酬（連続ボーナス強化）
      // 基礎報酬 + 連続日数ボーナス（段階的に増加）
      let continuousBonus = 0;
      if (newContinuousDays >= 30) {
        continuousBonus = 50; // 30日以上: +50 XP
      } else if (newContinuousDays >= 14) {
        continuousBonus = 30; // 14日以上: +30 XP
      } else if (newContinuousDays >= 7) {
        continuousBonus = 15; // 7日以上: +15 XP
      } else if (newContinuousDays >= 3) {
        continuousBonus = 5;  // 3日以上: +5 XP
      }
      
      const expGain = 30 + continuousBonus + Math.floor(newContinuousDays * 2);
      const coinsGain = 20 + Math.floor(newContinuousDays * 3);

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
      routesLogger.error("Error recording shuren:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // ============ Shihan (師範 - Long-term goals) ============
  app.get("/api/shihans", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      const shihans = await storage.getAllShihans(player.id);
      res.json(shihans);
    } catch (error) {
      routesLogger.error("Error fetching shihans:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.post("/api/shihans", apiRateLimiters.taskCreation, async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }

      // 日付文字列をDateオブジェクトに変換
      const data = {
        ...req.body,
        targetDate: new Date(req.body.targetDate),
        startDate: new Date(req.body.startDate),
      };

      const validation = insertShihanSchema.safeParse(data);
      if (!validation.success) {
        return res.status(400).json({ error: "入力が無効です", details: validation.error });
      }

      const validatedData = validation.data;

      // AI生成: 師範名
      const masterName = await generateMasterName(validatedData.title, validatedData.genre, { playerId: player.id });

      // AI生成: 師範画像（オプション）
      let masterImageUrl = "";
      let imageGenerationWarning = false;
      
      try {
        masterImageUrl = await generateImage(
          `${masterName}, wise Japanese martial arts master, ${validatedData.genre} specialist`,
          "master",
          { playerId: player.id }
        );
        
        // 空文字列が返ってきた場合は画像生成が失敗
        if (!masterImageUrl) {
          imageGenerationWarning = true;
          routesLogger.warn("師範画像の生成に失敗しました。師範は作成されますが画像なしで保存されます。");
        }
      } catch (error) {
        routesLogger.error("師範画像生成エラー:", error);
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
      routesLogger.error("Error creating shihan:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.patch("/api/shihans/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const shihan = await storage.getShihan(id);
      if (!shihan) {
        return res.status(404).json({ error: "師範が見つかりません" });
      }

      if (shihan.completed) {
        return res.status(400).json({ error: "目標は既に達成されています" });
      }

      const player = await storage.getPlayer(shihan.playerId);
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
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
      routesLogger.error("Error completing shihan:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // ============ Task Linking System (連携システム) ============
  
  // 師範から務メを生成
  app.post("/api/shihans/:id/generate-tsutome", async (req, res) => {
    try {
      const { id } = req.params;
      routesLogger.debug("Generating tsutome for shihan:", id);
      
      const shihan = await storage.getShihan(id);
      if (!shihan) {
        routesLogger.error("Shihan not found:", id);
        return res.status(404).json({ error: "師範が見つかりません" });
      }

      const player = req.user!;
      if (!player) {
        routesLogger.error("Player not found");
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }

      const { title, deadline, difficulty = "normal" } = req.body;
      routesLogger.debug("Request body:", { title, deadline, difficulty });
      
      // Validate required fields
      if (!title || !deadline) {
        routesLogger.error("Missing required fields:", { title, deadline });
        return res.status(400).json({ 
          error: "タイトルと期限は必須です",
          message: "タイトルと期限を入力してください" 
        });
      }
      
      // AI生成: モンスター名
      const monsterName = await generateMonsterName(title, shihan.genre, difficulty, { playerId: player.id });
      
      // AI生成: モンスター画像（オプション）
      let monsterImageUrl = "";
      try {
        monsterImageUrl = await generateImage(
          `${monsterName}, Japanese yokai monster, ${difficulty} difficulty`,
          "monster",
          { playerId: player.id }
        );
      } catch (error) {
        routesLogger.error("Monster image generation error:", error);
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

      routesLogger.debug(`Generated tsutome from shihan:`, {
        tsutomeId: tsutome.id,
        shihanId: shihan.id,
        shihanName: shihan.masterName,
        fixedBonus: "20%",
        rewardBonus: 0.2,
        linkSource: enrichedTsutome.linkSource,
      });

      res.status(201).json(enrichedTsutome);
    } catch (error) {
      routesLogger.error("Error generating tsutome from shihan:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // 修練から務メを生成
  app.post("/api/shurens/:id/generate-tsutome", async (req, res) => {
    try {
      const { id } = req.params;
      routesLogger.debug("Generating tsutome for shuren:", id);
      
      const shuren = await storage.getShuren(id);
      if (!shuren) {
        routesLogger.error("Shuren not found:", id);
        return res.status(404).json({ error: "修練が見つかりません" });
      }

      const player = req.user!;
      if (!player) {
        routesLogger.error("Player not found");
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
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
      const monsterName = await generateMonsterName(shuren.title, shuren.genre, "normal", { playerId: player.id });
      
      // AI生成: モンスター画像（オプション）
      let monsterImageUrl = "";
      try {
        monsterImageUrl = await generateImage(
          `${monsterName}, training yokai spirit, daily practice`,
          "monster",
          { playerId: player.id }
        );
      } catch (error) {
        routesLogger.error("Monster image generation error:", error);
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
      routesLogger.error("Error generating tsutome from shuren:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
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
        return res.status(400).json({ error: "無効なタイプです。'shihan'または'shuren'を指定してください" });
      }

      res.json(tsutomes);
    } catch (error) {
      routesLogger.error("Error fetching linked tsutomes:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // 師範の進捗状況取得
  app.get("/api/shihans/:id/progress", async (req, res) => {
    try {
      const { id } = req.params;
      const shihan = await storage.getShihan(id);
      if (!shihan) {
        return res.status(404).json({ error: "師範が見つかりません" });
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
      routesLogger.error("Error fetching shihan progress:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // ============ Shikaku (刺客 - Urgent tasks) ============
  app.get("/api/shikakus", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      const shikakus = await storage.getAllShikakus(player.id);
      res.json(shikakus);
    } catch (error) {
      routesLogger.error("Error fetching shikakus:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.post("/api/shikakus", apiRateLimiters.taskCreation, async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }

      const validation = insertShikakuSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "入力が無効です", details: validation.error });
      }

      const validatedData = validation.data;

      // AI生成: 刺客名
      const assassinName = await generateAssassinName(validatedData.title, validatedData.difficulty, { playerId: player.id });

      // AI生成: 刺客画像（オプション）
      let assassinImageUrl = "";
      let imageGenerationWarning = false;
      
      try {
        assassinImageUrl = await generateImage(
          `${assassinName}, mysterious Japanese ninja assassin, ${validatedData.difficulty} level threat`,
          "assassin",
          { playerId: player.id }
        );
        
        // 空文字列が返ってきた場合は画像生成が失敗
        if (!assassinImageUrl) {
          imageGenerationWarning = true;
          routesLogger.warn("刺客画像の生成に失敗しました。刺客は作成されますが画像なしで保存されます。");
        }
      } catch (error) {
        routesLogger.error("刺客画像生成エラー:", error);
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
      routesLogger.error("Error creating shikaku:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.patch("/api/shikakus/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const shikaku = await storage.getShikaku(id);
      if (!shikaku) {
        return res.status(404).json({ error: "刺客が見つかりません" });
      }

      if (shikaku.completed) {
        return res.status(400).json({ error: "タスクは既に完了しています" });
      }

      // 期限切れチェック
      if (new Date() > new Date(shikaku.expiresAt)) {
        return res.status(400).json({ error: "タスクは期限切れです" });
      }

      const player = await storage.getPlayer(shikaku.playerId);
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
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
      routesLogger.error("Error completing shikaku:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // ============ Boss ============
  app.get("/api/boss/current", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }

      let boss = await storage.getCurrentBoss(player.id);

      // ボスが存在しない場合は新規作成
      if (!boss) {
        const bossNumber = 1;
        const bossName = await generateBossName(bossNumber, { playerId: player.id });
        const bossImageUrl = await generateImage(
          `${bossName}, epic demon boss`,
          "boss",
          { playerId: player.id }
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
      routesLogger.error("Error fetching boss:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.post("/api/boss/:id/attack", async (req, res) => {
    try {
      const { id } = req.params;
      const boss = await storage.getBoss(id);
      if (!boss) {
        return res.status(404).json({ error: "ボスが見つかりません" });
      }

      const player = await storage.getPlayer(boss.playerId);
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }

      // 1日1回制限チェック
      const today = new Date().toDateString();
      const lastAttack = boss.lastAttackDate ? new Date(boss.lastAttackDate).toDateString() : null;
      if (lastAttack === today) {
        return res.status(400).json({ error: "今日はすでに攻撃しました" });
      }

      // 装備ボーナスを考慮
      const equipBonus = await getEquipmentBonus(player.id);
      const effectiveStrength = player.strength + equipBonus.strength;
      const effectiveVitality = player.vitality + equipBonus.vitality;

      // ダメージ計算（攻撃）難易度スケーリングを軽く乗せる
      const difficultyScaler = Math.max(1, boss.bossNumber * 0.08 + 1);
      const damage = Math.max(1, Math.floor((effectiveStrength + player.level * 2) * 1.2 * difficultyScaler));
      const newBossHp = Math.max(0, boss.hp - damage);

      // プレイヤーダメージ（耐久を防御力として使用）
      const playerDamage = Math.max(1, Math.floor(boss.attackPower * 0.85) - Math.floor(effectiveVitality * 0.65));
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
        const storyText = await generateStoryText(boss.bossNumber, boss.bossName, { playerId: player.id });
        const storyImageUrl = await generateImage(
          `Epic battle victory scene, ${boss.bossName} defeated`,
          "story",
          { playerId: player.id }
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
        const nextBossName = await generateBossName(nextBossNumber, { playerId: player.id });
        const nextBossImageUrl = await generateImage(
          `${nextBossName}, epic demon boss`,
          "boss",
          { playerId: player.id }
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
      routesLogger.error("Error attacking boss:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // ============ Items & Shop ============
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      res.json(items);
    } catch (error) {
      routesLogger.error("Error fetching items:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.post("/api/items/:id/buy", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: "アイテムが見つかりません" });
      }

      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }

      if (player.coins < item.price) {
        return res.status(400).json({ error: "コインが不足しています" });
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
      routesLogger.error("Error buying item:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // ============ Stories ============
  app.get("/api/stories", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      const stories = await storage.getAllStories(player.id);
      res.json(stories);
    } catch (error) {
      routesLogger.error("Error fetching stories:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  app.patch("/api/stories/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      const story = await storage.getStory(id);
      if (!story) {
        return res.status(404).json({ error: "物語が見つかりません" });
      }

      const updatedStory = await storage.updateStory(id, { viewed: true });
      res.json(updatedStory);
    } catch (error) {
      routesLogger.error("Error marking story as viewed:", error);
      res.status(500).json({ error: "内部エラーが発生しました" });
    }
  });

  // ============ Cron/Periodic Processing ============
  // Manual trigger for daily reset (for testing)
  app.post("/api/cron/daily-reset", async (req, res) => {
    try {
      routesLogger.debug("[API] Manual trigger for daily reset requested");
      await triggerDailyReset();
      res.json({ 
        success: true, 
        message: "Daily reset triggered successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      routesLogger.error("Error triggering daily reset:", error);
      res.status(500).json({ 
        error: "Failed to trigger daily reset",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manual trigger for hourly check (for testing)
  app.post("/api/cron/hourly-check", async (req, res) => {
    try {
      routesLogger.debug("[API] Manual trigger for hourly check requested");
      await triggerHourlyCheck();
      res.json({ 
        success: true, 
        message: "Hourly check triggered successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      routesLogger.error("Error triggering hourly check:", error);
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
      routesLogger.error("Error fetching cron status:", error);
      res.status(500).json({ 
        error: "Failed to fetch cron status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Inventory routes
  app.get("/api/inventories", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
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
      routesLogger.error("Error fetching inventories:", error);
      res.status(500).json({ error: "インベントリの取得に失敗しました" });
    }
  });

  // Drop history and statistics routes
  app.get("/api/drop-history", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      
      const history = await storage.getPlayerDropHistory(player.id);
      
      // Enrich with item details
      const historyWithItems = await Promise.all(
        history.map(async (drop) => {
          const item = await storage.getItem(drop.itemId);
          return {
            ...drop,
            item
          };
        })
      );
      
      res.json(historyWithItems);
    } catch (error) {
      routesLogger.error("Error fetching drop history:", error);
      res.status(500).json({ error: "ドロップ履歴の取得に失敗しました" });
    }
  });

  app.get("/api/drop-statistics", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      
      const statistics = await storage.getDropStatistics(player.id);
      
      // Enrich most common items with item details
      const mostCommonWithItems = await Promise.all(
        statistics.mostCommon.map(async (entry: { itemId: string; count: number }) => {
          const item = await storage.getItem(entry.itemId);
          return {
            ...entry,
            item
          };
        })
      );
      
      // Enrich recent drops with item details
      const recentDropsWithItems = await Promise.all(
        statistics.recentDrops.map(async (drop: DropHistory) => {
          const item = await storage.getItem(drop.itemId);
          return {
            ...drop,
            item
          };
        })
      );
      
      res.json({
        ...statistics,
        mostCommon: mostCommonWithItems,
        recentDrops: recentDropsWithItems
      });
    } catch (error) {
      routesLogger.error("Error fetching drop statistics:", error);
      res.status(500).json({ error: "ドロップ統計の取得に失敗しました" });
    }
  });

  // Equipment routes
  app.get("/api/equipment", async (req, res) => {
    try {
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
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
      routesLogger.error("Error fetching equipment:", error);
      res.status(500).json({ error: "装備の取得に失敗しました" });
    }
  });

  app.post("/api/equipment/equip", async (req, res) => {
    try {
      const { itemId } = req.body;
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      
      // Get item details
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "アイテムが見つかりません" });
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
        return res.status(400).json({ error: "このアイテムは装備できません" });
      }
      
      await storage.equipItem(player.id, itemId, slot);
      const updatedPlayer = await storage.getPlayer(player.id);
      res.json({ success: true, player: updatedPlayer });
    } catch (error) {
      routesLogger.error("Error equipping item:", error);
      res.status(500).json({ error: "アイテムの装備に失敗しました" });
    }
  });

  app.post("/api/equipment/unequip", async (req, res) => {
    try {
      const { slot } = req.body;
      const player = req.user!;
      if (!player) {
        return res.status(404).json({ error: "プレイヤーが見つかりません" });
      }
      
      await storage.unequipItem(player.id, slot);
      const updatedPlayer = await storage.getPlayer(player.id);
      res.json({ success: true, player: updatedPlayer });
    } catch (error) {
      routesLogger.error("Error unequipping item:", error);
      res.status(500).json({ error: "アイテムの装備解除に失敗しました" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
