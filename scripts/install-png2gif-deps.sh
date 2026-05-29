#!/usr/bin/env bash
# Native dependencies for png2gif (node-canvas).
# - macOS local dev: Homebrew packages below, then npm install.
# - Cloud Run: png2gif/Dockerfile installs Debian packages during image build.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

install_macos_deps() {
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is required to build canvas on macOS: https://brew.sh"
    exit 1
  fi

  BREW_PACKAGES=(
    pkg-config
    cairo
    pango
    libpng
    jpeg
    giflib
    librsvg
    pixman
    ffmpeg
    graphicsmagick
  )

  MISSING=()
  for pkg in "${BREW_PACKAGES[@]}"; do
    if ! brew list "$pkg" >/dev/null 2>&1; then
      MISSING+=("$pkg")
    fi
  done

  if ((${#MISSING[@]} > 0)); then
    echo "Installing png2gif native dependencies: ${MISSING[*]}"
    brew install "${MISSING[@]}"
  else
    echo "png2gif native dependencies already installed."
  fi

  if [[ -d /opt/homebrew/lib/pkgconfig ]]; then
    export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
  fi
  if [[ -d /opt/homebrew/opt/jpeg/lib/pkgconfig ]]; then
    export PKG_CONFIG_PATH="/opt/homebrew/opt/jpeg/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
  fi

  if ! xcode-select -p >/dev/null 2>&1; then
    echo "Xcode Command Line Tools are required. Run: xcode-select --install"
    exit 1
  fi
}

install_linux_deps() {
  if command -v apt-get >/dev/null 2>&1; then
    echo "Linux: canvas build deps are installed in png2gif/Dockerfile for Cloud Run."
    echo "For local Linux dev, install the builder packages from that Dockerfile."
  fi
}

case "$(uname -s)" in
  Darwin) install_macos_deps ;;
  Linux) install_linux_deps ;;
  *) echo "Unsupported OS for automatic native deps; see png2gif/Dockerfile." ;;
esac

echo "Installing png2gif npm dependencies..."
(cd "$ROOT/png2gif" && npm install)
