import OpenAI from "openai";
import pLimit from "p-limit";
import pRetry from "p-retry";
import { logger } from "./utils/logger";

// Create a child logger for AI module
const aiLogger = logger.child("AI");

// AI Service availability tracking
let aiServiceStatus = {
  available: false,
  lastCheck: new Date(),
  consecutiveFailures: 0,
  lastError: null as string | null,
};

// Check if AI service is configured
const isAIConfigured = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);

if (!isAIConfigured) {
  aiLogger.warn("OpenAI Integration environment variables not found. AI features will use fallback methods.");
  aiServiceStatus.available = false;
} else {
  aiServiceStatus.available = true;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "",
  timeout: 10000, // 10秒のタイムアウト
  maxRetries: 1, // OpenAI SDK内のリトライは1回まで
});

// 画像生成のレート制限 - 同時に1つのみ生成を許可
const imageGenerationLimit = pLimit(1);

// Predefined fallback data for Japanese names
const fallbackNames = {
  monster: {
    study: ["学魔", "文妖", "読霊", "知妖", "書鬼", "習魔", "頁霊", "墨妖"],
    exercise: ["体魔", "力妖", "動鬼", "筋霊", "汗妖", "走魔", "鍛霊", "体鬼"],
    work: ["仕魔", "労鬼", "務妖", "職霊", "業魔", "作妖", "勤鬼", "働霊"],
    hobby: ["趣妖", "楽魔", "遊鬼", "好霊", "興魔", "娯妖", "楽霊", "趣鬼"],
    housework: ["家魔", "掃妖", "片鬼", "整霊", "磨魔", "洗妖", "拭鬼", "家霊"],
    fun: ["楽妖", "笑魔", "遊霊", "愉鬼", "喜妖", "戯魔", "楽鬼", "笑霊"],
    default: ["務妖", "仕魔", "労鬼", "働霊", "妖怪", "魔物", "怪異", "鬼神"],
  },
  training: {
    study: ["学習の型", "文武の道", "知恵の技", "読書の型"],
    exercise: ["体練の型", "鍛錬の道", "健体の技", "練武の型"],
    work: ["仕事の型", "労働の道", "務めの技", "職人の型"],
    hobby: ["趣味の型", "楽しみの道", "興味の技", "好みの型"],
    housework: ["家事の型", "清潔の道", "整頓の技", "片付けの型"],
    fun: ["遊戯の型", "楽しみの道", "愉快の技", "笑顔の型"],
    default: ["修練の型", "鍛錬の道", "武芸の技", "精進の型"],
  },
  master: ["導きの師範", "教えの老師", "武芸の達人", "知恵の賢者", "道の師匠", "技の名人"],
  assassin: ["影の刺客", "闇の忍者", "夜叉の使い", "風の暗殺者", "霧の追手", "月影の忍"],
  boss: (num: number) => {
    const bosses = [
      "魔王", "鬼神", "大妖怪", "邪神", "闇の帝王", "冥界の主",
      "混沌の王", "破壊神", "終焉の魔", "虚無の支配者"
    ];
    return `第${num}の${bosses[Math.min(num - 1, bosses.length - 1)]}`;
  },
};

// Story templates for fallback
const storyTemplates = [
  (bossNumber: number, bossName: string) => 
    `暗黒の時代が訪れた。${bossName}が現世に降臨し、人々は恐怖に震えている。しかし一人の戦士が立ち上がった。今、第${bossNumber}の戦いが始まろうとしている。`,
  (bossNumber: number, bossName: string) => 
    `遥か昔より封印されていた${bossName}が目覚めた。その力は計り知れず、世界を滅ぼす力を持つ。勇者よ、第${bossNumber}の試練に挑め。`,
  (bossNumber: number, bossName: string) => 
    `${bossName}の影が世界を覆い始めた。希望は失われつつある。だが、運命の戦士が現れた。第${bossNumber}章の幕が上がる。`,
];

