# Oracle Cloud dev box (Always Free)

A second, fully separate environment from `terraform/` (prod, AWS) - own
state, own credentials, own directory. Nothing here touches prod.

Ampere A1 compute (2 OCPU / 12GB, Always Free - Oracle halved this from 4/24
on 2026-06-15) running Ubuntu + Spring Boot on the `local` profile behind
nginx + certbot, plus a separate Always Free HeatWave MySQL DB system (its
own free allocation, does not eat into the compute limit above) in a private
subnet. Reachable at `api.lovewanshisamaj.in`.

## 1. Get OCI API credentials

In the OCI Console: click your profile icon (top right) -> **User Settings**
-> **API Keys** -> **Add API Key** -> "Generate API Key Pair" -> download
the private key (save it to `~/.oci/oci_api_key.pem`) -> Add.

The confirmation dialog shows a config snippet with everything
`terraform.tfvars` needs:

```
user=ocid1.user.oc1..xxxx          -> user_ocid
fingerprint=xx:xx:...              -> fingerprint
tenancy=ocid1.tenancy.oc1..xxxx    -> tenancy_ocid, and compartment_ocid
region=ap-mumbai-1                 -> region
```

## 2. Configure and apply

```bash
cd terraform-oracle
cp terraform.tfvars.example terraform.tfvars
# fill in tenancy_ocid, user_ocid, fingerprint, oci_private_key_path, region, compartment_ocid

export TF_VAR_db_password='pick something strong'

terraform init
terraform plan
terraform apply
```

If it fails with "Out of host capacity" for `VM.Standard.A1.Flex`, or a
capacity/limit error creating the `MySQL.Free` DB system, that specific
availability domain is temporarily out of room for that shape - open
`compute.tf`, change the `[0]` index in `local.availability_domain` to `[1]`
or `[2]`, and re-apply. This is common and not a config error. The MySQL DB
system typically takes several minutes to reach ACTIVE; Terraform waits for
it before creating the compute instance, since cloud-init needs its endpoint.

`terraform apply` prints `instance_public_ips` (a list - two instances, 1
OCPU/6GB each, since smaller shape requests are more likely to find capacity
than one 2 OCPU/12GB request) when done. If one instance fails with "Out of
host capacity" while the other succeeds, that's fine - use whichever one
came up; re-run `terraform apply "tfplan"` later to fill in the other.

## 3. First deploy

Each instance boots with the application database already created on the
managed MySQL DB system, and a `lovewanshi-milan` systemd service installed but
with no jar yet. Pick whichever instance actually came up (check
`instance_public_ips`) and deploy to that one - <instance_public_ip> below
means that IP.

```bash
# Build the jar locally
cd backend/lovewanshi-milan-api-feature
./gradlew bootJar

# Ship it and your real app.properties secrets (Firebase, JWT, mail, Google OAuth)
scp -i ~/.ssh/lovewanshi_milan_dev build/libs/*.jar ubuntu@<instance_public_ip>:/tmp/app.jar
scp -i ~/.ssh/lovewanshi_milan_dev src/main/resources/application.properties ubuntu@<instance_public_ip>:/tmp/application.properties

ssh -i ~/.ssh/lovewanshi_milan_dev ubuntu@<instance_public_ip>
  sudo mv /tmp/app.jar /opt/lovewanshi-milan/app.jar
  sudo mv /tmp/application.properties /opt/lovewanshi-milan/application.properties
  sudo chown lovewanshi:lovewanshi /opt/lovewanshi-milan/app.jar /opt/lovewanshi-milan/application.properties
  sudo systemctl restart lovewanshi-milan
  sudo systemctl status lovewanshi-milan
  curl http://localhost:8080/actuator/health
```

If you end up with both instances running, only deploy to (and point DNS at)
one of them - the second is a spare, not a load-balanced pair; nothing here
sets up traffic splitting between them.

(`application.properties` sitting next to the jar in `/opt/lovewanshi-milan/` is
picked up by Spring automatically as the base config layer, same as it works
locally - `--spring.profiles.active=local` in the systemd unit layers
`application-local.properties`'s DB/JPA/logging defaults on top, but the DB
values there get overridden by the `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`
already in `/etc/lovewanshi-milan/lovewanshi-milan.env` from cloud-init, so no edits
needed there.)

## 4. Point api.lovewanshisamaj.in here and get a cert

At GoDaddy (or wherever `lovewanshisamaj.in` is authoritative once the
Cloudflare experiment is fully reverted - see `../LOCAL_DEV.md`), add:

```
Type:  A
Host:  dev-api
Value: <instance_public_ip>
```

Wait for it to resolve (`dig +short api.lovewanshisamaj.in`), then:

```bash
ssh -i ~/.ssh/lovewanshi_milan_dev ubuntu@<instance_public_ip>
sudo certbot --nginx -d api.lovewanshisamaj.in
```

Certbot rewrites the nginx config to redirect 80 -> 443 and auto-renews via
its own systemd timer. Verify: `curl https://api.lovewanshisamaj.in/actuator/health`.

## Connecting to MySQL directly (no compute instance needed)

MySQL lives in a private subnet with no public IP. `bastion.tf` creates a
free, OCI-managed Bastion targeting that subnet, so you can reach it from
your laptop without needing the app instance up - useful for inspecting data
or running migrations by hand.

```bash
# One-time: OCI CLI, configured with the same API key as terraform.tfvars
pip3 install oci-cli
mkdir -p ~/.oci && cat > ~/.oci/config <<EOF
[DEFAULT]
user=<user_ocid from terraform.tfvars>
fingerprint=<fingerprint from terraform.tfvars>
tenancy=<tenancy_ocid from terraform.tfvars>
region=ap-mumbai-1
key_file=~/.oci/oci_api_key.pem
EOF
chmod 600 ~/.oci/config

# Get the bastion OCID and MySQL's private endpoint
cd terraform-oracle
BASTION_ID=$(terraform state show oci_bastion_bastion.main | grep '^\s*id\s*=' | cut -d'"' -f2)
terraform output -raw mysql_endpoint   # e.g. 10.30.2.173:3306

# Create a session (max 3h, create a new one each time it expires)
oci bastion session create-port-forwarding \
  --bastion-id "$BASTION_ID" \
  --display-name mysql-tunnel \
  --ssh-public-key-file ~/.ssh/lovewanshi_milan_dev.pub \
  --session-ttl 10800 \
  --target-private-ip <ip from mysql_endpoint> \
  --target-port 3306 \
  --wait-for-state SUCCEEDED --wait-for-state FAILED

# The command above's output includes the session OCID; use it here, or
# `oci bastion session get --session-id <id> --query 'data."ssh-metadata"'`
ssh -i ~/.ssh/lovewanshi_milan_dev -N -L 3307:<ip from mysql_endpoint>:3306 -p 22 \
  <session-ocid>@host.bastion.ap-mumbai-1.oci.oraclecloud.com

# In another terminal, once the tunnel is up:
mysql -h 127.0.0.1 -P 3307 -u <db_username> -p
```

(Local port 3307, not 3306 - avoids colliding with a local MySQL server if
you also have `../LOCAL_DEV.md`'s local-dev setup running.)

## Redeploying after code changes

Repeat the `scp` + `systemctl restart` steps in section 3 (skip the
`application.properties` copy if it hasn't changed).

## Tearing down

```bash
terraform destroy
```

Always Free resources cost nothing while running, but `destroy` is the clean
way to remove everything if you stop using this box.
