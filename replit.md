# 務メ討魔録 (Tsutome Touma-roku)

## 概要
和風妖怪退治をテーマにしたゲーミフィケーションTo-Doリストアプリ。
スマホ完全最適化された縦画面デザインで、タスクを妖怪退治に変えて楽しく生産性を向上させます。

## プロジェクト構成

### フロントエンド (React + TypeScript)
- **デザインシステム**: 和風カラーパレット、日本語フォント (Noto Sans JP, Zen Antique, Roboto Mono)
- **主要ページ**:
  - `/` - ホーム (務メ一覧、刺客表示)
  - `/shuren` - 修練一覧 (習慣タスク)
  - `/boss` - ボスバトル画面
  - `/shop` - ショップ (アイテム・装備・素材購入)
  - `/profile` - プレイヤーステータスと記録
  - `/calendar` - カレンダー表示
  - `/story` - ストーリーアーカイブ

### バックエンド (Express + TypeScript)
- **データモデル**: Player, Tsutome(務メ), Shuren(修練), Shihan(師範), Shikaku(刺客), Boss, Story, Item, Inventory
- **AI統合**: OpenAI (画像生成、テキスト生成、難易度判定、タスク審査)

## 技術スタック
- **Frontend**: React, Wouter, TanStack Query, Shadcn UI, Tailwind CSS, Framer Motion
- **Backend**: Express.js, In-memory storage (MVPフェーズ)
- **AI**: OpenAI (Replit AI Integrations経由)
- **デザイン**: モバイルファースト、和風UI、360px-430px最適化

## 最近の変更 (2025-01-17)

### Phase 1: Schema & Frontend ✅
- 全データスキーマ定義完了 (shared/schema.ts)
- 和風デザインシステム構築
  - カラーパレット: クリーム色和紙ベース、深紅アクセント
  - 日本語フォント統合
  - スマホ最適化CSS (タッチターゲット48px+)
- 全ページコンポーネント実装
  - BottomNav, StatsBar, TsutomeCard, ShurenCard
  - Home, Shuren, Boss, Shop, Profile, Calendar, Story
  - TaskFormDialog (タスク作成フォーム)
- ローディング、エラー、空状態の美しいUI実装

### 次のステップ
- Phase 2: Backend実装 (API、OpenAI統合、ゲームロジック)
- Phase 3: Integration & Testing

## ユーザー設定
- 言語: 日本語
- ターゲット: スマホユーザー (360px-430px)
- テーマ: 和風妖怪退治
