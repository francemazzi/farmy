#!/bin/sh
# ============================================
# Farmy - Automated Backup Script
# Runs inside Docker container via cron
# ============================================

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_BACKUPS=14  # Keep 2 weeks of daily backups

echo "[$(date)] Starting backup..."

# --- Backup SQLite database ---
if [ -f /data/farmy.db ]; then
    cp /data/farmy.db "$BACKUP_DIR/farmy_${TIMESTAMP}.db"
    echo "[$(date)] Database backed up: farmy_${TIMESTAMP}.db"
else
    echo "[$(date)] WARNING: Database file not found!"
fi

# --- Backup uploads ---
if [ -d /uploads ] && [ "$(ls -A /uploads 2>/dev/null)" ]; then
    tar czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C /uploads .
    echo "[$(date)] Uploads backed up: uploads_${TIMESTAMP}.tar.gz"
fi

# --- Cleanup old backups (keep last MAX_BACKUPS) ---
cd "$BACKUP_DIR"

# Clean old DB backups
ls -t farmy_*.db 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
# Clean old upload backups
ls -t uploads_*.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f

echo "[$(date)] Backup completed. Current backups:"
ls -lh "$BACKUP_DIR"
