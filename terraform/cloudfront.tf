# ---------------------------------------------------------------------------
# CloudFront in front of the photo bucket.
#
# Why at all: egress. S3 charges about $0.109/GB out of Mumbai, and profile
# photos are the only thing this app serves in bulk. CloudFront's free tier is
# 1 TB/month and 10M requests, permanently - not a first-year promotion - so
# for any traffic this app plausibly reaches, image delivery costs nothing.
# The edge cache is the secondary benefit; the bill is the reason.
#
# Why signed URLs rather than a public bucket: these are photographs of
# members, on a matrimonial site. A public bucket would mean any leaked key is
# world-readable forever. Signed URLs keep the same "expires in an hour" model
# the app already had with S3 presigning.
#
# Why NOT presigned S3 URLs through CloudFront: every presigned URL carries a
# unique signature, so the cache key differs per request and the hit rate is
# ~0. Configuring the cache to ignore query strings "fixes" that by serving
# cached private photos to anyone who asks for the path - which is worse than
# no CDN. CloudFront's own signing is the supported answer: it strips its
# signature parameters before both caching and the origin request, so one
# cached object serves every authorised viewer.
# ---------------------------------------------------------------------------

# --- signing keys ----------------------------------------------------------

# The public half of an RSA-2048 keypair. CloudFront verifies signatures with
# this; the API signs with the private half, which is NOT in Terraform - it is
# a deploy secret, so state never holds it. Rotating means adding a second key
# to the group, moving the API onto it, then removing the first.
resource "aws_cloudfront_public_key" "photos" {
  name        = "${local.name}-photos-signer"
  comment     = "Verifies photo URLs signed by the API"
  encoded_key = var.cloudfront_public_key

  lifecycle {
    # CloudFront cannot update a public key in place; changing the material
    # replaces it, and the replacement must exist before the key group stops
    # pointing at the old one or in-flight URLs break.
    create_before_destroy = true
  }
}

resource "aws_cloudfront_key_group" "photos" {
  name    = "${local.name}-photos-signers"
  comment = "Key groups trusted to sign photo URLs"
  items   = [aws_cloudfront_public_key.photos.id]
}

# --- origin access ---------------------------------------------------------

# Origin Access Control, not the legacy Origin Access Identity: OAC signs
# origin requests with SigV4, which OAI cannot do, and is what AWS supports
# going forward. The bucket stays fully private - it is reachable only through
# this distribution.
resource "aws_cloudfront_origin_access_control" "photos" {
  name                              = "${local.name}-photos"
  description                       = "Lets the photo distribution read the private bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# --- distribution ----------------------------------------------------------

resource "aws_cloudfront_distribution" "photos" {
  enabled = true
  comment = "${local.name} member photos"

  # No IPv6: the app's own API is IPv4-only behind the Oracle load balancer,
  # and a photo host that resolves over a path the API cannot is a debugging
  # trap for no gain. Worth revisiting when the API is dual-stack.
  is_ipv6_enabled = false

  # PriceClass_100 is North America and Europe ONLY - it would push every
  # Indian request across an ocean and make the CDN slower than S3 Mumbai.
  # _200 is the cheapest class that includes Indian edge locations.
  price_class = "PriceClass_200"

  origin {
    origin_id                = "photos-s3"
    domain_name              = "${var.s3_photo_bucket}.s3.${var.region}.amazonaws.com"
    origin_access_control_id = aws_cloudfront_origin_access_control.photos.id
  }

  default_cache_behavior {
    target_origin_id = "photos-s3"

    # Photos are immutable once written - the compression Lambda stamps
    # Cache-Control: max-age=31536000, immutable. Nothing here ever needs a
    # write method.
    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    viewer_protocol_policy = "redirect-to-https"

    # The gate. Without a trusted key group the distribution is public, and a
    # public distribution over a private bucket is strictly worse than the
    # bucket alone: it adds a world-readable front door.
    trusted_key_groups = [aws_cloudfront_key_group.photos.id]

    # Managed-CachingOptimized: honours the origin's Cache-Control, forwards
    # no cookies or query strings into the cache key, and compresses. The
    # AWS-managed ID is stable across accounts and regions.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    compress = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # The default *.cloudfront.net certificate. A custom domain such as
    # images.gahoimarriage.in would need an ACM certificate in us-east-1
    # specifically - CloudFront reads certificates from nowhere else - plus a
    # DNS record. Not required for the app to work, since the API hands out
    # whatever hostname it signs.
    cloudfront_default_certificate = true
  }
}

# --- bucket policy ---------------------------------------------------------

# Grants read to the CloudFront service principal, and only when the request
# comes from THIS distribution. Without the SourceArn condition any CloudFront
# distribution in any AWS account could read the bucket.
data "aws_iam_policy_document" "photos_bucket" {
  statement {
    sid     = "AllowCloudFrontRead"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    resources = ["arn:aws:s3:::${var.s3_photo_bucket}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.photos.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "photos" {
  bucket = var.s3_photo_bucket
  policy = data.aws_iam_policy_document.photos_bucket.json
}

# --- outputs ---------------------------------------------------------------

output "cloudfront_domain" {
  description = "Hostname the API signs photo URLs against."
  value       = aws_cloudfront_distribution.photos.domain_name
}

output "cloudfront_key_pair_id" {
  description = "Key-Pair-Id the API must send with each signed URL."
  value       = aws_cloudfront_public_key.photos.id
}
