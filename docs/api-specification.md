# Tsutome API 仕様書

## 概要

Tsutome（務メ討魔録）は、タスク管理をRPGゲーム化したWebアプリケーションです。

- **ベースURL**: `https://tsutomeapp.com/api`
- **認証方式**: セッションベース（Cookie認証）
- **コンテンツタイプ**: `application/json`

---

## 認証

### POST /api/login

ユーザーログイン

**リクエスト**
```json
{
  "username": "string",
  "password": "string"
}
```

**レスポンス (200)**
```json
{
  "player": {
    "id": "uuid",
    "name": "string",
    "username": "string",
    "role": "player|admin",
    "level": "number",
    "exp": "number",
    "hp": "number",
    "maxHp": "number",
    "coins": "number",
    "job": "string",
    "jobLevel": "number"
  }
}
```

**エラー**
- `400`: ユーザー名とパスワードを入力してください
- `401`: ユーザー名またはパスワードが違います
- `403`: アカウントが停止されています
- `429`: ログイン試行が多すぎます（レート制限: 5回/15分）

---

### POST /api/logout

ログアウト

**レスポンス (200)**
```json
{
  "success": true
}
```

---

### GET /api/me

現在のユーザー情報を取得

**レスポンス (200)**
```json
{
  "authenticated": true,
  "player": { ... }
}
```

**エラー**
- `401`: 未認証

---

## プレイヤー

### GET /api/player

現在のプレイヤー情報を取得

**認証**: 必須

**レスポンス (200)**
```json
{
  "id": "uuid",
  "name": "string",
  "username": "string",
  "role": "player|admin",
  "level": "number",
  "exp": "number",
  "hp": "number",
  "maxHp": "number",
  "coins": "number",
  "wisdom": "number",
  "strength": "number",
  "agility": "number",
  "vitality": "number",
  "luck": "number",
  "job": "string",
  "jobLevel": "number",
  "jobXp": "number",
  "streak": "number",
  "aiStrictness": "very_lenient|lenient|balanced|strict|very_strict"
}
```

---

### POST /api/player/change-password

パスワード変更

**認証**: 必須

**リクエスト**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**レスポンス (200)**
```json
{
  "success": true
}
```

**エラー**
- `400`: 現在のパスワードが一致しません
- `400`: 新しいパスワードは4文字以上で入力してください

---

### PATCH /api/player/update-ai-strictness

AI審査の厳格度を更新

**認証**: 必須

**リクエスト**
```json
{
  "aiStrictness": "very_lenient|lenient|balanced|strict|very_strict"
}
```

**レスポンス (200)**: 更新後のプレイヤー情報

---

### POST /api/player/change-job

職業変更

**認証**: 必須

**リクエスト**
```json
{
  "jobId": "novice|samurai|monk|scholar|ninja|guardian|mystic"
}
```

**レスポンス (200)**
```json
{
  "success": true,
  "player": { ... },
  "cost": "number"
}
```

---

## 務メ（Tsutome）- 通常タスク

### GET /api/tsutomes

プレイヤーの全務メを取得

**認証**: 必須

**レスポンス (200)**
```json
[
  {
    "id": "uuid",
    "playerId": "uuid",
    "title": "string",
    "deadline": "ISO8601",
    "genre": "study|exercise|work|hobby|housework|fun",
    "startDate": "ISO8601",
    "difficulty": "easy|normal|hard|veryHard|extreme",
    "monsterName": "string",
    "monsterImageUrl": "string|null",
    "completed": "boolean",
    "completedAt": "ISO8601|null",
    "cancelled": "boolean",
    "strengthLevel": "number",
    "linkedShurenId": "uuid|null",
    "linkedShihanId": "uuid|null",
    "linkSource": {
      "type": "shuren|shihan",
      "id": "uuid",
      "name": "string",
      "bonus": "number"
    },
    "rewardBonus": "number"
  }
]
```

---

### POST /api/tsutomes

新しい務メを作成

**認証**: 必須
**レート制限**: 20回/分

