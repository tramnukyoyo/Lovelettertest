import React, { useEffect, useState } from 'react';

export const HeartBreak: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hide after animation completes (1.5 seconds)
    const timer = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="heartbreak-container">
      <div className="heartbreak-animation">
        {/* Left half of heart */}
        <div className="heart-half heart-left">💔</div>

        {/* Right half of heart */}
        <div className="heart-half heart-right">💔</div>
      </div>
    </div>
  );
};
