"""
Setup Script for Oracle Cloud Always Free MySQL Database & Compute Instance
----------------------------------------------------------------------------
This script automates:
1. Configuring OCI credentials in terraform-oracle/terraform.tfvars
2. Initializing & running Terraform to provision:
   - VCN & Subnets (Always Free)
   - HeatWave MySQL DB System (MySQL.Free shape, 50 GB, Always Free)
   - Ampere A1 Compute Instance (Always Free)
3. Transferring & importing 'heatwave_marriage_portal_dump (1).sql' into MySQL
"""

import os
import sys
import re
import shutil
import subprocess
import getpass
import secrets
import string

REPO_ROOT = r"D:\Lovewanshi Familty\milanapp"
TF_DIR = os.path.join(REPO_ROOT, "terraform-oracle")
DUMP_FILE = os.path.join(REPO_ROOT, "heatwave_marriage_portal_dump (1).sql")
SSH_KEY_PUB = os.path.expanduser(r"~/.ssh/oci_dev.pub")
SSH_KEY_PRIV = os.path.expanduser(r"~/.ssh/oci_dev")
OCI_DIR = os.path.expanduser(r"~/.oci")

def refresh_env_path():
    """Ensure terraform is discoverable in PATH on Windows."""
    machine_path = os.environ.get("Path", "")
    user_path = os.environ.get("Path", "")
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment") as k:
            m_p, _ = winreg.QueryValueEx(k, "Path")
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment") as k:
            u_p, _ = winreg.QueryValueEx(k, "Path")
        os.environ["PATH"] = f"{u_p};{m_p};{os.environ['PATH']}"
    except Exception:
        pass