**リクエスト**
```json
{
  "title": "string",
  "deadline": "ISO8601",
  "genre": "study|exercise|work|hobby|housework|fun",
  "startDate": "ISO8601 (optional)",
  "difficulty": "easy|normal|hard|veryHard|extreme|auto"
}
```

**レスポンス (201)**
```json
{
  "id": "uuid",
  "monsterName": "string (AI生成)",
  "monsterImageUrl": "string|null",
  "warning": "string (optional)"
}
```

---

### PATCH /api/tsutomes/:id/complete

務メを完了

**認証**: 必須

**リクエスト**
```json
{
  "completionReport": "string (optional)"
}
```

**レスポンス (200)**
```json
{
  "tsutome": { ... },
  "rewards": {
    "exp": "number",
    "coins": "number",
    "levelUp": "boolean",
    "newLevel": "number",
    "bonusInfo": { ... }
  },
  "aiVerification": {
    "feedback": "string",
    "bonusMultiplier": "number"
  },
  "drops": [
    {
      "item": { ... },
      "quantity": "number",
      "isBonus": "boolean"
    }
  ]
}
```

---

### POST /api/tsutomes/:id/cancel

務メをキャンセル（ペナルティあり）

**認証**: 必須

**レスポンス (200)**
```json
{
  "tsutome": { ... },
  "penalties": true
}
```

---

### DELETE /api/tsutomes/:id

務メを削除

**認証**: 必須

**レスポンス (204)**: No Content

---

## 修練（Shuren）- 習慣タスク

### GET /api/shurens

プレイヤーの全修練を取得

**認証**: 必須

---

### POST /api/shurens

新しい修練を作成

**認証**: 必須
**レート制限**: 20回/分

**リクエスト**
```json
{
  "title": "string",
  "genre": "study|exercise|work|hobby|housework|fun",
  "repeatInterval": "number (1-30)",
  "startDate": "ISO8601",
  "dataTitle": "string",
  "dataUnit": "string"
}
```

---

### PATCH /api/shurens/:id/record

修練の実施を記録

**認証**: 必須

**レスポンス (200)**
```json
{
  "shuren": { ... },
  "rewards": {
    "exp": "number",
    "coins": "number"
  }
}
```

---

### POST /api/shurens/:id/generate-tsutome

修練から今日の務メを生成

**認証**: 必須

---

## 師範（Shihan）- 長期目標

### GET /api/shihans

プレイヤーの全師範を取得

**認証**: 必須

---

### POST /api/shihans

新しい師範を作成

**認証**: 必須
**レート制限**: 20回/分

**リクエスト**
```json
{
  "title": "string",
  "targetDate": "ISO8601",
  "genre": "study|exercise|work|hobby|housework|fun",
  "startDate": "ISO8601"
}
```

---

### PATCH /api/shihans/:id/complete

師範の目標を達成

**認証**: 必須

---

### GET /api/shihans/:id/progress

師範の進捗状況を取得

**認証**: 必須

---

### POST /api/shihans/:id/generate-tsutome

師範から務メを生成

**認証**: 必須

**リクエスト**
```json
{
  "title": "string",
  "deadline": "ISO8601",
  "difficulty": "easy|normal|hard"
}
```

---

## 刺客（Shikaku）- 緊急タスク

### GET /api/shikakus

プレイヤーの全刺客を取得

**認証**: 必須

---

### POST /api/shikakus

新しい刺客を作成

**認証**: 必須
**レート制限**: 20回/分

**リクエスト**
```json
{
  "title": "string",
  "difficulty": "easy|normal|hard|veryHard|extreme"
}
```

---

### PATCH /api/shikakus/:id/complete

刺客を撃退（完了）

**認証**: 必須

---

## ボス

### GET /api/boss/current

現在のボス情報を取得

**認証**: 必須

---

### POST /api/boss/:id/attack

ボスを攻撃（1日1回）

**認証**: 必須

