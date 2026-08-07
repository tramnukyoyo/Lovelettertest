/**
 * PaperDeductionBackdrop — fixed MOONLIT-RAIN NOIR SCENE behind all content.
 *
 * A luminous, building-free detective-noir night, hand-built as layered inline
 * pixel-art SVG (shapeRendering="crispEdges") + pure-CSS animation, in the spirit
 * of Bluffalo's PrairieBackdrop. The big warm moon + breathing halo keeps the
 * scene bright (the old dark night scene read as "dark/empty" — this one is lit).
 *
 * Layers (back → front):
 *   1. .gb-sky        — deep noir night gradient with a warm amber rim at the foot
 *   2. .gb-stars      — faint twinkling pixel stars (CSS dots)
 *   3. .gb-moonglow   — soft breathing halo behind the moon (the key light)
 *   4. .gb-moon       — pixel-art SVG moon (warm gold), with craters
 *   5. .gb-fog-far    — slow drifting pixel fog bank (parallax, far)
 *   6. .gb-fog-near   — faster drifting pixel fog bank (parallax, near)
 *   7. .gb-shafts     — faint diagonal noir light shafts (slow shift)
 *   8. .gb-rain       — gentle falling rain streaks
 *   9. .gb-motes      — floating dust motes / embers in the moonlight
 *  10. .gb-grain      — faint drifting film grain
 *  11. .gb-scanlines  — whisper-subtle CRT scanline overlay (z 50, multiply)
 *
 * Pure CSS — no JS loops, no image files. Decoration only: aria-hidden,
 * pointer-events: none. All motion is `prefers-reduced-motion` guarded in
 * decor.css (the static scene stays visible — never blanks).
 *
 * Styles: src/styles/components/decor.css (.gb-backdrop block)
 */
