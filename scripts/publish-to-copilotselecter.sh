#!/usr/bin/env bash
# CopilotSelecter リポジトリへ main ブランチをプッシュするスクリプト
# 使い方: ./scripts/publish-to-copilotselecter.sh

set -euo pipefail

REPO_URL="https://github.com/SerK21/CopilotSelecter.git"
SOURCE_URL="https://github.com/SerK21/Cursor.git"

echo "==> CopilotSelecter へコードを移行します"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI が必要です: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "先に gh auth login を実行してください"
  exit 1
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

echo "==> 一時ディレクトリ: $WORKDIR"
git clone --depth 1 --branch main "$SOURCE_URL" "$WORKDIR/source"
git clone "$REPO_URL" "$WORKDIR/target" 2>/dev/null || {
  mkdir -p "$WORKDIR/target"
  cd "$WORKDIR/target"
  git init -b main
  git remote add origin "$REPO_URL"
}

cd "$WORKDIR/target"
rsync -a --delete "$WORKDIR/source/" ./ --exclude .git
git add -A
git status

if git diff --cached --quiet; then
  echo "変更はありません。すでに同期済みの可能性があります。"
else
  git commit -m "chore: import CopilotSelecter extension from Cursor repo"
fi

git push -u origin main
echo "完了: $REPO_URL"