// Helper function to check if error is retryable
function isRetryableError(error: any): boolean {
  // Check for specific error types that warrant a retry
  if (error?.response?.status === 429) return true; // Rate limit
  if (error?.response?.status >= 500) return true; // Server errors
  if (error?.code === 'ECONNRESET') return true; // Connection reset
  if (error?.code === 'ETIMEDOUT') return true; // Timeout
  if (error?.code === 'ENOTFOUND') return true; // DNS issues
  if (error?.message?.includes('timeout')) return true; // Timeout errors
  if (error?.message?.includes('ECONNREFUSED')) return true; // Connection refused
  return false;
}

// Update AI service status
function updateServiceStatus(success: boolean, error?: any) {
  if (success) {
    aiServiceStatus.consecutiveFailures = 0;
    aiServiceStatus.available = true;
    aiServiceStatus.lastError = null;
  } else {
    aiServiceStatus.consecutiveFailures++;
    aiServiceStatus.lastError = error?.message || 'Unknown error';
    
    // Mark service as unavailable after 3 consecutive failures
    if (aiServiceStatus.consecutiveFailures >= 3) {
      aiServiceStatus.available = false;
      aiLogger.error(`AI service marked as unavailable after ${aiServiceStatus.consecutiveFailures} consecutive failures`);
    }
  }
  aiServiceStatus.lastCheck = new Date();
}

