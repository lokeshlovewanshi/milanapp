"""
Setup Script for Oracle Cloud Always Free MySQL Database & Compute Instance
----------------------------------------------------------------------------
This script automates:
1. Verifying OCI credentials in terraform-oracle/terraform.tfvars
2. Initializing & running Terraform to provision:
   - VCN & Subnets (Always Free)
   - HeatWave MySQL DB System (MySQL.Free shape, 50 GB, Always Free)
   - Ampere A1 Compute Instance (1 OCPU, 6 GB RAM, 50 GB boot volume, Always Free)
3. Transferring & importing 'heatwave_marriage_portal_dump (1).sql' into MySQL
"""

import os
import sys
import re
import shutil
import subprocess
import secrets
import string
import json
import time

REPO_ROOT = r"D:\Lovewanshi Familty\milanapp"
TF_DIR = os.path.join(REPO_ROOT, "terraform-oracle")
DUMP_FILE = os.path.join(REPO_ROOT, "heatwave_marriage_portal_dump (1).sql")
SSH_KEY_PUB = os.path.expanduser(r"~/.ssh/oci_dev.pub")
SSH_KEY_PRIV = os.path.expanduser(r"~/.ssh/oci_dev")
OCI_DIR = os.path.expanduser(r"~/.oci")

TF_BIN = shutil.which("terraform") or os.path.join(OCI_DIR, "terraform.exe")

def generate_db_password(length=16):
    chars = string.ascii_letters + string.digits + "!@#%^*()"
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#%^*()")
    ]
    for _ in range(length - 4):
        pwd.append(secrets.choice(chars))
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)

