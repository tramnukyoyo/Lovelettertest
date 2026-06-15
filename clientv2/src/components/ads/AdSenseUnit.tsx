import React, { useEffect, useRef } from 'react';
import { ADSENSE_ENABLED, ADSENSE_PUBLISHER_ID } from '../../config/adsense';

declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

interface AdSenseUnitProps {
  slot: string;
  format?: 'auto' | 'rectangle';
  style?: React.CSSProperties;
}

const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
  slot,
  format = 'rectangle',
  style,
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !ADSENSE_ENABLED) return;

    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
        initialized.current = true;
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  if (!ADSENSE_ENABLED) return null;

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client={ADSENSE_PUBLISHER_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
};

export default AdSenseUnit;
