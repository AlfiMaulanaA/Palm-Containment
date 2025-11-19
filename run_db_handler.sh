#!/bin/bash

# Palm Database Handler Runner Script
# This script runs the Python database handler for palm user management

echo "Starting Palm Database Handler..."
echo "This handler manages palm user database operations via MQTT"
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if paho-mqtt is installed
python3 -c "import paho.mqtt.client" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing required Python packages..."
    pip3 install paho-mqtt
fi

# Run the database handler
echo "Running Palm Database Handler..."
echo "Press Ctrl+C to stop"
echo ""

python3 middleware/palm_database_handler.py
