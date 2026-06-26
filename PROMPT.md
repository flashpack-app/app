# flash. — iOS App Build Prompt (v2)

---

## PROMPT

``
Build a production-ready iOS application called "flash." using Swift and SwiftUI.
Follow every detail below exactly.

---

## APP OVERVIEW

Name: flash.
Platform: iOS 17+ (iPhone only, portrait locked)
Language: Swift 5.9+
UI Framework: SwiftUI
Architecture: MVVM + Clean Architecture
Dependencies: Apple frameworks only — SwiftUI, AVFoundation, Vision, CoreImage, UserNotifications, PhotosUI, CryptoKit
Tab bar: 3 tabs — Feed (grid icon), Camera (camera icon, center), Profile (person icon)

Design language:
- Background: #0A0A0A (true black, not dark grey)
- Cards: #141414 with 0.5px border #252525
- Accent yellow: #FFD60A (used sparingly — shutter ring, your mosaic border, send button, streak badge)
- Green: #30D158 (chemistry score, joined states)
- Red: #FF453A (report, expiry chip, screenshot alert)
- Text primary: #FFFFFF
- Text secondary: rgba(255,255,255,0.4)
- Text hint: rgba(255,255,255,0.2)
- Font: SF Pro Display via -apple-system
- Border radius: 12px cards, 8px small elements, 20px pills

NO video mode. Photo only.
NO watermarks.
NO follower counts.
NO likes.

---

## SCREEN 1 — INVITE GATE

This is the first screen every new user sees. No way to bypass it.

Layout (full screen, centered, black background):
- "flash." logo: 38px bold, white, letter-spacing -1.5px, yellow period
- Subtitle: "invite only. get a code from a friend." — 8px, rgba white 0.3, centered, line-height 1.6
- Invite code input: monospace font, uppercase, centered, placeholder "FLASH · _ _ _ · _ _"
  - Validate format: ^FLASH·[A-Z0-9]{3}·[A-Z0-9]{2}$
  - Auto-uppercase as user types
  - Background #141414, border 0.5px #2a2a2a, border-radius 8px
- "continue" button: full width, 28px height, #FFD60A background, black text, 700 weight, 8px border-radius
  - Disabled until valid format detected
  - On valid: animate to phone verification screen
- Footer: "no code? ask a friend who's in." — 7px, rgba white 0.18, centered

On success → phone number screen → OTP (6-digit, auto-advance) → camera permissions → main app

---

## SCREEN 2 — CAMERA

Full screen, black background. No top navigation bar from SwiftUI — custom top bar only.

