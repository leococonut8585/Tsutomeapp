# Tsutome 運用マニュアル

## 目次

1. [システム概要](#システム概要)
2. [環境構成](#環境構成)
3. [デプロイ手順](#デプロイ手順)
4. [日常運用](#日常運用)
5. [監視・ログ](#監視ログ)
6. [トラブルシューティング](#トラブルシューティング)
7. [バックアップ・リカバリ](#バックアップリカバリ)
8. [セキュリティ](#セキュリティ)

---

## システム概要

### アプリケーション情報

| 項目 | 内容 |
|------|------|
| アプリ名 | Tsutome（務メ討魔録） |
| 種別 | ゲーミフィケーション型タスク管理RPG |
| 本番URL | https://tsutomeapp.com |
| 技術スタック | React + Vite + Express.js + PostgreSQL |

### 主要コンポーネント

```
┌─────────────────────────────────────────────────────┐
│                    nginx (リバースプロキシ)           │
│                    Port: 443 (HTTPS)                │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                    PM2 (プロセス管理)                │
├─────────────────────────────────────────────────────┤
│  tsutomeapp    │  Port: 4000 (メインアプリ)         │
│  tsutome-api   │  ワーカープロセス                  │
│  tsutome-worker│  バックグラウンドジョブ            │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                 PostgreSQL                          │
│                 Port: 5433                          │
└─────────────────────────────────────────────────────┘
```

---

## 環境構成

### 本番サーバー

| 項目 | 値 |
|------|-----|
| ホスト | tsutomeapp.com (153.121.72.94) |
| OS | Ubuntu |
| Node.js | v20.19.5 (nvm管理) |
| アプリディレクトリ | /opt/tsutomeapp |
| SSH接続 | `ssh ubuntu@tsutomeapp.com` |

### 環境変数 (/opt/tsutomeapp/.env)

```bash
# データベース
DATABASE_URL=postgresql://tsutome:tsutomepass@localhost:5433/tsutomeapp

# セッション
SESSION_SECRET=<ランダム文字列>

# AI API
GROK_API_KEY=<Grok APIキー>
GOOGLE_API_KEY=<Google APIキー>

# その他
NODE_ENV=production
PORT=4000
```

### 必要なSecrets (GitHub Actions)

| Secret名 | 用途 |
|----------|------|
| SSH_PRIVATE_KEY | デプロイ用SSH秘密鍵 |
| SSH_HOST | tsutomeapp.com |
| SSH_USER | ubuntu |

---

## デプロイ手順

### 自動デプロイ（推奨）

1. `main` ブランチにプッシュ
2. GitHub Actions CI が実行（テスト・ビルド）
3. CI成功後、Deploy ワークフローが自動実行
4. 本番サーバーに自動デプロイ

### 手動デプロイ

```bash
# 1. ローカルでビルド
npm ci
npm run build

# 2. アーカイブ作成
tar -czf tsutomeapp-deploy.tar.gz dist server shared package.json package-lock.json

# 3. サーバーに転送
scp -i tsutomeapp_ed25519 tsutomeapp-deploy.tar.gz ubuntu@tsutomeapp.com:/tmp/

# 4. サーバーで展開
ssh -i tsutomeapp_ed25519 ubuntu@tsutomeapp.com << 'EOF'
  cd /opt/tsutomeapp
  
  # バックアップ
  tar -czf ~/tsutomeapp_backup_$(date +%Y%m%d%H%M%S).tar.gz .
  
  # .envを退避
  cp .env /tmp/.env.bak
  
  # 展開
  rm -rf *
  tar -xzf /tmp/tsutomeapp-deploy.tar.gz
  mv /tmp/.env.bak .env
  
  # 依存インストール
  npm install --production
  
  # 再起動
  pm2 restart tsutomeapp --update-env
EOF
```

---

## 日常運用

### PM2 コマンド

```bash
# プロセス一覧
pm2 ls

# 再起動
pm2 restart tsutomeapp

# 環境変数更新込み再起動
pm2 restart tsutomeapp --update-env

# ログ確認
pm2 logs tsutomeapp --lines 100

# モニタリング
pm2 monit
```

### データベース操作

```bash
# PostgreSQL接続
psql "$DATABASE_URL"

# マイグレーション適用
psql "$DATABASE_URL" -f migrations/0001_xxx.sql

# バックアップ
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql

# リストア
psql "$DATABASE_URL" < backup_xxx.sql
```

### Cronジョブ

アプリ内で自動実行されるジョブ：

| ジョブ | スケジュール | 説明 |
|--------|--------------|------|
| 日次リセット | 0:00 JST (15:00 UTC) | HP回復、期限切れタスク処理 |
| 時間チェック | 毎時00分 | 期限切れ刺客削除 |

手動トリガー（テスト用）：
```bash
curl -X POST https://tsutomeapp.com/api/cron/daily-reset
curl -X POST https://tsutomeapp.com/api/cron/hourly-check
```

---

## 監視・ログ

### ログの場所

```bash
# PM2ログ
~/.pm2/logs/tsutomeapp-out.log
~/.pm2/logs/tsutomeapp-error.log

# nginxログ
/var/log/nginx/access.log
/var/log/nginx/error.log
```

### ログローテーション

PM2のpm2-logrotateモジュールで自動ローテーション設定済み。

### ヘルスチェック

```bash
# アプリ応答確認
curl -I https://tsutomeapp.com

# API応答確認
curl https://tsutomeapp.com/api/me
```

### 監査ログ

管理画面からCSVダウンロード可能：
```
GET /api/admin/logs?format=csv
```

---

## トラブルシューティング

### 問題: アプリが応答しない

```bash
# プロセス確認
pm2 ls

# すべて停止している場合
pm2 start ecosystem.config.cjs

# 特定プロセスがエラーの場合
pm2 restart tsutomeapp
pm2 logs tsutomeapp --err --lines 50
```

### 問題: データベース接続エラー

```bash
# PostgreSQL状態確認
sudo systemctl status postgresql

# 接続テスト
psql "$DATABASE_URL" -c "SELECT 1"

# 再起動
sudo systemctl restart postgresql
```

### 問題: セッションが維持されない

```bash
# セッションテーブル確認
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM session"

# Cookieの確認（ブラウザ側）
# - connect.sid が存在するか
# - Secure属性が正しいか
```

### 問題: AI生成が失敗する

```bash
# API キー確認
grep -E "GROK_API_KEY|GOOGLE_API_KEY" /opt/tsutomeapp/.env

# ログでエラー確認
pm2 logs tsutomeapp --lines 100 | grep -i "grok\|gemini\|ai"

# レート制限確認（管理画面でAPI利用状況）
```

### 問題: デプロイ後に404エラー

```bash
# ビルド確認
ls -la /opt/tsutomeapp/dist

# nginxリロード
sudo nginx -t && sudo systemctl reload nginx
```

---

## バックアップ・リカバリ

### 定期バックアップ（推奨）

```bash
#!/bin/bash
# /opt/scripts/backup.sh

BACKUP_DIR="/var/backups/tsutomeapp"
DATE=$(date +%Y%m%d_%H%M%S)

# DBバックアップ
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/db_$DATE.sql"

# アプリバックアップ
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" -C /opt tsutomeapp

# 古いバックアップ削除（7日以上）
find "$BACKUP_DIR" -type f -mtime +7 -delete
```

Cronで毎日実行：
```
0 3 * * * /opt/scripts/backup.sh
```

### リカバリ手順

```bash
# 1. 最新バックアップを確認
ls -la /var/backups/tsutomeapp/

# 2. アプリリストア
cd /opt
mv tsutomeapp tsutomeapp.broken
tar -xzf /var/backups/tsutomeapp/app_YYYYMMDD.tar.gz

# 3. DBリストア（必要な場合）
psql "$DATABASE_URL" < /var/backups/tsutomeapp/db_YYYYMMDD.sql

# 4. 再起動
pm2 restart all --update-env
```

---

## セキュリティ

### 実装済みセキュリティ対策

| 対策 | 実装 |
|------|------|
| HTTPS | Let's Encrypt証明書 |
| セッション | HTTP-only Cookie |
| CORS | 許可オリジンのみ |
| CSP | Content-Security-Policy |
| XSS対策 | 入力サニタイズ |
| SQLインジェクション | Drizzle ORM (プリペアドステートメント) |
| レート制限 | express-rate-limit |
| パスワード | 最低4文字（平文保存※要件による） |

### 定期的なセキュリティタスク

1. **週次**: 依存パッケージの脆弱性チェック
   ```bash
   npm audit
   ```

2. **月次**: SSL証明書の有効期限確認
   ```bash
   certbot certificates
   ```

3. **月次**: 監査ログのレビュー

4. **四半期**: セキュリティアップデートの適用
   ```bash
   sudo apt update && sudo apt upgrade
   ```

### インシデント対応

1. **検知**: 監査ログ、エラーログ、異常なAPI利用
2. **封じ込め**: 該当ユーザーの停止、IP遮断
3. **調査**: ログ分析、影響範囲特定
4. **復旧**: 必要に応じてリストア
5. **報告**: インシデント報告書作成

---

## 連絡先・参考資料

### ドキュメント

- [API仕様書](./api-specification.md)
- [デプロイガイド](./deploy-readme.md)
- [アプリ概要](./app-overview.md)

### 外部サービス

| サービス | 用途 | ダッシュボード |
|----------|------|---------------|
| xAI (Grok) | テキスト生成 | https://console.x.ai |
| Google AI | 画像生成 | https://console.cloud.google.com |
| GitHub | ソースコード・CI/CD | https://github.com/leococonut8585/Tsutomeapp |

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2025-12-01 | 初版作成 |