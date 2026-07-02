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

## Caching

Hot reads go through `src/cache.ts`: pack payloads (`shapePack`, 60s TTL) and
the `/me` user row (120s TTL). Every mutating endpoint invalidates the keys it
touches; the TTL bounds staleness for anything indirect (e.g. an avatar change
appearing inside cached pack payloads).

Set `REDIS_URL` to share the cache across instances. Without it an in-process
TTL map with identical semantics is used, so local dev needs no Redis. Cache
errors fall through to Postgres — Redis being down slows things, never breaks.

## Important

The Neon connection string lives in `.env` (gitignored). Rotate it in the Neon console once development settles, and never commit `.env`.