// Generic retry wrapper with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallback: () => T
): Promise<T> {
  // If AI is not configured or marked unavailable, use fallback immediately
  if (!isAIConfigured || !aiServiceStatus.available) {
    aiLogger.debug(`${operationName}: AI service unavailable, using fallback`);
    return fallback();
  }

  try {
    const result = await pRetry(
      async () => {
        try {
          const res = await operation();
          updateServiceStatus(true);
          return res;
        } catch (error) {
          // Log the specific error details
          aiLogger.warn(`${operationName} attempt failed:`, {
            error: error?.message || error,
            status: error?.response?.status,
            code: error?.code,
          });
          
          // Only retry if it's a retryable error
          if (!isRetryableError(error)) {
            // Create a custom error to abort retries
            const abortError = new Error(error?.message || 'Non-retryable error');
            (abortError as any).name = 'AbortError';
            throw abortError;
          }
          throw error;
        }
      },
      {
        retries: 3,
        factor: 2, // Exponential backoff factor
        minTimeout: 1000, // Start with 1 second
        maxTimeout: 10000, // Max 10 seconds between retries
        onFailedAttempt: (error) => {
          aiLogger.debug(
            `${operationName} retry attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
          );
        },
        shouldRetry: (error) => {
          // Don't retry if it's an AbortError
          return error?.name !== 'AbortError';
        },
      }
    );
    return result;
  } catch (error) {
    updateServiceStatus(false, error);
    aiLogger.error(`${operationName} failed after all retries:`, {
      error: error?.message || error,
      consecutiveFailures: aiServiceStatus.consecutiveFailures,
    });
    return fallback();
  }
}

// 難易度マッピング関数 - AI応答をスキーマに合わせて変換
function translateDifficulty(aiDifficulty: "easy" | "medium" | "hard" | "legendary"): "easy" | "normal" | "hard" | "veryHard" | "extreme" {
  const difficultyMap = {
    'easy': 'easy' as const,
    'medium': 'normal' as const,
    'hard': 'hard' as const,
    'legendary': 'extreme' as const
  };
  
  return difficultyMap[aiDifficulty];
}

// Rule-based difficulty assessment fallback
function assessDifficultyByRules(
  taskTitle: string,
  taskDescription?: string,
  genre?: string
): "easy" | "normal" | "hard" | "veryHard" | "extreme" {
  const titleLength = taskTitle.length;
  const descriptionLength = taskDescription?.length || 0;
  const totalLength = titleLength + descriptionLength;
  
  // Keywords that indicate difficulty
  const easyKeywords = ["簡単", "シンプル", "軽い", "ちょっと", "少し", "確認", "チェック"];
  const hardKeywords = ["難しい", "困難", "複雑", "高度", "専門", "プロジェクト", "長期"];
  const extremeKeywords = ["極限", "究極", "最高", "完璧", "マスター", "エキスパート"];
  
  const titleLower = taskTitle.toLowerCase();
  
  // Check for difficulty keywords
  if (extremeKeywords.some(keyword => titleLower.includes(keyword))) {
    return "extreme";
  }
  if (hardKeywords.some(keyword => titleLower.includes(keyword))) {
    return Math.random() > 0.5 ? "veryHard" : "hard";
  }
  if (easyKeywords.some(keyword => titleLower.includes(keyword))) {
    return "easy";
  }
  
  // Use title/description length as a proxy for complexity
  if (totalLength < 20) return "easy";
  if (totalLength < 50) return "normal";
  if (totalLength < 100) return "hard";
  if (totalLength < 150) return "veryHard";
  return "extreme";
}

// タスク難易度を自動判定する関数
export async function assessTaskDifficulty(
  taskTitle: string, 
  taskDescription?: string,
  genre?: string
): Promise<"easy" | "normal" | "hard" | "veryHard" | "extreme"> {
  return withRetry(
    async () => {
      const prompt = `あなたはタスクの難易度を評価する専門家です。

タスク: ${taskTitle}
${taskDescription ? `詳細: ${taskDescription}` : ''}
${genre ? `ジャンル: ${genre}` : ''}

このタスクの難易度を以下の基準で判定してください：

【easy - 易】10-30分で完了、簡単な作業
- 日常的な繰り返し作業
- 単純な確認やチェック
- 短時間の習慣

【medium - 中】30分-2時間、集中が必要
- 計画や思考が必要な作業
- 複数ステップの作業
- 学習や練習

【hard - 難】2時間-1日、高い集中力が必要
- 複雑な問題解決
- 創造的な作業
- 長時間の集中作業

【legendary - 伝説】数日以上、特別な努力が必要
- 大規模プロジェクト
- 高度な専門知識が必要
- 長期的な取り組み

難易度を1つだけ選んで、以下の形式で回答してください：
easy, medium, hard, legendary のいずれか1単語のみ`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3, // 低めの温度で一貫性のある判定
        max_tokens: 10,
      });

      const aiDifficulty = response.choices[0]?.message?.content?.trim().toLowerCase();
      
      // 有効な難易度値のチェック
      if (aiDifficulty === "easy" || aiDifficulty === "medium" || aiDifficulty === "hard" || aiDifficulty === "legendary") {
        // AIの応答をスキーマ形式に変換
        aiLogger.debug(`assessTaskDifficulty: AI returned ${aiDifficulty} for "${taskTitle}"`);
        return translateDifficulty(aiDifficulty);
      }
      
      // Invalid response from AI
      aiLogger.warn(`assessTaskDifficulty: Invalid difficulty returned: ${aiDifficulty}, using fallback`);
      return assessDifficultyByRules(taskTitle, taskDescription, genre);
    },
    'assessTaskDifficulty',
    () => {
      aiLogger.info(`assessTaskDifficulty: Using rule-based fallback for "${taskTitle}"`);
      return assessDifficultyByRules(taskTitle, taskDescription, genre);
    }
  );
}

// タスク完了を詳細に審査する関数
export async function verifyTaskCompletionAdvanced(
  taskTitle: string,
  taskDescription: string | null,
  completionReport: string,
  monsterName: string,
  difficulty: string,
  aiStrictness: string = "lenient" // デフォルトは寛容
): Promise<{
  approved: boolean;
  feedback: string;
  bonusMultiplier: number; // 1.0 = 通常, 1.2 = 優秀, 0.8 = 不十分
}> {
  return withRetry(
    async () => {
      // 審査レベルに応じたプロンプトと温度を設定
      const getStrictnessConfig = (level: string) => {
        switch (level) {
          case "very_lenient":
            return {
              role: "とても優しい審査官",
              policy: "ほぼ全ての報告を承認する極めて寛容な審査",
              criteria: "1. 報告があれば即承認\n2. 内容不問で努力を評価\n3. 常に励まし、褒める",
              note: "※ほぼ全てを承認してください。よほどの空欄でない限り承認。",
              temperature: 0.9,
              defaultBonus: 1.0
            };
          case "lenient":
            return {
              role: "優しい審査官",
              policy: "プレイヤーの報告を好意的に審査する寛容な姿勢",
              criteria: "1. 何らかの報告があれば基本的に承認\n2. 具体性が不足していても努力を認める\n3. 短い報告でも完了と認める",
              note: "※基本的にapproved: trueで承認してください。",
              temperature: 0.7,
              defaultBonus: 1.0
            };
          case "balanced":
            return {
              role: "公平な審査官",
              policy: "適度な基準でバランスよく審査",
              criteria: "1. タスクに関連した報告があるか確認\n2. ある程度の具体性を求める\n3. 努力の跡が見えれば承認",
              note: "※タスクと関係ない報告や極端に短い場合は不承認も可。",
              temperature: 0.5,
              defaultBonus: 1.0
            };
          case "strict":
            return {
              role: "厳格な審査官",
              policy: "詳細で具体的な報告を求める厳しい審査",
              criteria: "1. タスクの要求を満たす具体的な成果報告\n2. 実際の行動や結果の詳細\n3. 手抜きや曖昧な報告は不承認",
              note: "※具体性のない報告は不承認にしてください。",
              temperature: 0.3,
              defaultBonus: 0.9
            };
          case "very_strict":
            return {
              role: "最も厳格な審査官",
              policy: "完璧な報告のみを承認する極めて厳しい審査",
              criteria: "1. タスクの全要素を網羅した詳細な報告\n2. 明確な成果と具体的な数値や事実\n3. 証拠となる詳細な説明",
              note: "※完璧でない報告は容赦なく不承認にしてください。",
              temperature: 0.1,
              defaultBonus: 0.8
            };
          default:
            return {
              role: "優しい審査官",
              policy: "プレイヤーの報告を好意的に審査する寛容な姿勢",
              criteria: "1. 何らかの報告があれば基本的に承認\n2. 具体性が不足していても努力を認める\n3. 短い報告でも完了と認める",
              note: "※基本的にapproved: trueで承認してください。",
              temperature: 0.7,
              defaultBonus: 1.0
            };
        }
      };

      const config = getStrictnessConfig(aiStrictness);
      
      const prompt = `あなたは務メ討魔録の${config.role}です。

【タスク情報】
タイトル: ${taskTitle}
${taskDescription ? `詳細: ${taskDescription}` : ''}
難易度: ${difficulty}
討伐対象: ${monsterName}

【プレイヤーの完了報告】
${completionReport}

【審査方針】
${config.policy}

【審査基準】
${config.criteria}

【判定】
以下のJSON形式で回答してください：
{
  "approved": true/false,
  "feedback": "審査結果のフィードバック（日本語、50文字以内）",
  "bonusMultiplier": 数値（0.5-1.5の範囲）
}

bonusMultiplierの基準：
- 1.5: 期待を大きく超える成果
- 1.2: 優秀な完了
- 1.0: 標準的な完了
- 0.9: 簡潔だが完了と認める
- 0.8: 最小限でも完了と認める
- 0.5: 不十分だが部分的に認める

${config.note}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: config.temperature,
        max_tokens: 200,
        response_format: { type: "json_object" },
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error("No response from AI");
      }

      const parsed = JSON.parse(result);
      
      // バリデーション
      const approved = typeof parsed.approved === 'boolean' ? parsed.approved : true;
      const feedback = typeof parsed.feedback === 'string' 
        ? parsed.feedback.substring(0, 100) 
        : "審査完了";
      const bonusMultiplier = typeof parsed.bonusMultiplier === 'number' 
        ? Math.min(1.5, Math.max(0.5, parsed.bonusMultiplier))
        : 1.0;

      aiLogger.debug(`verifyTaskCompletionAdvanced: AI approved=${approved} for "${taskTitle}"`);
      return {
        approved,
        feedback,
        bonusMultiplier,
      };
    },
    'verifyTaskCompletionAdvanced',
    () => {
      // Fallback: Auto-approve with warning
      aiLogger.warn(`verifyTaskCompletionAdvanced: AI unavailable, auto-approving task "${taskTitle}"`);
      
      // Simple rule-based approval based on report length
      const reportLength = completionReport.length;
      let feedback = "AIサービスが利用できないため、自動承認されました。";
      let bonusMultiplier = 1.0;
      
      if (reportLength < 10) {
        feedback = "報告が短いですが、承認されました。";
        bonusMultiplier = 0.8;
      } else if (reportLength > 100) {
        feedback = "詳細な報告、よく頑張りました！";
        bonusMultiplier = 1.2;
      }
      
      return {
        approved: true,
        feedback,
        bonusMultiplier,
      };
    }
  );
}

// Helper function to get random monster name from fallback lists
function getRandomMonsterName(genre: string): string {
  const names = fallbackNames.monster[genre as keyof typeof fallbackNames.monster] || fallbackNames.monster.default;
  return names[Math.floor(Math.random() * names.length)];
}

// 妖怪の名前を生成
export async function generateMonsterName(taskTitle: string, genre: string, difficulty: string): Promise<string> {
  return withRetry(
    async () => {
      const prompt = `あなたは和風ファンタジー世界の妖怪を命名する専門家です。

タスク: ${taskTitle}
ジャンル: ${genre}
難易度: ${difficulty}

このタスクを象徴する妖怪の名前を、以下の形式で1つだけ生成してください:
- 3〜6文字の漢字、もしくは漢字+ひらがなの組み合わせ
- 日本の妖怪や伝承の雰囲気を持つ名前
- タスクの内容や難易度を反映した名前

名前のみを出力してください（説明不要）。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 50,
      });

      const name = response.choices[0]?.message?.content?.trim();
      if (!name) {
        throw new Error("Empty response from AI");
      }
      
      aiLogger.debug(`generateMonsterName: AI generated "${name}" for task "${taskTitle}"`);
      return name;
    },
    'generateMonsterName',
    () => {
      const name = getRandomMonsterName(genre);
      aiLogger.info(`generateMonsterName: Using fallback name "${name}" for task "${taskTitle}"`);
      return name;
    }
  );
}

// Helper function to get random training name from fallback lists
function getRandomTrainingName(genre: string): string {
  const names = fallbackNames.training[genre as keyof typeof fallbackNames.training] || fallbackNames.training.default;
  return names[Math.floor(Math.random() * names.length)];
}

// 修練の名前を生成
export async function generateTrainingName(taskTitle: string, genre: string): Promise<string> {
  return withRetry(
    async () => {
      const prompt = `あなたは和風武芸の修練を命名する専門家です。

習慣タスク: ${taskTitle}
ジャンル: ${genre}

この習慣を象徴する修練の名前を、以下の形式で1つだけ生成してください:
- 3〜6文字の漢字、もしくは漢字+ひらがなの組み合わせ
- 「〜の型」「〜の道」「〜の技」などの武芸・修行的な名前
- タスクの内容を反映した名前

名前のみを出力してください（説明不要）。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 50,
      });

      const name = response.choices[0]?.message?.content?.trim();
      if (!name) {
        throw new Error("Empty response from AI");
      }
      
      aiLogger.debug(`generateTrainingName: AI generated "${name}" for task "${taskTitle}"`);
      return name;
    },
    'generateTrainingName',
    () => {
      const name = getRandomTrainingName(genre);
      aiLogger.info(`generateTrainingName: Using fallback name "${name}" for task "${taskTitle}"`);
      return name;
    }
  );
}

