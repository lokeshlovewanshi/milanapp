# Infrastructure

Terraform for the Gahoi Milan API: VPC, EC2, database, CodeDeploy, and an OIDC role so GitHub Actions deploys without a stored AWS key.

## Is CodeDeploy free?

**Yes, for EC2.** AWS charges nothing per deployment to EC2, Lambda or ECS. Only *on-premises* instances are billed, at $0.02 per instance update. ([AWS pricing](https://aws.amazon.com/codedeploy/pricing/))

The only cost here is the S3 bucket holding release bundles — a ~60 MB jar with a 30-day lifecycle rule, so pennies.

## No Aurora

Aurora is excluded from the AWS free tier under every account and starts around
**$44/month** at the 0.5 ACU floor, against roughly **$17** for `db.t3.micro`
MySQL. ([Usage.ai](https://www.usage.ai/blogs/aws/rds/aurora-serverless-v2/),
[AWS](https://aws.amazon.com/rds/free/))

It buys fast failover, read replicas and self-growing storage. A 1000-user app
needs none of those, so it has been removed entirely rather than left as a
tempting switch. Revisit when read traffic genuinely justifies a replica.

## Instance size

`t3.small` - 2 vCPU, 2 GB RAM, about **$16.40/month** in ap-south-1.

Not free-tier eligible (that covers `t2.micro` and `t3.micro` only), which is
fine while promotional credits are covering the bill - but worth remembering
when they run out.

The 2 GB is what makes the difference. On a 1 GB `t3.micro` the JVM gets
roughly 400 MB after the OS and nginx: it runs, but swap becomes part of normal
operation and a deploy landing during an `apt upgrade` can trip the OOM killer.
With 2 GB the heap is set to 1 GB and swap goes back to being a safety net.

The systemd unit is tuned to match: `-Xms512m -Xmx1g` with G1GC, and
`MemoryMax=1600M` so a runaway request fails on its own rather than taking the
machine down. **Dropping to `t3.micro` means editing those back to `-Xmx512m`
and `-XX:+UseSerialGC`** - the heap settings and the instance size have to move
together.

## Secrets

Production values live in `/etc/gahoi-milan/gahoi-milan.env` on the instance.
The deploy workflow assembles that file from GitHub repository secrets and
ships it base64-encoded, so nothing sensitive is in this repo or in Terraform.

systemd loads it via `EnvironmentFile`, and `application-prod.properties`
interpolates the same names, so `${DB_PASSWORD}` resolves from the environment.

**AWS Secrets Manager was removed.** It was never actually in use: the Spring
`EnvironmentPostProcessor` written to read it was never registered - its
`.imports` file was empty - so the class shipped in every jar and never ran.
The secret sat unread, was deleted on 3 August, and the API kept restarting
without noticing. Keeping dead infrastructure that costs $0.40/month and blocks
`terraform apply` bought nothing.

If you want it back, the missing piece was one line in
`META-INF/spring/org.springframework.boot.env.EnvironmentPostProcessor.imports`
naming the class - and note the processor throws on failure, so the secret has
to exist and the instance role has to be able to read it before that line goes
in.

## Deploy

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` — you need `key_pair_name` (create the key pair in the EC2 console first) and `ssh_allowed_cidr`:

```bash
echo "$(curl -s https://checkip.amazonaws.com)/32"
```

Pass the database password through the environment so it never lands in a file:

```bash
export TF_VAR_db_password="$(openssl rand -base64 24)"
echo "$TF_VAR_db_password"        # save this somewhere safe

terraform init
terraform plan
terraform apply
```

Takes 10–15 minutes, mostly waiting on RDS.

## After apply

`terraform output next_steps` prints the checklist. In short:

1. Point DNS at `terraform output api_public_ip`, then on the server run `sudo certbot --nginx -d api.gahoimarriage.in`
2. Fill in `/etc/gahoi-milan/gahoi-milan.env` — Terraform writes the DB URL and username, you add the passwords and secrets
3. Add two GitHub repository secrets from the outputs: `AWS_DEPLOY_ROLE_ARN` and `AWS_ARTIFACT_BUCKET`
4. Load the schema by connecting from the EC2 box (RDS is private, by design)
5. Push to `main` — the workflow builds, tests, bundles and deploys

## What this sets up, and why

**No NAT gateway.** A NAT costs ~$32/month plus data processing — more than the database. The app server sits in a public subnet behind a security group allowing only 22, 80 and 443.

**RDS is not publicly accessible.** A public MySQL endpoint with a guessable password gets found by scanners within hours. The app reaches it over the VPC; you reach it by SSHing to the app server first.

**Port 8080 is not open.** nginx proxies over loopback. Exposing 8080 would let anyone bypass TLS and the rate limits by talking to Java directly.

**SSH is restricted to one IP,** and Terraform refuses `0.0.0.0/0` outright. The instance also has SSM Session Manager attached, so you have a way in if your home IP changes.

**IMDSv2 required.** The v1 metadata endpoint can be reached through a server-side request forgery bug, handing an attacker the instance role's credentials — that's the mechanism behind the 2019 Capital One breach.

**An instance role instead of access keys.** This is what replaces the key currently public in your git history. Credentials arrive via the metadata service, rotate automatically, and never exist in a file.

**OIDC for GitHub Actions.** The workflow exchanges a short-lived GitHub token for AWS credentials — no static key in repository secrets. The trust policy is pinned to `repo:owner/repo:ref:refs/heads/main`; without that condition any repository on GitHub could assume the role.

**A final snapshot on destroy,** plus deletion protection. Without both, one `terraform destroy` takes production with it.

**S3 gateway endpoint.** Free, and it keeps photo uploads on the AWS backbone rather than billing them as internet egress.

## Cost

Every resource this Terraform creates, in `ap-south-1`,
past any free-tier allowance. Mumbai runs roughly 10-20% above `us-east-1`, so
treat these as estimates and check your first bill.

| Resource | Spec | Monthly |
|---|---|---|
| `aws_instance` | **`t3.small`**, 730 hrs | **~$16.40** |
| root EBS volume | 20 GB gp3 | ~$1.80 |
| `aws_db_instance` | `db.t3.micro` MySQL, single-AZ | ~$15-22 |
| RDS storage | 20 GB gp3 | ~$2.30 |
| RDS backups | 7 days | $0 while under 20 GB |
| `aws_eip` | 1 public IPv4 | ~$3.65 |
| `aws_s3_bucket` | release bundles, 30-day expiry | <$0.10 |
| CloudWatch Logs | RDS error + slow query | ~$0.50 |
| `aws_vpc`, subnets, route table, IGW | | **$0** |
| security groups x2, rules x5 | | **$0** |
| `aws_vpc_endpoint` (S3 gateway) | | **$0** |
| IAM roles x3, policies, instance profile | | **$0** |
| OIDC provider | | **$0** |
| CodeDeploy app + deployment group | | **$0** |
| DB subnet group, parameter group | | **$0** |
| | | **~$40-47 (Rs 3,400-4,000)** |

39 resources; 25 of them are free.

Promotional credits cover this while they last. Dropping to `t3.micro`
afterwards takes it to roughly **$32-38**.

### The Elastic IP is not free

Since 1 February 2024 AWS charges **$0.005/hour for every public IPv4 address**,
attached or not - about **$3.65/month**, $43.80/year.
([AWS](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights),
[DoiT](https://www.doit.com/blog/aws-public-ipv4-price-increase-the-complete-guide))

Releasing it is not an option: without a static address the instance's public IP
changes on every stop/start and the DNS record silently stops resolving.

### What is deliberately absent

| Not created | Would have cost |
|---|---|
| NAT gateway | ~$32/month + $0.045/GB processed |
| Application Load Balancer | ~$16/month + LCU charges |
| Multi-AZ RDS | doubles the database line |
| RDS Performance Insights | free at 7 days, paid beyond |
| Second EC2 instance | another ~$12 |

Those are the right choices later. None of them do anything for a 1000-user app
today, and together they would roughly triple the bill.

### Watch for

- **Data transfer out** - the first 100 GB/month is free account-wide. Profile
  photos are served from S3, so the API itself moves very little; heavy photo
  traffic shows up on the S3 bill, not here.
- **RDS backup storage** beyond 20 GB is billed. Seven days of a small database
  will not reach that.
- **Free tier ending with no warning.** Billing starts the hour the window
  closes. Set a budget alert on day one: Billing -> Budgets.

Check what you are actually paying:

```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -v1d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

## Sources

- [AWS CodeDeploy pricing](https://aws.amazon.com/codedeploy/pricing/)
- [AWS Free Tier with Aurora & RDS](https://aws.amazon.com/rds/free/)
- [Aurora Serverless v2 ACU pricing and scale-to-zero](https://www.usage.ai/blogs/aws/rds/aurora-serverless-v2/)
- [AWS Free Tier changes, July 2025](https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/)
- [Public IPv4 address charge](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights)
