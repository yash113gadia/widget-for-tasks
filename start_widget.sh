#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Kill previous TaskWidget instances to prevent duplicate menu bar items
killall TaskWidget 2>/dev/null || true
sleep 0.3

# Start Node.js sync server in background if not running
if ! lsof -i:3000 > /dev/null; then
  echo "Starting Task Sync Server on port 3000..."
  node "$DIR/server.js" &
  sleep 1.5
fi

# Launch single instance of Native macOS TaskWidget
echo "Launching Native macOS Desktop Widget..."
"$DIR/TaskWidget"
