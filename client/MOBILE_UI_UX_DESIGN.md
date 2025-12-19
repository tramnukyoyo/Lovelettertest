# HeartsGambit Mobile UI/UX Audit & Redesign Proposal

Status: draft  
Scope: `HeartsGambit/client` (web, React)  
Audience: product/design + implementation (frontend)  
Last updated: 2025-12-19

## Executive summary (what to do)

HeartsGambit is visually “desk/board”-first and currently *fits* on smaller viewports via responsive sizing, but the **mobile experience is not reliably playable or comfortable**—especially on very small devices and in landscape where the OS/UI chrome consumes most vertical space.

Recommended solution: **ship an “Immersive Mobile Mode”** that:

1. **Treats gameplay as landscape-first**, with a friendly rotate prompt in portrait (and an optional portrait fallback layout).
2. **Moves non-core UI into drawers/sheets** (chat, players, evidence/history, settings) and removes redundant in-board overlays on small screens.
3. **Makes the hand + actions a dedicated “Case File” bottom sheet** instead of always-on UI, so the board area stays readable.
4. **Replaces hover/tooltips with tap-to-inspect** (full-screen card inspector + swipe paging).
5. **Hardens mobile-web ergonomics**: safe-area handling, keyboard avoidance, larger tap targets, reduced motion/transparency options, and iOS performance tweaks.

This document audits the current state, defines the target mobile experience, and specifies an implementation-ready redesign.

---

## Context & constraints

### Product context
- Web-based, real-time deduction card game (2-player UI in header, but code supports more players).
- Noir “desk” aesthetic driven by a fixed background image (`public/Background.webp`).
- Mobile navigation already exists at the platform level via `BottomTabBar` + `MobileDrawer`.

### Technical constraints (web)
- **Orientation can’t be forced** in mobile browsers; only encouraged with UI prompts.
- **iOS Safari** has special constraints:
  - `background-attachment: fixed` often janks or breaks scrolling.
  - `100vh` can be unstable with address bar; `100dvh` helps but keyboard still changes viewport.
  - Backdrop blur can be expensive.

---

## Current mobile audit (what’s hurting UX)

This is based on the current structure and styles:
- Game: `src/components/hearts-gambit/HeartsGambitGame.tsx`
- Header: `src/components/GameHeader.tsx`
- Mobile nav + drawer: `src/components/BottomTabBar.tsx`, `src/components/MobileDrawer.tsx`
- Cards + tooltips: `src/components/hearts-gambit/DynamicCard.tsx`, `src/components/hearts-gambit/CardTooltip.tsx`
- CSS: `src/unified.css`

### 1) Screen real estate is over-allocated to chrome
- Fixed header + bottom tab bar both occupy persistent space.
- In **mobile landscape** the remaining vertical space becomes extremely small, forcing cramped card sizes and increasing mis-taps.
- `App.tsx` adds `pb-20` to the main game scroll area (to avoid the tab bar), reducing usable area further.

Impact:
- Gameplay feels “squeezed”, especially on small phones.
- Key UI (opponent targeting, action menu, hand) competes for the same pixels.

### 2) Information architecture is “desktop all-at-once”
The game surface includes:
- Opponent area + deck + discard + “Case Notes” overlay (last chat messages) + hand + floating action menu.
- Chat and players are also available via the global mobile drawer.

Impact:
- **Redundant UI** (Case Notes overlay + chat drawer) and too many simultaneous elements on small screens.
- The “Case Notes” overlay (fixed size) can **occlude** critical interactions.

### 3) Interactions depend on hover/tooltips patterns
`CardTooltip` provides mouse hover and a mobile touch fallback (auto-hides after ~1.5s).

Impact:
- Tooltips are a weak fit for mobile: hard to control, can block the board, and don’t support “inspect + act” flows.
- Players need a dependable way to read card text and confirm decisions without precision taps.

### 4) Action flow is not optimized for touch
The “Context Actions Menu”:
- Is a floating panel anchored bottom-right with a fixed width target (`w-[560px]` with max-width clamp).
- Contains multi-step inputs (target selection, inspector guess selection) and confirm/cancel.
- The Inspector guess grid uses small cards with **8px** description text (`.hg-guard-select-card`).

Impact:
- On small screens, the action UI becomes busy and error-prone.
- Multi-step actions are not clearly staged; target selection relies on tapping opponent cards that may be small/overlapping.

### 5) Readability and friendly microcopy issues
Several UI elements appear to include garbled characters (likely encoding/font fallback), for example:
- Chat emoji button label in `ChatWindow.tsx`
- Some tooltip/inspector “Tip” text in the evidence inspector

