import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import * as cron from "node-cron";
import { executeDailyReset, executeHourlyCheck } from "./cron";
import { logger } from "./utils/logger";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { setupSecurityMiddleware, errorHandler, requestSizeLimits } from "./middleware/security";

const app = express();
app.set('trust proxy', 1);
const PgSession = connectPgSimple(session);
const SESSION_SECRET = process.env.SESSION_SECRET || "tsutomeapp-secret";

// セキュリティミドルウェアを最初に設定
setupSecurityMiddleware(app);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: requestSizeLimits.json,
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: requestSizeLimits.urlencoded }));

app.use(
  session({
    store: process.env.DATABASE_URL
      ? new PgSession({
          conString: process.env.DATABASE_URL,
          createTableIfMissing: true,
        })
      : undefined,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: app.get("env") === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(async (req, _res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    req.user = undefined;
    return next();
  }
  try {
    const player = await storage.getPlayer(userId);
    if (!player || player.suspended) {
      delete req.session.userId;
      req.user = undefined;
    } else {
      req.user = player;
    }
  } catch (error) {
    logger.error("Failed to hydrate session user", { error });
    req.user = undefined;
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      logger.request(req.method, path, res.statusCode, duration, capturedJsonResponse);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // カスタムエラーハンドラー
  app.use(errorHandler);

  // フォールバックエラーハンドラー
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    logger.error("Unhandled error", { error: err.message, stack: err.stack });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`Server started - serving on port ${port}`);
    
    // Set up automatic cron jobs
    logger.info("Setting up automatic cron jobs...");
    
    // Daily Reset - Runs at 0:00 JST (15:00 UTC)
    // JST is UTC+9, so midnight JST is 15:00 UTC the previous day
    cron.schedule("0 15 * * *", async () => {
      logger.info("[CRON] Daily reset triggered (0:00 JST)");
      try {
        await executeDailyReset();
        logger.info("[CRON] Daily reset completed successfully");
      } catch (error) {
        logger.error("[CRON] Daily reset failed:", error);
      }
    }, {
      timezone: "UTC" // Using UTC to ensure consistency
    });
    
    // Hourly Check - Runs every hour
    cron.schedule("0 * * * *", async () => {
      logger.info("[CRON] Hourly check triggered");
      try {
        await executeHourlyCheck();
        logger.info("[CRON] Hourly check completed successfully");
      } catch (error) {
        logger.error("[CRON] Hourly check failed:", error);
      }
    }, {
      timezone: "UTC"
    });
    
    logger.info("Automatic cron jobs scheduled:");
    logger.info("- Daily reset: 0:00 JST (15:00 UTC) daily");
    logger.info("- Hourly check: Every hour at :00");
    
    // Run hourly check on startup to process any overdue tasks
    setTimeout(async () => {
      logger.info("[CRON] Running initial hourly check on startup...");
      try {
        await executeHourlyCheck();
        logger.info("[CRON] Initial hourly check completed");
      } catch (error) {
        logger.error("[CRON] Initial hourly check failed:", error);
      }
    }, 5000); // Wait 5 seconds after server starts
  });
})();
