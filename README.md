# CopilotSelecter

Copilot Premium（`copilot.microsoft.com` など）で、毎回モデル / モードを手動選択する手間を省く Chrome / Edge 拡張機能です。

リポジトリ: https://github.com/SerK21/CopilotSelecter

## できること

- **デフォルトモデルを固定** — ポップアップまたは設定画面で一度選べば、以後自動でそのモデル / モードを選択します
- **対応プリセット**（Work IQ / Copilot の入れ子メニュー含む）
  - 自動 / クイック応答 / Think Deeper
  - Study and learn / Search（個人 Copilot）
  - GPT 5.6 Think Deeper / GPT 5.6 Quick response / GPT 5.5 Quick Response
  - Claude Sonnet / Claude Opus
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
3. 使いたいモデル（例: GPT 5.6 Think Deeper / Sonnet / Opus）を選択して「保存」
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
- `https://m365.cloud.microsoft/*` および `https://m365.cloud.microsoft.com/*`（M365 Copilot / Work IQ）
- `https://copilot.cloud.microsoft/*`
- `https://www.office.com/chat/*`
- `https://www.microsoft365.com/*`

## 開発

```bash
# ラベル一致ロジックの簡易テスト
node --test tests/models.test.js
```

## リポジトリ移行（CopilotSelecter）

このコードは `SerK21/CopilotSelecter` 向けです。空のリポジトリへ初回プッシュする場合:

```bash
# 方法1: スクリプト（gh ログイン済みならこれが簡単）
./scripts/publish-to-copilotselecter.sh

# 方法2: 手動
git clone https://github.com/SerK21/CopilotSelecter.git
cd CopilotSelecter
git remote add source https://github.com/SerK21/Cursor.git
git fetch source main
git reset --hard source/main
git push -u origin main
```

## ライセンス

MIT
