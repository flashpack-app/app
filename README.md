# flash. (Expo prototype)

> Expo / React Native prototype of the **flash.** invite-only photo app described in `PROMPT.md`.
> The Swift/SwiftUI build lives separately — this is the cross-platform sketch first.

## Quick start


### Client

```powershell
# from this folder
npm install
npx expo start
```

Then press `a` (Android), `i` (iOS, macOS only), or scan the QR with **Expo Go**.

> Camera, screenshot detection, and haptics require a real device or simulator — they won't work in the web preview.

### Pointing the client at the server

The client reads `extra.apiUrl` from `app.json`. Defaults:

- iOS simulator → `http://localhost:4000`
- Android emulator → auto-overridden to `http://10.0.2.2:4000`
- Real device on Expo Go → edit `app.json` `extra.apiUrl` to your machine's LAN IP, e.g. `http://192.168.1.42:4000`, then reload.

## Auth flow (no phone, no OTP)

1. **Invite gate** → enter `FLASH·XXX·XX`. Server checks it's an unused genesis code OR a real user's code with remaining slots.
2. **Username screen** → pick `@yourname`.
3. Server creates the user, gives them their own `invite_code` + 3 slots, returns `{ user, token }`.
4. Existing users can tap **"already have an account? sign in"** on the gate, then enter their `@username` (no password — temporary, OTP comes later).
5. Client persists session in `AsyncStorage`. Future launches skip the gate.
6. **Settings** lives at Profile → ⚙. From there: account info, invites, admin panel (admins only), and sign out.

## What's included

All 10 screens from `PROMPT.md`, wired through React Navigation:

1. **Invite gate** — `FLASH·XXX·XX` regex validation, mock verification.
2. **Camera** — live `expo-camera` viewfinder, rule-of-thirds grid, focus ring, vibe filter strip, animated shutter.
3. **Photo preview** — animated send-button morph, mock upload, haptic confirm.
4. **Pack reveal** — animated 2x2 mosaic + chemistry bar, share sheet, screenshot detection.
5. **Feed** — pack cards, pull-to-refresh, long-press → report flow.
6. **One-comment moment** — locked banner, member messages, gated send with on-device text moderation.
7. **Screenshot warning modal** — triggered by `expo-screen-capture`, logs to mock API.
8. **Profile** — avatar, streak, stats, vibemeter bars, packed-with chips.
9. **Invite** — share code, slot list, share sheet via `expo-linking`.
10. **Report** — modal sheet, radio reasons, mock submit toast.

## Project layout

```
flashpack/
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
└── src/
    ├── components/    # FlashLogo, Mosaic, PackCard, ChemistryBar, FilterStrip, ...
    ├── data/mock.ts   # mock user, packs, invite slots
    ├── navigation/    # RootNavigator (Stack + Tabs)
    ├── screens/       # 10 screens listed above
    ├── services/      # api (mock), filters, moderation, screenshot
    ├── state/         # AppStateProvider (auth + packs context)
    ├── theme/         # colors + typography tokens
    └── types/         # TS models matching the PROMPT
```

## Filter implementation note

The Swift target uses `CIFilter` chains (saturation/contrast/temperature/color matrix). React Native has no first-party CoreImage equivalent. To stay dependency-free this build approximates each vibe with a tinted overlay (`src/services/filters.ts`).

For pixel-accurate parity later, swap `filterStyles` for a Skia or `react-native-color-matrix-image-filters` implementation — the call sites already centralise the filter-to-style mapping.

## Behaviour parity vs PROMPT

| PROMPT requirement | Expo build status |
| --- | --- |
| Photo only (no video) | yes |
| No watermarks / likes / followers | yes |
| Tab bar visible everywhere except invite gate | yes |
| True black `#0A0A0A` everywhere | yes |
| On-device text moderation | basic word-list (`src/services/moderation.ts`); swap for ML when porting |
| On-device image moderation | stubbed allow-all; hook a native vision module here |
| Screenshot detection + silent log | yes (`expo-screen-capture`) |
| `flash://invite?code=...` deep link | scheme registered in `app.json`; share sheet uses it |

## Next steps for native parity

1. Replace overlay filters with Skia color matrices that mirror the CIFilter chains in `PROMPT.md`.
2. Wire real backend endpoints in `src/services/api.ts` (already typed).
3. Plug `expo-notifications` into `PushType` handlers (mapping is in `PROMPT.md`).
4. Add OTP / phone verification screens before `InviteGate → Tabs`.
5. Port the same visual hierarchy to SwiftUI when ready (component names already mirror the PROMPT structure).
