import pLimit from "p-limit";
import pRetry from "p-retry";
import { storage } from "./storage";
import type { ApiUsageDelta } from "./storage";
import { logger } from "./utils/logger";

const aiLogger = logger.child("AI");

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
const GROK_ENDPOINT = process.env.GROK_API_ENDPOINT || "https://api.x.ai/v1/chat/completions";
const GROK_MODEL = process.env.GROK_MODEL || "grok-4.1-fast-reasoning";
const GROK_TIMEOUT_MS = Number(process.env.GROK_TIMEOUT_MS || 90000);

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
const GEMINI_ENDPOINT =
  process.env.GEMINI_IMAGE_ENDPOINT ||
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 90000);

const GROK_INPUT_COST_PER_TOKEN = 0.2 / 1_000_000;
const GROK_OUTPUT_COST_PER_TOKEN = 0.5 / 1_000_000;
const GROK_WEB_SEARCH_COST = 5 / 1000; // per call
const GEMINI_TEXT_INPUT_COST_PER_TOKEN = 2 / 1_000_000;
const GEMINI_TEXT_OUTPUT_COST_PER_TOKEN = 12 / 1_000_000;
const GEMINI_IMAGE_INPUT_COST = 0.0011;
const GEMINI_IMAGE_OUTPUT_COST: Record<"1k" | "2k" | "4k", number> = {
  "1k": 0.134,
  "2k": 0.134,
  "4k": 0.24,
};

const isTextAIConfigured = Boolean(GROK_API_KEY);
const isImageAIConfigured = Boolean(GEMINI_API_KEY);

const imageGenerationLimit = pLimit(1);

type ImageType = "monster" | "training" | "master" | "assassin" | "boss" | "story";

interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GrokOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object";
  webSearch?: boolean;
}

interface AiCallContext {
  playerId?: string;
  webSearch?: boolean;
}

interface ImageOptions extends AiCallContext {
  resolution?: "1k" | "2k" | "4k";
  mimeType?: string;
  includeReferenceImage?: boolean;
}

let aiServiceStatus = {
  available: isTextAIConfigured,
  lastCheck: new Date(),
  consecutiveFailures: 0,
  lastError: null as string | null,
};

if (!isTextAIConfigured) {
  aiLogger.warn("Grok 4.1 API key missing. Falling back to static data.");
}
if (!isImageAIConfigured) {
  aiLogger.warn("Gemini NanoBanana Pro API key missing. Image generation disabled.");
}

const fallbackNames = {
  monster: {
    study: ["Kyoju Oni", "Scroll Serpent", "Inkbound Specter"],
    exercise: ["Muscle Drake", "Sprint Ogre", "Pulse Fiend"],
    work: ["Ledger Wraith", "Office Chimera", "Bureau Basilisk"],
    hobby: ["Canvas Phantom", "Chord Imp", "Garden Djinn"],
    housework: ["Dust Revenant", "Laundry Ghoul", "Soap Kelpie"],
    fun: ["Festival Oni", "Arcade Hydra", "Carnival Raven"],
    default: ["Midnight Beast", "Neon Golem", "Paper Tiger"],
  },
  training: {
    study: ["Scholar's Forge", "Chronicle Circuit", "Mind Ladder"],
    exercise: ["Blitz Regimen", "Thunder Sprint", "Iron Pulse"],
    work: ["Productivity Kata", "Focus Drill", "Zen Workflow"],
    hobby: ["Creative Bloom", "Muse Circuit", "Harmony Loop"],
    housework: ["Order Ritual", "Sparkling Tempo", "Tidy Cascade"],
    fun: ["Joystride Flow", "Quest Groove", "Lumine Dash"],
    default: ["Everyday Routine", "Momentum Loop", "Heroic Habit"],
  },
  master: ["Sensei Raikou", "Mistblade Mentor", "Sable Archivist", "Aurora Strategist"],
  assassin: ["Velvet Knife", "Glass Lotus", "Nocturne Whisper", "Azure Specter"],
  boss: (num: number) => `Chapter ${num}: Eclipse Regent`,
} as const;

const storyTemplates = [
  (bossNumber: number, bossName: string) =>
    `Boss ${bossNumber} — ${bossName} — spreads static dusk across Tsutome City. The air tastes metallic, and even the neon refuses to glow. Rumors say a single hero still moves.`,
  (bossNumber: number, bossName: string) =>
    `${bossName} etches contracts of fear along the skyline. Citizens hear quills scratching in their dreams. Chapter ${bossNumber} begins when someone tears the page.`,
  (bossNumber: number, bossName: string) =>
    `On the eve of Chapter ${bossNumber}, ${bossName} commandeers the clocktower. Every strike rewinds courage—unless a challenger rewrites time.`,
] as const;

