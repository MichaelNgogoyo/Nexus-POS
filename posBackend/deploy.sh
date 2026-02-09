#!/bin/bash

set -e

# === config ===

JAR_NAME="pos-0.0.1-SNAPSHOT.jar"
REMOTE_USER="michael"
REMOTE_HOST="20.124.12.140"
REMOTE_DIRECTORY="/opt/pos"

#=== Build Jar ===
echo "Building the project..."
./mvnw clean package -DskipTests

#=== upload jar ===
echo "Uploading the jar to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIRECTORY}..."
scp "target/$JAR_NAME"  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIRECTORY/"

#=== restart service ===
echo "Restarting the service on the remote server..."
ssh "$REMOTE_USER@$REMOTE_HOST" << EOF
    pkill -f "$JAR_NAME" || true
    nohup java -jar "$REMOTE_DIRECTORY/$JAR_NAME" > "$REMOTE_DIRECTORY/app.log" 2>&1 &
    echo "App started. logs: $REMOTE_DIRECTORY/app.log"
EOF

