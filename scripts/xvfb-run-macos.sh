#!/bin/bash

# Start Xvfb if not running
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Starting Xvfb on macOS..."
    Xvfb :99 -screen 0 1920x1080x24 &
    XVFB_PID=$!
    export DISPLAY=:99
fi

# Run the command passed as arguments
"$@"

# Stop Xvfb after the command runs
kill $XVFB_PID
