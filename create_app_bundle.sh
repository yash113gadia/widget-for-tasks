#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$DIR/Task Widget.app"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

cat << 'EOF' > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
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

# GUI launches inherit launchd's minimal PATH, which has no node.
# Bake in node's directory so the sync server can start from Finder.
NODE_BIN="$( dirname "$( command -v node )" )"

cat << EOF > "$APP_DIR/Contents/MacOS/launcher"
#!/bin/bash
DIR="$DIR"
export PATH="$NODE_BIN:\$PATH"
cd "\$DIR"
exec "\$DIR/start_widget.sh"
EOF

chmod +x "$APP_DIR/Contents/MacOS/launcher"
echo "Task Widget.app created successfully!"
