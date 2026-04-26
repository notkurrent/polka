#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

WEBHOOK_URL="${WEBHOOK_URL:-https://thepolka.app/api/telegram/webhook}"

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "TELEGRAM_BOT_TOKEN is required" >&2
  exit 1
fi

case "${1:-info}" in
  set)
    if [[ -z "${TELEGRAM_WEBHOOK_SECRET:-}" ]]; then
      echo "TELEGRAM_WEBHOOK_SECRET is required for set" >&2
      exit 1
    fi
    curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
      -F "url=${WEBHOOK_URL}" \
      -F "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
    ;;
  info)
    curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
    ;;
  *)
    echo "Usage: $0 [set|info]" >&2
    exit 1
    ;;
esac
