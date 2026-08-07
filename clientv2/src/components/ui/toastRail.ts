/**
 * #ps-toast-rail — the ONE host every Prime Suspect system toast portals into.
 *
 * Before this existed, five toast families were each hard-pinned to the same
 * viewport coordinates (`top:20px; left:50%` / `top:20px; right:20px`) with no
 * awareness of one another, so any two firing together stacked on top of each
 * other and the reading order was decided by DOM insertion luck.
 *
 * The rail is a single fixed column that sits BELOW the game header (so a toast
 * can never cover the header controls) and holds two lanes stacked vertically —
 * they are laid out in normal flow inside one flex column, which is why two
 * lanes can never collide the way two `position: fixed` blocks could.
 *
 * The components stay separate: only the positioning moved here. The shared
 * SKIN lives in toastRail.css as the `.ps-toast` family.
 *
 * Mounted lazily from the toasts themselves rather than from App.tsx so the
 * rail exists for whichever toast fires first, in any route.
 */
import './toastRail.css';

export type ToastLane = 'top-center' | 'top-right';

const RAIL_ID = 'ps-toast-rail';

/** Declaration order is the on-screen stacking order of the lanes. */
const LANE_CLASS: Record<ToastLane, string> = {
  'top-center': 'ps-toast-rail--top-center',
  'top-right': 'ps-toast-rail--top-right',
};

function createLane(lane: ToastLane): HTMLElement {
  const el = document.createElement('div');
  el.className = `ps-toast-rail__lane ${LANE_CLASS[lane]}`;
  return el;
}

function ensureRail(): HTMLElement {
  const existing = document.getElementById(RAIL_ID);
  if (existing) return existing;

  const rail = document.createElement('div');
  rail.id = RAIL_ID;
  // Both lanes are created up front so their order never depends on which
  // toast happened to fire first.
  (Object.keys(LANE_CLASS) as ToastLane[]).forEach((lane) => {
    rail.appendChild(createLane(lane));
  });
  document.body.appendChild(rail);
  return rail;
}

/** Portal target for a toast. Safe to call on every render — it is idempotent. */
export function getToastLane(lane: ToastLane): HTMLElement {
  const rail = ensureRail();
  const found = rail.querySelector<HTMLElement>(`.${LANE_CLASS[lane]}`);
  if (found) return found;
  const created = createLane(lane);
  rail.appendChild(created);
  return created;
}
