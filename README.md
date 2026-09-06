# CopilotSelecter

Copilot Premium（`copilot.microsoft.com` など）で、毎回モデル / モードを手動選択する手間を省く **Google Chrome** 拡張機能です。

リポジトリ: https://github.com/SerK21/CopilotSelecter

## Chrome への入れ方（自分の PC）

Chrome ウェブストア未公開のため、**デベロッパーモードで読み込み**します。所要時間は約 1 分です。

### 1. 拡張のフォルダを用意する

どちらか好きな方法で構いません。

**ZIP を使う場合**

1. GitHub の [Releases](https://github.com/SerK21/CopilotSelecter/releases) から `copilotselecter-chrome.zip` をダウンロードする（Release がまだ無いときは [ソース ZIP](https://github.com/SerK21/CopilotSelecter/archive/refs/heads/main.zip) でも可）
2. ZIP を解凍する
3. 解凍先に `manifest.json` があることを確認する（ソース ZIP の場合は `CopilotSelecter-main` フォルダの中）

**Git でクローンする場合**

```bash
git clone https://github.com/SerK21/CopilotSelecter.git
```

クローンしたリポジトリのルートに `manifest.json` があります。アイコンはリポジトリに含まれているので、追加のビルドは不要です。

### 2. Chrome に読み込む

1. Google Chrome を開く
2. アドレスバーに `chrome://extensions` と入力して Enter
3. 右上の **デベロッパーモード** をオンにする
4. **パッケージ化されていない拡張機能を読み込む** をクリック
5. `manifest.json` があるフォルダを選択する
6. ツールバーに **CopilotSelecter** のアイコンが出れば成功です（ピン留めすると使いやすいです）

以後 Chrome を再起動しても、そのフォルダを消さない限り拡張は残ります。コードを更新したら `chrome://extensions` の再読み込みボタンを押してください。

### 3. 使う

1. ツールバーのアイコンをクリック
2. 使いたいモデル（例: Think deeper / Opus / GPT Thinking）を選んで **保存**
3. [Copilot](https://copilot.microsoft.com/) を開く（すでに開いているタブは再読み込み）

詳細設定はポップアップの「詳細設定」から変更できます。

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

## 動作の仕組み

1. **ページ読み込み直後** — Copilot が使う `sessionStorage` の `sticky-conversation-mode` に、選んだモードキー（`smart` / `reasoning` など）を書き込みます
2. **UI 監視** — ヘッダーまたはコンポーザーのモデルピッカーを監視し、表示が設定と違う場合はドロップダウンを開いて該当項目をクリックします（Shadow DOM 内も探索します）
3. **Premium 固有モデル** — Opus や GPT-5.6 など、モードキーがない項目は画面上の表示名（ラベル）で一致させます

## Microsoft Edge の注意

**Edge 135 以降**では、Microsoft が `copilot.microsoft.com` を保護ドメインとして扱い、拡張機能のコンテンツスクリプト注入がブロックされる場合があります（`The extensions gallery cannot be scripted`）。

- **Chrome** — この拡張の想定環境です
- **Edge** — 上記制限により動作しない可能性があります。Edge で使う場合は Chrome の利用を推奨します

## 対応 URL

- `https://copilot.microsoft.com/*`
- `https://copilot.com/*`
- `https://www.bing.com/chat/*`
- `https://m365.cloud.microsoft/*` / `https://m365.cloud.microsoft.com/*`
- `https://copilot.cloud.microsoft/*`

## 開発

```bash
# ラベル一致ロジックの簡易テスト
npm test

# Chrome 読み込み用 ZIP（直下に manifest.json）
bash scripts/pack-extension.sh
```

アイコンを作り直す場合のみ:

```bash
python3 scripts/generate-icons.py
```

## ライセンス

MIT
