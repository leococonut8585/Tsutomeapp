import { describe, it, expect } from "vitest";
import { computeGrokCost, computeGeminiCost } from "../ai";

// 定数の値（ai.ts より）
const GROK_INPUT_COST_PER_TOKEN = 0.2 / 1_000_000;  // $0.2 per 1M tokens
const GROK_OUTPUT_COST_PER_TOKEN = 0.5 / 1_000_000; // $0.5 per 1M tokens
const GROK_WEB_SEARCH_COST = 5 / 1000;              // $5 per 1000 calls = $0.005 per call

const GEMINI_TEXT_INPUT_COST_PER_TOKEN = 2 / 1_000_000;   // $2 per 1M tokens
const GEMINI_TEXT_OUTPUT_COST_PER_TOKEN = 12 / 1_000_000; // $12 per 1M tokens
const GEMINI_IMAGE_INPUT_COST = 0.0011;                    // $0.0011 per image input
const GEMINI_IMAGE_OUTPUT_COSTS = {
  "1k": 0.134,
  "2k": 0.134,
  "4k": 0.24,
};

describe("課金ロジック - computeGrokCost", () => {
  it("入力トークンのみの場合、正しいコストを計算する", () => {
    const usage = { prompt_tokens: 1000, completion_tokens: 0 };
    const cost = computeGrokCost(usage, false);
    expect(cost).toBeCloseTo(1000 * GROK_INPUT_COST_PER_TOKEN, 10);
  });

  it("出力トークンのみの場合、正しいコストを計算する", () => {
    const usage = { prompt_tokens: 0, completion_tokens: 500 };
    const cost = computeGrokCost(usage, false);
    expect(cost).toBeCloseTo(500 * GROK_OUTPUT_COST_PER_TOKEN, 10);
  });

  it("入力と出力の両方がある場合、正しいコストを計算する", () => {
    const usage = { prompt_tokens: 100, completion_tokens: 50 };
    const expectedCost = 100 * GROK_INPUT_COST_PER_TOKEN + 50 * GROK_OUTPUT_COST_PER_TOKEN;
    const cost = computeGrokCost(usage, false);
    expect(cost).toBeCloseTo(expectedCost, 10);
  });

  it("Web検索オプション有効時、追加コストが加算される", () => {
    const usage = { prompt_tokens: 100, completion_tokens: 50 };
    const baseCost = 100 * GROK_INPUT_COST_PER_TOKEN + 50 * GROK_OUTPUT_COST_PER_TOKEN;
    const cost = computeGrokCost(usage, true);
    expect(cost).toBeCloseTo(baseCost + GROK_WEB_SEARCH_COST, 10);
  });

  it("usageがundefinedの場合、0を返す", () => {
    const cost = computeGrokCost(undefined, false);
    expect(cost).toBe(0);
  });

  it("usageがnullの場合、0を返す", () => {
    const cost = computeGrokCost(null, false);
    expect(cost).toBe(0);
  });

  it("別形式のキー (promptTokens/completionTokens) でも動作する", () => {
    const usage = { promptTokens: 100, completionTokens: 50 };
    const expectedCost = 100 * GROK_INPUT_COST_PER_TOKEN + 50 * GROK_OUTPUT_COST_PER_TOKEN;
    const cost = computeGrokCost(usage, false);
    expect(cost).toBeCloseTo(expectedCost, 10);
  });

  it("大量トークン (1M tokens) の計算が正しい", () => {
    const usage = { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 };
    const expectedCost = 0.2 + 0.5; // $0.2 for input + $0.5 for output = $0.7
    const cost = computeGrokCost(usage, false);
    expect(cost).toBeCloseTo(expectedCost, 6);
  });
});

