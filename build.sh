#!/bin/bash
# Build script for Smart Job Application Autofill Extension

set -e

echo "🔨 Building Smart Job Autofill Extension..."

# Get version from manifest.json
VERSION=$(grep -o '"version": "[^"]*' manifest.json | cut -d'"' -f4)
echo "📦 Version: $VERSION"

# Create build directory
BUILD_DIR="build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Files to include in the extension
FILES=(
  "manifest.json"
  "background.js"
  "content.js"
  "injected.js"
  "popup.html"
  "popup.js"
  "popup.css"
  "icons/"
)

# Copy files to build directory
echo "📁 Copying files..."
for file in "${FILES[@]}"; do
  if [ -e "$file" ]; then
    if [ -d "$file" ]; then
      cp -r "$file" "$BUILD_DIR/"
    else
      cp "$file" "$BUILD_DIR/"
    fi
    echo "  ✓ $file"
  else
    echo "  ⚠️  $file not found (skipping)"
  fi
done

# Create ZIP file
ZIP_NAME="extension-v${VERSION}.zip"
echo "🗜️  Creating $ZIP_NAME..."
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" . -q
cd ..

echo "✅ Build complete!"
echo ""
echo "📦 Package: $ZIP_NAME"
echo "📍 Location: $(pwd)/$ZIP_NAME"
echo ""
echo "Next steps:"
echo "  1. Upload to Chrome Web Store, or"
echo "  2. Pack as .crx via chrome://extensions (Pack extension)"
echo ""