Impact:
- Reduces trust and polish, especially on mobile where users rely on icons and microcopy for guidance.

### 6) Mobile web ergonomics + performance risks
Potential issues for mobile:
- `background-attachment: fixed` on the noir background.
- Extensive shadows/backdrop blurs and animated film grain.
- Keyboard avoidance for chat input inside a fixed drawer.

Impact:
- Increased battery drain and jank on lower-end devices.
- Input fields can be partially obscured by the keyboard if not explicitly handled.

---

## Target mobile experience (design goals)

### Primary goals
1. **Playable on small devices** (including very small phones) without squinting or mis-taps.
2. **One-screen focus**: show the board by default, reveal everything else on demand.
3. **Fast “inspect → decide → confirm” loop** with clear staging and safe confirmations.
4. **Mobile-native ergonomics**: safe areas, keyboard, touch targets, reduced motion.
5. Preserve the noir tone without sacrificing usability.

### Success metrics (practical)
- Turn completion time on mobile (median) within +15% of desktop.
- “Undo/regret” proxies: fewer misplays (measured by immediate cancel/reselect patterns).
- Lower abandon rate during first game on mobile.
- Higher chat usage on mobile (because it’s accessible, not intrusive).

---

## Proposed solution: Immersive Mobile Mode

### Overview
Introduce a mobile gameplay shell that treats the **board as the default**, and moves everything else into predictable, thumb-friendly surfaces.

**Three-layer model**
1. **Board layer**: opponents + deck + discard + minimal state indicators.
2. **HUD layer**: tiny, always-available controls (menu + turn/phase + notifications).
3. **Sheet layer**: “Case File” (hand + actions) and “Utility Drawers” (chat/players/evidence/settings/video).

### Orientation strategy
**Landscape-first gameplay**:
- If `portrait` and `in-game`, show a “Rotate for best experience” overlay.
- Provide a “Continue in portrait” option that switches to a portrait fallback layout (reflowed + more sheet-driven).

Why: the visual metaphor and current background composition are landscape-biased; landscape maximizes horizontal room for opponent + deck + discard + hand.

Implementation hooks already exist:
- `useOrientation()` in `src/hooks/useIsMobile.ts`

### Layout variants

#### A) Mobile landscape (preferred for play)
- **Hide the full header** during active play; replace it with a compact HUD:
  - Top-left: Menu button (leave, copy invite, settings).
  - Top-right: Phase badge + (optional) room code (or in menu).
- Replace bottom tab bar with a **vertical utility rail** on the right edge (optional) *or* keep bottom bar but shrink height in landscape.
- Board area uses the full remaining height.
- “Case File” sheet (hand + actions) is collapsed by default and expanded when needed.

#### B) Mobile portrait (fallback / “continue anyway”)
- Board becomes a vertically stacked “card table”:
  - Opponent strip (single opponent centered, swipe if >1).
  - Deck + discard row.
  - “Case File” sheet sits above the bottom safe area and is often expanded by default.
- Chat/players remain in a utility drawer.

#### C) Tablet
- Keep the current layout mostly intact but apply mobile interaction improvements (tap-to-inspect, action sheet).

---

## Key component specs

### 1) Case File sheet (hand + actions)
Replace “always visible hand + floating action panel” with a single bottom sheet.

**Collapsed state**
- Shows a “Case File” handle/tab and key indicators:
  - cards in hand (count)
  - “Your turn” / “Draw” prompts

**Expanded state**
- Contains:
  - Hand carousel (large cards, horizontal scroll, snap)
  - Selected card details (name, effect summary)
  - Action flow UI (target selection / guess selection / confirm)

Benefits:
- Frees board space.
- Keeps all “decision-making” in one place.
- Allows large, readable cards on mobile.

### 2) Action flow = staged, touch-first
Convert actions into a small state machine:
1. Select card
2. Select target (if needed)
3. Select guess (if needed)
4. Confirm (primary CTA) + Cancel (secondary)

Design requirements:
- The primary CTA is always reachable with the thumb (bottom-right in sheet).
- Target selection is presented as a **list** of eligible players (not only tap-on-board), with a “tap opponent” shortcut.
- For Inspector/guess: use **iconic card faces** (or numbers) + a tap-to-inspect preview, not tiny multi-line text.

### 3) Card inspector (tap-to-inspect)
Make “read the card” reliable:
- Tap card → opens full-screen inspector modal.
- Swipe left/right (or Prev/Next buttons) to page through a set (hand, evidence timeline, discard pile).
- Optional: pinch-to-zoom on the card image/text for accessibility.