def generate_db_password(length=16):
    chars = string.ascii_letters + string.digits + "!@#%^*()"
    # Oracle MySQL requires at least one uppercase, lowercase, digit, special char
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
    refresh_env_path()
    print("=" * 70)
    print("  Oracle Cloud (OCI) Always Free MySQL Database Setup")
    print("=" * 70)

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
    configured = False
    if os.path.isfile(tfvars_path):
        with open(tfvars_path, "r") as f:
            content = f.read()
            if "tenancy_ocid" in content and "ocid1.tenancy" in content:
                configured = True
                print(f"[*] Found existing configuration: {tfvars_path}")

    if not configured:
        print("\n" + "-" * 70)
        print("  STEP 1: OCI API Key Details Needed")
        print("-" * 70)
        print("To allow Terraform to create your free resources, we need your OCI API key.")
        print("\nIf you haven't generated one yet in Oracle Cloud Console:")
        print("1. Log in to https://cloud.oracle.com")
        print("2. Click Profile icon (top right) -> User Settings (or your email)")
        print("3. Under 'Resources' on the left side, click 'API Keys'")
        print("4. Click 'Add API Key' -> select 'Generate API Key Pair'")
        print("5. Download the Private Key (.pem file) and save it to: " + os.path.join(OCI_DIR, "oci_api_key.pem"))
        print("6. Click 'Add'. OCI will show a 'Configuration File Preview'.")
        print("-" * 70)

        # Check if oci_api_key.pem exists in ~/.oci
        default_pem = os.path.join(OCI_DIR, "oci_api_key.pem")
        pem_path = default_pem if os.path.isfile(default_pem) else ""

        print("\nEnter your OCI Configuration Details:")
        tenancy_ocid = input("Tenancy OCID (ocid1.tenancy.oc1..): ").strip()
        user_ocid = input("User OCID (ocid1.user.oc1..): ").strip()
        fingerprint = input("Fingerprint (e.g. 12:34:56:...): ").strip()
        region = input("Region [ap-mumbai-1]: ").strip() or "ap-mumbai-1"

        if not pem_path:
            pem_path = input(f"Path to downloaded .pem private key [{default_pem}]: ").strip() or default_pem

        if not os.path.isfile(pem_path):
            print(f"[!] Warning: Private key file not found at {pem_path}")
            print(f"    Please place your downloaded OCI private key at: {pem_path}")

        db_password = input("Choose MySQL DB Admin Password (press Enter to auto-generate): ").strip()
        if not db_password:
            db_password = generate_db_password()
            print(f"[*] Auto-generated DB Password: {db_password}")

        # Write terraform.tfvars
        # Use forward slashes for Terraform paths on Windows
        pem_path_tf = pem_path.replace("\\", "/")
        ssh_pub_tf = SSH_KEY_PUB.replace("\\", "/")

        tfvars_content = f"""# Generated by setup_oracle_free_db.py
tenancy_ocid         = "{tenancy_ocid}"
user_ocid            = "{user_ocid}"
fingerprint          = "{fingerprint}"
oci_private_key_path = "{pem_path_tf}"
region               = "{region}"
compartment_ocid     = "{tenancy_ocid}"
ssh_public_key_path  = "{ssh_pub_tf}"
db_password          = "{db_password}"
project              = "lovewanshi-milan-dev"
instance_count       = 1
"""
        with open(tfvars_path, "w", encoding="utf-8") as f:
            f.write(tfvars_content)
        print(f"\n[+] Created {tfvars_path}")

    # 4. Terraform Init
    print("\n" + "-" * 70)
    print("  STEP 2: Initializing Terraform")
    print("-" * 70)
    res = subprocess.run(["terraform", "init"], cwd=TF_DIR)
    if res.returncode != 0:
        print("[!] terraform init failed. Please check error above.")
        sys.exit(1)

    # 5. Terraform Plan & Apply
    print("\n" + "-" * 70)
    print("  STEP 3: Provisioning Always Free Resources via Terraform")
    print("-" * 70)
    print("Resources being created (All within Always Free limits):")
    print(" - Virtual Cloud Network (VCN) & Subnets (Free)")
    print(" - OCI MySQL HeatWave Database System (MySQL.Free shape, 50 GB storage, $0/mo)")
    print(" - Ampere A1 Compute VM (1 OCPU, 6 GB RAM, $0/mo)")
    print("\nStarting terraform apply (this usually takes 5-10 minutes for MySQL to provision)...")

    res = subprocess.run(["terraform", "apply", "-auto-approve"], cwd=TF_DIR)
    if res.returncode != 0:
        print("[!] terraform apply encountered an error. Check above output.")
        sys.exit(1)

    # 6. Import SQL Database Dump
    print("\n" + "-" * 70)
    print("  STEP 4: Importing Database Dump into MySQL")
    print("-" * 70)

    # Get Terraform outputs
    out_ips = subprocess.run(["terraform", "output", "-json", "instance_public_ips"], cwd=TF_DIR, capture_output=True, text=True)
    out_mysql = subprocess.run(["terraform", "output", "-raw", "mysql_endpoint"], cwd=TF_DIR, capture_output=True, text=True)

    import json
    public_ips = json.loads(out_ips.stdout.strip()) if out_ips.returncode == 0 else []
    mysql_endpoint = out_mysql.stdout.strip() if out_mysql.returncode == 0 else ""

    if public_ips and mysql_endpoint:
        vm_ip = public_ips[0]
        db_host = mysql_endpoint.split(":")[0]
        print(f"[*] App Instance Public IP: {vm_ip}")
        print(f"[*] MySQL Internal Endpoint: {mysql_endpoint}")

        print("\n[*] Waiting 30s for cloud-init and SSH to become ready on the VM...")
        import time
        time.sleep(30)

        print("[*] Uploading SQL dump to the VM via SCP...")
        scp_cmd = [
            "scp", "-o", "StrictHostKeyChecking=no",
            "-i", SSH_KEY_PRIV,
            DUMP_FILE,
            f"ubuntu@{vm_ip}:/tmp/dump.sql"
        ]
        res_scp = subprocess.run(scp_cmd)
        if res_scp.returncode == 0:
            print("[+] SQL dump transferred.")
            print("[*] Restoring database schema and data into MySQL...")
            restore_cmd = f"mysql -h {db_host} -P 3306 -u lovewanshi_dev -p'{db_password}' marriage_portal < /tmp/dump.sql && echo 'IMPORT_SUCCESS'"
            ssh_cmd = [
                "ssh", "-o", "StrictHostKeyChecking=no",
                "-i", SSH_KEY_PRIV,
                f"ubuntu@{vm_ip}",
                restore_cmd
            ]
            res_ssh = subprocess.run(ssh_cmd)
            if res_ssh.returncode == 0:
                print("\n[+] Database restored successfully from dump!")
            else:
                print("[!] Notice: Automatic restore command exited with non-zero code. You can run it manually on the VM.")
        else:
            print("[!] SCP upload failed. You can upload the dump manually once the instance is ready.")

    print("\n" + "=" * 70)
    print("  [ALL DONE] Oracle Cloud Always Free Setup Completed!")
    print("=" * 70)
    print(f"Database Name:    marriage_portal")
    print(f"Database User:    lovewanshi_dev")
    print(f"Database Host:    {mysql_endpoint}")
    if public_ips:
        print(f"Compute VM IP:    {public_ips[0]}")
        print(f"SSH Command:      ssh -i ~/.ssh/oci_dev ubuntu@{public_ips[0]}")
    print("=" * 70)

if __name__ == "__main__":
    main()
