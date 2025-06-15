# デプロイガイド

## 🌐 GitHub Pages（静的デモページ）

**URL**: https://ougonnokishi.github.io/voice-assistant/

GitHubの設定:
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: /docs
4. Save

## 🚀 Render.com でのデプロイ

1. [Render.com](https://render.com) にサインアップ
2. Dashboard → New → Web Service
3. "Connect a repository" → GitHubアカウントを連携
4. `ougonnokishi/voice-assistant` を選択
5. 以下の設定を入力:
   - Name: `voice-assistant`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Environment Variables を追加:
   - `ANTHROPIC_API_KEY`: あなたのAPIキー
   - `OPENAI_API_KEY`: あなたのAPIキー
   - `PORT`: 10000
7. Create Web Service をクリック

## 🛤️ Railway でのデプロイ

1. [Railway](https://railway.app) にGitHubでログイン
2. New Project → Deploy from GitHub repo
3. `voice-assistant` リポジトリを選択
4. Variables タブで環境変数を追加:
   ```
   ANTHROPIC_API_KEY=your-key
   OPENAI_API_KEY=your-key
   ```
5. 自動的にデプロイが開始

## 💻 Replit でのデプロイ

1. [Replit](https://replit.com) にサインアップ
2. Create → Import from GitHub
3. URL: `https://github.com/ougonnokishi/voice-assistant`
4. Secrets タブで環境変数を追加
5. Run ボタンをクリック

## 🔐 環境変数の設定

すべてのプラットフォームで以下の環境変数が必要:

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | Anthropic API キー | ✅ |
| `OPENAI_API_KEY` | OpenAI API キー | ✅ |
| `GOOGLE_APPLICATION_CREDENTIALS` | Google Cloud 認証 | ❌ (音声機能用) |
| `PORT` | サーバーポート | ❌ (デフォルト: 3000) |

## 🎯 推奨デプロイ方法

1. **開発・テスト**: Replit（ブラウザで即座に試せる）
2. **本番環境**: Render.com または Railway（無料プランあり）
3. **デモページ**: GitHub Pages（静的コンテンツのみ）

## トラブルシューティング

### ポート番号の問題
一部のサービスでは特定のポート番号が必要:
- Render: `PORT=10000`
- Railway: 自動設定
- Replit: 自動設定

### WebSocketの問題
HTTPSでホスティングする場合、WebSocket URLを `wss://` に変更する必要があります。