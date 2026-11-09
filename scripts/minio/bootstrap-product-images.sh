#!/usr/bin/env sh
set -eu

: "${MINIO_ENDPOINT:?MINIO_ENDPOINT is required}"
: "${MINIO_BUCKET:=product-images}"
: "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
: "${MINIO_ACCESS_KEY:?MINIO_ACCESS_KEY is required}"
: "${MINIO_SECRET_KEY:?MINIO_SECRET_KEY is required}"
: "${MC_ALIAS:=nexuspos}"
: "${MC_BIN:=mc}"

if [ "$MINIO_ROOT_USER" = "$MINIO_ACCESS_KEY" ] || [ "$MINIO_ROOT_PASSWORD" = "$MINIO_SECRET_KEY" ]; then
  echo "Root and application credentials must be separate." >&2
  exit 1
fi

policy_file=$(mktemp)
trap 'rm -f "$policy_file"' EXIT HUP INT TERM
cat > "$policy_file" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::$MINIO_BUCKET"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": ["arn:aws:s3:::$MINIO_BUCKET/*"]
    }
  ]
}
JSON

"$MC_BIN" alias set "$MC_ALIAS" "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
"$MC_BIN" mb --ignore-existing "$MC_ALIAS/$MINIO_BUCKET" >/dev/null
if ! "$MC_BIN" admin policy info "$MC_ALIAS" nexus-pos-product-images >/dev/null 2>&1; then
  "$MC_BIN" admin policy create "$MC_ALIAS" nexus-pos-product-images "$policy_file" >/dev/null
fi
if ! "$MC_BIN" admin user info "$MC_ALIAS" "$MINIO_ACCESS_KEY" >/dev/null 2>&1; then
  "$MC_BIN" admin user add "$MC_ALIAS" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null
fi
"$MC_BIN" admin policy attach "$MC_ALIAS" nexus-pos-product-images --user "$MINIO_ACCESS_KEY" >/dev/null

# Replace the root alias credentials in the private mc config with the scoped app user.
"$MC_BIN" alias set "$MC_ALIAS" "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null
"$MC_BIN" ls "$MC_ALIAS/$MINIO_BUCKET" >/dev/null
echo "MinIO bucket and restricted POS image user are ready."
