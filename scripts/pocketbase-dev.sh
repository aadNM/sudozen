#!/usr/bin/env bash
# Downloads PocketBase into .pocketbase/, creates/updates a superuser, and starts the server.
#
# Usage:
#   PB_SUPERUSER_EMAIL=you@example.com PB_SUPERUSER_PASSWORD='long-password' ./scripts/pocketbase-dev.sh
#   (or put those two values in .env)
#
# Optional: PB_VERSION=0.30.0 to pin a version (defaults to the latest GitHub release).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PB_DIR="$ROOT/.pocketbase"
PB_BIN="$PB_DIR/pocketbase"

# Load .env if present (only simple KEY=VALUE lines)
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ROOT/.env")
  set +a
fi

if [[ ! -x "$PB_BIN" ]]; then
  case "$(uname -s)" in
    Darwin) os=darwin ;;
    Linux)  os=linux ;;
    *) echo "Unsupported OS. Download PocketBase manually from https://pocketbase.io/docs/" >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) arch=arm64 ;;
    x86_64|amd64)  arch=amd64 ;;
    *) echo "Unsupported CPU architecture: $(uname -m)" >&2; exit 1 ;;
  esac

  version="${PB_VERSION:-}"
  if [[ -z "$version" ]]; then
    version="$(curl -fsSL https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
      | grep '"tag_name"' | head -1 | sed -E 's/.*"v([^"]+)".*/\1/')"
  fi

  echo "Downloading PocketBase v$version ($os/$arch)..."
  mkdir -p "$PB_DIR"
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/pb.zip" \
    "https://github.com/pocketbase/pocketbase/releases/download/v${version}/pocketbase_${version}_${os}_${arch}.zip"
  unzip -oq "$tmp/pb.zip" -d "$tmp"
  mv "$tmp/pocketbase" "$PB_BIN"
  chmod +x "$PB_BIN"
  rm -rf "$tmp"
fi

if [[ -n "${PB_SUPERUSER_EMAIL:-}" && -n "${PB_SUPERUSER_PASSWORD:-}" ]]; then
  "$PB_BIN" superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" --dir "$PB_DIR/pb_data"
else
  echo "PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD not set; create a superuser from the link PocketBase prints below."
fi

echo "PocketBase dashboard: http://127.0.0.1:8090/_/"
echo "Next (in another terminal): npm run pb:setup"
# 0.0.0.0 so a physical phone on the same Wi-Fi can reach it too
exec "$PB_BIN" serve --http 0.0.0.0:8090 --dir "$PB_DIR/pb_data"
