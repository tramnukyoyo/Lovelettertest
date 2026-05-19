import React from 'react';
import { useExplainerClock } from './useExplainerClock';
import { openExplainer } from './explainerStore';
import type { DemoSpec } from './types';

interface Props {
  gameId: string;
  demoSpec: DemoSpec;
  t: (key: string) => string;
}

const GameExplainerSidebar: React.FC<Props> = ({ gameId, demoSpec, t }) => {
  const tClock = useExplainerClock(demoSpec.durationMs);
  const Demo = demoSpec.Component;

  const elapsedMs = tClock * demoSpec.durationMs;
  let activeBeat = demoSpec.beats[0];
  for (const b of demoSpec.beats) {
    if (b.atMs <= elapsedMs) activeBeat = b;
    else break;
  }

  const onActivate = () => openExplainer(gameId);

  return (
    <div
      className="game-explainer-sidebar"
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
      title={t('gameExplainer.tapForFullGuide')}
    >
      <div
        className="game-explainer-sidebar-stage"
        style={{ aspectRatio: demoSpec.aspectRatio }}
      >
        <Demo t={tClock} />
      </div>
      <p className="game-explainer-sidebar-caption">
        {t(activeBeat.captionKey)}
      </p>
    </div>
  );
};

export default GameExplainerSidebar;
