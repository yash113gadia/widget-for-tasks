#!/bin/bash
LOGO_SRC="/tmp/logo.png"
PUBLIC_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/public"
APP_DIR="/Applications/Task Widget.app"

echo "1. Generating Android Pixel PWA Icons..."
sips -s format png -z 192 192 "$LOGO_SRC" --out "$PUBLIC_DIR/icon-192.png"
sips -s format png -z 512 512 "$LOGO_SRC" --out "$PUBLIC_DIR/icon-512.png"
cp "$PUBLIC_DIR/icon-192.png" "$PUBLIC_DIR/favicon.png"

echo "2. Generating macOS AppIcon.icns..."
ICONSET_DIR="/tmp/AppIcon.iconset"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

sips -s format png -z 16 16     "$LOGO_SRC" --out "$ICONSET_DIR/icon_16x16.png"
sips -s format png -z 32 32     "$LOGO_SRC" --out "$ICONSET_DIR/icon_16x16@2x.png"
sips -s format png -z 32 32     "$LOGO_SRC" --out "$ICONSET_DIR/icon_32x32.png"
sips -s format png -z 64 64     "$LOGO_SRC" --out "$ICONSET_DIR/icon_32x32@2x.png"
sips -s format png -z 128 128   "$LOGO_SRC" --out "$ICONSET_DIR/icon_128x128.png"
sips -s format png -z 256 256   "$LOGO_SRC" --out "$ICONSET_DIR/icon_128x128@2x.png"
sips -s format png -z 256 256   "$LOGO_SRC" --out "$ICONSET_DIR/icon_256x256.png"
sips -s format png -z 512 512   "$LOGO_SRC" --out "$ICONSET_DIR/icon_256x256@2x.png"
sips -s format png -z 512 512   "$LOGO_SRC" --out "$ICONSET_DIR/icon_512x512.png"
sips -s format png -z 1024 1024 "$LOGO_SRC" --out "$ICONSET_DIR/icon_512x512@2x.png"

iconutil -c icns "$ICONSET_DIR" -o "/tmp/AppIcon.icns"

echo "3. Updating macOS Task Widget.app bundle..."
mkdir -p "$APP_DIR/Contents/Resources"
cp "/tmp/AppIcon.icns" "$APP_DIR/Contents/Resources/AppIcon.icns"

cat << 'EOF' > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.user.taskwidget</string>
    <key>CFBundleName</key>
    <string>Task Widget</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

# Force macOS Finder / Dock icon cache refresh
touch "$APP_DIR"
touch "$APP_DIR/Contents/Info.plist"
killall Finder || true
killall Dock || true

echo "Logo successfully applied to macOS App and Android PWA!"
