<h1 align="center">Shimimo-Storyloom</h1>

<p align="center">あなただけのキャラクター、選択肢、結末で、ビジュアルノベルを紡ごう。</p>
<p align="center"><strong>Electron · JavaScript · CSS</strong></p>

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <strong>日本語</strong>
</p>

<p align="center">
  <a href="https://github.com/shimimokun-ai/Shimimo-Storyloom/actions/workflows/check.yml"><img src="https://github.com/shimimokun-ai/Shimimo-Storyloom/actions/workflows/check.yml/badge.svg?branch=main" alt="ソース検証"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-22.12%2B-43853D?style=flat-square" alt="Node.js 22.12 以上"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-ISC-475569?style=flat-square" alt="ISC ライセンス"></a>
  <a href="assets/README.md"><img src="https://img.shields.io/badge/game_assets-none-64748B?style=flat-square" alt="ゲーム素材の同梱なし"></a>
</p>

---

**Shimimo-Storyloom** は、Shimimo が既存ゲームの実行基盤を独立したプロジェクトとして整理したビジュアルノベル用フレームワークです。動作するサンプルを出発点に、キャラクター、シナリオ、画面を差し替えて自分の作品を作れます。Storyloom という名前には「物語を紡ぐ」という意味を込めています。

> [!NOTE]
> 元のゲームの画像、音楽、ボイス、動画、フォント、シナリオは同梱していません。初期画面はグレーと白、システムフォント、名前のカードで構成し、実績は **1、2、3** のプレースホルダーになっています。ミニゲームは Canvas 描画と合成音を使うため、追加素材なしでサンプルを実行できます。

## クイックスタート

**Node.js 22.12 以上**（24 推奨）と Git が必要です。

```bash
git clone https://github.com/shimimokun-ai/Shimimo-Storyloom.git
cd Shimimo-Storyloom
npm ci
npm start
```

初回起動時に言語と音量を選び、設定を保存してゲームを開始します。サンプルには 2 つの章、選択肢による分岐、任意で遊べるミニゲームが含まれています。

<details>
<summary><strong>ブラウザーでプレビューするには</strong></summary>

```bash
npm run serve
```

ターミナルに表示されたローカルアドレスを開いてください。ブラウザー版でもシナリオ、設定、章選択、ギャラリー、ミニゲームを利用できます。デスクトップアプリの終了、システムの全画面切り替え、キャラクターチャット API は Electron が提供します。

</details>

## 主な機能

| モジュール | 内容 |
| --- | --- |
| **シナリオ演出** | 会話、文字送り、キャラクター表示、背景切り替え、CG、エンディングクレジット |
| **分岐と状態** | 選択肢、シーン移動、フラグ、条件分岐、章の解放 |
| **閲覧機能** | AUTO、SKIP、会話履歴、音量と表示の設定 |
| **多言語** | 簡体字中国語、日本語、英語のサンプルシナリオと UI |
| **素材の追加** | 自作の立ち絵、背景、BGM、効果音、ボイス。空の設定でも実行可能 |
| **ミニゲーム** | リズム、格闘、雪上の障害物回避、手書き。不要なら無効化可能 |
| **任意の拡張** | AI キャラクターチャットと Steam 実績アダプター。外部サービスは初期状態で無効 |

## 自分の物語を作る

まずプロジェクト設定を編集し、次にシナリオを差し替えます。素材キーとシーン ID を通して、コンテンツとエンジンをつなぎます。

| 変更したい内容 | 編集する場所 |
| --- | --- |
| プロジェクト識別子、キャラクター、章、素材、機能スイッチ | [`js/config.js`](js/config.js) |
| サンプルの構造基準となる中国語シナリオ | [`js/story/zh/`](js/story/zh/) |
| 日本語と英語のシナリオ | [`js/story/ja/`](js/story/ja/) · [`js/story/en/`](js/story/en/) |
| シーンと章ファイルの対応 | [`js/script.js`](js/script.js) · [`js/script_ja.js`](js/script_ja.js) · [`js/script_en.js`](js/script_en.js) |
| 初期画面のテーマ | [`css/framework.css`](css/framework.css) |
| エンディングの制作クレジット | [`js/generated/ending-credits.js`](js/generated/ending-credits.js) · [`js/locales/`](js/locales/) |

