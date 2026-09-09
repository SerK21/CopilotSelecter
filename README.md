# CopilotSelecter

Copilot / Work IQ で毎回モデルを手動選択する手間を省く **Chrome / Microsoft Edge** 拡張機能です。

リポジトリ: https://github.com/SerK21/CopilotSelecter

## 会社の Edge 152（公式ビルド）で使う

**結論:** Edge 152 公式ビルドでは、会社 Copilot を次の URL の **通常タブ** で開くとこの拡張が動きます。

https://m365.cloud.microsoft/chat

Edge 152 で直ったのは `m365.cloud.microsoft` へのサードパーティ拡張です。一方、次の画面は Microsoft が保護しているため、**フラグでもグループポリシーでも拡張を注入できません。**

- `https://copilot.microsoft.com/`
- Edge サイドバー Copilot（`edgeservices.bing.com` など）

拡張を入れると、`copilot.microsoft.com` を開いたときは既定で `https://m365.cloud.microsoft/chat` へ切り替えます（詳細設定でオフにできます）。

### 入れ方

1. [`addon/CopilotSelecter-Setup.exe`](addon/CopilotSelecter-Setup.exe) をダウンロードして実行する  
   （SmartScreen が出たら「詳細情報」→「実行」）
2. Edge で `edge://extensions` を開く
3. 右上の **デベロッパーモード** をオンにする
4. **パッケージ化されていない拡張機能を読み込む** で、セットアップが表示したフォルダを選ぶ（パスはクリップボードにコピー済み）
5. **https://m365.cloud.microsoft/chat** を開き、ツールバーの CopilotSelecter からモデルを選んで保存する

ZIP だけ使う場合は [`addon/copilotselecter-chrome.zip`](addon/copilotselecter-chrome.zip) を解凍し、手順 2 以降と同じです。解凍先に `manifest.json` があるフォルダを選んでください。

会社ポリシーでデベロッパーモード自体が禁止されている場合は、この方法では入れられません。IT 側の許可が必要です。

## Chrome で使う場合

同じ ZIP / EXE を使い、読み込み先を `chrome://extensions` にしてください。Chrome では `copilot.microsoft.com` でも動作します。

## できること

- **デフォルトモデルを固定** — ポップアップまたは設定画面で一度選べば、以後自動でそのモデル / モードを選択します
- **対応プリセット**（Work IQ / Copilot の入れ子メニュー含む）
  - 自動 / クイック応答 / Think Deeper
  - Study and learn / Search（個人 Copilot）
  - GPT 5.6 Think Deeper / GPT 5.6 Quick response / GPT 5.5 Quick Response
  - Claude Sonnet / Claude Opus
- **新規チャットでも再適用** — 画面遷移や新しいチャット開始時にも設定を維持
- **手動変更を尊重** — 自分でモデルを変えた直後は、一定時間自動適用しません

## 動作の仕組み

1. **ページ読み込み直後** — Copilot が使う `sessionStorage` の `sticky-conversation-mode` に、選んだモードキー（`smart` / `reasoning` など）を書き込みます
2. **UI 監視** — ヘッダーまたはコンポーザーのモデルピッカーを監視し、表示が設定と違う場合はドロップダウンを開いて該当項目をクリックします
3. **Premium 固有モデル** — Opus や GPT-5.6 など、モードキーがない項目は画面上の表示名（ラベル）で一致させます

## 対応 URL

| URL | Chrome | Edge 152 公式ビルド |
| --- | --- | --- |
| `https://m365.cloud.microsoft/*`（会社 Copilot / Work IQ） | 動作 | **動作（会社利用はここ）** |
| `https://copilot.com/*` | 動作 | 動作することが多い |
| `https://www.bing.com/chat/*` | 動作 | 動作することが多い |
| `https://copilot.microsoft.com/*` | 動作 | **保護ページのため不可**（M365 へ誘導） |
| Edge サイドバー Copilot | — | **不可**（通常タブを使う） |

## 開発

```bash
npm test
bash scripts/build-release-assets.sh
```

## ライセンス

MIT
