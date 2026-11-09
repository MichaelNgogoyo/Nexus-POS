# POS product image storage

The deploy workflow can enable the private MinIO service with
`workflow_dispatch` → `target_service=core` and `deploy_minio=true`. It builds
the pinned upstream MinIO source release in `docker/Dockerfile.minio`, stores
data in the persistent `minio-data` volume, keeps the S3 API bound to VPS
loopback for administration, and does not publish the console.

Configure separate `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` and
`MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` repository secrets. The app credentials
must be different from the root credentials. The deploy workflow writes its
generated Compose files with owner-only permissions.

On the VPS, use a verified MinIO `mc` client and a private config directory to
run `bootstrap-product-images.sh` once. It creates the private `product-images`
bucket and a scoped app user with only bucket listing, object read and object
write permissions. It then replaces the alias's root credentials with the
scoped app credentials. Do not make the bucket public or put root credentials
in the backend service.

The image seeder uploads to keys under `catalog/` and writes an idempotent SQL
mapping for only the `KE-FOOD-*` product SKUs. The source and license for each
photo are retained in the manifest and exposed to app users through
`/image-credits.csv`.
