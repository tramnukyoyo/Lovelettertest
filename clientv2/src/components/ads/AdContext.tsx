import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { loadAdSense } from '../../services/adsenseLoader';
import { ADSENSE_ENABLED } from '../../config/adsense';

interface AdContextType {
  shouldShowAds: boolean;
  isAdBlocked: boolean;
  canShowAd: boolean;
  onAdImpression: () => void;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

// Frequency controls
const AD_COOLDOWN_MS = 60 * 1000; // 1 minute between ads in games
const MAX_ADS_PER_GAME = 3;

interface AdProviderProps {
  children: ReactNode;
  isPremium?: boolean; // Pass from player data
}

export const AdProvider: React.FC<AdProviderProps> = ({ children, isPremium = false }) => {
  const [isAdBlocked, setIsAdBlocked] = useState(false);
  const [adCount, setAdCount] = useState(0);
  const [lastAdTime, setLastAdTime] = useState<number | null>(null);

  // Ads are off entirely until AdSense approves the site, THEN gated on premium.
  // The ADSENSE_ENABLED half is load-bearing: without it every non-premium player
  // renders GameAdRectangle's dev placeholder ("Support GameBuddies — Ads help keep
  // games free!") on real game-over screens and TV lobbies, because that component
  // only consults the flag to pick placeholder-vs-AdSenseUnit, never to decide
  // whether to render at all. The platform's own AdContext has always gated on it.
  const shouldShowAds = ADSENSE_ENABLED && !isPremium;

  // Inject the AdSense loader only when this client may actually show ads
  // (also a no-op on its own side while the flag is false).
  useEffect(() => {
    if (shouldShowAds) {
      loadAdSense();
    }
  }, [shouldShowAds]);

  // Ad-block detection
  useEffect(() => {
    if (!shouldShowAds || typeof window === 'undefined') return;

    const bait = document.createElement('div');
    bait.className = 'adsbox ad-banner';
    bait.style.width = '1px';
    bait.style.height = '1px';
    bait.style.position = 'absolute';
    bait.style.opacity = '0';
    document.body.appendChild(bait);

    const timer = setTimeout(() => {
      const blocked = bait.offsetHeight === 0 || window.getComputedStyle(bait).display === 'none';
      setIsAdBlocked(blocked);
      bait.remove();
    }, 100);

    return () => {
      clearTimeout(timer);
      bait.remove();
    };
  }, [shouldShowAds]);

  // Check if we can show an ad (cooldown + max count)
  const canShowAd = shouldShowAds &&
    !isAdBlocked &&
    adCount < MAX_ADS_PER_GAME &&
    (!lastAdTime || Date.now() - lastAdTime > AD_COOLDOWN_MS);

  const onAdImpression = useCallback(() => {
    setAdCount(prev => prev + 1);
    setLastAdTime(Date.now());
  }, []);

  const value: AdContextType = {
    shouldShowAds,
    isAdBlocked,
    canShowAd,
    onAdImpression,
  };

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
};

export const useAds = (): AdContextType => {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
};

export default AdContext;