// 師範の名前を生成
export async function generateMasterName(taskTitle: string, genre: string): Promise<string> {
  return withRetry(
    async () => {
      const prompt = `あなたは和風武芸の師範を命名する専門家です。

長期目標: ${taskTitle}
ジャンル: ${genre}

この目標を導く師範の名前を、以下の形式で1つだけ生成してください:
- 4〜8文字の日本人名風の名前（姓+名、または雅号）
- 師匠、老師、達人の雰囲気を持つ名前
- ジャンルと目標を反映した名前

名前のみを出力してください（説明不要）。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 50,
      });

      const name = response.choices[0]?.message?.content?.trim();
      if (!name) {
        throw new Error("Empty response from AI");
      }
      
      aiLogger.debug(`generateMasterName: AI generated "${name}" for task "${taskTitle}"`);
      return name;
    },
    'generateMasterName',
    () => {
      const name = fallbackNames.master[Math.floor(Math.random() * fallbackNames.master.length)];
      aiLogger.info(`generateMasterName: Using fallback name "${name}" for task "${taskTitle}"`);
      return name;
    }
  );
}

// 刺客の名前を生成
export async function generateAssassinName(taskTitle: string, difficulty: string): Promise<string> {
  return withRetry(
    async () => {
      const prompt = `あなたは和風ファンタジー世界の刺客を命名する専門家です。

緊急タスク: ${taskTitle}
難易度: ${difficulty}

この緊急タスクを象徴する刺客の名前を、以下の形式で1つだけ生成してください:
- 3〜6文字の漢字、もしくは漢字+ひらがなの組み合わせ
- 忍者、刺客、暗殺者の雰囲気を持つ名前
- 難易度と緊急性を反映した名前

名前のみを出力してください（説明不要）。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 50,
      });

      const name = response.choices[0]?.message?.content?.trim();
      if (!name) {
        throw new Error("Empty response from AI");
      }
      
      aiLogger.debug(`generateAssassinName: AI generated "${name}" for task "${taskTitle}"`);
      return name;
    },
    'generateAssassinName',
    () => {
      const name = fallbackNames.assassin[Math.floor(Math.random() * fallbackNames.assassin.length)];
      aiLogger.info(`generateAssassinName: Using fallback name "${name}" for task "${taskTitle}"`);
      return name;
    }
  );
}

