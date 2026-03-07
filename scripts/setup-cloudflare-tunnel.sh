#!/bin/bash
# ============================================
# Farmy - Cloudflare Tunnel Setup (Quick Test)
# Creates a temporary public URL (no account needed)
# ============================================

set -euo pipefail

REMOTE_HOST="frasma@192.168.68.106"
REMOTE_DIR="/home/frasma/farmy"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Farmy - Cloudflare Tunnel Setup ===${NC}"
echo ""

case "${1:-test}" in

    # --- Quick test tunnel (temporary URL, no account needed) ---
    test)
        echo -e "${YELLOW}Starting temporary Cloudflare tunnel...${NC}"
        echo "This creates a free public URL that lasts until you stop it."
        echo "Press Ctrl+C to stop."
        echo ""

        ssh "$REMOTE_HOST" bash <<'REMOTE_TUNNEL'
# Install cloudflared if not present
if ! command -v cloudflared &>/dev/null; then
    echo "Installing cloudflared..."
    # ARM64 for Raspberry Pi
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /tmp/cloudflared
    chmod +x /tmp/cloudflared
    sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
fi

echo ""
echo "=== Starting tunnel to http://localhost:80 ==="
echo "Your public URL will appear below:"
echo ""

cloudflared tunnel --url http://localhost:80 2>&1 | grep -E "https://.*trycloudflare.com|INF"
REMOTE_TUNNEL
        ;;

    # --- Persistent tunnel (requires Cloudflare account) ---
    persistent)
        echo -e "${YELLOW}Setting up persistent Cloudflare tunnel...${NC}"
        echo ""
        echo "Steps:"
        echo "1. Go to https://one.dash.cloudflare.com/"
        echo "2. Networks > Tunnels > Create a tunnel"
        echo "3. Name it 'farmy'"
        echo "4. Copy the tunnel token"
        echo ""

        read -p "Paste your Cloudflare Tunnel Token: " TUNNEL_TOKEN

        if [ -z "$TUNNEL_TOKEN" ]; then
            echo "No token provided. Aborting."
            exit 1
        fi

        # Update .env.production with token
        if grep -q "CLOUDFLARE_TUNNEL_TOKEN" "$REMOTE_DIR/../.env.production" 2>/dev/null; then
            sed -i "s|CLOUDFLARE_TUNNEL_TOKEN=.*|CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN|" .env.production
        else
            echo "CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN" >> .env.production
        fi

        echo ""
        echo "Token saved. Now configure the tunnel in Cloudflare dashboard:"
        echo "  - Add public hostname pointing to: http://frontend:80"
        echo ""
        echo "Then deploy with: ./scripts/deploy.sh update"
        echo "The cloudflared service in docker-compose will start automatically."
        ;;

    *)
        echo "Usage: $0 [test|persistent]"
        echo ""
        echo "  test       - Quick temporary tunnel (no account needed)"
        echo "  persistent - Set up permanent tunnel (requires Cloudflare account)"
        ;;
esac