This replaces tooltips as the primary mobile affordance.

### 4) Utility drawers
Keep (and strengthen) the existing drawer model for:
- Chat
- Players
- Video
- Settings
- Evidence (discard viewer)

Enhancements:
- Add unread badges (chat, evidence updates) to the nav control that opens the drawer.
- Ensure drawer content has proper keyboard-safe padding when inputs are focused.

### 5) Minimal HUD
A tiny overlay that stays visible without consuming major space:
- Turn indicator (Your turn / Waiting / Eliminated)
- Phase badge
- Deck count + discard count (optional)
- Notification dots for chat/evidence

---

## Visual + layout guidance (mobile)

### Touch targets
- Minimum interactive size: **44×44px** (Apple HIG baseline).
- Avoid stacked/overlapped cards as primary tap targets on mobile unless each has a clear hit area.

### Typography
- Avoid fixed `10px` text on mobile for gameplay-critical information.
- Use `clamp()` scales tied to viewport height/width, and allow user zoom in inspector.

### Use the background as “atmosphere”, not layout
The noir desk background is strong, but on mobile it should:
- Never reduce readability (add scrims/gradients behind text).
- Never dictate fixed positioning of interactive UI if it creates occlusion.

### Reduce visual cost in mobile mode
In mobile:
- Disable `background-attachment: fixed`.
- Reduce backdrop blur and large shadows.
- Respect `prefers-reduced-motion` (already present) and consider a “Reduced Effects” toggle for older devices.

---

## Technical implementation notes (frontend)

### Safe areas + viewport
- Update `index.html` viewport meta to include `viewport-fit=cover` for better safe-area control.
- Ensure all fixed-position elements (HUD, sheets, drawers) pad using:
  - `env(safe-area-inset-top)`
  - `env(safe-area-inset-bottom)`

### Keyboard avoidance (chat + inputs)
- When an input is focused inside a drawer/sheet:
  - Add bottom padding equal to `env(keyboard-inset-height)` where supported (or use a JS resize observer fallback).
  - Ensure the input stays visible (scroll into view).

### Responsive triggers
Use a combination of:
- width breakpoints (`<= 768`, `<= 480`)
- height breakpoints (`<= 480`)
- orientation (`portrait` vs `landscape`)

Prefer “small height” checks for landscape phones.

### Use existing building blocks
- Orientation detection exists: `useOrientation()`
- Mobile navigation exists: `BottomTabBar`, `MobileDrawer`
- Card inspector patterns exist: evidence `zoomContext` modal can be generalized to hand/discard.

---

## Rollout plan (incremental, low-risk)

### Phase 1: Quick wins (1–2 days)
- Hide/disable “Case Notes” overlay on small screens (use chat drawer instead).
- Add unread chat badge support to mobile nav.
- Replace garbled characters in buttons/tips with icons/text.
- Add landscape-specific reductions: smaller paddings/gaps, smaller persistent chrome.

### Phase 2: Immersive Mobile Mode (3–6 days)
- Implement Case File sheet and move hand + action UI into it.
- Add portrait rotate prompt + portrait fallback layout.
- Implement tap-to-inspect for hand cards (reuse inspector modal patterns).

### Phase 3: Polish + accessibility (2–4 days)
- Refine target/guess staging with clearer eligibility and previews.
- Performance pass on mobile (reduce blur, disable fixed background, reduce heavy shadows).
- QA pass on iOS Safari + Android Chrome (keyboard, safe areas, touch hit areas).

---

## Acceptance criteria (QA checklist)

**Gameplay**
- No essential gameplay UI is hidden behind the header/tab bar on iPhone SE-class devices.
- Hand cards can be read and selected without mis-taps.
- Target selection is possible without precision tapping.
- Inspector/guess selection is readable and confirmable.

**Ergonomics**
- All primary controls meet 44×44px touch size.
- Drawer inputs stay visible when the keyboard opens.
- Safe areas are respected (no clipped controls on notched devices).

**Performance**
- Scrolling and animations remain smooth on iOS Safari.
- Reduced motion mode disables non-essential animations.

**Polish**
- No garbled icon/text glyphs in core UI.
- Clear, friendly feedback for “Your turn”, “Draw”, “Waiting”, and errors.

---

## Open questions

1. Do we *require* landscape for gameplay, or allow portrait fallback for accessibility?
2. Is the game strictly 2-player long-term? If not, should mobile opponent UI be a carousel by default?
3. Should video be integrated into the HUD in landscape (picture-in-picture), or remain drawer-only?

