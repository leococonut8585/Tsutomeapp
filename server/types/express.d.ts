import type { Player } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: Player;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export {};
