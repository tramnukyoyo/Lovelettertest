# Prime Suspect (HeartsGambit) - Mobile Friendliness Audit

**Audit Date:** 2025-12-19
**Auditor:** Claude Code
**Game:** Prime Suspect (internal name: HeartsGambit)
**Platform:** GameBuddies.io

---

## Executive Summary

Prime Suspect has a **solid mobile infrastructure** but the **game board itself is desktop-centric**. The platform-level patterns (bottom tab bar, mobile drawers, safe area handling) are well-implemented, but the actual gameplay UI (`HeartsGambitGame.tsx`) has significant mobile usability issues.

### Overall Scores

| Category | Score | Notes |
|----------|-------|-------|
| **Mobile Infrastructure** | 8/10 | Excellent foundation with modern patterns |
| **Game Board Mobile UX** | 4/10 | Desktop-only layout with fixed dimensions |
| **iPhone SE Experience** | 3/10 | Broken - cards unreadable, overflow issues |
| **iPad Experience** | 7/10 | Usable in landscape mode |
| **Overall Mobile Score** | **6/10** | Good bones, needs game-specific work |

---

## Part 1: What's Working Well

### 1.1 Modern Viewport Handling

| Feature | Implementation | File Location |
|---------|---------------|---------------|
| Dynamic viewport height | `100dvh` for iOS Safari address bar | `unified.css:4926` |
| Safe area insets | `env(safe-area-inset-*)` CSS variables | `unified.css:106-109` |
| Viewport meta | `width=device-width, initial-scale=1.0` | `index.html:7` |

**Analysis:** The game correctly handles the iOS Safari dynamic viewport issue where the address bar appears/disappears. Using `100dvh` instead of `100vh` ensures the game fills the available space without content being hidden.

### 1.2 Mobile Navigation System

**Bottom Tab Bar** (`BottomTabBar.tsx`)
- 5 tabs: Game, Players, Chat, Video, Settings
- Touch-friendly button sizes
- Active state indication
- Performance-optimized with React.memo

**Mobile Drawer System** (`MobileDrawer.tsx`)
- Slide-up panels for secondary content
- Backdrop click handling
- Safe area padding for notched devices
- Three positions: bottom, left, right

### 1.3 Responsive Card Sizing

**File:** `unified.css:2409-2442`

```css
/* Tablet landscape */
--hg-card-height: clamp(70px, 22vh, 240px);
--hg-card-width: clamp(47px, 14.7vh, 160px);

/* Mobile portrait */
--hg-card-height: clamp(45px, 10vh, 120px);
--hg-card-width: clamp(30px, 6.7vh, 80px);
```

**Analysis:** The use of `clamp()` for responsive sizing is correct, but the minimum values (30-45px) are too small for legibility.

### 1.4 Comprehensive Breakpoint System

The game uses 6 responsive tiers:

| Breakpoint | Size | Target Devices |
|------------|------|----------------|
| Mobile Portrait | 320-480px | Small phones |
| Mobile Landscape | 480-768px | Phones rotated |
| Tablet Portrait | 768-1024px | iPads vertical |
| Small Desktop | 1024-1366px | Laptops |
| Desktop | 1366-1920px | Standard monitors |
| Large Desktop | 1920px+ | 4K displays |

---

## Part 2: Critical Issues Found

### 2.1 CRITICAL: Game Board Layout is Desktop-Only

**File:** `HeartsGambitGame.tsx:288-686`

The game uses a fixed 3-section vertical flex layout:

```
┌─────────────────────────────────────┐
│     OPPONENTS AREA (flex-[3])       │
│   Horizontal layout with gap-8      │
├─────────────────────────────────────┤
│                                     │
│     DECK AREA (flex-[4])            │
│   translate-x-[132px] translate-y-10│  <- PROBLEM!
│                                     │
├─────────────────────────────────────┤
│     PLAYER HAND (flex-[3])          │
└─────────────────────────────────────┘
```

**Problems Identified:**

1. **Fixed pixel translations** on deck area (line 408):
   ```jsx
   className="... translate-x-[132px] translate-y-10"
   ```
   This 132px horizontal offset causes horizontal overflow on screens narrower than ~400px.

2. **No mobile layout adaptation** - The same layout is used regardless of screen size.

3. **Opponents displayed with fixed gaps** (`gap-8` = 32px) - With 3+ opponents, this overflows on small screens.

4. **Player info panels have fixed width** (`w-48` = 192px) - Inflexible for narrow screens.

### 2.2 HIGH: Context Actions Menu Overflow

