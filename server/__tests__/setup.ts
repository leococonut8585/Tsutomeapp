/**
 * テスト用セットアップファイル
 * 統合テストで使用する共通ユーティリティ
 */

import express, { type Express } from "express";
import session from "express-session";
import { MemStorage, type IStorage } from "../storage";
import type { Player, InsertPlayer } from "@shared/schema";

// テスト用のメモリストレージインスタンス
let testStorage: MemStorage;

/**
 * テスト用Expressアプリを作成
 */
export async function createTestApp(): Promise<{
  app: Express;
  storage: IStorage;
}> {
  testStorage = new MemStorage();
  
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // テスト用セッション設定（メモリストア）
  app.use(
    session({
      secret: "test-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60,
      },
    })
  );
  
  // セッションからユーザーを復元するミドルウェア
  app.use(async (req, _res, next) => {
    const userId = req.session.userId;
    if (!userId) {
      req.user = undefined;
      return next();
    }
    try {
      const player = await testStorage.getPlayer(userId);
      if (!player || player.suspended) {
        delete req.session.userId;
        req.user = undefined;
      } else {
        req.user = player;
      }
    } catch {
      req.user = undefined;
    }
    next();
  });
  
  return { app, storage: testStorage };
}

/**
 * テスト用のルートを登録
 */
export function registerTestRoutes(
  app: Express,
  storage: IStorage
) {
  // 認証不要のパブリックルート
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "ユーザー名とパスワードを入力してください" });
    }
    const player = await storage.getPlayerByUsername(String(username).trim());
    if (!player || player.passwordPlain !== password) {
      return res.status(401).json({ error: "ユーザー名またはパスワードが違います" });
    }
    if (player.suspended) {
      return res.status(403).json({ error: "アカウントが停止されています" });
    }
    req.session.userId = player.id;
    res.json({ player: sanitizePlayer(player) });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
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

  // 認証チェックミドルウェア
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

  // 管理者専用ミドルウェア
  const adminOnly: express.RequestHandler = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "管理者専用の操作です" });
    }
    next();
  };

  // 管理者API
  app.get("/api/admin/users", adminOnly, async (_req, res) => {
    const players = await storage.listPlayers();
    res.json({ users: players.map(mapAdminUser) });
  });

  app.get("/api/admin/summary", adminOnly, async (_req, res) => {
    const players = await storage.listPlayers();
    const totalUsers = players.length;
    const suspendedUsers = players.filter((p) => p.suspended).length;
    const totalMonthlyCost = players.reduce(
      (sum, p) => sum + Number(p.monthlyApiCost ?? 0),
      0
    );
    const totalMonthlyCalls = players.reduce(
      (sum, p) => sum + Number(p.monthlyApiCalls ?? 0),
      0
    );
    res.json({ totalUsers, suspendedUsers, totalMonthlyCost, totalMonthlyCalls });
  });

  app.post("/api/admin/users", adminOnly, async (req, res) => {
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
    res.status(201).json({ user: mapAdminUser(created) });
  });

  app.post("/api/admin/users/:id/suspend", adminOnly, async (req, res) => {
    const { id } = req.params;
    const updated = await storage.updatePlayer(id, { suspended: true });
    if (!updated) {
      return res.status(404).json({ error: "対象ユーザーが見つかりません" });
    }
    res.json({ user: mapAdminUser(updated) });
  });

  app.post("/api/admin/users/:id/resume", adminOnly, async (req, res) => {
    const { id } = req.params;
    const updated = await storage.updatePlayer(id, { suspended: false });
    if (!updated) {
      return res.status(404).json({ error: "対象ユーザーが見つかりません" });
    }
    res.json({ user: mapAdminUser(updated) });
  });

  app.post("/api/admin/users/:id/reset-password", adminOnly, async (req, res) => {
    const { id } = req.params;
    const newPassword = generateTempPassword();
    const updated = await storage.updatePlayer(id, { passwordPlain: newPassword });
    if (!updated) {
      return res.status(404).json({ error: "対象ユーザーが見つかりません" });
    }
    res.json({ user: mapAdminUser(updated), newPassword });
  });

  // プレイヤー情報API
  app.get("/api/player", (req, res) => {
    res.json(sanitizePlayer(req.user!));
  });

  app.post("/api/player/change-password", async (req, res) => {
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
  });
}

// ヘルパー関数
function sanitizePlayer(player: Player) {
  const { passwordPlain, ...rest } = player;
  return rest;
}

function mapAdminUser(player: Player) {
  return {
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
  };
}

function generateTempPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!?";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return password;
}

/**
 * テスト用プレイヤーを作成
 */
export async function createTestPlayer(
  storage: IStorage,
  override: Partial<InsertPlayer> = {}
): Promise<Player> {
  const defaults: InsertPlayer = {
    name: "テストユーザー",
    username: `test-user-${Date.now()}`,
    passwordPlain: "testpass123",
    role: "player",
    suspended: false,
  };
  return storage.createPlayer({ ...defaults, ...override });
}

/**
 * テスト用管理者を作成
 */
export async function createTestAdmin(
  storage: IStorage,
  override: Partial<InsertPlayer> = {}
): Promise<Player> {
  const defaults: InsertPlayer = {
    name: "管理者",
    username: `admin-${Date.now()}`,
    passwordPlain: "adminpass123",
    role: "admin",
    suspended: false,
  };
  return storage.createPlayer({ ...defaults, ...override });
}

// Express session 型拡張
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: Player;
    }
  }
}