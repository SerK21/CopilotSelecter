# CopilotSelecter

Copilot Premium（`copilot.microsoft.com` など）で、毎回モデル / モードを手動選択する手間を省く Chrome / Edge 拡張機能です。

リポジトリ: https://github.com/SerK21/CopilotSelecter

## できること

- **デフォルトモデルを固定** — ポップアップまたは設定画面で一度選べば、以後自動でそのモデル / モードを選択します
- **対応プリセット**
  - Auto / Smart
  - Think deeper（reasoning）
  - Study and learn
  - Search
  - Claude Opus（表示名で一致）
  - GPT Thinking / Quick response（GPT-5.6 / 5.5 系の表示名で一致）
- **新規チャットでも再適用** — 画面遷移や新しいチャット開始時にも設定を維持
- **手動変更を尊重** — 自分でモデルを変えた直後は、一定時間自動適用しません

## インストール（開発版）

1. このリポジトリをクローン
2. アイコンを生成（初回のみ）

```bash
python3 scripts/generate-icons.py
```

3. Chrome で `chrome://extensions` を開く
4. 「デベロッパーモード」を ON
5. 「パッケージ化されていない拡張機能を読み込む」で、このリポジトリのルートを選択

Edge でも同様に `edge://extensions` から読み込めます。

## 使い方

1. 拡張機能をインストール
2. ツールバーのアイコンをクリック
3. 使いたいモデル（例: Think deeper / Opus / GPT Thinking）を選択して「保存」
4. Copilot を開く（または既存タブをリロード）

詳細設定は拡張機能の「詳細設定」画面から変更できます。

## 動作の仕組み

1. **ページ読み込み直後** — Copilot が使う `sessionStorage` の `sticky-conversation-mode` に、選んだモードキー（`smart` / `reasoning` など）を書き込みます
2. **UI 監視** — ヘッダーまたはコンポーザーのモデルピッカーを監視し、表示が設定と違う場合はドロップダウンを開いて該当項目をクリックします
3. **Premium 固有モデル** — Opus や GPT-5.6 など、モードキーがない項目は画面上の表示名（ラベル）で一致させます

## Microsoft Edge の注意

**Edge 135 以降**では、Microsoft が `copilot.microsoft.com` を保護ドメインとして扱い、拡張機能のコンテンツスクリプト注入がブロックされる場合があります（`The extensions gallery cannot be scripted`）。

- **Chrome** — 現状問題なく動作する想定です
- **Edge** — 上記制限により動作しない可能性があります。Edge で使う場合は Chrome の利用を推奨します

## 対応 URL

- `https://copilot.microsoft.com/*`
- `https://copilot.com/*`
- `https://www.bing.com/chat/*`
- `https://m365.cloud.microsoft.com/*`（M365 Copilot Web）

## 開発

```bash
# ラベル一致ロジックの簡易テスト
node --test tests/models.test.js
```

## 別リポジトリとして公開する場合

このプロジェクトは単体で完結しています。新しい GitHub リポジトリを作る場合:

```bash
git clone https://github.com/SerK21/CopilotSelecter.git
cd CopilotSelecter
python3 scripts/generate-icons.py
```

## ライセンス

MIT
