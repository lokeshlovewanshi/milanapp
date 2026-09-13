import os
import subprocess

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
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

env = load_env(ENV_FILE)
vm_ip = env.get("VM_IP", "155.248.244.90")
ssh_key = os.path.expanduser(env.get("SSH_KEY", "~/.ssh/oci_dev"))
db_user = env.get("DB_USERNAME", "lovewanshi_dev")
db_pass = env.get("DB_PASSWORD", "")
db_host = env.get("DB_HOST", "10.30.2.230")
db_name = env.get("DB_NAME", "marriage_portal")

print(f"Connecting to Oracle Cloud MySQL ({db_name}) on {db_host}...")
cmd = ["ssh", "-i", ssh_key, "-t", f"ubuntu@{vm_ip}", f"mysql -h {db_host} -u {db_user} -p'{db_pass}' {db_name}"]
subprocess.run(cmd)

