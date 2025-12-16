import React, { useMemo } from 'react';

interface TimerDisplayProps {
  timeRemaining: number;
  totalTime: number;
}

// Helper to get CSS variable values
const getCSSVariables = () => {
  const root = getComputedStyle(document.documentElement);
  return {
    primary: root.getPropertyValue('--primary').trim() || '#7B3FF2',
    secondary: root.getPropertyValue('--secondary').trim() || '#00F0FF',
    textPrimary: root.getPropertyValue('--text-primary').trim() || '#f8fafc',
    textSecondary: root.getPropertyValue('--text-secondary').trim() || '#cbd5e1',
    danger: root.getPropertyValue('--danger').trim() || '#FF6B9D',
  };
};

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ timeRemaining, totalTime }) => {
  // Calculate percentage for circular progress
  const percentage = (timeRemaining / totalTime) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isWarning = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  // Get CSS variables
  const colors = useMemo(() => getCSSVariables(), []);

  return (
    <div className={`timer-display ${isWarning ? 'timer-warning' : ''} ${isCritical ? 'timer-critical' : ''} w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36`}>
      <svg className="timer-svg w-full h-full" viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          className="timer-circle-bg"
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={colors.primary}
          strokeWidth="8"
          opacity="0.2"
        />

        {/* Progress circle */}
        <circle
          className="timer-circle-progress"
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={isCritical ? colors.danger : isWarning ? '#f59e0b' : colors.secondary}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />

        {/* Timer text */}
        <text
          className="timer-text"
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="28"
          fontWeight="bold"
          fill={isCritical ? colors.danger : isWarning ? '#f59e0b' : colors.textPrimary}
          style={{ fontFamily: 'var(--font-heading, Space Grotesk), sans-serif' }}
        >
          {timeRemaining}
        </text>

        <text
          className="timer-label"
          x="60"
          y="78"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="12"
          fill={colors.textSecondary}
          style={{ fontFamily: 'var(--font-body, Space Grotesk), sans-serif' }}
        >
          seconds
        </text>
      </svg>
    </div>
  );
};
