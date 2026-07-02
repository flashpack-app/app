// S3-backed media storage. When configured, photo/video uploads land in S3
// and only the public (CDN) URL is stored in Postgres — Express stops
// streaming media bytes. Without S3_BUCKET the server keeps the legacy
// base64-in-Postgres behaviour so local dev needs no AWS setup.
//
// Env:
//   S3_BUCKET        bucket name (enables S3 storage)
//   S3_REGION        falls back to AWS_REGION, then us-east-1
//   S3_ENDPOINT      optional, for R2/MinIO-compatible stores
//   S3_PUBLIC_URL    CDN base, e.g. https://dxxxx.cloudfront.net — used to
//                    build the stored URL; defaults to the bucket's S3 URL
//   S3_KEY_PREFIX    optional key prefix (default "media")
//   credentials      standard AWS chain (env vars, instance role, etc.)

import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.S3_BUCKET ?? '';
const REGION = process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
const ENDPOINT = process.env.S3_ENDPOINT || undefined;
const KEY_PREFIX = (process.env.S3_KEY_PREFIX ?? 'media').replace(/\/+$/, '');
const PUBLIC_BASE = (
  process.env.S3_PUBLIC_URL ||
  (BUCKET ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : '')
).replace(/\/+$/, '');

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({ region: REGION, ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}) });
  }
  return client;
}

export function storageEnabled(): boolean {
  return BUCKET.length > 0;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

// Uploads a media buffer and returns the public URL to store in the DB.
export async function uploadMedia(kind: 'photo' | 'video' | 'avatar', buf: Buffer, mime: string): Promise<string> {
  const ext = EXT_BY_MIME[mime] ?? 'bin';
  const key = `${KEY_PREFIX}/${kind}s/${randomUUID()}.${ext}`;
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buf,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return `${PUBLIC_BASE}/${key}`;
}

// Best-effort delete for reverted media. Only touches URLs we minted.
export async function deleteMediaByUrl(url: string | null | undefined): Promise<void> {
  if (!storageEnabled() || !url || !url.startsWith(`${PUBLIC_BASE}/`)) return;
  const key = url.slice(PUBLIC_BASE.length + 1);
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    console.warn('s3 delete failed for', key, e);
  }
}
