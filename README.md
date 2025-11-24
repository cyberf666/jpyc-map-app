# JPYC対応サービスマップ

JPYCが使える実店舗・オンラインサービスを探せるWebアプリケーションです。

## 機能

- **実店舗（地図）タブ**: 現在地周辺のJPYC対応店舗を地図上に表示
- **オンライン事業者一覧タブ**: JPYC対応オンラインサービスをカード形式で一覧表示
- 検索・フィルター機能
- レスポンシブデザイン

## 技術スタック

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Leaflet + OpenStreetMap（地図表示）
- Supabase（データベース・認証）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集してSupabaseの認証情報を設定

### 3. 開発サーバーの起動

```bash
npm run dev
```

## スタンドアロン版（HTML）

`index.html` をブラウザで直接開くか、簡易サーバーで起動:

```bash
npx serve . -p 3001
```

## ライセンス

MIT
