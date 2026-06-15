import React, { useEffect } from 'react';
import GameExplainerModal from './GameExplainerModal';
import GameExplainerSidebar from './GameExplainerSidebar';
import { useFirstTimeTracker } from './useFirstTimeTracker';
import { useExplainerOpen, openExplainer } from './explainerStore';
import type { DemoSpec } from './types';

interface Props {
  gameId: string;
  demoSpec: DemoSpec;
  /** Pass the project's t() translation helper. */
  t: (key: string) => string;
}

const GameExplainer: React.FC<Props> = ({ gameId, demoSpec, t }) => {
  const { seen, markSeen } = useFirstTimeTracker(gameId);
  const isOpen = useExplainerOpen(gameId);

  // First-time auto-open. Effect runs once: if not seen, flip the store open.
  // Subsequent re-mounts (e.g. dev hot-reload) won't re-trigger because seen
  // becomes true after markSeen.
  useEffect(() => {
    if (!seen) openExplainer(gameId);
    // intentional: only fire on first mount of this gameId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isOpen ? (
    <GameExplainerModal
      gameId={gameId}
      demoSpec={demoSpec}
      t={t}
      onClose={markSeen}
    />
  ) : (
    <GameExplainerSidebar gameId={gameId} demoSpec={demoSpec} t={t} />
  );
};

export default GameExplainer;
