import { createPortal } from 'react-dom';

/**
 * Portal — renders children into document.body.
 *
 * Why: Prime Suspect's in-game modals are mounted INSIDE
 * `.hearts-gambit-game`, which applies CSS transforms (translate-x) to its
 * table sections. A `position: fixed` element anchors to the nearest
 * transformed ancestor, not the viewport, so inline modals render off-centre.
 * Portaling them to <body> escapes those transforms so `fixed inset-0`
 * centres on the real viewport.
 */
export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  createPortal(children, document.body);

export default Portal;
