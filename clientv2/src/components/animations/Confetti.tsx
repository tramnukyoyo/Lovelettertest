import React, { useEffect, useState, useMemo } from 'react';
import './Confetti.css';

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
}

export const Confetti: React.FC = () => {
  const [visible, setVisible] = useState(true);

  // Generate particles once on mount using useMemo (no setInterval needed!)
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage across viewport
      color: ['#d2b25a', '#e7cc7a', '#8a2233', '#f6f0e6', '#a77e22'][Math.floor(Math.random() * 5)],
      size: Math.random() * 10 + 5,
      duration: 2 + Math.random() * 1.5, // 2-3.5s fall duration (varies per particle)
      delay: Math.random() * 0.5, // 0-0.5s stagger for natural effect
    }))
  , []);

  useEffect(() => {
    // Hide component after 3.5 seconds (max duration + max delay)
    const timeoutId = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timeoutId);
  }, []);

  if (!visible) return null;

  return (
    <div className="confetti-container">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
