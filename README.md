# CopilotSelecter

Copilot Premium（`copilot.microsoft.com` など）で、毎回モデル / モードを手動選択する手間を省く **Google Chrome** 拡張機能です。

リポジトリ: https://github.com/SerK21/CopilotSelecter

## Chrome への入れ方（自分の PC）

アドオン本体はリポジトリの [`addon/`](addon/) に置いてあります。

Chrome ウェブストアは使っていません。また **Google は `.exe` から拡張機能を黙って入れることを禁止している**ので、完全ワンクリックインストールはできません。その代わり、セットアップ EXE がファイル配置・パスコピー・拡張機能ページ起動までやります。最後に Chrome 側で 2 クリックだけ必要です。

### いちばん楽な方法（Windows）

1. [`addon/CopilotSelecter-Setup.exe`](addon/CopilotSelecter-Setup.exe) をダウンロードして実行する  
   （SmartScreen が出たら「詳細情報」→「実行」）
2. Chrome の拡張機能ページで **デベロッパーモード** をオン
3. **パッケージ化されていない拡張機能を読み込む** で、ダイアログに出たフォルダを選ぶ（パスはクリップボードにコピー済み）

### ZIP だけ使う場合（Windows / Mac / Linux 共通）

1. [`addon/copilotselecter-chrome.zip`](addon/copilotselecter-chrome.zip) をダウンロードして解凍する
2. Chrome で `chrome://extensions` を開く
3. **デベロッパーモード** をオン
4. **パッケージ化されていない拡張機能を読み込む**
5. 解凍したフォルダ（中に `manifest.json` がある方）を選ぶ

ソースから入れる場合はリポジトリをクローンし、ルート（`manifest.json` がある場所）を選んでください。アイコンはリポジトリに含まれているので、追加のビルドは不要です。

以後 Chrome を再起動しても、そのフォルダを消さない限り拡張は残ります。コードを更新したら `chrome://extensions` の再読み込みボタンを押してください。

### 使う

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

# Chrome 用 ZIP と Windows セットアップ EXE を addon/ に出力
bash scripts/build-release-assets.sh
```

アイコンを作り直す場合のみ:

```bash
python3 scripts/generate-icons.py
```

## ライセンス

MIT
