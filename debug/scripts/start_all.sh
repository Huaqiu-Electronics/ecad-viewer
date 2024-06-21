#! /bin/bash

HOME_DIR="/home/kicad"
APP_DIR="$HOME_DIR/app"
SCRIPT_DIR="$APP_DIR/scripts"

nohup python3 "$SCRIPT_DIR/cli_srv.py" &
nohup python3 "$SCRIPT_DIR/file_srv.py" &
nohup python3 -m http.server -d $APP_DIR -p 8012 &

echo "Viewer is running at http://localhost:8012"
