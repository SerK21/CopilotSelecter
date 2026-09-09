#!/usr/bin/env bash
# Chrome に「パッケージ化されていない拡張機能」として読み込める ZIP を作る。
# ZIP 直下に manifest.json が来るようにする（GitHub の Source code ZIP とは別物）。

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/dist"
OUT="${DIST}/copilotselecter-chrome.zip"

mkdir -p "${DIST}"
rm -f "${OUT}"

python3 "${ROOT}/scripts/generate-icons.py" >/dev/null

TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

mkdir -p "${TMP}/extension"
cp "${ROOT}/manifest.json" "${TMP}/extension/"
cp "${ROOT}/LICENSE" "${TMP}/extension/"
cp -R "${ROOT}/icons" "${TMP}/extension/"
cp -R "${ROOT}/src" "${TMP}/extension/"

(
  cd "${TMP}/extension"
  zip -qr "${OUT}" .
)

echo "Wrote ${OUT}"