def main():
    print("=" * 75)
    print("  Oracle Cloud (OCI) Always Free MySQL Database & Compute VM Setup")
    print("=" * 75)

    # 1. Verify dump file exists
    if not os.path.isfile(DUMP_FILE):
        print(f"[!] Error: Database dump file not found at: {DUMP_FILE}")
        sys.exit(1)
    print(f"[*] Found Database Dump: {os.path.basename(DUMP_FILE)} ({os.path.getsize(DUMP_FILE) // 1024} KB)")

    # 2. Verify SSH key
    if not os.path.isfile(SSH_KEY_PUB):
        print("[*] Generating new SSH key pair (~/.ssh/oci_dev)...")
        os.makedirs(os.path.dirname(SSH_KEY_PUB), exist_ok=True)
        subprocess.run(["ssh-keygen", "-t", "ed25519", "-f", SSH_KEY_PRIV, "-N", ""], check=True)
    print(f"[*] SSH Key Ready: {SSH_KEY_PUB}")

    # 3. Check for existing terraform.tfvars
    tfvars_path = os.path.join(TF_DIR, "terraform.tfvars")
    if not os.path.isfile(tfvars_path):
        print(f"[!] Error: {tfvars_path} not found.")
        sys.exit(1)
    print(f"[*] Found configuration: {tfvars_path}")

    # Extract db_password from terraform.tfvars
    db_password = ""
    with open(tfvars_path, "r", encoding="utf-8") as f:
        for line in f:
            m = re.match(r'^\s*db_password\s*=\s*"([^"]+)"', line)
            if m:
                db_password = m.group(1)
                break

    # 4. Terraform Init
    print("\n" + "-" * 75)
    print("  STEP 1: Initializing Terraform")
    print("-" * 75)
    res = subprocess.run([TF_BIN, "init"], cwd=TF_DIR)
    if res.returncode != 0:
        print("[!] terraform init failed.")
        sys.exit(1)

    # 5. Terraform Plan & Apply
    print("\n" + "-" * 75)
    print("  STEP 2: Provisioning Always Free Resources via Terraform")
    print("-" * 75)
    print("Resources being created (All within Always Free limits):")
    print(" - Virtual Cloud Network (VCN), Internet Gateway, Subnets ($0/mo)")
    print(" - OCI MySQL HeatWave Database System (MySQL.Free shape, 50 GB storage, $0/mo)")
    print(" - Ampere A1 Compute VM (1 OCPU, 6 GB RAM, 50 GB boot volume, $0/mo)")
    print("\nStarting terraform apply (MySQL usually takes 5-10 minutes to provision in OCI)...")

    res = subprocess.run([TF_BIN, "apply", "-auto-approve"], cwd=TF_DIR)
    if res.returncode != 0:
        print("[!] terraform apply encountered an error. Check output above.")
        sys.exit(1)

    # 6. Import SQL Database Dump
    print("\n" + "-" * 75)
    print("  STEP 3: Importing Database Dump into MySQL")
    print("-" * 75)

    out_ips = subprocess.run([TF_BIN, "output", "-json", "instance_public_ips"], cwd=TF_DIR, capture_output=True, text=True)
    out_mysql = subprocess.run([TF_BIN, "output", "-raw", "mysql_endpoint"], cwd=TF_DIR, capture_output=True, text=True)

    public_ips = json.loads(out_ips.stdout.strip()) if out_ips.returncode == 0 else []
    mysql_endpoint = out_mysql.stdout.strip() if out_mysql.returncode == 0 else ""

    if public_ips and mysql_endpoint:
        vm_ip = public_ips[0]
        db_host = mysql_endpoint.split(":")[0]
        print(f"[*] App Instance Public IP: {vm_ip}")
        print(f"[*] MySQL Internal Endpoint: {mysql_endpoint}")

        print("\n[*] Waiting for SSH service to become ready on the VM...")
        ready = False
        for attempt in range(1, 30):
            test_ssh = subprocess.run(
                ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5",
                 "-i", SSH_KEY_PRIV, f"ubuntu@{vm_ip}", "echo SSH_READY"],
                capture_output=True, text=True
            )
            if "SSH_READY" in test_ssh.stdout:
                ready = True
                print(f"[+] SSH is ready on attempt {attempt}!")
                break
            time.sleep(10)

        if not ready:
            print("[!] Warning: Could not establish SSH connection automatically after 5 minutes.")
            print(f"    You can SSH manually: ssh -i {SSH_KEY_PRIV} ubuntu@{vm_ip}")
        else:
            print("[*] Uploading SQL dump to the VM via SCP...")
            scp_cmd = [
                "scp", "-o", "StrictHostKeyChecking=no",
                "-i", SSH_KEY_PRIV,
                DUMP_FILE,
                f"ubuntu@{vm_ip}:/tmp/dump.sql"
            ]
            res_scp = subprocess.run(scp_cmd)
            if res_scp.returncode == 0:
                print("[+] SQL dump transferred successfully.")
                print("[*] Restoring database schema and data into MySQL (28 tables)...")
                restore_cmd = f"mysql -h {db_host} -P 3306 -u lovewanshi_dev -p'{db_password}' marriage_portal < /tmp/dump.sql && echo 'IMPORT_SUCCESS'"
                res_ssh = subprocess.run([
                    "ssh", "-o", "StrictHostKeyChecking=no",
                    "-i", SSH_KEY_PRIV,
                    f"ubuntu@{vm_ip}",
                    restore_cmd
                ])
                if res_ssh.returncode == 0:
                    print("\n[+] Database restored successfully from dump!")
                else:
                    print("[!] Notice: Automatic restore command exited with non-zero code. You can run it manually on the VM.")
            else:
                print("[!] SCP upload failed.")

    print("\n" + "=" * 75)
    print("  [ALL DONE] Oracle Cloud Always Free Setup Completed!")
    print("=" * 75)
    print("Database Name:    marriage_portal")
    print("Database User:    lovewanshi_dev")
    print(f"Database Host:    {mysql_endpoint}")
    if public_ips:
        print(f"Compute VM IP:    {public_ips[0]}")
        print(f"SSH Command:      ssh -i ~/.ssh/oci_dev ubuntu@{public_ips[0]}")
    print("=" * 75)

if __name__ == "__main__":
    main()
