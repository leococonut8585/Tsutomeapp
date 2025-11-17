import OpenAI from "openai";

// Replit AI Integrations経由でOpenAIを使用
// 環境変数が設定されていない場合はエラーを出す
if (!process.env.REPLIT_AGENT_API_KEY || !process.env.REPLIT_AGENT_API_BASE_URL) {
  console.warn("WARNING: Replit AI Integration environment variables not found. AI features may not work.");
}

const openai = new OpenAI({
  apiKey: process.env.REPLIT_AGENT_API_KEY || "",
  baseURL: process.env.REPLIT_AGENT_API_BASE_URL || "",
});

// 妖怪の名前を生成
export async function generateMonsterName(taskTitle: string, genre: string, difficulty: string): Promise<string> {
  try {
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

    return response.choices[0]?.message?.content?.trim() || "妖怪";
  } catch (error) {
    console.error("妖怪名生成エラー:", error);
    return `${genre}の妖怪`;
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
export async function generateImage(prompt: string, type: "monster" | "training" | "master" | "assassin" | "boss" | "story"): Promise<string | null> {
  try {
    // 和風スタイルのベースプロンプト
    const stylePrompts = {
      monster: "Japanese yokai monster in traditional ukiyo-e art style, detailed ink painting, dramatic colors",
      training: "Japanese martial arts training scene in traditional ukiyo-e art style, serene and powerful",
      master: "Japanese martial arts master in traditional ukiyo-e art style, wise and powerful presence",
      assassin: "Japanese ninja assassin in traditional ukiyo-e art style, mysterious and deadly",
      boss: "Epic Japanese demon boss in traditional ukiyo-e art style, terrifying and majestic",
      story: "Japanese fantasy landscape in traditional ukiyo-e art style, mystical atmosphere",
    };

    const fullPrompt = `${prompt}, ${stylePrompts[type]}`;

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      n: 1,
      size: "512x512",
    });

    return response.data[0]?.url || null;
  } catch (error) {
    console.error("画像生成エラー:", error);
    return null;
  }
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
