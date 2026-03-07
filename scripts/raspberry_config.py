#!/usr/bin/env python3
"""
Farmy - Raspberry Pi Configuration & Management
Variabili di connessione e utility per il Raspberry Pi.
"""

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class RaspberryConfig:
    """Configurazione Raspberry Pi per Farmy."""

    # --- Connessione SSH ---
    host: str = "192.168.68.106"
    user: str = "frasma"
    password: str = "piadina2025"
    ssh_target: str = "frasma@192.168.68.106"

    # --- Percorsi ---
    remote_dir: str = "/home/frasma/farmy"
    data_dir: str = "/home/frasma/farmy/data"
    backup_dir: str = "/home/frasma/farmy/backups"
    uploads_dir: str = "/home/frasma/farmy/uploads"

    # --- Porte ---
    backend_port: int = 7771
    frontend_port: int = 80

    # --- Docker ---
    compose_file: str = "docker-compose.yml"
    backend_container: str = "farmy-backend"
    frontend_container: str = "farmy-frontend"
    tunnel_container: str = "farmy-tunnel"

    # --- Database ---
    db_path: str = "/home/frasma/farmy/data/farmy.db"
    db_url: str = "file:/app/data/farmy.db"

    # --- URLs ---
    @property
    def local_api_url(self) -> str:
        return f"http://{self.host}:{self.backend_port}"

    @property
    def local_frontend_url(self) -> str:
        return f"http://{self.host}:{self.frontend_port}"


# Singleton
PI = RaspberryConfig()


def ssh_command(cmd: str, verbose: bool = True) -> subprocess.CompletedProcess:
    """Esegue un comando SSH sul Raspberry Pi."""
    full_cmd = f'sshpass -p "{PI.password}" ssh -o StrictHostKeyChecking=no {PI.ssh_target} "{cmd}"'
    if verbose:
        print(f"[SSH] {cmd}")
    return subprocess.run(full_cmd, shell=True, capture_output=not verbose, text=True)


def scp_upload(local_path: str, remote_path: str) -> subprocess.CompletedProcess:
    """Upload file al Raspberry Pi."""
    full_cmd = f'sshpass -p "{PI.password}" scp -o StrictHostKeyChecking=no {local_path} {PI.ssh_target}:{remote_path}'
    print(f"[SCP] {local_path} -> {remote_path}")
    return subprocess.run(full_cmd, shell=True, text=True)


def scp_download(remote_path: str, local_path: str) -> subprocess.CompletedProcess:
    """Download file dal Raspberry Pi."""
    full_cmd = f'sshpass -p "{PI.password}" scp -o StrictHostKeyChecking=no {PI.ssh_target}:{remote_path} {local_path}'
    print(f"[SCP] {remote_path} -> {local_path}")
    return subprocess.run(full_cmd, shell=True, text=True)


def check_status():
    """Controlla lo stato del Raspberry Pi e dei servizi."""
    print("=" * 50)
    print("  FARMY - Stato Raspberry Pi")
    print("=" * 50)

    print("\n--- Connessione ---")
    result = ssh_command("echo 'OK'", verbose=False)
    print(f"SSH: {'Connesso' if result.returncode == 0 else 'Non raggiungibile'}")

    if result.returncode == 0:
        print("\n--- Sistema ---")
        ssh_command("cat /sys/class/thermal/thermal_zone0/temp | awk '{printf \"Temp CPU: %.1f°C\\n\", $1/1000}'")
        ssh_command("free -h | awk '/^Mem:/{print \"Memoria: \" $3 \"/\" $2}'")
        ssh_command("df -h / | awk 'NR==2{print \"Disco: \" $3 \"/\" $2 \" (\" $5 \" usato)\"}'")

        print("\n--- Docker ---")
        ssh_command(f"cd {PI.remote_dir} && docker compose ps 2>/dev/null || echo 'Docker non avviato'")


def quick_deploy():
    """Deploy rapido al Raspberry Pi."""
    project_dir = Path(__file__).parent.parent

    print("=== Deploy rapido Farmy ===")

    # Sync files
    rsync_cmd = (
        f'rsync -avz --delete '
        f'--exclude "node_modules" --exclude "dist" --exclude ".git" '
        f'--exclude "*.db*" --exclude "dataset" --exclude "__pycache__" '
        f'--exclude ".env" --exclude "backups" '
        f'-e "sshpass -p {PI.password} ssh -o StrictHostKeyChecking=no" '
        f'{project_dir}/ {PI.ssh_target}:{PI.remote_dir}/'
    )
    subprocess.run(rsync_cmd, shell=True)

    # Rebuild and restart
    ssh_command(f"cd {PI.remote_dir} && docker compose up -d --build")

    print("\nDeploy completato!")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python raspberry_config.py <comando>")
        print("  status  - Controlla stato Raspberry Pi")
        print("  deploy  - Deploy rapido")
        print("  ssh     - Apri sessione SSH")
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "status":
        check_status()
    elif cmd == "deploy":
        quick_deploy()
    elif cmd == "ssh":
        import os
        os.system(f'sshpass -p "{PI.password}" ssh {PI.ssh_target}')
    else:
        print(f"Comando sconosciuto: {cmd}")
