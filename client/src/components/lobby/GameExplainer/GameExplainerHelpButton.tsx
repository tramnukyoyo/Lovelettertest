import React from 'react';
import { HelpCircle } from 'lucide-react';
import { openExplainer } from './explainerStore';

interface Props {
  gameId: string;
  size?: number;
  /** aria-label override. Default: 'How to play'. */
  ariaLabel?: string;
}

const GameExplainerHelpButton: React.FC<Props> = ({
  gameId,
  size = 18,
  ariaLabel = 'How to play',
}) => {
  return (
    <button
      type="button"
      className="game-explainer-help-button"
      onClick={() => openExplainer(gameId)}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <HelpCircle size={size} />
    </button>
  );
};

export default GameExplainerHelpButton;
