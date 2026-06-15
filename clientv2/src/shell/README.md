# GameShell — universal viewport-fit layout

One layout for every GameBuddies client; each game ships its own theme.
**Distribution: copy-paste** (project convention — no npm packages for
in-house reuse). Bluffalo clientv2 is the canonical reference.

## What a game copies

```
src/shell/**            GameShell, Scene primitives, PresenceDock, overflow guard
src/styles/shell/**     shell.css (grid/hud/rail/dock) + stage.css (fit machinery)
```

Then in `src/styles/index.css` (after components, before pages):

```css
@import './shell/shell.css';
@import './shell/stage.css';
```

## What a game must provide

1. **Theme tokens** — the standard `styles/base/variables.css` contract
   (`--primary`, `--panel-bg`, `--px-border-dark`, fonts, …). The shell has
   zero hardcoded visuals; it renders entirely from tokens.
2. **Four slots**:
   - `hud` — your GameHeader (+ SpectatorBanner etc.)
   - `rail` — chat/players (shared SidebarTabs + ChatWindow + PlayerList work as-is)
   - `dock` — `<PresenceDock players={...}/>` with a per-phase status mapping
   - children — one `<Scene>` per game phase
3. **Scenes** — wrap each phase in the primitives:

```tsx
<GameShell hud={...} rail={...} dock={<PresenceDock players={dockPlayers}/>}
           railUnread={unread} railLabel={t('chat.title')}>
  <Scene>
    <SceneHeader>{/* badges · timer · question */}</SceneHeader>
    <SceneBody><OptionGrid>{/* bounded lists */}</OptionGrid></SceneBody>
    <SceneActions>{/* CTA — always visible */}</SceneActions>
  </Scene>
</GameShell>
```

## Fit rules (read before styling a scene)

- The stage is a **size container**; size in-stage type/spacing with the
  `--gs-text-*` / `--gs-gap` / `--gs-pad-*` tokens (container-unit clamps).
- Bounded lists go in `OptionGrid` — rows split the remaining space, so the
  list fits by construction. Clamp long item text with `.gs-clamp-2`.
- Decorative content that may be sacrificed on short stages: tag it
  `gs-hide-short` (hidden ≤600px stage height). (The old `gs-collapse-short` /
  `gs-show-short` collapse-to-button pair was removed — short lobby panes now
  scroll internally with a ScrollHint instead; the class only survives as a
  styling hook inside GameExplainer.css.)
- Never give a scene `overflow-y: auto` — the ladder's last-resort step
  (≤420px stage) enables internal scroll globally.
- Dev builds warn in the console if a scene overflows the stage.
- **Safe areas** (`viewport-fit=cover`): the hud's GameHeader carries
  `padding-top: env(safe-area-inset-top)` (status bar / notch), the dock
  carries `env(safe-area-inset-bottom)` (home indicator). Scenes never need
  their own insets.
- **Keyboard**: GameShell watches `visualViewport` (`useKeyboardHeight`) and,
  while the on-screen keyboard is open, adds `gs-kb-open` + sets
  `--gs-keyboard-inset` — the shell shrinks by the keyboard height and hides
  the dock so `SceneActions` stays visible. Scenes with text inputs need no
  extra handling.

## Structural tokens (overridable per game)

| Token | Default | Meaning |
|---|---|---|
| `--gs-rail-w` | 320px | rail width (desktop) |
| `--gs-dock-h` | 60px | presence dock height |

Minimum supported viewports: desktop 1024×600, tablet 768×1024, phone 360×640.
