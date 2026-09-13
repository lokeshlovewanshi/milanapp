# Deploying the API

Production is **two Oracle Cloud instances behind an Always Free load
balancer**, in `ap-mumbai-1`. Not AWS - the AWS stack this repo's older
`DEPLOY.md` describes (EC2 + RDS + CodeDeploy) was retired, and only S3 and
the Lambdas remain there.

| | |
|---|---|
| Domain | `https://api.lovewanshisamaj.in` |
| Load balancer | `130.210.52.85` (OCI, Always Free) |
| Bastion Host | `152.67.7.218` (public IP) |
| Instance 0 | `10.30.1.102` (private subnet, no public IP) |
| Instance 1 | `10.30.1.121` (private subnet, no public IP) |
| Database | MySQL HeatWave, `10.30.2.173:3306`, schema `marriage_portal` |
| Photos | S3 `LOVEWANSHI-milan-photos`, served via CloudFront `dm53nmzbwxptr.cloudfront.net` |
| SSH via Bastion | `ssh -J ubuntu@152.67.7.218 -i ~/.ssh/LOVEWANSHI_milan_dev ubuntu@<instance_ip>` |

Request path:

```
phone / browser
  → api.lovewanshisamaj.in        (DNS at GoDaddy)
  → OCI load balancer :443      (TLS terminates here)
  → nginx :80 on one instance   (round robin on private subnet)
  → java :8080
```

**The instances are hard to replace.** Oracle's Always Free capacity in
`ap-mumbai-1` is usually exhausted; the second one took 230 attempts over
several hours to create. Never terraform-destroy them.

---

## On the machine

| What | Where |
|---|---|
| Jar | `/opt/LOVEWANSHI-milan/app.jar` |
| Previous jar | `/opt/LOVEWANSHI-milan/app.previous.jar` (rollback) |
| Secrets | `/etc/LOVEWANSHI-milan/LOVEWANSHI-milan.env` — `root:LOVEWANSHI`, mode `640` |
| Firebase key | `/etc/LOVEWANSHI-milan/firebase.json` |
| Service | `LOVEWANSHI-milan.service` (systemd), runs as `LOVEWANSHI` |
| Logs | `/var/log/LOVEWANSHI-milan/app.log` |
| nginx site | `/etc/nginx/sites-available/LOVEWANSHI-milan` |

The app runs as a plain Java process under systemd. No Docker.

```bash
# Connect via Bastion
ssh -J ubuntu@152.67.7.218 -i ~/.ssh/LOVEWANSHI_milan_dev ubuntu@10.30.1.102

sudo systemctl status LOVEWANSHI-milan
sudo systemctl restart LOVEWANSHI-milan
sudo tail -f /var/log/LOVEWANSHI-milan/app.log
```

---

## Deploying

### Through CI (preferred)

`.github/workflows/deploy-backend-oracle.yml` builds the jar and deploys to both
private instances through the Bastion host (`152.67.7.218`) **one at a time** with a
health gate on each - so a bad build stops after the first and the second
keeps serving.

It runs on push to `main` under `backend/**`, or by hand from the Actions tab.

Requires these repository secrets:

```
ORACLE_SSH_PRIVATE_KEY   ORACLE_DB_URL        ORACLE_BASTION_HOST (optional, default: 152.67.7.218)
ORACLE_JWT_SECRET        ORACLE_DB_USERNAME   ORACLE_LOAD_BALANCER_IP (optional, default: 130.210.52.85)
AWS_ACCESS_KEY_ID        ORACLE_DB_PASSWORD   NOTIFICATIONS_ADMIN_SECRET
AWS_SECRET_ACCESS_KEY    AWS_S3_BUCKET        API_BASE_URL
GOOGLE_OAUTH_CLIENT_IDS  MAIL_USERNAME        MAIL_PASSWORD
FIREBASE_SERVICE_ACCOUNT_JSON                 CORS_ALLOWED_ORIGINS
```

> **The first CI run will sign everyone out.** The instances currently carry a
> `JWT_SECRET` generated during a manual deploy, not the one in
> `ORACLE_JWT_SECRET`. The first workflow run replaces it, invalidating every
> issued token. Do this before you have real members.

### By hand

When CI is not an option. Build, copy via bastion ProxyJump, swap, restart, wait for health:

```bash
cd backend/LOVEWANSHI-milan-api-feature-h-sijariya
./gradlew build -x test

JAR=build/libs/partner-0.0.1-SNAPSHOT.jar
for IP in 10.30.1.102 10.30.1.121; do
  rsync -e "ssh -J ubuntu@152.67.7.218 -i ~/.ssh/LOVEWANSHI_milan_dev" --partial --inplace "$JAR" ubuntu@$IP:/tmp/app.jar
done
```

Then on **each** instance in turn - never both at once, or there is a moment
with nothing serving:

