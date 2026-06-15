import type { FC } from 'react';

export interface DemoBeat {
  /** Timestamp (ms) within the loop at which this caption becomes active. */
  atMs: number;
  /** Translation key for the caption. Resolved via t(captionKey) at render time. */
  captionKey: string;
}

export interface DemoProps {
  /** Normalized clock position in [0, 1). Loops every demoSpec.durationMs. */
  t: number;
}

export interface DemoSpec {
  /** Pure SVG component. Must accept {t} and render synchronously. */
  Component: FC<DemoProps>;
  /** Total loop duration in ms. */
  durationMs: number;
  /** SVG width/height ratio (e.g. 4/3 = 1.333...). */
  aspectRatio: number;
  /**
   * Caption beats. MUST be sorted ascending by atMs.
   * The first beat MUST start at atMs=0 (acts as the default caption).
   */
  beats: DemoBeat[];
}
