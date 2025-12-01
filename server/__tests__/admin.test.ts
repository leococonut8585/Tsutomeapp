/**
 * 管理機能統合テスト
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

describe("管理機能API", () => {
  let app: Express;
  let storage: IStorage;
  let adminAgent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    const testEnv = await createTestApp();
    app = testEnv.app;
    storage = testEnv.storage;
    registerTestRoutes(app, storage);

    // 管理者としてログイン
    await createTestAdmin(storage, {
      username: "admin",
      passwordPlain: "adminpass",
    });
    adminAgent = request.agent(app);
    await adminAgent
      .post("/api/login")
      .send({ username: "admin", password: "adminpass" })
      .expect(200);
  });

  describe("GET /api/admin/users", () => {
    it("ユーザー一覧を取得できる", async () => {
      // テストユーザーを追加
      await createTestPlayer(storage, {
        username: "user1",
        passwordPlain: "pass1",
        name: "ユーザー1",
      });
      await createTestPlayer(storage, {
        username: "user2",
        passwordPlain: "pass2",
        name: "ユーザー2",
      });

      const res = await adminAgent.get("/api/admin/users").expect(200);

      expect(res.body).toHaveProperty("users");
      expect(Array.isArray(res.body.users)).toBe(true);
      // 管理者 + 2ユーザー + デフォルトプレイヤー = 4
      expect(res.body.users.length).toBeGreaterThanOrEqual(3);

      // ユーザー情報にはパスワードが含まれる（管理画面用）
      const user = res.body.users.find((u: any) => u.username === "user1");
      expect(user).toBeDefined();
      expect(user.passwordPlain).toBe("pass1");
      expect(user.name).toBe("ユーザー1");
    });

    it("一般ユーザーはアクセスできない", async () => {
      await createTestPlayer(storage, {
        username: "normaluser",
        passwordPlain: "pass",
      });

      const userAgent = request.agent(app);
      await userAgent
        .post("/api/login")
        .send({ username: "normaluser", password: "pass" })
        .expect(200);

      await userAgent.get("/api/admin/users").expect(403);
    });
  });

  describe("GET /api/admin/summary", () => {
    it("統計情報を取得できる", async () => {
      await createTestPlayer(storage, {
        username: "active-user",
        suspended: false,
      });
      await createTestPlayer(storage, {
        username: "suspended-user",
        suspended: true,
      });

      const res = await adminAgent.get("/api/admin/summary").expect(200);

      expect(res.body).toHaveProperty("totalUsers");
      expect(res.body).toHaveProperty("suspendedUsers");
      expect(res.body).toHaveProperty("totalMonthlyCost");
      expect(res.body).toHaveProperty("totalMonthlyCalls");

      // 少なくとも停止中ユーザーが1人いる
      expect(res.body.suspendedUsers).toBeGreaterThanOrEqual(1);
    });
  });

  describe("POST /api/admin/users", () => {
    it("新規ユーザーを作成できる", async () => {
      const res = await adminAgent
        .post("/api/admin/users")
        .send({
          username: "newuser",
          password: "newpass123",
          role: "player",
          name: "新規ユーザー",
        })
        .expect(201);

      expect(res.body).toHaveProperty("user");
      expect(res.body.user.username).toBe("newuser");
      expect(res.body.user.name).toBe("新規ユーザー");
      expect(res.body.user.role).toBe("player");

      // DBに保存されていることを確認
      const savedUser = await storage.getPlayerByUsername("newuser");
      expect(savedUser).toBeDefined();
      expect(savedUser!.passwordPlain).toBe("newpass123");
    });

    it("管理者ユーザーも作成できる", async () => {
      const res = await adminAgent
        .post("/api/admin/users")
        .send({
          username: "newadmin",
          password: "adminpass123",
          role: "admin",
        })
        .expect(201);

      expect(res.body.user.role).toBe("admin");
    });

    it("重複ユーザー名は409エラー", async () => {
      await createTestPlayer(storage, {
        username: "existinguser",
      });

      const res = await adminAgent
        .post("/api/admin/users")
        .send({
          username: "existinguser",
          password: "somepass123",
        })
        .expect(409);

      expect(res.body.error).toContain("既に存在");
    });

    it("パスワードが短すぎる場合は400エラー", async () => {
      const res = await adminAgent
        .post("/api/admin/users")
        .send({
          username: "shortpassuser",
          password: "abc",
        })
        .expect(400);

      expect(res.body.error).toContain("4文字以上");
    });

    it("無効なロールは400エラー", async () => {
      const res = await adminAgent
        .post("/api/admin/users")
        .send({
          username: "invalidrole",
          password: "validpass123",
          role: "superadmin",
        })
        .expect(400);

      expect(res.body.error).toContain("アカウント種別");
    });
  });

  describe("POST /api/admin/users/:id/suspend", () => {
    it("ユーザーを停止できる", async () => {
      const player = await createTestPlayer(storage, {
        username: "to-suspend",
        suspended: false,
      });

      const res = await adminAgent
        .post(`/api/admin/users/${player.id}/suspend`)
        .expect(200);

      expect(res.body.user.suspended).toBe(true);

      // DBも更新されている
      const updated = await storage.getPlayer(player.id);
      expect(updated!.suspended).toBe(true);
    });

    it("存在しないユーザーは404エラー", async () => {
      await adminAgent
        .post("/api/admin/users/nonexistent-id/suspend")
        .expect(404);
    });

    it("停止中ユーザーはログインできなくなる", async () => {
      const player = await createTestPlayer(storage, {
        username: "to-be-suspended",
        passwordPlain: "password",
        suspended: false,
      });

      // 停止前はログインできる
      await request(app)
        .post("/api/login")
        .send({ username: "to-be-suspended", password: "password" })
        .expect(200);

      // 停止
      await adminAgent.post(`/api/admin/users/${player.id}/suspend`);

      // 停止後はログインできない
      const res = await request(app)
        .post("/api/login")
        .send({ username: "to-be-suspended", password: "password" })
        .expect(403);

      expect(res.body.error).toContain("停止");
    });
  });

  describe("POST /api/admin/users/:id/resume", () => {
    it("停止を解除できる", async () => {
      const player = await createTestPlayer(storage, {
        username: "suspended",
        passwordPlain: "password",
        suspended: true,
      });

      const res = await adminAgent
        .post(`/api/admin/users/${player.id}/resume`)
        .expect(200);

      expect(res.body.user.suspended).toBe(false);

      // DBも更新されている
      const updated = await storage.getPlayer(player.id);
      expect(updated!.suspended).toBe(false);

      // 解除後はログインできる
      await request(app)
        .post("/api/login")
        .send({ username: "suspended", password: "password" })
        .expect(200);
    });
  });

  describe("POST /api/admin/users/:id/reset-password", () => {
    it("パスワードをリセットできる", async () => {
      const player = await createTestPlayer(storage, {
        username: "reset-target",
        passwordPlain: "oldpassword",
      });

      const res = await adminAgent
        .post(`/api/admin/users/${player.id}/reset-password`)
        .expect(200);

      expect(res.body).toHaveProperty("newPassword");
      expect(typeof res.body.newPassword).toBe("string");
      expect(res.body.newPassword.length).toBeGreaterThanOrEqual(8);

      // 新しいパスワードでログインできる
      await request(app)
        .post("/api/login")
        .send({ username: "reset-target", password: res.body.newPassword })
        .expect(200);

      // 古いパスワードではログインできない
      await request(app)
        .post("/api/login")
        .send({ username: "reset-target", password: "oldpassword" })
        .expect(401);
    });

    it("存在しないユーザーは404エラー", async () => {
      await adminAgent
        .post("/api/admin/users/nonexistent-id/reset-password")
        .expect(404);
    });
  });

  describe("一般ユーザーからの管理API操作", () => {
    let userAgent: ReturnType<typeof request.agent>;
    let targetPlayer: Awaited<ReturnType<typeof createTestPlayer>>;

    beforeEach(async () => {
      await createTestPlayer(storage, {
        username: "normaluser",
        passwordPlain: "userpass",
        role: "player",
      });
      targetPlayer = await createTestPlayer(storage, {
        username: "targetuser",
        passwordPlain: "targetpass",
      });

      userAgent = request.agent(app);
      await userAgent
        .post("/api/login")
        .send({ username: "normaluser", password: "userpass" })
        .expect(200);
    });

    it("ユーザー作成は拒否される", async () => {
      await userAgent
        .post("/api/admin/users")
        .send({ username: "hackattempt", password: "hackpass123" })
        .expect(403);
    });

    it("ユーザー停止は拒否される", async () => {
      await userAgent
        .post(`/api/admin/users/${targetPlayer.id}/suspend`)
        .expect(403);
    });

    it("パスワードリセットは拒否される", async () => {
      await userAgent
        .post(`/api/admin/users/${targetPlayer.id}/reset-password`)
        .expect(403);
    });

    it("サマリー取得は拒否される", async () => {
      await userAgent.get("/api/admin/summary").expect(403);
    });
  });
});