#!/usr/bin/env bash
# Chrome 用 ZIP と Windows セットアップ EXE を addon/ に出力する。

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADDON="${ROOT}/addon"
INSTALLER="${ROOT}/scripts/windows-installer"

mkdir -p "${ADDON}"
bash "${ROOT}/scripts/pack-extension.sh"

cp "${ROOT}/dist/copilotselecter-chrome.zip" "${ADDON}/copilotselecter-chrome.zip"
cp "${ROOT}/dist/copilotselecter-chrome.zip" "${INSTALLER}/extension.zip"

(
  cd "${INSTALLER}"
  GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-H windowsgui -s -w" -o "${ADDON}/CopilotSelecter-Setup.exe"
)

rm -f "${INSTALLER}/extension.zip"

echo "Wrote ${ADDON}/copilotselecter-chrome.zip"
echo "Wrote ${ADDON}/CopilotSelecter-Setup.exe"