const imageStyles: Record<ImageType, string> = {
  monster: "Ultra-detailed yokai concept art, dramatic rim lighting, 4k render, stylized Japanese ink energy",
  training: "Game UI infographic, sleek holographic panels, optimistic palette, sharp typography",
  master: "Painterly portrait, cinematic lighting, ornate robes, floating particles",
  assassin: "Cyberpunk stealth operative, high contrast neon smoke, dynamic pose",
  boss: "Epic raid boss splash art, towering scale, volumetric lighting, particles",
  story: "Storyboard still, cinematic wide shot, soft diffusion glow, atmospheric haze",
};

function updateServiceStatus(success: boolean, error?: any) {
  if (success) {
    aiServiceStatus.consecutiveFailures = 0;
    aiServiceStatus.available = true;
    aiServiceStatus.lastError = null;
  } else {
    aiServiceStatus.consecutiveFailures++;
    aiServiceStatus.lastError = error?.message || "Unknown error";
    if (aiServiceStatus.consecutiveFailures >= 3) {
      aiServiceStatus.available = false;
      aiLogger.error("Grok service marked unavailable after consecutive failures");
    }
  }
  aiServiceStatus.lastCheck = new Date();
}

function getAbortSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function callGrok(messages: GrokMessage[], options?: GrokOptions) {
  if (!isTextAIConfigured) {
    throw new Error("Grok API key is not configured");
  }

  const payload: Record<string, any> = {
    model: GROK_MODEL,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 512,
    stream: false,
  };

  if (options?.responseFormat === "json_object") {
    payload.response_format = { type: "json_object" };
  }

  if (options?.webSearch) {
    payload.tools = [{ type: "web_search", web_search: { enable: true } }];
  }

  const { signal, cancel } = getAbortSignal(GROK_TIMEOUT_MS);

  try {
    const response = await fetch(GROK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Grok API error: ${response.status} ${body}`);
    }

    const data = await response.json();
    updateServiceStatus(true);
    return data;
  } catch (error) {
    updateServiceStatus(false, error);
    throw error;
  } finally {
    cancel();
  }
}

function extractMessageContent(choice: any): string {
  const content = choice?.message?.content;
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join("\n");
  }
  if (typeof content?.text === "string") return content.text;
  return "";
}

async function translateToEnglish(text: string): Promise<string> {
  if (!text.trim()) return text;
  if (!isTextAIConfigured) return text;
  try {
    const res = await callGrok(
      [
        {
          role: "system",
          content: "You are a bilingual translator. Translate Japanese or mixed text into natural English without explanation.",
        },
        { role: "user", content: text },
      ],
      { temperature: 0.3, maxTokens: 256 }
    );
    const translated = extractMessageContent(res.choices?.[0]).trim();
    return translated || text;
  } catch (error) {
    aiLogger.warn("translateToEnglish fallback triggered", { error: (error as Error).message });
    return text;
  }
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function sanitizeSingleLineResponse(raw: string, maxLength = 80): string {
  return raw
    .split(/\r?\n/)[0]
    .replace(/^['"\s]+|['"\s]+$/g, "")
    .replace(/[`]/g, "")
    .trim()
    .slice(0, maxLength);
}

function resolveMonsterFallback(genre: string): string {
  const pool =
    fallbackNames.monster[genre as keyof typeof fallbackNames.monster] ||
    fallbackNames.monster.default;
  return pickRandom(pool);
}

function resolveTrainingFallback(genre: string): string {
  const pool =
    fallbackNames.training[genre as keyof typeof fallbackNames.training] ||
    fallbackNames.training.default;
  return pickRandom(pool);
}

function buildImagePrompt(basePrompt: string, type: ImageType): string {
  const suffix = imageStyles[type];
  return `${basePrompt}. ${suffix}`.trim();
}

function isAscii(text: string): boolean {
  return /^[\x00-\x7F]+$/.test(text);
}

async function ensureEnglishPrompt(prompt: string): Promise<string> {
  if (!prompt.trim()) return prompt;
  if (isAscii(prompt)) return prompt;
  return translateToEnglish(prompt);
}

function clampMultiplier(value: number, min = 0.5, max = 1.5): number {
  return Math.min(max, Math.max(min, value));
}

