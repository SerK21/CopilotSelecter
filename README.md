# CopilotSelecter

Copilot / Work IQ で毎回モデルを手動選択する手間を省く **Chrome / Microsoft Edge** 拡張機能です。

リポジトリ: https://github.com/SerK21/CopilotSelecter

## Edge 152（会社の公式ビルド）で使う

Edge 152 では `m365.cloud.microsoft` へのサードパーティ拡張が再び動きます。  
ただし **`copilot.microsoft.com` と Edge サイドバー Copilot は、今もブラウザが保護していて拡張を注入できません**（フラグやポリシーでは解除不可）。

会社の Edge では次の URL を **通常タブ** で開いてください。

- https://m365.cloud.microsoft/chat

拡張を入れると、`copilot.microsoft.com` を開いたときは自動で上記へ切り替えます（設定でオフにできます）。

### 入れ方

1. [`addon/CopilotSelecter-Setup.exe`](addon/CopilotSelecter-Setup.exe) を実行する（SmartScreen が出たら「詳細情報」→「実行」）
2. `edge://extensions` で **デベロッパーモード** をオン
3. **パッケージ化されていない拡張機能を読み込む** で、表示されたフォルダを選ぶ
4. https://m365.cloud.microsoft/chat を開き、ツールバーの CopilotSelecter からモデルを保存する

ZIP の場合は [`addon/copilotselecter-chrome.zip`](addon/copilotselecter-chrome.zip) を解凍し、同じ手順で `edge://extensions` から読み込みます。

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

| URL | Chrome | Edge 152 |
| --- | --- | --- |
| `https://m365.cloud.microsoft/*`（会社 Copilot / Work IQ） | 動作 | 動作 |
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