export default function PaperDeductionBackdrop() {
  return (
    <div className="gb-backdrop" aria-hidden="true">
      {/* deep noir night gradient (warm amber rim at the foot) */}
      <div className="gb-sky" />

      {/* faint twinkling pixel stars */}
      <div className="gb-stars" />

      {/* soft breathing halo behind the moon — the key light */}
      <div className="gb-moonglow" />

      {/* pixel-art moon */}
      <div className="gb-moon">
        <svg viewBox="0 0 28 28" shapeRendering="crispEdges" width="100%" height="100%">
          {/* disc — warm gold, built from 2px row bands */}
          <g fill="var(--moon-core, #e7cc7a)">
            <rect x="10" y="0"  width="8"  height="2" />
            <rect x="6"  y="2"  width="16" height="2" />
            <rect x="4"  y="4"  width="20" height="2" />
            <rect x="2"  y="6"  width="24" height="4" />
            <rect x="0"  y="10" width="28" height="8" />
            <rect x="2"  y="18" width="24" height="4" />
            <rect x="4"  y="22" width="20" height="2" />
            <rect x="6"  y="24" width="16" height="2" />
            <rect x="10" y="26" width="8"  height="2" />
          </g>
          {/* rim accent (top-left highlight) */}
          <g fill="var(--moon-rim, #f6ecc4)">
            <rect x="6"  y="4" width="6" height="2" />
            <rect x="4"  y="6" width="6" height="2" />
          </g>
          {/* craters */}
          <g fill="var(--moon-crater, #c9a94e)">
            <rect x="16" y="10" width="4" height="4" />
            <rect x="9"  y="16" width="4" height="2" />
            <rect x="19" y="18" width="2" height="2" />
          </g>
        </svg>
      </div>

      {/* far fog bank — slow drift.
          The banks are flat rects, so their BOTTOM edge used to cut a hard
          horizontal seam across the whole stage (~y350 at 1920) where the
          skyline stopped and flat night began. A vertical mask dissolves each
          bank into the sky instead, so the scenery reads as one space. */}
      <div className="gb-fog-far">
        <svg viewBox="0 0 96 18" shapeRendering="crispEdges" width="100%" height="100%" fill="var(--fog-far, #6f7a8c)">
          <defs>
            <linearGradient id="gbFogFarFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="0.35" stopColor="#fff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="gbFogFarMask">
              <rect x="0" y="0" width="96" height="18" fill="url(#gbFogFarFade)" />
            </mask>
          </defs>
          <g mask="url(#gbFogFarMask)">
            <rect x="0"  y="12" width="96" height="6" />
            <rect x="10" y="8"  width="30" height="4" />
            <rect x="22" y="5"  width="12" height="3" />
            <rect x="54" y="8"  width="26" height="4" />
            <rect x="62" y="5"  width="10" height="3" />
          </g>
        </svg>
      </div>

      {/* near fog bank — faster drift, denser (same bottom-edge dissolve) */}
      <div className="gb-fog-near">
        <svg viewBox="0 0 96 20" shapeRendering="crispEdges" width="100%" height="100%" fill="var(--fog-near, #4a5260)">
          <defs>
            <linearGradient id="gbFogNearFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
              <stop offset="0.3" stopColor="#fff" stopOpacity="0.62" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="gbFogNearMask">
              <rect x="0" y="0" width="96" height="20" fill="url(#gbFogNearFade)" />
            </mask>
          </defs>
          <g mask="url(#gbFogNearMask)">
            <rect x="0"  y="13" width="96" height="7" />
            <rect x="8"  y="9"  width="34" height="4" />
            <rect x="18" y="6"  width="14" height="3" />
            <rect x="50" y="9"  width="32" height="4" />
            <rect x="60" y="6"  width="12" height="3" />
          </g>
        </svg>
      </div>

      {/* faint diagonal noir light shafts */}
      <div className="gb-shafts" />

      {/* gentle falling rain */}
      <div className="gb-rain" />

      {/* floating dust motes / embers in the moonlight */}
      <div className="gb-motes" />

      {/* faint drifting film grain */}
      <div className="gb-grain" />

      {/* ---- noir street foreground (bottom) ---------------------------------- */}
      {/* dark pavement band */}
      <div className="gb-street" />

      {/* warm pool cast by the street lamp */}
      <div className="gb-lamp-pool" />

      {/* street lamp (bottom-left) */}
      <div className="gb-streetlamp">
        <svg viewBox="0 0 24 80" shapeRendering="crispEdges" width="100%" height="100%">
          <g fill="var(--noir-figure, #15110f)">
            <rect x="6"  y="76" width="12" height="4" />
            <rect x="10" y="16" width="4"  height="62" />
            <rect x="4"  y="6"  width="16" height="12" />
            <rect x="7"  y="2"  width="10" height="4" />
          </g>
          <g className="gb-bulb" fill="var(--royal-gold-light, #e7cc7a)">
            <rect x="7" y="9" width="10" height="6" />
          </g>
        </svg>
      </div>

      {/* pixel DETECTIVE — fedora + trench coat + magnifying glass + pipe ember
          (stands by the phone booth, bottom-right) */}
      <div className="gb-detective">
        <svg viewBox="0 0 48 84" shapeRendering="crispEdges" width="100%" height="100%">
          <g fill="var(--noir-figure-strong, #16121a)">
            {/* fedora */}
            <rect x="7"  y="13" width="34" height="3" />
            <rect x="15" y="5"  width="18" height="8" />
            {/* head */}
            <rect x="17" y="16" width="14" height="6" />
            {/* raised collar peaks */}
            <rect x="12" y="22" width="7"  height="7" />
            <rect x="29" y="22" width="7"  height="7" />
            {/* torso + long trench coat */}
            <rect x="11" y="22" width="26" height="14" />
            <rect x="13" y="36" width="22" height="26" />
            <rect x="15" y="62" width="18" height="22" />
            {/* arm reaching out to the magnifier */}
            <rect x="33" y="30" width="9"  height="3" />
          </g>
          {/* leg gap */}
          <rect x="23" y="74" width="3" height="10" fill="#0d0a12" />
          {/* hatband + coat buttons (gold accents so the shape reads) */}
          <g fill="var(--royal-gold, #d2b25a)">
            <rect x="15" y="11" width="18" height="2" />
            <rect x="23" y="40" width="2"  height="2" />
            <rect x="23" y="48" width="2"  height="2" />
          </g>
          {/* magnifying glass — the detective tell */}
          <g className="gb-lens">
            <rect x="38" y="22" width="9" height="2" fill="var(--royal-gold-light, #e7cc7a)" />
            <rect x="38" y="30" width="9" height="2" fill="var(--royal-gold-light, #e7cc7a)" />
            <rect x="38" y="24" width="2" height="6" fill="var(--royal-gold-light, #e7cc7a)" />
            <rect x="45" y="24" width="2" height="6" fill="var(--royal-gold-light, #e7cc7a)" />
            <rect x="40" y="24" width="3" height="3" fill="rgba(255,255,255,0.85)" />
          </g>
          <rect x="40" y="32" width="2" height="6" fill="var(--royal-gold, #d2b25a)" />
          {/* pipe ember at the mouth */}
          <rect className="gb-ember" x="14" y="19" width="2" height="2" fill="#ff7a3c" />
        </svg>
      </div>

      {/* red phone booth (bottom-right) */}
      <div className="gb-phonebooth">
        <svg viewBox="0 0 44 84" shapeRendering="crispEdges" width="100%" height="100%">
          {/* body */}
          <rect x="2" y="8" width="40" height="76" fill="var(--booth-red, #5a121f)" />
          {/* roof */}
          <g fill="var(--royal-crimson-dark, #3d0c13)">
            <rect x="0" y="2" width="44" height="7" />
            <rect x="6" y="0" width="32" height="3" />
          </g>
          {/* lit interior (behind the panes) */}
          <rect className="gb-booth-glow" x="6" y="14" width="32" height="44" fill="var(--royal-gold-light, #e7cc7a)" />
          {/* window mullions split the glow into panes */}
          <g fill="var(--booth-red, #5a121f)">
            <rect x="2"  y="14" width="4"  height="44" />
            <rect x="38" y="14" width="4"  height="44" />
            <rect x="20" y="14" width="3"  height="44" />
            <rect x="6"  y="26" width="32" height="3" />
            <rect x="6"  y="40" width="32" height="3" />
            <rect x="6"  y="54" width="32" height="4" />
          </g>
        </svg>
      </div>

      {/* pixel MURDERER — hood + hunched coat + raised knife + red eye glints
          (stands in the lamp light, bottom-left) */}
      <div className="gb-murderer">
        <svg viewBox="0 0 48 84" shapeRendering="crispEdges" width="100%" height="100%">
          <g fill="var(--murk, #0a0810)">
            {/* hood pulled low over the face */}
            <rect x="14" y="4"  width="18" height="10" />
            <rect x="11" y="12" width="24" height="4" />
            {/* hunched shoulders */}
            <rect x="8"  y="18" width="32" height="11" />
            {/* long coat */}
            <rect x="10" y="29" width="28" height="33" />
            <rect x="12" y="62" width="24" height="22" />
            {/* raised arm gripping the knife */}
            <rect x="33" y="16" width="4"  height="12" />
          </g>
          {/* sinister red eye glints */}
          <g fill="#c8324a">
            <rect x="18" y="11" width="2" height="2" />
            <rect x="26" y="11" width="2" height="2" />
          </g>
          {/* knife — the murderer tell */}
          <rect x="32" y="13" width="6" height="3" fill="#2a2018" />
          <g className="gb-knife">
            <rect x="34" y="1" width="3" height="12" fill="#cfd6e0" />
            <rect x="34" y="1" width="1" height="12" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* whisper-subtle CRT scanline overlay */}
      <div className="gb-scanlines" />
    </div>
  );
}