// コスト計算関数（テスト用にエクスポート）
export function computeGrokCost(usage: any, webSearch?: boolean): number {
  const promptTokens = usage?.prompt_tokens ?? usage?.promptTokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? usage?.completionTokens ?? 0;
  const tokenCost = promptTokens * GROK_INPUT_COST_PER_TOKEN + completionTokens * GROK_OUTPUT_COST_PER_TOKEN;
  const webCost = webSearch ? GROK_WEB_SEARCH_COST : 0;
  return tokenCost + webCost;
}

export function computeGeminiCost(usage: any, resolution: "1k" | "2k" | "4k", includeReferenceImage?: boolean): number {
  const promptTokens = usage?.promptTokenCount ?? 0;
  const completionTokens = usage?.candidatesTokenCount ?? 0;
  const textCost = promptTokens * GEMINI_TEXT_INPUT_COST_PER_TOKEN + completionTokens * GEMINI_TEXT_OUTPUT_COST_PER_TOKEN;
  const imageCost = GEMINI_IMAGE_OUTPUT_COST[resolution] ?? GEMINI_IMAGE_OUTPUT_COST["2k"];
  const inputImageCost = includeReferenceImage ? GEMINI_IMAGE_INPUT_COST : 0;
  return textCost + imageCost + inputImageCost;
}

async function recordApiUsageDelta(playerId: string | undefined, delta: ApiUsageDelta) {
  if (!playerId) return;
  try {
    await storage.incrementApiUsage(playerId, delta);
  } catch (error) {
    aiLogger.warn("Failed to record API usage", { playerId, error: (error as Error).message });
  }
}

async function recordGrokUsage(playerId: string | undefined, usage: any, opts?: { webSearch?: boolean }) {
  if (!playerId || !usage) return;
  const inputTokens = usage?.prompt_tokens ?? usage?.promptTokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? usage?.completionTokens ?? 0;
  const cost = computeGrokCost(usage, opts?.webSearch);
  const delta: ApiUsageDelta = {
    calls: 1,
    costUsd: cost,
    inputTokens,
    outputTokens,
  };
  await recordApiUsageDelta(playerId, delta);
}

async function recordGeminiUsage(
  playerId: string | undefined,
  usage: any,
  resolution: "1k" | "2k" | "4k",
  includeReferenceImage?: boolean,
) {
  if (!playerId || !usage) return;
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;
  const cost = computeGeminiCost(usage, resolution, includeReferenceImage);
  const delta: ApiUsageDelta = {
    calls: 1,
    costUsd: cost,
    inputTokens,
    outputTokens,
    imageCount: 1,
  };
  await recordApiUsageDelta(playerId, delta);
}

async function grokTextCompletion(messages: GrokMessage[], options?: GrokOptions) {
  const data = await callGrok(messages, options);
  const text = extractMessageContent(data.choices?.[0]).trim();
  return { text, data };
}

export async function generateMonsterName(title: string, genre: string, difficulty: string, context?: AiCallContext) {
  const fallback = resolveMonsterFallback(genre);
  if (!isTextAIConfigured) return fallback;
  try {
    const { text, data } = await grokTextCompletion(
      [
        {
          role: "system",
          content: "Generate a short, stylish yokai-style monster name (max 5 words). Return only the name.",
        },
        {
          role: "user",
          content: `Task title: ${title}\nGenre: ${genre}\nDifficulty: ${difficulty}`,
        },
      ],
      { temperature: 0.85, maxTokens: 64 }
    );
    await recordGrokUsage(context?.playerId, data?.usage, context);
    const cleaned = sanitizeSingleLineResponse(text);
    return cleaned || fallback;
  } catch (error) {
    aiLogger.warn("generateMonsterName fallback", { error: (error as Error).message });
    return fallback;
  }
}

export async function generateTrainingName(title: string, genre: string, context?: AiCallContext) {
  const fallback = resolveTrainingFallback(genre);
  if (!isTextAIConfigured) return fallback;
  try {
    const { text, data } = await grokTextCompletion(
      [
        {
          role: "system",
          content: "Invent a motivational training program name (max 4 words). Return only the name.",
        },
        {
          role: "user",
          content: `Habit: ${title}\nCategory: ${genre}`,
        },
      ],
      { temperature: 0.75, maxTokens: 48 }
    );
    await recordGrokUsage(context?.playerId, data?.usage, context);
    const cleaned = sanitizeSingleLineResponse(text);
    return cleaned || fallback;
  } catch (error) {
    aiLogger.warn("generateTrainingName fallback", { error: (error as Error).message });
    return fallback;
  }
}

