#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/android_app"

echo "🚀 Building Android APK..."
gradle assembleDebug

if [ -f "$DIR/android_app/app/build/outputs/apk/debug/app-debug.apk" ]; then
  echo "SUCCESS: APK built at $DIR/android_app/app/build/outputs/apk/debug/app-debug.apk"
  
  # If Pixel is connected via ADB, install automatically!
  if adb devices | grep -q "device$"; then
    echo "📱 Installing APK onto connected Pixel..."
    adb install -r "$DIR/android_app/app/build/outputs/apk/debug/app-debug.apk"
  fi
fi