**レスポンス (200)**
```json
{
  "message": "string",
  "damage": "number",
  "playerDamage": "number",
  "bossHp": "number",
  "bossDefeated": "boolean",
  "rewards": {
    "exp": "number",
    "coins": "number"
  }
}
```

---

## アイテム・インベントリ

### GET /api/items

全アイテム一覧を取得

---

### POST /api/items/:id/buy

アイテムを購入

**認証**: 必須

---

### GET /api/inventories

プレイヤーのインベントリを取得

**認証**: 必須

---

### GET /api/equipment

装備中のアイテムを取得

**認証**: 必須

---

### POST /api/equipment/equip

アイテムを装備

**認証**: 必須

**リクエスト**
```json
{
  "itemId": "uuid"
}
```

---

### POST /api/equipment/unequip

アイテムの装備を解除

**認証**: 必須

**リクエスト**
```json
{
  "slot": "weapon|armor|accessory"
}
```

---

## ドロップ履歴

### GET /api/drop-history

ドロップ履歴を取得

**認証**: 必須

---

### GET /api/drop-statistics

ドロップ統計を取得

**認証**: 必須

---

## ストーリー

### GET /api/stories

プレイヤーのストーリー一覧を取得

**認証**: 必須

---

### PATCH /api/stories/:id/view

ストーリーを既読にする

**認証**: 必須

---

## 画像生成

### POST /api/generate-image

AI画像生成

**認証**: 必須
**レート制限**: 10回/分

**リクエスト**
```json
{
  "prompt": "string",
  "type": "monster|training|master|assassin|boss|story"
}
```

**レスポンス (200)**
```json
{
  "imageUrl": "string"
}
```

---

## Cron・スケジュール

### GET /api/cron/status

Cronジョブの状態を取得

**認証**: 必須

---

### POST /api/cron/daily-reset

日次リセットを手動実行（テスト用）

**認証**: 必須

---

### POST /api/cron/hourly-check

時間チェックを手動実行（テスト用）

**認証**: 必須

---

## 管理者API

全て管理者権限（`role: "admin"`）が必要

### GET /api/admin/users

ユーザー一覧を取得

**レート制限**: 30回/分

---

### GET /api/admin/summary

統計サマリーを取得

---

### POST /api/admin/users

新規ユーザー作成

**レート制限**: 30回/分

**リクエスト**
```json
{
  "username": "string",
  "password": "string (4文字以上)",
  "role": "player|admin",
  "name": "string (optional)"
}
```

---

### POST /api/admin/users/:id/suspend

ユーザーを停止

---

### POST /api/admin/users/:id/resume

ユーザーの停止を解除

---

### POST /api/admin/users/:id/reset-password

パスワードリセット

**レスポンス (200)**
```json
{
  "user": { ... },
  "newPassword": "string"
}
```

---

### GET /api/admin/logs

監査ログを取得

**クエリパラメータ**
- `limit`: 取得件数（最大500）
- `format`: `json`（デフォルト）または `csv`

---

## 共通エラーレスポンス

```json
{
  "error": "エラーメッセージ"
}
```

### HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 204 | 削除成功（レスポンスボディなし） |
| 400 | リクエストエラー |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソースが見つからない |
| 409 | 競合（重複など） |
| 429 | レート制限超過 |
| 500 | サーバーエラー |

---

## レート制限

| エンドポイント | 制限 |
|----------------|------|
| グローバル（/api/*） | 500回/15分 |
| ログイン | 5回/15分 |
| AI生成 | 10回/分 |
| タスク作成 | 20回/分 |
| 管理API | 30回/分 |

---

## セキュリティ

- HTTPS必須
- HTTP-only Cookieによるセッション管理
- Content Security Policy適用
- XSS/CSRF対策
- SQLインジェクション対策
- 入力サニタイズ

---

## AI統合

- **テキスト生成**: Grok 4.1 (xAI)
- **画像生成**: Gemini 3 Pro Image (Google)

API利用料金はユーザーごとに追跡され、管理画面で確認可能。