export async function generateMasterName(title: string, genre: string, context?: AiCallContext) {
  const fallback = pickRandom(fallbackNames.master);
  if (!isTextAIConfigured) return fallback;
  try {
    const { text, data } = await grokTextCompletion(
      [
        {
          role: "system",
          content: "Name an enigmatic mentor guiding the hero. Return only the name (max 4 words).",
        },
        {
          role: "user",
          content: `Goal: ${title}\nTheme: ${genre}`,
        },
      ],
      { temperature: 0.8, maxTokens: 48 }
    );
    await recordGrokUsage(context?.playerId, data?.usage, context);
    const cleaned = sanitizeSingleLineResponse(text);
    return cleaned || fallback;
  } catch (error) {
    aiLogger.warn("generateMasterName fallback", { error: (error as Error).message });
    return fallback;
  }
}

export async function generateAssassinName(theme: string, difficulty: string, context?: AiCallContext) {
  const fallback = pickRandom(fallbackNames.assassin);
  if (!isTextAIConfigured) return fallback;
  try {
    const { text, data } = await grokTextCompletion(
      [
        {
          role: "system",
          content: "Invent a codename for a futuristic assassin (max 3 words). Return only the codename.",
        },
        {
          role: "user",
          content: `Target theme: ${theme}\nDifficulty: ${difficulty}`,
        },
      ],
      { temperature: 0.9, maxTokens: 40 }
    );
    await recordGrokUsage(context?.playerId, data?.usage, context);
    const cleaned = sanitizeSingleLineResponse(text);
    return cleaned || fallback;
  } catch (error) {
    aiLogger.warn("generateAssassinName fallback", { error: (error as Error).message });
    return fallback;
  }
}

export async function generateBossName(bossNumber: number, context?: AiCallContext) {
  const fallback = fallbackNames.boss(bossNumber);
  if (!isTextAIConfigured) return fallback;
  try {
    const { text, data } = await grokTextCompletion(
      [
        {
          role: "system",
          content: "Name a climactic boss using a poetic title (max 5 words). Return only the title.",
        },
        {
          role: "user",
          content: `Boss number: ${bossNumber}`,
        },
      ],
      { temperature: 0.85, maxTokens: 48 }
    );
    await recordGrokUsage(context?.playerId, data?.usage, context);
    const cleaned = sanitizeSingleLineResponse(text);
    return cleaned || fallback;
  } catch (error) {
    aiLogger.warn("generateBossName fallback", { error: (error as Error).message });
    return fallback;
  }
}

export async function generateStoryText(bossNumber: number, bossName: string, context?: AiCallContext) {
  const fallback = pickRandom(storyTemplates)(bossNumber, bossName);
  if (!isTextAIConfigured) return fallback;
  try {
    const { text, data } = await grokTextCompletion(
      [
        {
          role: "system",
          content: "Write a short cyber-fantasy mission briefing (2 sentences).",
        },
        {
          role: "user",
          content: `Boss ${bossNumber}: ${bossName}\nTone: heroic, urgent`,
        },
      ],
      { temperature: 0.8, maxTokens: 180 }
    );
    await recordGrokUsage(context?.playerId, data?.usage, context);
    return text || fallback;
  } catch (error) {
    aiLogger.warn("generateStoryText fallback", { error: (error as Error).message });
    return fallback;
  }
}

export async function assessTaskDifficulty(
  title: string,
  description?: string,
  genre?: string,
  context?: AiCallContext,
): Promise<"easy" | "medium" | "hard" | "legendary"> {
  if (!isTextAIConfigured) return "medium";
  try {
    const { text, data } = await grokTextCompletion(
      [
        {
          role: "system",
          content:
            "Evaluate a task difficulty as one of: easy, medium, hard, legendary. Respond with JSON {\"difficulty\":\"value\"}.",
        },
        {
          role: "user",
          content: JSON.stringify({ title, description, genre }),
        },
      ],
      { temperature: 0.2, maxTokens: 120, responseFormat: "json_object" }
    );
    await recordGrokUsage(context?.playerId, data?.usage, context);
    try {
      const parsed = JSON.parse(text || data.choices?.[0]?.message?.content || "{}");
      const value = String(parsed.difficulty || parsed.level || parsed.tier || "medium")
        .toLowerCase()
        .trim();
      if (value.includes("legend")) return "legendary";
      if (value.includes("hard")) return "hard";
      if (value.includes("easy")) return "easy";
      return "medium";
    } catch {
      return "medium";
    }
  } catch (error) {
    aiLogger.warn("assessTaskDifficulty fallback", { error: (error as Error).message });
    return "medium";
  }
}

export const assessDifficulty = assessTaskDifficulty;

export interface VerificationResult {
  approved: boolean;
  feedback: string;
  bonusMultiplier: number;
}

