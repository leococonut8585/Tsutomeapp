/**
 * 認証・セッション統合テスト
 */
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import {
  createTestApp,
  registerTestRoutes,
  createTestPlayer,
  createTestAdmin,
} from "./setup";
import type { IStorage } from "../storage";

describe("認証API", () => {
  let app: Express;
  let storage: IStorage;

  beforeEach(async () => {
    const testEnv = await createTestApp();
    app = testEnv.app;
    storage = testEnv.storage;
    registerTestRoutes(app, storage);
  });

  describe("POST /api/login", () => {
    it("正しい認証情報でログインできる", async () => {
      const player = await createTestPlayer(storage, {
        username: "testuser",
        passwordPlain: "password123",
      });

      const res = await request(app)
        .post("/api/login")
        .send({ username: "testuser", password: "password123" })
        .expect(200);

      expect(res.body).toHaveProperty("player");
      expect(res.body.player.id).toBe(player.id);
      expect(res.body.player.username).toBe("testuser");
      // パスワードは返却されない
      expect(res.body.player).not.toHaveProperty("passwordPlain");
    });

    it("ユーザー名またはパスワードが空の場合は400エラー", async () => {
      const res = await request(app)
        .post("/api/login")
        .send({ username: "", password: "" })
        .expect(400);

      expect(res.body.error).toContain("ユーザー名");
    });

    it("パスワードが間違っている場合は401エラー", async () => {
      await createTestPlayer(storage, {
        username: "testuser",
        passwordPlain: "correct-password",
      });

      const res = await request(app)
        .post("/api/login")
        .send({ username: "testuser", password: "wrong-password" })
        .expect(401);

      expect(res.body.error).toContain("パスワード");
    });

    it("存在しないユーザーの場合は401エラー", async () => {
      const res = await request(app)
        .post("/api/login")
        .send({ username: "nonexistent", password: "anypassword" })
        .expect(401);

      expect(res.body.error).toContain("ユーザー名");
    });

    it("停止中のアカウントはログインできない", async () => {
      await createTestPlayer(storage, {
        username: "suspended-user",
        passwordPlain: "password123",
        suspended: true,
      });

      const res = await request(app)
        .post("/api/login")
        .send({ username: "suspended-user", password: "password123" })
        .expect(403);

      expect(res.body.error).toContain("停止");
    });
  });

  describe("POST /api/logout", () => {
    it("ログアウトが成功する", async () => {
      await createTestPlayer(storage, {
        username: "testuser",
        passwordPlain: "password123",
      });

      // まずログイン
      const agent = request.agent(app);
      await agent
        .post("/api/login")
        .send({ username: "testuser", password: "password123" })
        .expect(200);

      // ログアウト
      const res = await agent.post("/api/logout").expect(200);

      expect(res.body.success).toBe(true);

      // ログアウト後は認証が必要なAPIにアクセスできない
      await agent.get("/api/player").expect(401);
    });
  });

  describe("GET /api/me", () => {
    it("ログイン済みの場合はユーザー情報を返す", async () => {
      const player = await createTestPlayer(storage, {
        username: "testuser",
        passwordPlain: "password123",
      });

      const agent = request.agent(app);
      await agent
        .post("/api/login")
        .send({ username: "testuser", password: "password123" })
        .expect(200);

      const res = await agent.get("/api/me").expect(200);

      expect(res.body.authenticated).toBe(true);
      expect(res.body.player.id).toBe(player.id);
    });

    it("未ログインの場合は401エラー", async () => {
      const res = await request(app).get("/api/me").expect(401);

      expect(res.body.authenticated).toBe(false);
    });
  });

  describe("認証必須エンドポイント", () => {
    it("認証なしでプロテクトされたAPIにアクセスすると401エラー", async () => {
      await request(app).get("/api/player").expect(401);
    });

    it("停止中ユーザーのセッションはアクセス拒否される", async () => {
      const player = await createTestPlayer(storage, {
        username: "will-be-suspended",
        passwordPlain: "password123",
        suspended: false,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/login")
        .send({ username: "will-be-suspended", password: "password123" })
        .expect(200);

      // ログイン後にアカウントを停止
      await storage.updatePlayer(player.id, { suspended: true });

      // 停止後はセッション復元時にクリアされ、認証エラーとなる
      // （実際のアプリケーション動作: 停止ユーザーはセッション復元時に req.user = undefined となる）
      const res = await agent.get("/api/player").expect(401);
      expect(res.body.error).toContain("ログイン");
    });
  });

  describe("権限チェック", () => {
    it("一般ユーザーは管理者APIにアクセスできない", async () => {
      await createTestPlayer(storage, {
        username: "normaluser",
        passwordPlain: "password123",
        role: "player",
      });

      const agent = request.agent(app);
      await agent
        .post("/api/login")
        .send({ username: "normaluser", password: "password123" })
        .expect(200);

      // 管理者専用APIへのアクセスを試みる
      const res = await agent.get("/api/admin/users").expect(403);
      expect(res.body.error).toContain("管理者");
    });

    it("管理者は管理者APIにアクセスできる", async () => {
      await createTestAdmin(storage, {
        username: "adminuser",
        passwordPlain: "adminpass123",
      });

      const agent = request.agent(app);
      await agent
        .post("/api/login")
        .send({ username: "adminuser", password: "adminpass123" })
        .expect(200);

      // 管理者専用APIへのアクセス
      const res = await agent.get("/api/admin/users").expect(200);
      expect(res.body).toHaveProperty("users");
    });
  });

  describe("POST /api/player/change-password", () => {
    it("正しい現在のパスワードで変更できる", async () => {
      await createTestPlayer(storage, {
        username: "testuser",
        passwordPlain: "oldpassword",
      });

      const agent = request.agent(app);
      await agent
        .post("/api/login")
        .send({ username: "testuser", password: "oldpassword" })
        .expect(200);

      const res = await agent
        .post("/api/player/change-password")
        .send({ currentPassword: "oldpassword", newPassword: "newpassword123" })
        .expect(200);

      expect(res.body.success).toBe(true);

      // 新しいパスワードでログインできることを確認
      await agent.post("/api/logout");
      await agent
        .post("/api/login")
        .send({ username: "testuser", password: "newpassword123" })
        .expect(200);
    });

    it("現在のパスワードが間違っている場合は400エラー", async () => {
      await createTestPlayer(storage, {
        username: "testuser",
        passwordPlain: "correctpassword",
      });

      const agent = request.agent(app);
      await agent
        .post("/api/login")
        .send({ username: "testuser", password: "correctpassword" })
        .expect(200);

      const res = await agent
        .post("/api/player/change-password")
        .send({ currentPassword: "wrongpassword", newPassword: "newpassword" })
        .expect(400);

      expect(res.body.error).toContain("パスワード");
    });

    it("新しいパスワードが短すぎる場合は400エラー", async () => {
      await createTestPlayer(storage, {
        username: "testuser",
        passwordPlain: "correctpassword",
      });

      const agent = request.agent(app);
      await agent
        .post("/api/login")
        .send({ username: "testuser", password: "correctpassword" })
        .expect(200);

      const res = await agent
        .post("/api/player/change-password")
        .send({ currentPassword: "correctpassword", newPassword: "abc" })
        .expect(400);

      expect(res.body.error).toContain("4文字以上");
    });
  });
});