シナリオは、次のようなコマンドの組み合わせで構成します。

```js
{ type: 'background', asset: 'morning' },
{ type: 'showCharacter', id: 'guide', expression: 'default', position: 'right' },
{ type: 'dialogue', speaker: 'guide', text: 'どこへ行きたいですか？' },
{ type: 'choice', options: [
    { text: '出発する', target: 'departure' },
    { text: 'ここに残る', target: 'stay' }
] }
```

章ファイルに `departure` や `stay` などの移動先シーンを定義し、シーン一覧の対応を更新してください。3 言語のシーン ID、コマンド順序、分岐先はそろえ、表示する文章だけを翻訳します。

立ち絵がないキャラクターは名前のカードで表示されます。自分の素材を追加する場合は、設定にパスを登録し、シナリオからは引き続き素材キーを参照します。

> [!TIP]
> 新しい作品では `project.id` と、`package.json` のアプリ名、`build.appId`、`build.productName`、実行ファイル名を変更してください。作品ごとに保存領域とアプリの識別情報を分けられます。

## 検証とビルド

| コマンド | 用途 |
| --- | --- |
| `npm run verify` | ソース、シナリオ構造、テスト、素材を含まないことの検証 |
| `npm run test:smoke` | 実際の Electron を非表示ウィンドウで起動し、サンプル全体を検証 |
| `npm run package` | Windows 用の展開済みビルドを `dist/` に生成 |
| `npm run check:package` | 配布パッケージの依存ファイルとゲーム素材を検証 |
| `npm run test:package` | 生成した Windows EXE を起動し、一連の動作を検証 |
| `npm run dist` | Windows 用 ZIP 配布パッケージを生成 |

パッケージ化ではファイルの許可リストを使い、制作ツール、テスト、ドキュメント、キャッシュ、ローカル設定を除外します。初期状態では Electron のアプリアイコンを使用し、元のゲームのアイコンや Steam DLL は必要ありません。

<details>
<summary><strong>自分のゲーム用リポジトリとして使うには</strong></summary>

上流リポジトリにはテキストのソースだけを含めています。`.gitignore` は画像、音声、動画、制作ファイルを初期状態で除外します。`npm run audit:source` は、この素材を含まない上流版を維持するための検証です。

自分のゲーム用リポジトリでは、必要に応じて除外ルールを変更し、この上流版専用の検証を `verify` から外してください。追加するシナリオ、素材、音楽の利用条件も明記してください。

フレームワークは独立した Git 履歴を持ち、元のゲームリポジトリのコミットは含みません。保守と公開の手順は[公開ガイド](docs/PUBLISHING.md)（中国語）を参照してください。

</details>

## ドキュメント

以下の詳細ガイドは現在、中国語で提供しています。この README では導入、カスタマイズ、ビルドの基本を日本語で説明しています。

| ガイド | 内容 |
| --- | --- |
| [シナリオ作成](docs/AUTHORING.md) | 章、シーン、コマンド、分岐、翻訳 |
| [機能と素材の設定](docs/CONFIGURATION.md) | 素材、機能スイッチ、ボイス、AI チャット、Steam |
| [アーキテクチャ](docs/ARCHITECTURE.md) | コアモジュール、実行の流れ、デスクトップ側の役割 |
| [公開手順](docs/PUBLISHING.md) | ソース検証、Windows ビルド、リポジトリの保守 |

## ライセンスとフィードバック

フレームワークのコードと同梱サンプルは [ISC ライセンス](LICENSE) で公開しています。利用時はライセンス表示を保持してください。実行基盤と依存ライブラリの利用条件は[サードパーティーに関する記載](THIRD_PARTY_NOTICES.md)を参照してください。追加するシナリオ、画像、音楽には、別の利用条件を定めることができます。

不具合の報告は [Issues](https://github.com/shimimokun-ai/Shimimo-Storyloom/issues)、改善の提案は [Pull requests](https://github.com/shimimokun-ai/Shimimo-Storyloom/pulls) からお願いします。
