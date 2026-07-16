import React from 'react';
import { Crown, ExternalLink } from 'lucide-react';
import { t } from '../../utils/translations';
import { openPremium, isNativeWrapper } from '../../services/premiumUpsell';
import '../../styles/components/premium-upsell.css';

/**
 * Compact premium CTA (premium growth P1-A, 2026-07-16) — copied from the
 * canonical fleet source (Lightwall client). Rendered next to locked premium
 * options; opens the platform premium page in a new tab (see
 * services/premiumUpsell.ts). In store-wrapper apps the copy switches to the
 * GP-trial offer (earned currency, policy-safe).
 *
 * `surface` names the picker for analytics (e.g. 'card_style', 'game_skin',
 * 'reactions').
 */
interface PremiumUpsellChipProps {
  surface: string;
  className?: string;
}

const PremiumUpsellChip: React.FC<PremiumUpsellChipProps> = ({ surface, className }) => (
  <button
    type="button"
    className={`premium-upsell-chip${className ? ` ${className}` : ''}`}
    onClick={(e) => {
      e.stopPropagation();
      openPremium(surface);
    }}
  >
    <Crown size={12} aria-hidden="true" />
    {isNativeWrapper() ? t('premiumUpsell.tryTrial') : t('premiumUpsell.getPremium')}
    <ExternalLink size={11} aria-hidden="true" />
  </button>
);

export default PremiumUpsellChip;
