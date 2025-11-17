# 務メ討魔録 (Tsutome Touma-roku)

## 概要
和風妖怪退治をテーマにしたゲーミフィケーションTo-Doリストアプリ。
スマホ完全最適化された縦画面デザインで、タスクを妖怪退治に変えて楽しく生産性を向上させます。
PWA対応でオフラインでも利用可能、ホーム画面追加でネイティブアプリのような体験を提供。

## プロジェクト構成

### フロントエンド (React + TypeScript + PWA)
- **デザインシステム**: 和風カラーパレット、日本語フォント (Noto Sans JP, Zen Antique, Roboto Mono)
- **主要ページ** (全て実装完了):
  - `/` - ホーム (務メ一覧、刺客表示)
  - `/shuren` - 修練一覧 (習慣タスク、連続記録管理)
  - `/boss` - ボスバトル画面
  - `/shop` - ショップ (アイテム・装備・素材購入)
  - `/profile` - プレイヤーステータスと記録、転職システム
  - `/calendar` - カレンダー表示 (月次タスクビュー)
  - `/story` - ストーリーアーカイブ (ビューア付き)
- **PWA機能**:
  - Service Worker によるオフライン対応
  - ホーム画面追加対応
  - キャッシュ戦略実装 (Network First for API, Cache First for assets)
  - インストール促進UI

### バックエンド (Express + PostgreSQL)
- **データベース**: PostgreSQL (完全永続化対応)
- **データモデル**: Player (職業システム付き), Tsutome, Shuren, Shihan, Shikaku, Boss, Story, Item, Inventory
- **AI統合**: OpenAI (画像生成、テキスト生成、難易度判定、タスク審査)
- **ゲームメカニクス**:
  - レベルアップシステム (XP要求: level * 100)
  - 報酬システム (難易度別XP: easy 10-20, medium 30-50, hard 70-100, legendary 150-200)
  - ペナルティシステム (期限切れタスクでHP減少)
  - 連続達成ボーナス (streak * 5 XP)

### 職業システム (全6職業実装)
1. **侍 (Samurai)**: 戦闘タスクXP +20%、スキル「一刀両断」
2. **僧 (Monk)**: 最大HP +50、修練ボーナス、スキル「金剛」
3. **忍 (Ninja)**: 緊急タスク報酬2倍、スキル「影分身」
4. **学者 (Scholar)**: 勉強XP +30%、コイン +25%、スキル「博識」
5. **守護 (Guardian)**: ダメージ -30%、活力 +25、スキル「鉄壁」
6. **陰陽師 (Mystic)**: 全ステータス +5、レアドロップ2倍、スキル「陰陽術」

### 技術スタック
- **Frontend**: React, Wouter, TanStack Query, Shadcn UI, Tailwind CSS, Framer Motion
- **Backend**: Express.js, PostgreSQL (Drizzle ORM)
- **PWA**: Service Worker, Web App Manifest
- **AI**: OpenAI (Replit AI Integrations経由)
- **デザイン**: モバイルファースト、和風UI、360px-430px最適化

## 完了した機能 (2025-11-17)

### ✅ Phase 1: 基礎実装
- 全データスキーマ定義とDB永続化
- 和風デザインシステム構築
- 全ページコンポーネント実装

### ✅ Phase 2: ゲーム機能
- 全APIエンドポイント実装
- ゲームメカニクス (報酬、ペナルティ、レベルアップ)
- 職業システム (6職業、職業レベル、転職機能)
- タスク管理 (作成、完了、期限管理)
- 習慣タスク (連続記録、定期実行)

### ✅ Phase 3: PWA化
- Service Worker実装
- オフライン対応
- ホーム画面追加対応
- キャッシュ戦略最適化

## ユーザー設定
- 言語: 日本語
- ターゲット: スマホユーザー (360px-430px)
- テーマ: 和風妖怪退治
- インストール: PWA対応でホーム画面追加可能
