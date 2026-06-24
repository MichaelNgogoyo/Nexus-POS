#!/usr/bin/env bash
set -euo pipefail

# Resolve project directory
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Delegate runtime wiring to the JavaFX Maven plugin (handles module path and classpath)
exec mvn -q -f "$ROOT_DIR/pom.xml" -DskipTests javafx:run "$@"