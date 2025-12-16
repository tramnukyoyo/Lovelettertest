import React from 'react';

interface WaveBackgroundProps {
  isAnimating?: boolean;
}

const WaveBackground: React.FC<WaveBackgroundProps> = React.memo(({ isAnimating = false }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, #2A1F1F 0%, #3D2F2F 100%)',
        // Performance optimization: contain layout, style, and paint
        contain: isAnimating ? 'layout style paint' : 'strict',
        willChange: isAnimating ? 'auto' : 'unset',
      }}
    >
      {/* Main gradient background */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        style={{
          filter: isAnimating ? 'blur(40px)' : 'none',
          opacity: 0.3,
        }}
      >
        {/* Animated mesh gradients */}
        <defs>
          <radialGradient id="grad1" cx="20%" cy="30%">
            <stop offset="0%" stopColor="#FF8B4D" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3D2F2F" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad2" cx="80%" cy="70%">
            <stop offset="0%" stopColor="#FFD93D" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1A1F3A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad3" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FF6B9D" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3D2F2F" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background gradient circles */}
        <circle
          cx="200"
          cy="300"
          r="400"
          fill="url(#grad1)"
          style={{
            animation: isAnimating ? 'float1 20s ease-in-out infinite' : 'none',
          }}
        />
        <circle
          cx="1000"
          cy="500"
          r="350"
          fill="url(#grad2)"
          style={{
            animation: isAnimating ? 'float2 25s ease-in-out infinite' : 'none',
          }}
        />
        <circle
          cx="600"
          cy="200"
          r="300"
          fill="url(#grad3)"
          style={{
            animation: isAnimating ? 'float3 30s ease-in-out infinite' : 'none',
          }}
        />
      </svg>

      {/* Wave patterns (player 1 and 2) */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        style={{
          height: '150px',
        }}
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF8B4D" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FF8B4D" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFD93D" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFD93D" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Wave 1 (Player 1) */}
        <path
          d="M 0,60 Q 150,30 300,60 T 600,60 T 900,60 T 1200,60 L 1200,120 L 0,120 Z"
          fill="url(#waveGrad1)"
          style={{
            animation: isAnimating ? 'wave1 8s ease-in-out infinite' : 'none',
            transformOrigin: 'center',
          }}
        />

        {/* Wave 2 (Player 2) */}
        <path
          d="M 0,70 Q 150,40 300,70 T 600,70 T 900,70 T 1200,70 L 1200,120 L 0,120 Z"
          fill="url(#waveGrad2)"
          style={{
            animation: isAnimating ? 'wave2 8s ease-in-out infinite' : 'none',
            animationDelay: isAnimating ? '0.5s' : '0s',
            transformOrigin: 'center',
          }}
        />
      </svg>

      {/* CSS Animations */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(0.95); }
          66% { transform: translate(25px, -15px) scale(1.05); }
        }

        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-15px, 30px) scale(1.08); }
          66% { transform: translate(30px, -25px) scale(0.92); }
        }

        @keyframes wave1 {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-8px) scaleY(1.15); }
        }

        @keyframes wave2 {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-6px) scaleY(1.12); }
        }
      `}</style>
    </div>
  );
});

WaveBackground.displayName = 'WaveBackground';

export default WaveBackground;
