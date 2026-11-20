#!/bin/sh
# Companion cron/systemd-timer sweep for the DoPassGen MCP example.
# Enforces the 24h TTL even when the MCP server process is not running.
# Deletes ONLY regular files matching the server's naming scheme; never
# follows symlinks (find -type f has lstat semantics).
DIR="${DPG_SECRETS_DIR:-/tmp/dopassgen-mcp-secrets}"
[ -d "$DIR" ] || exit 0
find "$DIR" -maxdepth 1 -type f \
  -regextype posix-extended \
  -regex '.*/pw-[0-9]{13}-[a-f0-9]{16}\.txt' \
  -mmin +1440 -delete
