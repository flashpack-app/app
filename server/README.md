# flash. server

Tiny Express + Postgres (Neon) backend. Handles invite verification & user signup.
No phone/OTP — invite code → username → user, that's it.

## Run

```powershell
cd server
npm install
npm run migrate   # creates schema + seeds 10 genesis invite codes (codes are printed)
npm run dev       # http://localhost:4000
```

`migrate` is idempotent — safe to re-run, only creates missing genesis codes.

## Endpoints

| Method | Path             | Body                                     | Notes                            |
| ------ | ---------------- | ---------------------------------------- | -------------------------------- |
| GET    | `/health`        | —                                        | sanity check                     |
| POST   | `/invite/verify` | `{ code }`                               | `{ valid, kind?, reason? }`      |
| POST   | `/invite/redeem` | `{ code, username, city?, country?, flag? }` | creates user + their own code |
| GET    | `/me`            | —, header `Authorization: Bearer <id>`   | current user                     |
| GET    | `/invite/slots`  | —, header `Authorization: Bearer <id>`   | user's code + slots              |

`token` is just the user UUID for now (no JWT) — fine since OTP/phone is intentionally skipped. Swap to signed tokens before going public.

## Schema

- `users(id, username, invite_code, invite_slots, invited_by, streak_days, city, country, flag, created_at)`
- `genesis_codes(code, used, used_by, used_at)` — bootstrap codes for the very first signups (no inviter required)

## Media storage

With `S3_BUCKET` set, photo/video uploads go to S3 and Postgres stores only the
public URL (`photos.image_url` / `photos.video_url`); `/photos/:id/raw` and
`/photos/:id/video` 302-redirect to the CDN for those rows. Without it, media
keeps living in the base64 columns like before — no AWS needed for local dev.
Legacy rows keep streaming from Postgres either way.

| Var | Effect |
| --- | ------ |
| `S3_BUCKET` | enables S3 storage |
| `S3_REGION` | falls back to `AWS_REGION`, then `us-east-1` |
| `S3_PUBLIC_URL` | CDN base (CloudFront), e.g. `https://dxxxx.cloudfront.net`; defaults to the bucket URL |
| `S3_ENDPOINT` | optional, for R2/MinIO-compatible stores |
| `S3_KEY_PREFIX` | key prefix, default `media` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | standard AWS credential chain |

## Important

The Neon connection string lives in `.env` (gitignored). Rotate it in the Neon console once development settles, and never commit `.env`.
