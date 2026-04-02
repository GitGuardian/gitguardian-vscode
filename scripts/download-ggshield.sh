#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
VERSION=$(cat "$ROOT_DIR/ggshield_version" | tr -d '[:space:]')
OUTPUT_DIR="$ROOT_DIR/ggshield-bundled"

usage() {
    cat <<EOF
Usage: $(basename "$0") [--target <vscode-target>] [--force]

Download and stage a ggshield binary for bundling into a platform-specific VSIX.

If --target is omitted, auto-detects from the current OS/arch.
Skips download if the binary already exists (use --force to re-download).

Supported targets:
  darwin-x64, darwin-arm64, linux-x64, win32-x64, win32-arm64

The binary is extracted into ggshield-bundled/ at the project root.
EOF
    exit 1
}

detect_target() {
    local os arch
    os=$(uname -s)
    arch=$(uname -m)

    case "$os" in
        Darwin)
            case "$arch" in
                arm64)  echo "darwin-arm64" ;;
                x86_64) echo "darwin-x64" ;;
                *)      echo "Error: unsupported macOS architecture: $arch" >&2; exit 1 ;;
            esac
            ;;
        Linux)
            case "$arch" in
                x86_64)  echo "linux-x64" ;;
                *)       echo "Error: unsupported Linux architecture: $arch (only x86_64 is supported)" >&2; exit 1 ;;
            esac
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "win32-x64"
            ;;
        *)
            echo "Error: unsupported OS: $os" >&2; exit 1
            ;;
    esac
}

TARGET=""
FORCE=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --force)
            FORCE=1
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            ;;
    esac
done

if [[ -z "$TARGET" && -n "${GGSHIELD_TARGET:-}" ]]; then
    TARGET="$GGSHIELD_TARGET"
    echo "Using target from GGSHIELD_TARGET: ${TARGET}"
elif [[ -z "$TARGET" ]]; then
    TARGET=$(detect_target)
    echo "Auto-detected target: ${TARGET}"
fi

# Map VS Code target to ggshield release asset components
case "$TARGET" in
    darwin-x64)
        ASSET_TARGET="x86_64-apple-darwin"
        ARCHIVE_EXT="tar.gz"
        ;;
    darwin-arm64)
        ASSET_TARGET="arm64-apple-darwin"
        ARCHIVE_EXT="tar.gz"
        ;;
    linux-x64)
        ASSET_TARGET="x86_64-unknown-linux-gnu"
        ARCHIVE_EXT="tar.gz"
        ;;
    win32-x64|win32-arm64)
        ASSET_TARGET="x86_64-pc-windows-msvc"
        ARCHIVE_EXT="zip"
        ;;
    *)
        echo "Error: unsupported target '$TARGET'" >&2
        echo "Supported: darwin-x64, darwin-arm64, linux-x64, win32-x64, win32-arm64" >&2
        exit 1
        ;;
esac

ASSET_NAME="ggshield-${VERSION}-${ASSET_TARGET}.${ARCHIVE_EXT}"
DOWNLOAD_URL="https://github.com/GitGuardian/ggshield/releases/download/v${VERSION}/${ASSET_NAME}"

# Skip if binary already exists (unless --force)
if [[ "$TARGET" == win32-* ]]; then
    EXPECTED_BINARY="$OUTPUT_DIR/ggshield.exe"
else
    EXPECTED_BINARY="$OUTPUT_DIR/ggshield"
fi

if [[ "$FORCE" -eq 0 && -f "$EXPECTED_BINARY" ]]; then
    echo "ggshield binary already exists at ${EXPECTED_BINARY}, skipping download (use --force to re-download)"
    exit 0
fi

echo "Downloading ggshield v${VERSION} for ${TARGET}..."
echo "  URL: ${DOWNLOAD_URL}"

# Clean up previous bundled binary
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Download to a temp file
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

if ! curl -fSL --retry 3 --retry-delay 5 -o "$TMPFILE" "$DOWNLOAD_URL"; then
    echo "Error: failed to download ${DOWNLOAD_URL}" >&2
    echo "Check that ggshield v${VERSION} has a release asset for ${ASSET_TARGET}" >&2
    exit 1
fi

# Extract the binary into ggshield-bundled/
# The archive contains a directory like ggshield-{ver}-{target}/ with the binary inside.
# We extract and then move contents up so the structure is flat: ggshield-bundled/ggshield
case "$ARCHIVE_EXT" in
    tar.gz)
        tar xzf "$TMPFILE" -C "$OUTPUT_DIR" --strip-components=1
        ;;
    zip)
        # Extract to a temp dir first, then move contents up (strip top-level dir)
        EXTRACT_TMP=$(mktemp -d)
        trap 'rm -f "$TMPFILE"; rm -rf "$EXTRACT_TMP"' EXIT
        unzip -q "$TMPFILE" -d "$EXTRACT_TMP"
        # Move contents of the single top-level directory into OUTPUT_DIR
        TOP_DIR=$(ls "$EXTRACT_TMP")
        mv "$EXTRACT_TMP/$TOP_DIR"/* "$OUTPUT_DIR/"
        rm -rf "$EXTRACT_TMP"
        ;;
esac

# Verify the binary exists
if [[ "$TARGET" == win32-* ]]; then
    BINARY="$OUTPUT_DIR/ggshield.exe"
else
    BINARY="$OUTPUT_DIR/ggshield"
fi

if [[ ! -f "$BINARY" ]]; then
    echo "Error: expected binary not found at $BINARY after extraction" >&2
    echo "Contents of $OUTPUT_DIR:" >&2
    ls -la "$OUTPUT_DIR" >&2
    exit 1
fi

echo "ggshield v${VERSION} staged at ${OUTPUT_DIR}/"
echo "Binary: ${BINARY}"