describe("課金ロジック - computeGeminiCost", () => {
  it("1k解像度の画像生成コストを正しく計算する", () => {
    const usage = { promptTokenCount: 0, candidatesTokenCount: 0 };
    const cost = computeGeminiCost(usage, "1k", false);
    expect(cost).toBeCloseTo(GEMINI_IMAGE_OUTPUT_COSTS["1k"], 6);
  });

  it("2k解像度の画像生成コストを正しく計算する", () => {
    const usage = { promptTokenCount: 0, candidatesTokenCount: 0 };
    const cost = computeGeminiCost(usage, "2k", false);
    expect(cost).toBeCloseTo(GEMINI_IMAGE_OUTPUT_COSTS["2k"], 6);
  });

  it("4k解像度の画像生成コストを正しく計算する", () => {
    const usage = { promptTokenCount: 0, candidatesTokenCount: 0 };
    const cost = computeGeminiCost(usage, "4k", false);
    expect(cost).toBeCloseTo(GEMINI_IMAGE_OUTPUT_COSTS["4k"], 6);
  });

  it("テキストトークンと画像生成を組み合わせたコストを計算する", () => {
    const usage = { promptTokenCount: 100, candidatesTokenCount: 50 };
    const textCost = 100 * GEMINI_TEXT_INPUT_COST_PER_TOKEN + 50 * GEMINI_TEXT_OUTPUT_COST_PER_TOKEN;
    const imageCost = GEMINI_IMAGE_OUTPUT_COSTS["2k"];
    const cost = computeGeminiCost(usage, "2k", false);
    expect(cost).toBeCloseTo(textCost + imageCost, 10);
  });

  it("参照画像を含む場合、入力画像コストが追加される", () => {
    const usage = { promptTokenCount: 0, candidatesTokenCount: 0 };
    const baseCost = GEMINI_IMAGE_OUTPUT_COSTS["2k"];
    const cost = computeGeminiCost(usage, "2k", true);
    expect(cost).toBeCloseTo(baseCost + GEMINI_IMAGE_INPUT_COST, 6);
  });

  it("usageがundefinedでも画像コストは計算される", () => {
    const cost = computeGeminiCost(undefined, "2k", false);
    expect(cost).toBeCloseTo(GEMINI_IMAGE_OUTPUT_COSTS["2k"], 6);
  });

  it("フル利用シナリオ: テキスト + 4K画像 + 参照画像", () => {
    const usage = { promptTokenCount: 500, candidatesTokenCount: 200 };
    const textCost = 500 * GEMINI_TEXT_INPUT_COST_PER_TOKEN + 200 * GEMINI_TEXT_OUTPUT_COST_PER_TOKEN;
    const expectedCost = textCost + GEMINI_IMAGE_OUTPUT_COSTS["4k"] + GEMINI_IMAGE_INPUT_COST;
    const cost = computeGeminiCost(usage, "4k", true);
    expect(cost).toBeCloseTo(expectedCost, 10);
  });
});

describe("課金ロジック - 実際の利用シナリオ", () => {
  it("シナリオ1: 短いタスク名生成 (Grok)", () => {
    // 平均的なモンスター名生成: 約50入力トークン、10出力トークン
    const usage = { prompt_tokens: 50, completion_tokens: 10 };
    const cost = computeGrokCost(usage, false);
    // 期待コスト: $0.000015 程度
    expect(cost).toBeLessThan(0.0001);
    expect(cost).toBeGreaterThan(0);
  });

  it("シナリオ2: AI審査付きタスク完了 (Grok)", () => {
    // タスク完了審査: 約200入力トークン、100出力トークン
    const usage = { prompt_tokens: 200, completion_tokens: 100 };
    const cost = computeGrokCost(usage, false);
    // 期待コスト: $0.00009 程度
    expect(cost).toBeLessThan(0.001);
    expect(cost).toBeGreaterThan(0);
  });

  it("シナリオ3: モンスター画像生成 (Gemini 2k)", () => {
    const usage = { promptTokenCount: 100, candidatesTokenCount: 50 };
    const cost = computeGeminiCost(usage, "2k", false);
    // 主に画像コスト: $0.134 + テキストコスト
    expect(cost).toBeGreaterThan(0.13);
    expect(cost).toBeLessThan(0.15);
  });

  it("シナリオ4: 月間100タスク作成時の推定コスト", () => {
    // 各タスク: モンスター名生成 + 画像生成
    const tasksPerMonth = 100;
    
    // Grok (名前生成): 50入力 + 10出力 per task
    const grokUsagePerTask = { prompt_tokens: 50, completion_tokens: 10 };
    const grokCostPerTask = computeGrokCost(grokUsagePerTask, false);
    
    // Gemini (画像生成 2k): 100入力トークン
    const geminiUsagePerTask = { promptTokenCount: 100, candidatesTokenCount: 50 };
    const geminiCostPerTask = computeGeminiCost(geminiUsagePerTask, "2k", false);
    
    const totalMonthlyCost = (grokCostPerTask + geminiCostPerTask) * tasksPerMonth;
    
    // 100タスクで約 $14 程度（主に画像コスト）
    expect(totalMonthlyCost).toBeGreaterThan(10);
    expect(totalMonthlyCost).toBeLessThan(20);
  });
});