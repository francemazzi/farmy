#!/bin/bash
# ============================================
# Farmy - Manual Backup (run from host)
# Usage: ./scripts/backup.sh [local|remote]
# ============================================

set -euo pipefail

REMOTE_HOST="frasma@192.168.68.106"
REMOTE_DIR="/home/frasma/farmy"
LOCAL_BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$LOCAL_BACKUP_DIR"

backup_local() {
    echo "=== Local backup from Docker volumes ==="

    # Copy DB from Docker volume
    docker cp farmy-backend:/app/data/farmy.db "$LOCAL_BACKUP_DIR/farmy_${TIMESTAMP}.db"
    echo "Database saved: $LOCAL_BACKUP_DIR/farmy_${TIMESTAMP}.db"

    # Copy uploads
    docker cp farmy-backend:/app/uploads "$LOCAL_BACKUP_DIR/uploads_${TIMESTAMP}"
    tar czf "$LOCAL_BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C "$LOCAL_BACKUP_DIR" "uploads_${TIMESTAMP}"
    rm -rf "$LOCAL_BACKUP_DIR/uploads_${TIMESTAMP}"
    echo "Uploads saved: $LOCAL_BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
}

backup_remote() {
    echo "=== Remote backup from Raspberry Pi ==="

    # Pull DB from Raspberry
    scp "$REMOTE_HOST:$REMOTE_DIR/data/farmy.db" "$LOCAL_BACKUP_DIR/farmy_${TIMESTAMP}.db" 2>/dev/null || \
        ssh "$REMOTE_HOST" "docker cp farmy-backend:/app/data/farmy.db /tmp/farmy_backup.db" && \
        scp "$REMOTE_HOST:/tmp/farmy_backup.db" "$LOCAL_BACKUP_DIR/farmy_${TIMESTAMP}.db"
    echo "Database saved: $LOCAL_BACKUP_DIR/farmy_${TIMESTAMP}.db"

    # Pull uploads
    ssh "$REMOTE_HOST" "docker cp farmy-backend:/app/uploads /tmp/farmy_uploads_backup" && \
        ssh "$REMOTE_HOST" "cd /tmp && tar czf farmy_uploads_backup.tar.gz farmy_uploads_backup" && \
        scp "$REMOTE_HOST:/tmp/farmy_uploads_backup.tar.gz" "$LOCAL_BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" && \
        ssh "$REMOTE_HOST" "rm -rf /tmp/farmy_uploads_backup /tmp/farmy_uploads_backup.tar.gz"
    echo "Uploads saved: $LOCAL_BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
}

restore_db() {
    local BACKUP_FILE="$1"
    echo "=== Restoring database from $BACKUP_FILE ==="
    docker cp "$BACKUP_FILE" farmy-backend:/app/data/farmy.db
    docker restart farmy-backend
    echo "Database restored and server restarted."
}

case "${1:-local}" in
    local)   backup_local ;;
    remote)  backup_remote ;;
    restore) restore_db "${2:?Usage: ./backup.sh restore <backup_file>}" ;;
    *)       echo "Usage: $0 [local|remote|restore <file>]" ;;
esac