```bash
ssh -J ubuntu@152.67.7.218 -i ~/.ssh/LOVEWANSHI_milan_dev ubuntu@10.30.1.102

sudo cp /opt/LOVEWANSHI-milan/app.jar /opt/LOVEWANSHI-milan/app.previous.jar
sudo mv /tmp/app.jar /opt/LOVEWANSHI-milan/app.jar
sudo chown LOVEWANSHI:LOVEWANSHI /opt/LOVEWANSHI-milan/app.jar
sudo systemctl restart LOVEWANSHI-milan

# Wait for UP before touching the second instance.
until curl -fsS --max-time 3 http://127.0.0.1:8080/actuator/health | grep -q UP; do sleep 2; done
```

Cold start is 30-75 seconds.

### Rollback

```bash
sudo cp /opt/LOVEWANSHI-milan/app.previous.jar /opt/LOVEWANSHI-milan/app.jar
sudo systemctl restart LOVEWANSHI-milan
```

### Verify

```bash
curl -s https://api.lovewanshisamaj.in/actuator/health          # {"status":"UP"}
for i in 1 2 3 4; do curl -s -o /dev/null -w "%{http_code} " \
  https://api.lovewanshisamaj.in/actuator/health; done          # both backends
curl -s -o /dev/null -w "%{http_code}\n" \
  https://api.lovewanshisamaj.in/api/v1/user                    # 401 = auth works
```

---

## TLS — read this before November

The certificate is **Let's Encrypt, issued on instance 0, installed on the
load balancer**. It expires **15 November 2026**.

**Renewal is not automated, and the half that exists is the dangerous kind.**
Certbot's timer on instance 0 will renew the files on disk in mid-October, but
it knows nothing about the load balancer - which keeps serving the old
certificate until it expires and HTTPS breaks for every install at once.

Finishing it needs a deploy hook that, after each renewal:

1. creates a **new** OCI certificate resource (they are immutable - you cannot
   update one in place),
2. repoints the `https` listener at it,
3. deletes the old one.

Issuance used an HTTP-01 challenge through the load balancer. Both nginx
configs carry a `/.well-known/acme-challenge/` block: instance 0 serves it
from `/var/www/certbot`, instance 1 **proxies to instance 0**, because the
round robin would otherwise land the challenge on the wrong box about half the
time.

To reissue by hand:

```bash
ssh -J ubuntu@152.67.7.218 -i ~/.ssh/LOVEWANSHI_milan_dev ubuntu@10.30.1.102
sudo certbot certonly --webroot -w /var/www/certbot -d api.lovewanshisamaj.in
```

then upload `fullchain.pem` (leaf first, chain separately) and `privkey.pem`
to the load balancer with `oci lb certificate create`, and update the listener.

---

## Database

MySQL HeatWave on the private subnet - not reachable directly from the internet.

### Option 1: Port-forward tunnel from your laptop (Workbench / DBeaver)
```bash
ssh -L 3306:10.30.2.173:3306 -i ~/.ssh/LOVEWANSHI_milan_dev ubuntu@152.67.7.218
```
Then connect your local MySQL client to `127.0.0.1:3306`.

### Option 2: CLI through an instance via Bastion
```bash
ssh -J ubuntu@152.67.7.218 -i ~/.ssh/LOVEWANSHI_milan_dev ubuntu@10.30.1.102
set -a; source <(sudo cat /etc/LOVEWANSHI-milan/LOVEWANSHI-milan.env); set +a
mysql -h 10.30.2.173 -u "$DB_USERNAME" -p"$DB_PASSWORD" marriage_portal
```

`spring.jpa.hibernate.ddl-auto=none` in production - Hibernate never alters the
schema. Migrations in `sql/` are applied by hand.

Reference data (`city`, `state`, `lookup_option`, `profile_completion_weight`)
loads from a local dump with `REPLACE INTO`, so re-running is safe:

```bash
mysqldump -h 127.0.0.1 -u <user> -p marriage_portal \
  --no-create-info --complete-insert --replace --skip-lock-tables --no-tablespaces \
  state city lookup_option profile_completion_weight > refdata.sql
```

---

## Configuration

`application-prod.properties` reads everything from the environment; systemd
supplies it from `/etc/LOVEWANSHI-milan/LOVEWANSHI-milan.env`. To change a value:

```bash
sudo nano /etc/LOVEWANSHI-milan/LOVEWANSHI-milan.env
sudo systemctl restart LOVEWANSHI-milan
```

Two that are easy to get wrong:

- **`API_BASE_URL`** builds the Google OAuth redirect URI. Wrong value breaks
  Google sign-in with no other symptom.
- **`CORS_ALLOWED_ORIGINS`** must list the website's origin once it is
  deployed. The mobile app is unaffected - CORS is a browser rule.

---

## Lambdas

Terraform owns the **shape** (`terraform/lambdas.tf`); CI owns the **code**
(`.github/workflows/deploy-lambdas.yml`). The functions are created with a
placeholder zip and `lifecycle.ignore_changes` on `filename`, `layers` and
`environment`, so `terraform apply` never reverts a deploy.

> **Never run a bare `terraform apply` in `terraform/`.** State holds only S3
> and the Lambdas; the directory still defines the retired EC2/RDS/VPC stack, so
> a plain apply proposes **43 new resources** and rebuilds infrastructure you
> stopped paying for. Use `-target` for the resources you actually mean.