// ボスの名前を生成
export async function generateBossName(bossNumber: number): Promise<string> {
  return withRetry(
    async () => {
      const prompt = `あなたは和風ファンタジー世界の大敵（ボス妖怪）を命名する専門家です。

ボス番号: ${bossNumber}

第${bossNumber}の大敵の名前を、以下の形式で1つだけ生成してください:
- 4〜8文字の漢字、もしくは漢字+ひらがなの組み合わせ
- 大妖怪、魔王、鬼神などの強大な存在を感じさせる名前
- ボス番号が大きいほど、より強そうな名前

名前のみを出力してください（説明不要）。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 50,
      });

      const name = response.choices[0]?.message?.content?.trim();
      if (!name) {
        throw new Error("Empty response from AI");
      }
      
      aiLogger.debug(`generateBossName: AI generated "${name}" for boss #${bossNumber}`);
      return name;
    },
    'generateBossName',
    () => {
      const name = fallbackNames.boss(bossNumber);
      aiLogger.info(`generateBossName: Using fallback name "${name}" for boss #${bossNumber}`);
      return name;
    }
  );
}

// ストーリーテキスト生成
export async function generateStoryText(bossNumber: number, bossName: string): Promise<string> {
  return withRetry(
    async () => {
      const prompt = `あなたは和風ファンタジーの物語作家です。

ボス番号: ${bossNumber}
ボス名: ${bossName}

第${bossNumber}章の物語を、以下の形式で生成してください:
- 3〜5文の短い物語
- 和風ファンタジーの雰囲気
- ${bossName}が登場する物語
- プレイヤーが戦いに挑む決意を示す内容

物語のみを出力してください。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 200,
      });

      const story = response.choices[0]?.message?.content?.trim();
      if (!story) {
        throw new Error("Empty response from AI");
      }
      
      aiLogger.debug(`generateStoryText: AI generated story for boss #${bossNumber}`);
      return story;
    },
    'generateStoryText',
    () => {
      // Use random story template
      const template = storyTemplates[Math.floor(Math.random() * storyTemplates.length)];
      const story = template(bossNumber, bossName);
      aiLogger.info(`generateStoryText: Using fallback story for boss #${bossNumber}`);
      return story;
    }
  );
}

