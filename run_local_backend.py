"""
Local Backend Runner for Lodha Milan API
---------------------------------------------
1. Loads configuration from .env file (safely ignored by git)
2. Opens an SSH Tunnel to Oracle Cloud HeatWave MySQL (local port -> remote DB port)
3. Runs the Spring Boot server locally with active local profile
"""

import os
import sys
import time
import socket
import subprocess

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend", "lovewanshi-milan-api-feature")
ENV_FILE = os.path.join(REPO_ROOT, ".env")

def load_env(path):
    env_vars = {}
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip()
    return env_vars

def is_port_open(host="127.0.0.1", port=3308):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(2)
        return s.connect_ex((host, port)) == 0

def main():
    print("=" * 70)
    print("  Starting Lodha Milan API Backend Locally")
    print("=" * 70)

    # 1. Load environment
    file_env = load_env(ENV_FILE)
    vm_ip = file_env.get("VM_IP", "155.248.244.90")
    ssh_key = os.path.expanduser(file_env.get("SSH_KEY", "~/.ssh/oci_dev"))
    db_host = file_env.get("DB_HOST", "10.30.2.230")
    db_port = int(file_env.get("DB_PORT", "3306"))
    local_port = int(file_env.get("DB_LOCAL_PORT", "3308"))

    # 2. Start SSH Tunnel to Oracle Cloud MySQL
    tunnel_proc = None
    if is_port_open("127.0.0.1", local_port):
        print(f"[*] Port {local_port} is already open (SSH tunnel active).")
    else:
        print(f"[*] Opening SSH tunnel to Oracle Cloud MySQL on port {local_port}...")
        tunnel_cmd = [
            "ssh", "-o", "StrictHostKeyChecking=no",
            "-o", "ServerAliveInterval=30",
            "-o", "ServerAliveCountMax=5",
            "-i", ssh_key,
            "-L", f"{local_port}:{db_host}:{db_port}",
            "-N",
            f"ubuntu@{vm_ip}"
        ]
        tunnel_proc = subprocess.Popen(tunnel_cmd)
        
        # Wait up to 10s for tunnel
        for _ in range(10):
            time.sleep(1)
            if is_port_open("127.0.0.1", local_port):
                print(f"[+] SSH Tunnel established successfully on 127.0.0.1:{local_port}!")
                break
        else:
            print(f"[!] Warning: SSH Tunnel port {local_port} not yet responding. Proceeding anyway...")

    # 3. Run Spring Boot
    print("\n[*] Starting Spring Boot application via Gradle bootRun...")
    print(f"[*] Working Directory: {BACKEND_DIR}")
    gradle_cmd = ["cmd", "/c", "gradlew.bat", "bootRun"]
    
    env = os.environ.copy()
    env.update(file_env)
    env["DB_URL"] = f"jdbc:mysql://127.0.0.1:{local_port}/{file_env.get('DB_NAME', 'marriage_portal')}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata"

    try:
        boot_proc = subprocess.Popen(gradle_cmd, cwd=BACKEND_DIR, env=env)
        boot_proc.wait()
    except KeyboardInterrupt:
        print("\n[*] Stopping backend server...")
    finally:
        if tunnel_proc:
            tunnel_proc.terminate()
            print("[*] SSH Tunnel closed.")

if __name__ == "__main__":
    main()
