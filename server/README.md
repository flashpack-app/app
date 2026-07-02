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

## Moderation

Photo uploads (`POST /photos`) and comments (`POST /packs/:id/comment`) run through
`src/moderation.ts` before anything is stored. Rejections return `422` with
`{ error: 'image_rejected' | 'text_rejected', categories }`.

Env vars:

| Var | Effect |
| --- | ------ |
| `OPENAI_API_KEY` (or `MODERATION_API_KEY`) | enables ML moderation via `omni-moderation-latest` for both text and images |
| `MODERATION_FAIL_CLOSED=true` | reject content when the moderation API errors (default: fail open + heuristic) |

Without a key, text falls back to a word-boundary heuristic and images are allowed —
same behaviour dev environments had before, just enforced server-side now.

## Important

The Neon connection string lives in `.env` (gitignored). Rotate it in the Neon console once development settles, and never commit `.env`.
