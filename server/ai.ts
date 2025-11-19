import OpenAI from "openai";
import pLimit from "p-limit";
import pRetry from "p-retry";

// Replit AI Integrations経由でOpenAIを使用
// 環境変数が設定されていない場合はエラーを出す
if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  console.warn("WARNING: OpenAI Integration environment variables not found. AI features may not work.");
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "",
  timeout: 10000, // 10秒のタイムアウト
  maxRetries: 1, // リトライは1回まで
});

// 画像生成のレート制限 - 同時に1つのみ生成を許可
const imageGenerationLimit = pLimit(1);

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

// タスク難易度を自動判定する関数
export async function assessTaskDifficulty(
  taskTitle: string, 
  taskDescription?: string,
  genre?: string
): Promise<"easy" | "normal" | "hard" | "veryHard" | "extreme"> {
  try {
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
      return translateDifficulty(aiDifficulty);
    }
    
    // フォールバック - "normal" をデフォルトに
    console.warn(`Invalid difficulty returned: ${aiDifficulty}, using normal as default`);
    return "normal";
  } catch (error) {
    console.error("タスク難易度判定エラー:", error);
    return "normal"; // エラー時はnormalをデフォルトに
  }
}

// タスク完了を詳細に審査する関数
export async function verifyTaskCompletionAdvanced(
  taskTitle: string,
  taskDescription: string | null,
  completionReport: string,
  monsterName: string,
  difficulty: string
): Promise<{
  approved: boolean;
  feedback: string;
  bonusMultiplier: number; // 1.0 = 通常, 1.2 = 優秀, 0.8 = 不十分
}> {
  try {
    const prompt = `あなたは務メ討魔録の審査官です。プレイヤーのタスク完了報告を厳正に審査してください。

【タスク情報】
タイトル: ${taskTitle}
${taskDescription ? `詳細: ${taskDescription}` : ''}
難易度: ${difficulty}
討伐対象: ${monsterName}

【プレイヤーの完了報告】
${completionReport}

【審査基準】
1. 報告内容がタスクの要求を満たしているか
2. 具体的な成果や進捗が報告されているか
3. 誠実に取り組んだ証拠があるか

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
- 0.8: 最低限の完了
- 0.5: 不十分だが部分的に認める`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
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

    return {
      approved,
      feedback,
      bonusMultiplier,
    };
  } catch (error) {
    console.error("タスク完了審査エラー:", error);
    // エラー時は通常承認
    return {
      approved: true,
      feedback: "自動審査が利用できないため、承認されました。",
      bonusMultiplier: 1.0,
    };
  }
}

// 妖怪の名前を生成
export async function generateMonsterName(taskTitle: string, genre: string, difficulty: string): Promise<string> {
  // OpenAI APIが設定されていない場合は即座にフォールバック
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    console.log("OpenAI API not configured, using fallback monster name");
    const genreNames: Record<string, string[]> = {
      study: ["学魔", "文妖", "読霊", "知妖"],
      exercise: ["体魔", "力妖", "動鬼", "筋霊"],
      work: ["仕魔", "労鬼", "務妖", "職霊"],
      hobby: ["趣妖", "楽魔", "遊鬼", "好霊"],
      housework: ["家魔", "掃妖", "片鬼", "整霊"],
      fun: ["楽妖", "笑魔", "遊霊", "愉鬼"],
    };
    const names = genreNames[genre] || ["務妖", "仕魔", "労鬼", "働霊"];
    return names[Math.floor(Math.random() * names.length)];
  }

  try {
    console.log("Generating monster name with OpenAI...");
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
    console.log("Monster name generated:", name);
    return name || "妖怪";
  } catch (error: any) {
    console.error("妖怪名生成エラー:", error?.message || error);
    // タイムアウトまたはエラーの場合はフォールバック
    const genreNames: Record<string, string[]> = {
      study: ["学魔", "文妖", "読霊", "知妖"],
      exercise: ["体魔", "力妖", "動鬼", "筋霊"],
      work: ["仕魔", "労鬼", "務妖", "職霊"],
      hobby: ["趣妖", "楽魔", "遊鬼", "好霊"],
      housework: ["家魔", "掃妖", "片鬼", "整霊"],
      fun: ["楽妖", "笑魔", "遊霊", "愉鬼"],
    };
    const names = genreNames[genre] || ["務妖", "仕魔", "労鬼", "働霊"];
    return names[Math.floor(Math.random() * names.length)];
  }
}

// 修練の名前を生成
export async function generateTrainingName(taskTitle: string, genre: string): Promise<string> {
  try {
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

    return response.choices[0]?.message?.content?.trim() || "修練の型";
  } catch (error) {
    console.error("修練名生成エラー:", error);
    return `${genre}の型`;
  }
}

// 師範の名前を生成
export async function generateMasterName(taskTitle: string, genre: string): Promise<string> {
  try {
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

    return response.choices[0]?.message?.content?.trim() || "師範";
  } catch (error) {
    console.error("師範名生成エラー:", error);
    return "導きの師範";
  }
}

// 刺客の名前を生成
export async function generateAssassinName(taskTitle: string, difficulty: string): Promise<string> {
  try {
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

    return response.choices[0]?.message?.content?.trim() || "刺客";
  } catch (error) {
    console.error("刺客名生成エラー:", error);
    return "影の刺客";
  }
}

// ボスの名前を生成
export async function generateBossName(bossNumber: number): Promise<string> {
  try {
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

    return response.choices[0]?.message?.content?.trim() || `第${bossNumber}の大敵`;
  } catch (error) {
    console.error("ボス名生成エラー:", error);
    return `第${bossNumber}の大敵`;
  }
}

// ストーリーテキスト生成
export async function generateStoryText(bossNumber: number, bossName: string): Promise<string> {
  try {
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

    return response.choices[0]?.message?.content?.trim() || `第${bossNumber}章の物語`;
  } catch (error) {
    console.error("ストーリー生成エラー:", error);
    return `${bossName}との戦いが始まる...`;
  }
}

// 画像生成（妖怪・修練・師範・刺客・ボス・ストーリー）
export async function generateImage(prompt: string, type: "monster" | "training" | "master" | "assassin" | "boss" | "story"): Promise<string> {
  // Replit AI Integration は画像生成をサポートしていない
  // 将来的に別のプロバイダーを使用する予定
  console.log(`Skipping ${type} image generation - not supported in current integration`);
  return "";
}

// 難易度を判定（AIベース）
export async function assessDifficulty(taskTitle: string, genre: string): Promise<string> {
  try {
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

    const difficulty = response.choices[0]?.message?.content?.trim() || "normal";
    const validDifficulties = ["easy", "normal", "hard", "veryHard", "extreme"];
    return validDifficulties.includes(difficulty) ? difficulty : "normal";
  } catch (error) {
    console.error("難易度判定エラー:", error);
    return "normal";
  }
}

// タスク完了審査（AIベース）
export async function verifyTaskCompletion(taskTitle: string, evidence: string): Promise<boolean> {
  try {
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

    const result = response.choices[0]?.message?.content?.trim().toLowerCase() || "no";
    return result === "yes";
  } catch (error) {
    console.error("タスク審査エラー:", error);
    return false;
  }
}
