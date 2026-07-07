<div align="center">  
  
# flash. server  
  
**the Express + Postgres backend behind flash. — invites, packs, moderation, and caching.**  
  
<br />  
  
![Node](https://img.shields.io/badge/node-runtime-339933?logo=node.js&logoColor=white)  ![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)  ![Postgres](https://img.shields.io/badge/postgres-neon-4169E1?logo=postgresql&logoColor=white)  ![Redis](https://img.shields.io/badge/redis-cache-DC382D?logo=redis&logoColor=white)  ![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?logo=typescript&logoColor=white)  ![Render](https://img.shields.io/badge/deploy-render-46E3B7?logo=render&logoColor=white)  
  
</div>  
  
---  
  
## overview  
  
A single-process Express + Postgres (Neon) API. There is **no phone/OTP** —  
auth is `invite code → username → user`. The `token` is just the user's UUID  
(no JWT yet); swap to signed tokens before going public.  
  
- **runtime** — Node + `tsx`, Express 4, `pg` connection pool  
- **database** — Postgres (Neon in prod), schema in `src/schema.sql`  
- **cache** — Redis-backed with an in-process TTL fallback (`src/cache.ts`)  
- **moderation** — OpenAI `omni-moderation-latest` + local heuristic (`src/moderation.ts`)  
- **deploy** — Render (`render.yaml`), managed Postgres  
  
## what it does  
  
- **invites** — verify + redeem codes, bootstrap "genesis" codes for the first  
  signups, track the invite tree via `users.invited_by` and per-user slots  
- **packs** — matches users who posted in the same window into packs, computes  
  a chemistry score, and serves the reveal payload (`shapePack`)  
- **photos & video** — stores image/video bytes (base64) with an 18-hour expiry  
- **social** — pack + photo reactions, one comment per user per pack, reports  
  (packs / users / comments), screenshots, daily topics  
- **notifications** — in-app notification feed + Expo push fan-out  
- **moderation** — blocks explicit images and banned text before anything is stored  
  
## endpoints  
  
| Method | Path                    | Notes                                            |  
| ------ | ----------------------- | ------------------------------------------------ |  
| GET    | `/health`               | sanity check                                     |  
| POST   | `/invite/verify`        | `{ valid, kind?, reason? }`                      |  
| POST   | `/invite/redeem`        | creates user + their own invite code             |  
| GET    | `/me`                   | current user (cached, 120s TTL)                  |  
| GET    | `/invite/slots`         | user's code + invite slots                       |  
| POST   | `/photos`               | upload photo/video → matched into a pack (moderated) |  
| GET    | `/packs` · `/discover`  | member packs and public "around the globe" packs |  
| POST   | `/packs/:id/comment`    | one comment per user (moderated)                 |  
| POST   | `/packs/:id/react`      | pack reactions (max 5, enforced app-side)        |  
| POST   | `/screenshot`           | logs a screenshot + notifies pack members        |  
| GET    | `/notifications`        | in-app notification feed                         |  
  
> ~50 routes total in `src/index.ts` (auth-gated with `requireUser`, which reads  
> `Authorization: Bearer <userId>`). The table above is the core subset.  
  
## schema  
  
Defined in `src/schema.sql` (additive, idempotent migrations):  
  
- `users` — identity, invite code/slots, streak, location, pro/admin/ban flags, push token, violation count  
- `genesis_codes` — bootstrap codes for the very first signups (no inviter required)  
- `photos` — image/video bytes + filter, 18h `expires_at`  
- `packs` / `pack_members` — pack grouping + chemistry score  
- `pack_reactions` / `photo_reactions` / `pack_comments` — social layer  
- `pack_reports` / `user_reports` / `comment_reports` — moderation queues  
- `notifications` — in-app feed (`system` / `pack` / `comment` / `reaction` / `streak`)  
- `daily_topics` · `pack_screenshots` · `moderation_violations`  
  
## moderation  
  
Photo uploads (`POST /photos`) and comments (`POST /packs/:id/comment`) run  
through `src/moderation.ts` before anything is stored. Rejections return `422`  
with `{ error: 'image_rejected' | 'text_rejected', categories }`.  
  
| Var | Effect |  
| --- | ------ |  
| `OPENAI_API_KEY` (or `MODERATION_API_KEY`) | enables ML moderation via `omni-moderation-latest` for text + images |  
| `MODERATION_FAIL_CLOSED=true` | reject content when the moderation API errors (default: fail open + heuristic) |  
  
Without a key, text falls back to a word-boundary heuristic (`BANNED_TERMS`) and  
images are allowed.  
  
## caching  
  
Hot reads go through `src/cache.ts`: pack payloads (`shapePack`, 60s TTL) and the  
`/me` user row (120s TTL). Every mutating endpoint invalidates the keys it touches;  
the TTL bounds staleness for anything indirect. Set `REDIS_URL` to share the cache  
across instances — without it, an in-process TTL map with identical semantics is  
used, so local dev needs no Redis. Cache errors fall through to Postgres.  
  
## environment  
  
| Var | Purpose |  
| --- | ------- |  
| `DATABASE_URL` | Postgres connection (Neon in prod, injected by Render) |  
| `REDIS_URL` | shared cache; optional (in-process fallback when unset) |  
| `OPENAI_API_KEY` / `MODERATION_API_KEY` | ML moderation |  
| `MODERATION_FAIL_CLOSED` | fail closed on moderation errors |  
  
> `.env` is gitignored — never commit it. Rotate the Neon string in the Neon console.  
  
## layout  
  
- `src/index.ts` — all routes + matching/chemistry logic  
- `src/moderation.ts` — image/text moderation (OpenAI + heuristic)  
- `src/cache.ts` — Redis / in-process cache  
- `src/db.ts` · `src/migrate.ts` · `src/codes.ts` — pool, migrations, invite-code gen  
- `src/schema.sql` — full schema
