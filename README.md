# Better Garoon Schedule

サイボウズ株式会社のグループウェア Garoon の日表示・週表示に、現在時刻を示すラインをオーバーレイ表示する Chrome 拡張機能（Manifest V3）です。

## このプロジェクトについて

これは作者個人のサイドプロジェクトです。サイボウズの**公式製品ではありません**。本リポジトリの内容はすべて作者個人の成果物および見解であり、サイボウズの見解を示すものではありません。

「Garoon」はサイボウズ株式会社の登録商標です。本拡張機能が連携する対象を説明するためにのみ名称を使用しています。

## 対応環境

サイボウズの**クラウド版 Garoon（`*.cybozu.com`）のみ**を対象としています。オンプレミス版 Garoon はサポートしていません。

## 機能

- Garoon の日表示・週表示で現在時刻を示す赤いラインを表示
- オプションページから表示の ON/OFF を切り替え可能

※ この機能は Garoon の公開 API ではなく画面の DOM 構造に依存して実装されているため、Garoon 側のアップデートにより動作しなくなる可能性があります。

## 開発

本プロジェクトは [pnpm](https://pnpm.io/)（`pnpm@10.33.0`）と webpack（`ts-loader`）を使用しています。

```sh
pnpm install
pnpm build:dev   # 開発ビルド（dist/ に出力）
pnpm build       # 本番ビルド（NODE_ENV=production）+ scripts/zip.sh で archive.zip を生成
pnpm start       # webpack --watch（ファイル変更を監視）
pnpm icons       # src/icon/calendar.svg から sharp で PNG アイコンを再生成
pnpm typecheck   # tsc --noEmit -p tsconfig.test.json
pnpm lint        # eslint src
pnpm test        # vitest run
```

`pnpm build:dev` 後に `chrome://extensions`（デベロッパーモード）から `dist/` をパッケージ化されていない拡張機能として読み込みます。

## アイコン

[Lucide](https://lucide.dev/) を [ISC License](https://lucide.dev/license) のもとで利用しています。

## ライセンス

MIT License のもとで公開しています。詳細は [LICENSE](./LICENSE) を参照してください。