Top bar:
- Left: "flash." logo (15px, bold, #FFD60A period)
- Right: two 18px circle icon buttons (rgba white 0.08 bg) — flash toggle + timer

Viewfinder:
- Fills screen between top bar and filter strip
- Rounded rect 12px radius, margin 8px horizontal
- Live AVCaptureSession preview
- Rule-of-thirds grid overlay: 2 faint horizontal + 2 faint vertical lines (rgba white 0.08, 0.5px)
- Yellow focus ring (28x28, 1.5px border #FFD60A, 4px radius) — tap to move, animate position
- Active filter name badge: top-right of viewfinder, dark pill showing current filter name

Vibe filter strip (BELOW viewfinder, ABOVE shutter):
- Label: "vibe filter" — 7px, rgba white 0.3, uppercase, centered, letter-spacing 0.04em
- Horizontal scroll row of 5 filter thumbnails (32x32, border-radius 8px):
  1. moody — desaturated, high contrast, cool shadows
  2. warm — lifted shadows, orange cast, golden tones
  3. cold — blue shift, reduced saturation, flat shadows
  4. raw — no filter applied, unprocessed look
  5. dusk — red/magenta lift, compressed highlights
- Selected filter: 1.5px #FFD60A border
- Filter name below each thumbnail: 6px, active = #FFD60A, inactive = rgba white 0.3
- Filters applied using CIFilter on live preview — on-device only, never affects server upload

Implement filters with CIFilter chains:
- moody: CIColorControls(saturation: 0.6, contrast: 1.2) + CIColorMatrix(blue channel lift)
- warm: CIColorControls(brightness: 0.05) + CITemperatureAndTint(neutral: CIVector(x:6500,y:0))
- cold: CIColorControls(saturation: 0.7) + CITemperatureAndTint(neutral: CIVector(x:4000,y:0))
- raw: no filter
- dusk: CIColorMatrix(r: [1.1,0,0,0,0.05], g: [0,0.9,0,0,0], b: [0,0,0.8,0,0.1])

Shutter controls row:
- Left: last photo thumbnail (24x24, rounded 6px) — opens photo preview if tapped
- Center: shutter button (56px circle, 2.5px white border, white inner circle 44px)
- Right: camera flip button (28px circle, rgba white 0.08 bg, refresh icon)

Footer: red 4px dot + "your pack is waiting · shoot anytime" — 6px, rgba white 0.35

Mode selector: removed. Photo only. No video. No relay visible in this version.

On shutter tap:
1. Brief white flash overlay animation (0.1s, opacity 0→0.6→0)
2. Haptic feedback (UIImpactFeedbackGenerator .medium)
3. Capture still image with active CIFilter applied
4. Navigate to preview screen with spring animation

---

## SCREEN 3 — PHOTO PREVIEW + SEND

Shown immediately after capture. User decides to send or retake.

Layout:
- Full screen photo preview (captured image with filter baked in)
- Filter badge top-left: dark pill showing filter name + colored dot
- Bottom area (padding 16px horizontal):
  - Caption: "looks good? send it to your pack." — 8px, rgba white 0.3, centered
  - Two buttons side by side:
    LEFT — "retake" button:
      - pill-dim style (rgba white 0.07, border 0.5px rgba white 0.12, border-radius 10px)
      - Left arrow icon + "retake" label
      - flex: 1
    RIGHT — send button:
      - INITIAL STATE: yellow (#FFD60A) pill, "send" label (black, 700 weight) + yellow circle with black up-arrow icon inside
      - flex: 2, height 32px, border-radius 10px
      - ON TAP: spring animation — pill morphs into circle (width shrinks to 32px, border-radius 50%), then expands back as upload begins
      - UPLOADING STATE: circular progress spinner in yellow, no label
      - SUCCESS STATE: checkmark flash then navigate to feed
  - Footer hint: "your filter is saved to your vibe profile" — 6px, rgba white 0.15, centered

Tab bar visible at bottom.

---

## SCREEN 4 — PACK REVEAL

Shown when push notification "your pack is here 📦" arrives. Accessible from feed.

Top section (padding 10px):
- Status pill: green dot + "pack #N · 4 people" (rgba white 0.06 bg, 0.5px border rgba white 0.1)
- Title: "your pack\nis here." — 20px bold, white, letter-spacing -0.5px, line-height 1.1
- Subtitle: "shot 14 min apart · 3 countries" — 7px, rgba white 0.35

Mosaic (margin 10px horizontal):
- 2x2 grid, gap 3px, border-radius 14px, overflow hidden, height 220px
- Each cell: photo (or placeholder gradient), country flag emoji bottom-left (padding 4px 5px, font-size 10px)
- User's own cell: 1.5px #FFD60A border + "you" badge (top-right, #FFD60A background, black text, 700 weight, 6px font, border-radius 3px)

Chemistry bar:
- Label "vibe match" (7px, rgba white 0.3) + progress bar (flex:1, 3px height, rgba white 0.08 bg, #30D158 fill, border-radius 2px) + score "78%" (#30D158, 7px, 600 weight)
- Animate fill width from 0 to score on appear (0.8s easeOut)

Actions row (padding 0 10px 10px):
- Left: ghost react button — dim style, ghost icon + "react" label, flex:1, 26px height
- Right: share mosaic button — white (#FFFFFF) background, black text, share icon, flex:2, 26px height
  - On tap: render UIImage of mosaic + "flash." branding overlay, present UIActivityViewController

Tab bar visible.

---

## SCREEN 5 — FEED

Main home tab. Shows user's own packs in chronological order.

Top bar:
- Left: "flash." logo
- Right: expiry chip (red, clock icon, "18h left") + notification bell with red dot when unread

Pack cards (scrollable list, gap 7px, padding 10px):
Card structure (background #141414, border 0.5px #252525, border-radius 12px):
  TOP ROW: overlapping member avatars (16px circles, -4px margin, colored uniquely per member, initials) + timestamp right (7px, rgba white 0.25)
  MOSAIC: 2x2 grid, 44px per cell, gap 1px, no border-radius (edge-to-edge within card)
    - Expired cells: dark overlay + clock icon centered
  BOTTOM ROW:
    - Left: colored dot (green ≥70%, amber 50-69%, grey <50%) + "N% match" label (7px, rgba white 0.3)
    - Right: ghost emoji bubbles (16x16 circles, rgba white 0.05 bg, 0.5px border rgba white 0.08, centered emoji)

Pull to refresh.
Empty state: camera icon centered + "shoot and find your pack." (8px, rgba white 0.3)
Long press on card → context menu with "report" option.

Tab bar at bottom.

---

## SCREEN 6 — ONE COMMENT MOMENT

Accessible from any pack card. Opens as a sheet or push navigation.

Top: small 2x2 mosaic preview (96px total height, no border-radius, edge-to-edge)

Content area (padding 8px 10px):
- Header row: "one message each" (9px, 500 weight, white) + countdown "1h 42m" (7px, rgba white 0.25, clock icon)
- Locked banner (when not all members have posted): lock icon + "opens when all 4 have posted" (7px, rgba white 0.25, 0.04 bg, border-radius 6px)
- Existing comments (one per member, in dark cards):
  - Meta: flag emoji + city + "N min ago" (6px, rgba white 0.25)
  - Message text: 8px, rgba white 0.8, line-height 1.4
- User's comment card (when window open):
  - Yellow-tinted bg (rgba FFD60A 0.05), border 0.5px rgba FFD60A 0.15, border-radius 8px
  - Meta: "🇹🇷 you · write once, locked forever" (6px, rgba FFD60A 0.45)
  - Input row: dark pill input (flex:1, border-radius 20px) + yellow send circle (#FFD60A, 20px, up-arrow icon in black)
  - After sending: input replaced by sent message, no further editing
- If window closed: grey banner "comments locked"

ML text moderation before send:
- Use NaturalLanguage framework to detect hate speech / threats
- Block send if confidence > 0.75, show: "this message can't be sent."

Tab bar visible.

---

## SCREEN 7 — SCREENSHOT WARNING

Detect screenshots via:
`swift
NotificationCenter.default.addObserver(
    forName: UIApplication.userDidTakeScreenshotNotification,
    object: nil, queue: .main
) { _ in self.handleScreenshot() }
`

Present modal immediately (use a normal-flow container with min-height, not position:fixed):
- Dark overlay behind modal card
- Card (#161616, border 0.5px #2a2a2a, border-radius 12px, padding 12px):
  - Camera icon in red rounded square (28x28, rgba red 0.12 bg)
  - Title: "screenshot detected" (11px, 600 weight, white)
  - Body: "your pack members have been notified anonymously. screenshots are allowed — but everyone knows." (8px, rgba white 0.4)
  - Detail list (rgba red 0.07 bg, border-radius 6px):
    - "N people notified anonymously"
    - "logged to your account record"
    - "repeat screenshots flag for review"
  - Buttons: "close" (dim) + "delete it" (red #FF453A background)

Log to backend: POST /screenshots/log { packId, userId, timestamp }
Send silent push to all pack members (they see a subtle notification, no banner).

---

## SCREEN 8 — PROFILE (MINIMAL)

Right tab. Deliberately minimal — no pack history grid, no capsule vault UI complexity.

Top bar:
- Left: "@username" (11px, 600 weight, white)
- Right: settings icon button (18px circle, rgba white 0.08)

Avatar section (centered, padding 16px top 12px bottom):
- Avatar circle (54px, 1.5px #FFD60A border, initials or photo)
- Streak badge on avatar: bottom-right, #FFD60A bg, "47d" (6px, 700 weight, black), border 1.5px #0A0A0A
- Location text: "istanbul, TR" (7px, rgba white 0.3)
- Stats row (gap 16px):
  - packs: 47 (14px, 600, white) / "packs" (6px, rgba white 0.3)
  - countries: 18 / "countries"
  - saved: 3 / "saved"

Divider (0.5px, #1e1e1e, margin 0 10px)

VIBEMETER section (padding 0 10px 10px):
- Label: "vibemeter" (7px, rgba white 0.3, uppercase, letter-spacing 0.06em)
- Dark card (#141414, border 0.5px #252525, border-radius 10px, padding 10px):
  - One row per filter (gap 6px between rows):
    - Filter name (7px, rgba white 0.4, width 28px)
    - Progress bar (flex:1, height 4px, rgba white 0.08 bg, colored fill, border-radius 2px):
      - moody → #AFA9EC (purple-ish)
      - warm → #EF9F27 (amber)
      - cold → #5DCAA5 (teal)
      - raw → #B4B2A9 (grey)
      - dusk → #F09595 (red-ish)
    - Percentage label (7px, matching color)
  - Width reflects how often user uses that filter across all their packs
  - Footer inside card: "built from your last N packs" (6px, rgba white 0.2, centered, border-top 0.5px #252525, padding-top 6px)

"Packed with" section (padding 0 10px 10px):
- Label: "packed with" (7px, rgba white 0.3, uppercase)
- Wrap row of country chips: flag + country name (rgba white 0.05 bg, 0.5px border rgba white 0.08, border-radius 20px, padding 2px 7px, 7px font, rgba white 0.5 text)
- "+N more" chip if >4 countries

NO pack history grid. NO capsule vault. Keep it clean.

Tab bar at bottom.

---

## SCREEN 9 — INVITE SCREEN

Accessible via Profile → Settings → Invites.

Layout:
- Title: "invites" (11px, 600 weight, white, padding 4px 10px)

"your code" section:
- Label: "your code" (7px, rgba white 0.3, uppercase)
- Dark card: monospace code "FLASH·ÖMR·7K" (12px, 700, white, letter-spacing 2px) + copy icon button
  - On copy: haptic + "copied!" tooltip appears briefly

"3 slots" section:
- Label: "3 slots" (7px, rgba white 0.3, uppercase)
- Three slot rows (dark cards, border-radius 10px):
  SLOT TYPES:
  - Joined: green user icon circle (22px, #1a2a1a bg) + name + "joined" green badge
  - Pending: yellow user icon circle + name + "sent · not joined yet" + "pending" yellow badge
  - Open: dashed yellow border circle + "+" + "1 slot remaining" + "earn more at 30-day streak"

Warning box (rgba white 0.03 bg, border-radius 8px):
- Alert triangle icon (rgba FFD60A 0.4) + "if someone you invite breaks the rules, your account is reviewed too." (7px, rgba white 0.25)

Share button: full width, #FFD60A bg, "share invite link" (8px, 700, black) + share icon
- On tap: generates deep link flash://invite?code=FLASH·ÖMR·7K, presents share sheet

---

## SCREEN 10 — REPORT FLOW

Triggered by long-press context menu → "report" on any pack card in feed.
Presented as a modal sheet.

Back button + "report pack" title row.

Mini mosaic (2x2 grid, 56px total height, border-radius 10px, margin bottom 10px).

"what's the issue?" label (7px, rgba white 0.3, uppercase).

Radio option list (gap 4px):
Options: "nudity or sexual content" / "harassment or threats" / "violence or graphic content" / "spam or fake account" / "something else"
- Unselected: dark card, 0.5px #252525 border, rgba white 0.6 text, empty radio circle
- Selected: rgba red 0.06 bg, 0.5px rgba red 0.3 border, #FF453A text, filled red radio

Warning note (rgba white 0.03 bg, shield icon, border-radius 8px):
"the person who invited the reported user is also notified. repeat violations remove both accounts."

Submit button: full width, 28px height, #FF453A bg, "submit report" (8px, 700, white) + flag icon.
On submit: haptic feedback + dismiss modal + show toast "report submitted".

---

## DATA MODELS

`swift
struct User: Codable, Identifiable {
    let id: UUID
    var username: String
    var phoneNumber: String
    var inviteCode: String          // format: FLASH·XXX·XX
    var invitedBy: UUID?
    var inviteSlots: Int            // starts at 3
    var streakDays: Int
    var isPro: Bool
    var vibeProfile: VibeProfile
    var joinedAt: Date
}

struct VibeProfile: Codable {
    var filterUsage: [VibeFilter: Double]   // 0.0-1.0 per filter
}

struct Pack: Codable, Identifiable {
    let id: UUID
    var members: [PackMember]
    var photos: [PackPhoto]
    var chemistryScore: Int         // 0-100
    var createdAt: Date
    var expiresAt: Date             // last member's 24h expiry
    var isSaved: Bool
    var comment: PackComment?
    var status: PackStatus
}

struct PackMember: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let flag: String
    let city: String
    let country: String
    var hasPosted: Bool
    var ghostEmoji: String?
    var avatarColor: String         // hex for initials avatar
    var initials: String
}

struct PackPhoto: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let imageURL: String
    let thumbnailURL: String
    let filter: VibeFilter
    let capturedAt: Date
    let expiresAt: Date
}

struct PackComment: Codable {
    var messages: [CommentMessage]
    var windowOpensAt: Date?
    var windowClosesAt: Date?
    var isLocked: Bool
}

struct CommentMessage: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let flag: String
    let city: String
    let text: String
    let sentAt: Date
}

struct InviteSlot: Codable, Identifiable {
    let id: UUID
    var invitedUserId: UUID?
    var invitedUsername: String?
    var status: InviteStatus
    var sentAt: Date?
}

enum VibeFilter: String, Codable, CaseIterable {
    case moody, warm, cold, raw, dusk
}

enum PackStatus: String, Codable { case forming, active, expired }
enum InviteStatus: String, Codable { case open, pending, joined }
`

---

## VIEW MODEL STRUCTURE

`swift
// One ViewModel per screen
@MainActor class CameraViewModel: ObservableObject {
    @Published var selectedFilter: VibeFilter = .raw
    @Published var capturedImage: UIImage?
    @Published var isUploading: Bool = false
    func capture() { ... }
    func applyFilter(_ filter: VibeFilter, to image: UIImage) -> UIImage { ... }
    func upload() async { ... }
}

@MainActor class FeedViewModel: ObservableObject {
    @Published var packs: [Pack] = []
    @Published var isLoading: Bool = false
    func refresh() async { ... }
}

@MainActor class PackRevealViewModel: ObservableObject {
    @Published var pack: Pack
    @Published var chemistryAnimated: Double = 0
    func animateChemistry() { ... }
    func shareMosaic() { ... }
}

@MainActor class ProfileViewModel: ObservableObject {
    @Published var user: User
    @Published var vibePercentages: [VibeFilter: Double] = [:]
    func loadVibeProfile() { ... }
}

@MainActor class InviteViewModel: ObservableObject {
    @Published var slots: [InviteSlot] = []
    func copyCode() { ... }
    func shareLink() { ... }
}

@MainActor class CommentViewModel: ObservableObject {
    @Published var pack: Pack
    @Published var draftText: String = ""
    @Published var isWindowOpen: Bool = false
    func send() async { ... }
}

@MainActor class AppState: ObservableObject {
    @Published var currentUser: User?
    @Published var activePack: Pack?
    @Published var isAuthenticated: Bool = false
    @Published var pendingPackId: UUID?
}
`

---

## SERVICES

`swift
// APIService.swift
struct APIService {
    static let base = "https://api.flash-app.io/v1"

    func verifyInvite(code: String) async throws -> Bool
    func sendOTP(phone: String) async throws
    func verifyOTP(phone: String, otp: String) async throws -> String  // returns token
    func uploadPhoto(image: UIImage, filter: VibeFilter) async throws -> (photoId: UUID, packId: UUID)
    func getPacks() async throws -> [Pack]
    func getPack(id: UUID) async throws -> Pack
    func sendGhostReaction(packId: UUID, targetUserId: UUID, emoji: String) async throws
    func sendComment(packId: UUID, text: String) async throws
    func savePack(packId: UUID) async throws
    func reportPack(packId: UUID, reason: String) async throws
    func getMe() async throws -> User
    func getInviteSlots() async throws -> [InviteSlot]
    func logScreenshot(packId: UUID) async throws
}

// ModerationService.swift
struct ModerationService {
    // On-device image moderation using Vision
    func isImageSafe(_ image: UIImage) async -> Bool {
        // VNClassifyImageRequest — block if explicit confidence > 0.7
    }
    // On-device text moderation using NaturalLanguage
    func isTextSafe(_ text: String) -> Bool {
        // NLTagger for hate speech / threat detection
    }
}

// ScreenshotDetector.swift
class ScreenshotDetector: ObservableObject {
    @Published var screenshotDetected = false
    private var observer: NSObjectProtocol?
    func startMonitoring(packId: UUID) {
        observer = NotificationCenter.default.addObserver(
            forName: UIApplication.userDidTakeScreenshotNotification,
            object: nil, queue: .main
        ) { [weak self] _ in
            self?.screenshotDetected = true
            Task { try? await APIService().logScreenshot(packId: packId) }
        }
    }
    func stopMonitoring() {
        if let o = observer { NotificationCenter.default.removeObserver(o) }
    }
}

// FilterEngine.swift
struct FilterEngine {
    static func apply(_ filter: VibeFilter, to image: CIImage) -> CIImage {
        switch filter {
        case .moody:
            return image
                .applyingFilter("CIColorControls", parameters: ["inputSaturation": 0.6, "inputContrast": 1.2])
                .applyingFilter("CIColorMatrix", parameters: ["inputBVector": CIVector(x:0,y:0,z:0.15,w:0)])
        case .warm:
            return image
                .applyingFilter("CIColorControls", parameters: ["inputBrightness": 0.05])
                .applyingFilter("CITemperatureAndTint", parameters: ["inputNeutral": CIVector(x:6500,y:0)])
        case .cold:
            return image
                .applyingFilter("CIColorControls", parameters: ["inputSaturation": 0.7])
                .applyingFilter("CITemperatureAndTint", parameters: ["inputNeutral": CIVector(x:4000,y:0)])
        case .raw:
            return image
        case .dusk:
            return image
                .applyingFilter("CIColorMatrix", parameters: [
                    "inputRVector": CIVector(x:1.1,y:0,z:0,w:0.05),
                    "inputGVector": CIVector(x:0,y:0.9,z:0,w:0),
                    "inputBVector": CIVector(x:0,y:0,z:0.8,w:0.1)
                ])
        }
    }
}
`

---

## PUSH NOTIFICATIONS

Handle these types in AppDelegate / NotificationDelegate:
`swift
enum PushType: String {
    case packComplete = "pack.complete"       // "your pack is here 📦"
    case commentOpen = "pack.comment.open"    // "say something to your pack ✍️"
    case packExpiring = "pack.expiring"       // "pack disappears in 2 hours ⏱"
    case inviteJoined = "invite.joined"       // "Kemal joined flash. 🎉"
    case screenshot = "pack.screenshot"       // silent — no banner, triggers local modal
}
`

For screenshot push: receive silently, post local notification to show warning modal.

---

## ANIMATIONS

Camera shutter:
- Scale 0.92 on press, spring back on release
- White flash overlay: opacity 0→0.5→0 over 0.15s

Send button morph (in preview screen):
- On tap: withAnimation(.spring(response: 0.3, dampingFraction: 0.7))
  - Width shrinks from full to 32px (circle)
  - Border-radius to 50%
  - Label fades out, spinner fades in
  - On upload complete: checkmark scale-in (0.5→1.0), then navigate

Pack reveal mosaic:
- Each cell: scale 0.85→1.0 + opacity 0→1
- Stagger: 0.08s delay per cell
- Spring animation: response 0.4, dampingFraction 0.75

Chemistry bar: withAnimation(.easeOut(duration: 0.8)) — fill width 0 to final value

Ghost reaction send:
- Emoji scale-up + opacity fade out (flies up 20pt, duration 0.4s)

---

## PROJECT STRUCTURE

`
flash/
├── App/
│   ├── flashApp.swift
│   ├── AppState.swift
│   └── AppDelegate.swift
├── Features/
│   ├── Onboarding/
│   │   ├── InviteGateView.swift
│   │   ├── PhoneVerificationView.swift
│   │   ├── OTPView.swift
│   │   └── OnboardingViewModel.swift
│   ├── Camera/
│   │   ├── CameraView.swift
│   │   ├── CameraPreviewView.swift        // UIViewRepresentable wrapping AVCaptureVideoPreviewLayer
│   │   ├── PhotoPreviewView.swift
│   │   ├── FilterStripView.swift
│   │   └── CameraViewModel.swift
│   ├── Feed/
│   │   ├── FeedView.swift
│   │   ├── PackCardView.swift
│   │   └── FeedViewModel.swift
│   ├── PackReveal/
│   │   ├── PackRevealView.swift
│   │   ├── MosaicView.swift
│   │   ├── ChemistryBarView.swift
│   │   └── PackRevealViewModel.swift
│   ├── Comment/
│   │   ├── CommentMomentView.swift
│   │   └── CommentViewModel.swift
│   ├── Profile/
│   │   ├── ProfileView.swift
│   │   ├── VibemeterView.swift
│   │   └── ProfileViewModel.swift
│   ├── Invite/
│   │   ├── InviteView.swift
│   │   └── InviteViewModel.swift
│   └── Report/
│       ├── ReportView.swift
│       └── ReportViewModel.swift
├── Core/
│   ├── Models/
│   │   ├── User.swift
│   │   ├── Pack.swift
│   │   ├── PackPhoto.swift
│   │   ├── Comment.swift
│   │   └── InviteSlot.swift
│   ├── Services/
│   │   ├── APIService.swift
│   │   ├── AuthService.swift
│   │   ├── FilterEngine.swift
│   │   ├── ModerationService.swift
│   │   ├── NotificationService.swift
│   │   └── ScreenshotDetector.swift
│   └── Utilities/
│       ├── Extensions+Color.swift
│       ├── Extensions+UIImage+CIFilter.swift
│       └── Extensions+View.swift
├── DesignSystem/
│   ├── Colors.swift
│   ├── Typography.swift
│   └── Components/
│       ├── MosaicView.swift
│       ├── PackCardView.swift
│       ├── ChemistryBarView.swift
│       ├── VibemeterBarView.swift
│       ├── CountryChipView.swift
│       ├── PillButton.swift
│       └── InviteSlotRow.swift
└── Resources/
    ├── Assets.xcassets
    └── Info.plist
`

---

## DESIGN TOKENS

`swift
extension Color {
    static let flashBlack    = Color(hex: "#0A0A0A")
    static let flashCard     = Color(hex: "#141414")
    static let flashBorder   = Color(hex: "#252525")
    static let flashYellow   = Color(hex: "#FFD60A")
    static let flashGreen    = Color(hex: "#30D158")
    static let flashRed      = Color(hex: "#FF453A")
    static let flashAmber    = Color(hex: "#FF9F0A")
    static let textPrimary   = Color.white
    static let textSecondary = Color.white.opacity(0.4)
    static let textHint      = Color.white.opacity(0.2)
}

// Vibe filter colors
extension VibeFilter {
    var color: Color {
        switch self {
        case .moody: return Color(hex: "#AFA9EC")
        case .warm:  return Color(hex: "#EF9F27")
        case .cold:  return Color(hex: "#5DCAA5")
        case .raw:   return Color(hex: "#B4B2A9")
        case .dusk:  return Color(hex: "#F09595")
        }
    }
    var displayName: String { rawValue }
}
``

---

## BUILD ORDER (START HERE)

1. Xcode → New Project → iOS App → SwiftUI → minimum iOS 17
2. Set up DesignSystem/Colors.swift and Extensions+Color.swift first
3. Build AppState.swift as @MainActor ObservableObject 
4. Wire ContentView.swift with TabView (Feed / Camera / Profile) — true black tab bar
5. Build InviteGateView.swift — shown before TabView if not authenticated
6. Build CameraView with AVFoundation + FilterEngine + live preview
7. Build PhotoPreviewView with animated send button morph
8. Build PackRevealView with mosaic animation + chemistry bar animation
9. Build FeedView with PackCardView components + long-press report
10. Build ProfileView with VibemeterView 
11. Build InviteView and CommentMomentView 
12. Build ReportView as modal sheet
13. Add ScreenshotDetector to root and pack-viewing contexts
14. Wire APIService with mock JSON (URLSession + JSONDecoder)
15. Add NotificationService and handle push types
16. Add ModerationService — gate camera upload and comment send

STRICT RULES:
- No third-party dependencies
- No video mode
- No watermarks
- No follower counts or likes
- Filters are client-side only (CIFilter) — never processed server-side
- All moderation is on-device (Vision + NaturalLanguage frameworks)
- Tab bar always visible (except invite gate and OTP screens)
- True black (#0A0A0A) everywhere — not system dark mode gray
```

---

*flash. · IDE Prompt v2 · May 2026*




IMPORTANT!!!!!!!!!1

FOR NOW MAKE IT FOR EXPO!!!!!! I WANNA TRY WITH EXPO!!!! LATER WE WILL TRY WITH SWIFT!