// 画像生成（妖怪・修練・師範・刺客・ボス・ストーリー）
export async function generateImage(prompt: string, type: "monster" | "training" | "master" | "assassin" | "boss" | "story"): Promise<string> {
  // Replit AI Integration は画像生成をサポートしていない
  // 将来的に別のプロバイダーを使用する予定
  aiLogger.info(`generateImage: Returning empty string for ${type} (image generation not supported)`);
  return "";
}

// 難易度を判定（AIベース）
export async function assessDifficulty(taskTitle: string, genre: string): Promise<string> {
  return withRetry(
    async () => {
      const prompt = `あなたはタスク難易度を評価する専門家です。

タスク: ${taskTitle}
ジャンル: ${genre}

このタスクの難易度を以下から1つ選んでください:
- easy: 簡単、すぐにできる
- normal: 普通、ある程度の努力が必要
- hard: 難しい、かなりの努力が必要
- veryHard: 非常に難しい、多大な努力が必要
- extreme: 極限、最高の努力が必要

難易度のみを出力してください（説明不要）。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 20,
      });

      const difficulty = response.choices[0]?.message?.content?.trim();
      if (!difficulty) {
        throw new Error("Empty response from AI");
      }
      
      const validDifficulties = ["easy", "normal", "hard", "veryHard", "extreme"];
      if (!validDifficulties.includes(difficulty)) {
        aiLogger.warn(`assessDifficulty: Invalid difficulty "${difficulty}", using fallback`);
        return "normal";
      }
      
      aiLogger.debug(`assessDifficulty: AI returned "${difficulty}" for task "${taskTitle}"`);
      return difficulty;
    },
    'assessDifficulty',
    () => {
      // Fallback to rule-based assessment
      const titleLength = taskTitle.length;
      let difficulty = "normal";
      
      if (titleLength < 15) difficulty = "easy";
      else if (titleLength < 30) difficulty = "normal";
      else if (titleLength < 50) difficulty = "hard";
      else if (titleLength < 70) difficulty = "veryHard";
      else difficulty = "extreme";
      
      aiLogger.info(`assessDifficulty: Using fallback difficulty "${difficulty}" for task "${taskTitle}"`);
      return difficulty;
    }
  );
}

// タスク完了審査（AIベース）
export async function verifyTaskCompletion(taskTitle: string, evidence: string): Promise<boolean> {
  return withRetry(
    async () => {
      const prompt = `あなたはタスク完了を審査する専門家です。

タスク: ${taskTitle}
証拠/報告: ${evidence}

このタスクが完了したと判断できますか？
「yes」または「no」のみで答えてください。`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 10,
      });

      const result = response.choices[0]?.message?.content?.trim().toLowerCase();
      if (!result) {
        throw new Error("Empty response from AI");
      }
      
      const approved = result === "yes";
      aiLogger.debug(`verifyTaskCompletion: AI returned ${approved ? 'approved' : 'rejected'} for task "${taskTitle}"`);
      return approved;
    },
    'verifyTaskCompletion',
    () => {
      // Fallback: Auto-approve with warning if evidence is provided
      const approved = evidence.length > 5; // At least some evidence provided
      aiLogger.warn(`verifyTaskCompletion: AI unavailable, auto-${approved ? 'approving' : 'rejecting'} task "${taskTitle}" based on evidence length`);
      return approved;
    }
  );
}

// Export AI service status for monitoring
export function getAIServiceStatus() {
  return {
    ...aiServiceStatus,
    configured: isAIConfigured,
  };
}