**File:** `HeartsGambitGame.tsx:689-827`

The card-playing action panel:
```jsx
className="absolute bottom-5 right-5 w-[560px] max-w-[calc(100%-2.5rem)]"
```

**Problems:**
- Base width of 560px exceeds iPhone SE width (375px)
- Absolute positioning at `right-5` causes partial cutoff
- Inspector card selection grid (`grid grid-cols-4`) becomes extremely cramped
- Touch targets become too small when compressed

**Worst Case (iPhone SE portrait):**
- Available width: ~335px after padding
- 4 cards in grid = ~84px per card
- With gaps, each card is ~70px - barely tappable

### 2.3 HIGH: Card Sizing Too Small on Mobile

**Current minimum sizes at 480px breakpoint:**

| Card Type | Portrait Min | Landscape Min | Recommended Min |
|-----------|--------------|---------------|-----------------|
| Hand cards | 30px wide | 40px wide | 60px wide |
| Opponent cards | 30px wide | 40px wide | 50px wide |
| Deck/Discard | 30px wide | 40px wide | 60px wide |

**Impact:** At 30px width, card art is indistinguishable. Players cannot see:
- Character faces
- Card names
- Card effects

### 2.4 MEDIUM: Case Notes Panel Overlap

**File:** `HeartsGambitGame.tsx:583-597`

```jsx
className="absolute bottom-4 left-4 w-64 max-h-48"
```

The 256px fixed-width panel overlaps with:
- The deck area on narrow screens
- The player's hand cards
- The action menu when open

### 2.5 MEDIUM: No Landscape Orientation Prompt

Unlike other GameBuddies games (SchoolQuizGame, ClueScale), Prime Suspect has **no orientation prompt** encouraging users to rotate their phone to landscape.

Given the horizontal "detective desk" aesthetic, landscape mode is essential for proper gameplay.

**Existing pattern in platform:**
```css
/* unified.css:5096 */
@media (max-width: 48rem) and (orientation: portrait) {
  .orientation-prompt { display: flex; }
}
```

This pattern exists but is not implemented for HeartsGambit.

### 2.6 MEDIUM: Modals Not Mobile-Optimized

**Affected components:**
- Card Legend Modal (`CardLegendModal.tsx`)
- Evidence Locker modal (inline in `HeartsGambitGame.tsx:862-1247`)
- Inspector zoom dialog

**Issues:**
- Use `max-w-4xl` (896px) and `max-w-lg` (512px) - these work but aren't optimal
- No touch-friendly swipe gestures for navigation
- Close buttons are small and positioned far from thumb
- Scrollable content can conflict with body scroll on iOS

---

## Part 3: Device-Specific Analysis

### 3.1 iPhone SE (375x667 / 667x375)

| Orientation | Experience | Issues |
|-------------|------------|--------|
| **Portrait** | BROKEN | Deck translations cause horizontal overflow; cards at 30px are unreadable; action menu overflows; game unplayable |
| **Landscape** | POOR | Better width (667px) but only ~300px height for game board; vertical space crushed; cards overlap |

### 3.2 iPhone 14 Pro (393x852 / 852x393)

| Orientation | Experience | Issues |
|-------------|------------|--------|
| **Portrait** | POOR | Similar issues to iPhone SE; slight improvement from extra width |
| **Landscape** | FAIR | Usable but cramped; opponents area tight with 4 players |

### 3.3 iPad Mini (768x1024 / 1024x768)

| Orientation | Experience | Issues |
|-------------|------------|--------|
| **Portrait** | FAIR | Cards readable; layout functional; action menu works |
| **Landscape** | GOOD | Near-desktop experience; recommended orientation |

### 3.4 iPad Pro 12.9" (1024x1366)

| Orientation | Experience | Issues |
|-------------|------------|--------|
| **Both** | EXCELLENT | Full desktop experience on tablet |

---

## Part 4: Recommended Mobile Design

### 4.1 Strategy: Separate Mobile Layout Component

To preserve the desktop experience completely, create a separate mobile component:

```tsx
// HeartsGambitGame.tsx
const HeartsGambitGame: React.FC<Props> = (props) => {
  const isMobile = useIsMobile(768);

  if (isMobile) {
    return <HeartsGambitGameMobile {...props} />;
  }

  // Desktop code unchanged
  return (/* current implementation */);
};
```

### 4.2 Mobile Layout Design

