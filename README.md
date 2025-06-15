# リアルタイム音声対話AIアシスタント

マルチLLM（Claude + OpenAI）を使用したリアルタイム音声対話アシスタントのプロトタイプ実装です。

[![Run on Replit](https://replit.com/badge/github/ougonnokishi/voice-assistant)](https://replit.com/new/github/ougonnokishi/voice-assistant)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/deploy?template=https://github.com/ougonnokishi/voice-assistant)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ougonnokishi/voice-assistant)

## 特徴

- 🎤 **音声モード**: リアルタイム音声認識と音声合成（Google Cloud使用）
- 📝 **テキストモード**: ブラウザベースのチャット interface
- 🤖 **マルチLLM対応**: Claude APIとOpenAI APIを並列実行し、最速応答を採用
- ⚡ **低レイテンシ**: WebSocketによるリアルタイム通信
- 🛡️ **フォールバック機能**: 片方のAPIがエラーでも継続動作

## デモ

### テキストモード
![Text Mode Demo](https://user-images.githubusercontent.com/placeholder/text-mode-demo.png)

### 音声モード
![Voice Mode Demo](https://user-images.githubusercontent.com/placeholder/voice-mode-demo.png)

## セットアップ

### 1. リポジトリのクローン
```bash
git clone https://github.com/ougonnokishi/voice-assistant.git
cd voice-assistant
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env.example` を `.env` にコピーして、APIキーを設定:

```bash
cp .env.example .env
```

必要なAPIキー:
- **ANTHROPIC_API_KEY**: [Anthropic Console](https://console.anthropic.com/)から取得
- **OPENAI_API_KEY**: [OpenAI Platform](https://platform.openai.com/)から取得
- **GOOGLE_APPLICATION_CREDENTIALS**: Google Cloud認証ファイルのパス（音声機能用、オプション）

### 4. サーバー起動
```bash
npm start
```

### 5. ブラウザでアクセス
- テキストモード: http://localhost:3000/text-mode.html
- 音声モード: http://localhost:3000

## 技術スタック

### バックエンド
- Node.js + Express
- WebSocket (ws)
- @anthropic-ai/sdk
- openai
- @google-cloud/speech (音声認識)
- @google-cloud/text-to-speech (音声合成)

### フロントエンド
- Vanilla JavaScript
- WebSocket API
- WebRTC (MediaRecorder API)

## アーキテクチャ

```
┌─────────────┐     WebSocket      ┌─────────────────┐
│   Browser   │ ←---------------→  │  Node.js Server │
│             │                     │                 │
│ ・Audio     │                     │ ・WebSocket     │
│ ・Text UI   │                     │ ・LLM Gateway   │
└─────────────┘                     └────────┬────────┘
                                             │
                                    ┌────────┴────────┐
                                    │                 │
                              ┌─────▼─────┐    ┌─────▼─────┐
                              │Claude API │    │OpenAI API │
                              └───────────┘    └───────────┘
```

## 機能詳細

### テキストモード
- ブラウザベースのチャットインターフェース
- リアルタイムレスポンス表示
- 応答元のLLM表示（Claude/OpenAI）

### 音声モード（要Google Cloud設定）
- リアルタイム音声認識
- 自然な音声合成
- ストリーミング対応

### LLM統合
- Claude APIとOpenAI APIへの並列リクエスト
- 最速応答の採用（Promise.race使用）
- エラー時の自動フォールバック

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します！

## 注意事項

- APIキーは必ず環境変数で管理してください
- 本番環境ではHTTPSの使用を推奨します
- API利用料金にご注意ください