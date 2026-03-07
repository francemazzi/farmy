#!/bin/bash
# ============================================
# Farmy - SSH Deploy to Raspberry Pi
# Usage: ./scripts/deploy.sh [full|update|prisma|restart|logs|setup]
# ============================================

set -euo pipefail

# --- Configuration ---
REMOTE_HOST="frasma@192.168.68.106"
REMOTE_DIR="/home/frasma/farmy"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# --- First-time setup on Raspberry Pi ---
cmd_setup() {
    log "Setting up Raspberry Pi for first deployment..."

    ssh "$REMOTE_HOST" bash <<'REMOTE_SETUP'
set -e

# Install Docker if not present
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to re-login for group changes."
fi

# Install Docker Compose plugin if not present
if ! docker compose version &>/dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

# Create project directory
mkdir -p ~/farmy/data ~/farmy/backups

echo "Setup complete!"
REMOTE_SETUP

    log "Raspberry Pi setup done."
}

# --- Full deploy (sync + build + start) ---
cmd_full() {
    log "Starting full deployment to $REMOTE_HOST..."

    # Sync project files (exclude unnecessary)
    log "Syncing project files..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude '.git' \
        --exclude '*.db' \
        --exclude '*.db-wal' \
        --exclude '*.db-shm' \
        --exclude 'dataset' \
        --exclude 'backups' \
        --exclude '__pycache__' \
        --exclude '.env' \
        "$PROJECT_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"

    # Copy production env if exists
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        log "Syncing .env.production..."
        scp "$PROJECT_DIR/.env.production" "$REMOTE_HOST:$REMOTE_DIR/.env.production"
    fi

    # Build and start on Raspberry Pi
    log "Building and starting services on Raspberry Pi..."
    ssh "$REMOTE_HOST" bash <<REMOTE_DEPLOY
cd $REMOTE_DIR
docker compose down || true
docker compose build --no-cache
docker compose up -d
echo ""
echo "=== Services Status ==="
docker compose ps
REMOTE_DEPLOY

    log "Full deployment completed!"
}

# --- Quick update (sync + rebuild changed) ---
cmd_update() {
    log "Quick update deployment..."

    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude '.git' \
        --exclude '*.db*' \
        --exclude 'dataset' \
        --exclude 'backups' \
        --exclude '__pycache__' \
        --exclude '.env' \
        "$PROJECT_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"

    if [ -f "$PROJECT_DIR/.env.production" ]; then
        scp "$PROJECT_DIR/.env.production" "$REMOTE_HOST:$REMOTE_DIR/.env.production"
    fi

    ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose up -d --build"

    log "Update deployment completed!"
}

# --- Deploy Prisma schema only ---
cmd_prisma() {
    log "Deploying Prisma schema to Raspberry Pi..."

    # Sync only prisma files
    rsync -avz \
        "$PROJECT_DIR/server/prisma/" "$REMOTE_HOST:$REMOTE_DIR/server/prisma/"

    # Run prisma db push inside the container
    ssh "$REMOTE_HOST" bash <<REMOTE_PRISMA
cd $REMOTE_DIR

echo "Running Prisma schema push..."
docker compose exec -T backend npx prisma db push --accept-data-loss

echo ""
echo "=== Prisma schema deployed ==="
docker compose exec -T backend npx prisma db push --dry-run 2>&1 | tail -5
REMOTE_PRISMA

    log "Prisma schema deployed!"
}

# --- Restart services ---
cmd_restart() {
    log "Restarting services on Raspberry Pi..."
    ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose restart"
    ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose ps"
    log "Services restarted."
}

# --- View logs ---
cmd_logs() {
    local SERVICE="${2:-}"
    if [ -n "$SERVICE" ]; then
        ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose logs -f --tail=100 $SERVICE"
    else
        ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose logs -f --tail=100"
    fi
}

# --- Status ---
cmd_status() {
    ssh "$REMOTE_HOST" bash <<REMOTE_STATUS
echo "=== Docker Services ==="
cd $REMOTE_DIR && docker compose ps

echo ""
echo "=== System Resources ==="
echo "CPU Temp: \$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{printf "%.1f°C", \$1/1000}' || echo 'N/A')"
echo "Memory: \$(free -h | awk '/^Mem:/{print \$3 "/" \$2}')"
echo "Disk: \$(df -h / | awk 'NR==2{print \$3 "/" \$2 " (" \$5 " used)"}')"

echo ""
echo "=== Docker Resources ==="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || true
REMOTE_STATUS
}

# --- Main ---
case "${1:-help}" in
    setup)   cmd_setup ;;
    full)    cmd_full ;;
    update)  cmd_update ;;
    prisma)  cmd_prisma ;;
    restart) cmd_restart ;;
    logs)    cmd_logs "$@" ;;
    status)  cmd_status ;;
    *)
        echo "Farmy Deploy Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  setup    - First-time Raspberry Pi setup (install Docker)"
        echo "  full     - Full deploy (sync + build + start)"
        echo "  update   - Quick update (sync + rebuild changed)"
        echo "  prisma   - Deploy Prisma schema only"
        echo "  restart  - Restart all services"
        echo "  logs     - View logs (optionally: logs backend|frontend)"
        echo "  status   - Show services status and system info"
        ;;
esac