```
┌─────────────────────────────────┐
│  Opponents (horizontal scroll)  │  <- 100px height, swipeable
├─────────────────────────────────┤
│                                 │
│    Deck  ←──→  Discard          │  <- Centered, no translations
│                                 │
├─────────────────────────────────┤
│                                 │
│   Your Hand (max 2 cards)       │  <- 140px+ height, touch-friendly
│                                 │
├─────────────────────────────────┤
│   [Action Sheet when active]    │  <- Full-width bottom sheet
├─────────────────────────────────┤
│   Bottom Tab Bar (existing)     │  <- Already implemented
└─────────────────────────────────┘
```

### 4.3 Orientation Prompt

Add landscape orientation prompt for portrait phones:

```tsx
const OrientationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth <= 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowPrompt(isMobile && isPortrait);
    };
    // Event listeners for resize and orientationchange
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="hg-orientation-prompt">
      <RotateIcon />
      <h2>Rotate Your Device</h2>
      <p>Prime Suspect plays best in landscape mode</p>
    </div>
  );
};
```

### 4.4 Increased Card Sizes

Update minimum card sizes:

```css
/* Before */
--hg-card-width: clamp(30px, 6.7vh, 80px);

/* After */
--hg-card-width: clamp(60px, 15vw, 120px);
```

Minimum 60px ensures:
- Card art is visible
- Touch targets meet 44px minimum accessibility guideline
- Text is legible at arm's length

### 4.5 Mobile Action Sheet

Replace the floating action menu with a full-width bottom sheet:

```css
.hg-mobile-action-sheet {
  position: fixed;
  bottom: var(--bottom-tab-bar-height);
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.95);
  border-top: 2px solid var(--royal-gold);
  border-radius: 1rem 1rem 0 0;
  padding: 1rem;
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## Part 5: Implementation Roadmap

### Phase 1: Orientation Prompt (30 min)
- Create `OrientationPrompt.tsx` component
- Add noir theme styling
- Import in `App.tsx`

### Phase 2: Mobile Game Layout (2 hours)
- Create `HeartsGambitGameMobile.tsx`
- Implement horizontal scrolling opponents
- Remove fixed translations
- Add `useIsMobile` hook conditional

### Phase 3: Card Sizes (30 min)
- Update `unified.css` clamp values
- Test readability on iPhone SE

### Phase 4: Mobile Action Sheet (1.5 hours)
- Create `MobileActionSheet.tsx`
- Implement slide-up animation
- Position above bottom tab bar

### Phase 5: Mobile Opponents Area (1 hour)
- Create `MobileOpponentCard.tsx`
- Implement scroll snap
- Add touch selection

### Phase 6: Mobile Modals (1 hour)
- Make Evidence Locker full-screen
- Make Card Legend full-screen
- Add swipe navigation

### Phase 7: Testing (1 hour)
- iPhone SE in landscape
- iPhone 14 in landscape
- Desktop unchanged verification

**Total Estimated Effort: ~7.5 hours**

---

## Part 6: Comparison with External AI Analysis

The other AI's recommendations were reviewed:

| Suggestion | Assessment | Implementation |
|------------|------------|----------------|
| Force landscape mode | **AGREE** | Adding orientation prompt |
| Layer-based "modal" UI | **AGREE** | Tab/drawer already exists |
| Hide chrome (logo, footer) | **ALREADY DONE** | In-game view is clean |
| Pan & zoom on board | **REJECTED** | Layout fix is simpler |
| Right-edge action bar | **ADAPTED** | Bottom sheet matches platform |
| "My Evidence" drawer | **ALREADY EXISTS** | BottomTabBar + MobileDrawer |

---

## Appendix: File References

| File | Lines | Component/Feature |
|------|-------|-------------------|
| `unified.css` | 106-109 | Safe area inset variables |
| `unified.css` | 2409-2442 | Card size clamp values |
| `unified.css` | 4926 | Dynamic viewport height |
| `unified.css` | 5096 | Orientation media queries |
| `HeartsGambitGame.tsx` | 288-686 | Main game layout |
| `HeartsGambitGame.tsx` | 408 | Fixed deck translation |
| `HeartsGambitGame.tsx` | 583-597 | Case Notes panel |
| `HeartsGambitGame.tsx` | 689-827 | Context action menu |
| `HeartsGambitGame.tsx` | 862-1247 | Evidence Locker modal |
| `BottomTabBar.tsx` | 1-102 | Mobile navigation |
| `MobileDrawer.tsx` | 1-120 | Drawer component |
| `App.tsx` | 215-341 | Root layout |
| `index.html` | 7 | Viewport meta tag |

---

**End of Audit**
