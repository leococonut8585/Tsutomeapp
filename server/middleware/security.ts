import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import cors from "cors";
import { logger } from "../utils/logger";

const securityLogger = logger.child("Security");

/**
 * セキュリティ・パフォーマンスミドルウェアを設定
 */
export function setupSecurityMiddleware(app: Express): void {
  // 1. Helmet - セキュリティヘッダーの設定
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "https://api.x.ai", "https://generativelanguage.googleapis.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      // X-Frame-Options
      frameguard: { action: "deny" },
      // HSTS
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      // その他のセキュリティヘッダー
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // 2. CORS設定
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
    "https://tsutomeapp.com",
    "http://localhost:5000",
    "http://localhost:3000",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // リクエストにOriginがない場合（同一オリジン）は許可
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        securityLogger.warn("Blocked by CORS", { origin });
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      maxAge: 86400, // プリフライトキャッシュ: 24時間
    })
  );

  // 3. レスポンス圧縮
  app.use(
    compression({
      filter: (req, res) => {
        // APIレスポンスと静的ファイルを圧縮
        if (req.headers["x-no-compression"]) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6, // 圧縮レベル（1-9、デフォルトは6）
      threshold: 1024, // 1KB以上のレスポンスを圧縮
    })
  );

  // 4. グローバルレート制限
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 500, // 500リクエスト/15分
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "リクエストが多すぎます。しばらく待ってから再度お試しください。" },
    handler: (req, res) => {
      securityLogger.warn("Global rate limit exceeded", {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        error: "リクエストが多すぎます。しばらく待ってから再度お試しください。",
      });
    },
  });
  app.use("/api", globalLimiter);

  securityLogger.info("Security middleware configured");
}

/**
 * API固有のレート制限ミドルウェア
 */
export const apiRateLimiters = {
  // ログイン試行のレート制限（ブルートフォース対策）
  login: rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 5, // 5回まで
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "ログイン試行が多すぎます。15分後に再度お試しください。" },
    handler: (req, res) => {
      securityLogger.warn("Login rate limit exceeded", {
        ip: req.ip,
        username: req.body?.username,
      });
      res.status(429).json({
        error: "ログイン試行が多すぎます。15分後に再度お試しください。",
      });
    },
  }),

  // AI生成API（コスト高いため厳しく制限）
  aiGeneration: rateLimit({
    windowMs: 60 * 1000, // 1分
    max: 10, // 10リクエスト/分
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "AI生成リクエストが多すぎます。1分後に再度お試しください。" },
    handler: (req, res) => {
      securityLogger.warn("AI generation rate limit exceeded", {
        ip: req.ip,
        userId: (req as any).user?.id,
      });
      res.status(429).json({
        error: "AI生成リクエストが多すぎます。1分後に再度お試しください。",
      });
    },
  }),

  // タスク作成のレート制限
  taskCreation: rateLimit({
    windowMs: 60 * 1000, // 1分
    max: 20, // 20リクエスト/分
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "タスク作成が多すぎます。しばらくお待ちください。" },
  }),

  // 管理API（厳格な制限）
  admin: rateLimit({
    windowMs: 60 * 1000, // 1分
    max: 30, // 30リクエスト/分
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "管理APIリクエストが多すぎます。" },
  }),
};

/**
 * 入力サニタイズユーティリティ
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";
  // HTMLタグを除去
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
}

/**
 * SQLインジェクション検知
 */
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|HAVING)\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /('|"|;)/,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * 入力検証ミドルウェア
 */
export const validateInput: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // リクエストボディのチェック
  if (req.body && typeof req.body === "object") {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === "string") {
        // SQLインジェクション検知
        if (detectSqlInjection(value)) {
          securityLogger.warn("Potential SQL injection detected", {
            ip: req.ip,
            path: req.path,
            field: key,
          });
          return res.status(400).json({ error: "不正な入力が検出されました" });
        }
      }
    }
  }

  next();
};

/**
 * エラーハンドリングミドルウェア
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // CORSエラー
  if (err.message === "Not allowed by CORS") {
    securityLogger.warn("CORS error", { origin: req.headers.origin, path: req.path });
    res.status(403).json({ error: "アクセスが許可されていません" });
    return;
  }

  // その他のエラー
  securityLogger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // 本番環境ではスタックトレースを隠す
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "内部エラーが発生しました" });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}

/**
 * リクエストサイズ制限の設定値
 */
export const requestSizeLimits = {
  json: "10mb", // JSONボディの最大サイズ
  urlencoded: "10mb", // URL-encodedボディの最大サイズ
};