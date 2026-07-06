<div align="center">  
  
<img src="https://raw.githubusercontent.com/flashpack-app/app/main/src/assets/logo-white.png" alt="flash." width="180" />  
  
<br /><br />  
  
**an invite-only, camera-first photo app where small packs of friends capture and reveal moments together.**  
  
no likes. no followers. no watermarks.  
  
<br />  
  
<!-- issue / PR counters — grouped together, rounded (default flat style) -->  
![Open issues](https://img.shields.io/github/issues/flashpack-app/app?style=flat&color=FFD60A)  ![Closed issues](https://img.shields.io/github/issues-closed/flashpack-app/app?style=flat&color=30D158) ![Open PRs](https://img.shields.io/github/issues-pr/flashpack-app/app?style=flat) ![Closed PRs](https://img.shields.io/github/issues-pr-closed/flashpack-app/app?style=flat&color=30D158)  
  
<!-- activity -->  
![Last commit](https://img.shields.io/github/last-commit/flashpack-app/app?style=flat) ![Commit activity](https://img.shields.io/github/commit-activity/m/flashpack-app/app?style=flat) ![Contributors](https://img.shields.io/github/contributors/flashpack-app/app?style=flat) 
  
<!-- stack -->  
![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-000000?style=flat) ![React Native 0.81](https://img.shields.io/badge/React%20Native-0.81.5-000000?style=flat) ![React 19](https://img.shields.io/badge/React-19.1-000000?style=flat) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-000000?style=flat)  
  
</div>  
  
---  
  
## what is flash.  
  
flash. is a private, invite-only photo app built around **packs** — small groups  
of friends who capture and reveal moments together. there's no public feed to  
perform for, no like counts, no follower race. you get in with a code from a  
friend, you shoot, and your pack's photos reveal together as a mosaic.  
  
- **invite gate** — join only with a `FLASH·XXX·XX` code; every user gets their own code + limited invite slots  
- **camera-first** — live viewfinder, rule-of-thirds grid, focus ring, vibe filters, animated shutter  
- **pack reveal** — an animated 2×2 mosaic with a chemistry / vibe-match score  
- **one-comment moment** — a single gated comment per pack, so it stays intentional  
- **reactions** — a small, capped set of ghost emoji reactions per pack  
- **streaks** — daily posting streaks with escalating colour tiers  
- **flash.live** — short silent video clips (Pro)  
- **screenshot detection** — the pack is told when someone screenshots  
- **invite lineage** — see who invited whom, as a browsable family tree  
- **Pro tier** — exclusive film LUTs, custom tile borders, +2 invite slots, streak insurance, silent mode  
  
## content moderation  
  
both photos and comments are moderated server-side before anything is stored.  
images and text run through OpenAI `omni-moderation-latest`; text also has a  
local word-list heuristic. rejected uploads return `422` and never persist.  
  
## tech  
  
- **client** — Expo (SDK 54) / React Native 0.81, React 19, TypeScript; Skia LUT filters, React Navigation  
- **server** — Express + Postgres, with Redis-backed caching (in-process fallback when `REDIS_URL` is unset)  
- **deploy** — Render (`render.yaml`), managed Postgres  
  
## repo layout  
  
- `src/` — mobile app: `screens/`, `components/`, `services/`, `state/`, `theme/`, `assets/`  
- `server/` — Express + Postgres backend (`src/index.ts`, `src/moderation.ts`, `src/cache.ts`, `schema.sql`)
