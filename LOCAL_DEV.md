# Running the backend locally against api.lovewanshisamaj.in

For developing without touching prod AWS. The Spring Boot server runs on
your Mac against a local MySQL database; a Cloudflare Tunnel makes
`api.lovewanshisamaj.in` reach it instead of the real EC2 instance while the
tunnel is up. Nothing in `terraform/` or on the prod server is touched by
any of this - it is purely a DNS record you flip back and forth.

**While the tunnel is running, `api.lovewanshisamaj.in` serves your laptop,
not production.** Anything pointed at that domain - the production APK,
anyone else's requests - hits your local server instead. Only do this if
nothing real currently depends on that domain. See "Reverting" below for
how to get production traffic back immediately.

## 1. Local database

Already set up if you've run this before this session; here for a fresh
machine:

```bash
mysql -u root -e "
  CREATE DATABASE IF NOT EXISTS marriage_portal;
  CREATE USER IF NOT EXISTS 'test_user'@'localhost' IDENTIFIED BY 'Lokesh@401';
  GRANT ALL PRIVILEGES ON marriage_portal.* TO 'test_user'@'localhost';
"
# Load the schema - see backend/.../scripts or sql/ for the current dump.
```

## 2. Run the backend on the `local` profile

```bash
cd backend/lovewanshi-milan-api-feature
./gradlew bootRun --args='--spring.profiles.active=local'
```

This uses `application-local.properties` (checked into git, safe - no real
secrets in it) layered on top of your personal `application.properties`
(gitignored, holds your AWS/Firebase/mail values). Verify it's up:

```bash
curl http://localhost:8080/actuator/health
```

## 3. One-time Cloudflare Tunnel setup

```bash
# Sign into a Cloudflare account (any account - the domain does not need
# to be added there; this just authenticates the CLI). Opens a browser.
cloudflared tunnel login

# Creates the tunnel and a credentials file at ~/.cloudflared/<id>.json
cloudflared tunnel create lovewanshi-milan-local
```

That prints a **Tunnel ID** (a UUID) and the path to the credentials JSON.
Copy the template to a real (gitignored) config and fill both in:

```bash
cp backend/lovewanshi-milan-api-feature/deploy/local/cloudflared-config.yml.example \
   backend/lovewanshi-milan-api-feature/deploy/local/cloudflared-config.yml
```

```yaml
tunnel: <the UUID from `tunnel create`>
credentials-file: /Users/LokeshLovewanshi/.cloudflared/<the UUID>.json
```

## 4. Point the domain at the tunnel (GoDaddy)

GoDaddy stays the DNS provider - no nameserver migration needed. In
GoDaddy's DNS manager for `lovewanshisamaj.in`:

- **Delete or edit** the existing `api` **A record** (currently `3.7.79.20`,
  your prod Elastic IP)
- **Add a CNAME record**: host `api`, value `<the tunnel UUID>.cfargotunnel.com`

DNS propagation is usually fast but can take a few minutes depending on the
record's TTL.

## 5. Start the tunnel

```bash
cloudflared tunnel --config backend/lovewanshi-milan-api-feature/deploy/local/cloudflared-config.yml run lovewanshi-milan-local
```

Leave this running. `https://api.lovewanshisamaj.in` now reaches your local
Spring Boot server for as long as this process is up.

## Reverting - get production traffic back

Stop the tunnel (`Ctrl+C`), then in GoDaddy: delete the CNAME and restore
the A record:

```
Type: A
Host: api
Value: 3.7.79.20
```

That's the same IP `terraform output api_public_ip` reports today - confirm
it hasn't changed before restoring, in case the EC2 instance was ever
replaced in the meantime.