const strictnessPrompts: Record<string, string> = {
  very_lenient: "Only flag blatant failures. Assume the player did their best unless the report clearly contradicts success.",
  lenient: "Give the player the benefit of the doubt unless evidence suggests the work was not done.",
  balanced: "Evaluate fairly. Approve when the report demonstrates clear effort and completion, otherwise request revisions.",
  strict: "Require concrete evidence, numbers, or clear outcomes before approving. Be conservative with bonus multipliers.",
  very_strict: "Demand exceptional detail and proof of completion. Reject vague or unconvincing reports.",
};

export async function verifyTaskCompletionAdvanced(
  title: string,
  description: string | null,
  completionReport: string,
  monsterName: string,
  difficulty: string,
  aiStrictness: string,
  context?: AiCallContext,
): Promise<VerificationResult> {
  const fallback: VerificationResult = {
    approved: true,
    feedback: "AI審査をスキップしました。",
    bonusMultiplier: 1.0,
  };

  if (!isTextAIConfigured) {
    return fallback;
  }

  try {
    const strictness = strictnessPrompts[aiStrictness as keyof typeof strictnessPrompts] || strictnessPrompts.balanced;
    const userContent = [
      `Task Title: ${title}`,
      `Difficulty: ${difficulty}`,
      `Monster Persona: ${monsterName}`,
      description ? `Context: ${description}` : null,
      `Completion Report:\n${completionReport}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { text, data } = await grokTextCompletion(
      [
        {
          role: "system",
          content:
            "You are an evaluator for a Japanese productivity RPG. Make a judgement about whether the task was truly completed. " +
            "Respond ONLY in JSON with fields {\"approved\":boolean,\"feedback\":string,\"bonusMultiplier\":number}. " +
            strictness,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      { temperature: 0.2, maxTokens: 200, responseFormat: "json_object" }
    );

    await recordGrokUsage(context?.playerId, data?.usage, context);
    const raw = text || data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const approved =
      typeof parsed.approved === "boolean"
        ? parsed.approved
        : typeof parsed.status === "string"
          ? parsed.status.toLowerCase().includes("approve")
          : true;
    const feedback =
      typeof parsed.feedback === "string" && parsed.feedback.trim().length > 0
        ? parsed.feedback.trim()
        : approved
          ? "AI審査を通過しました。"
          : "AI審査で差し戻しとなりました。";
    const multiplierSource =
      typeof parsed.bonusMultiplier === "number"
        ? parsed.bonusMultiplier
        : typeof parsed.multiplier === "number"
          ? parsed.multiplier
          : 1.0;
    const bonusMultiplier = clampMultiplier(multiplierSource);
    return { approved, feedback, bonusMultiplier };
  } catch (error) {
    aiLogger.warn("verifyTaskCompletionAdvanced fallback", { error: (error as Error).message });
    return fallback;
  }
}

async function callGemini(payload: any) {
  if (!isImageAIConfigured) {
    throw new Error("Gemini API key is not configured");
  }

  const { signal, cancel } = getAbortSignal(GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${body}`);
    }

    return await response.json();
  } finally {
    cancel();
  }
}

function extractInlineImage(response: any) {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return {
          mimeType: part.inlineData.mimeType || "image/png",
          data: part.inlineData.data,
        };
      }
    }
  }
  return null;
}

export async function generateImage(prompt: string, type: ImageType, options?: ImageOptions): Promise<string> {
  if (!isImageAIConfigured) {
    return "";
  }

  const resolution = options?.resolution || "2k";
  const mimeType = options?.mimeType || "image/png";

  const runner = async () => {
    const styledPrompt = buildImagePrompt(prompt, type);
    const englishPrompt = await ensureEnglishPrompt(styledPrompt);

    const payload: Record<string, any> = {
      contents: [
        {
          role: "user",
          parts: [{ text: englishPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: mimeType,
        response_mime_type: mimeType,
      },
    };

    if (resolution) {
      payload.imageGenerationConfig = { size: resolution };
    }

    const data = await callGemini(payload);
    const image = extractInlineImage(data);

    if (!image) {
      throw new Error("Gemini returned no image data");
    }

    await recordGeminiUsage(options?.playerId, data?.usageMetadata, resolution, options?.includeReferenceImage);
    return `data:${image.mimeType};base64,${image.data}`;
  };

  try {
    return await imageGenerationLimit(() => pRetry(runner, { retries: 2, minTimeout: 1500 }));
  } catch (error) {
    aiLogger.warn("generateImage fallback", { error: (error as Error).message });
    return "";
  }
}
