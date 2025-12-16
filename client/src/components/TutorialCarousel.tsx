import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

interface TutorialSlide {
  image: string;
  title: string;
  description: string;
}

const slides: TutorialSlide[] = [
  {
    image: `${import.meta.env.BASE_URL}tutorial/1.webp`,
    title: 'Welcome to Love Letter!',
    description: 'Compete to deliver your love letter to the Princess. Bluff, deduce, and outwit your opponents to win her heart.'
  },
  {
    image: `${import.meta.env.BASE_URL}tutorial/2.webp`,
    title: 'Draw & Play',
    description: 'On your turn, draw one card and play one card. Each card has a unique effect that can help you or sabotage others.'
  },
  {
    image: `${import.meta.env.BASE_URL}tutorial/3.webp`,
    title: 'Card Effects',
    description: 'Use Guards to guess hands, Priests to peek, or the Baron to battle. But be careful—discarding the Princess eliminates you!'
  },
  {
    image: `${import.meta.env.BASE_URL}tutorial/4.webp`,
    title: 'Winning the Round',
    description: 'Be the last player standing or hold the highest card when the deck runs out to win a Token of Affection.'
  },
  {
    image: `${import.meta.env.BASE_URL}tutorial/5.webp`,
    title: 'Winning the Game',
    description: 'Collect enough tokens to win the game! 7 tokens for 2 players, 5 for 3 players, and 4 for 4 players.'
  }
];

interface TutorialCarouselProps {
  variant?: 'modal' | 'sidebar';
  isOpen?: boolean;
  onClose?: () => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const TutorialCarousel: React.FC<TutorialCarouselProps> = ({
  variant = 'modal',
  isOpen = false,
  onClose,
  autoPlay = true,
  autoPlayInterval = 5000
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play logic for sidebar variant
  useEffect(() => {
    if (variant !== 'sidebar' || !autoPlay) return;

    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [variant, autoPlay, autoPlayInterval, currentSlide]);

  // Preload images on mount
  useEffect(() => {
    slides.forEach(s => {
      const img = new Image();
      img.src = s.image;
    });
  }, []);

  const handleClose = useCallback(() => {
    setCurrentSlide(0);
    onClose?.();
  }, [onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (variant !== 'modal' || !isOpen) return;

    switch (e.key) {
      case 'Escape':
        handleClose();
        break;
      case 'ArrowLeft':
        setCurrentSlide(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
        setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
        break;
    }
  }, [variant, isOpen, handleClose]);

  useEffect(() => {
    if (variant === 'modal' && isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [variant, isOpen, handleKeyDown]);

  const slide = slides[currentSlide];

  // Sidebar variant - always visible
  if (variant === 'sidebar') {
    return (
      <div className="tutorial-sidebar">
        <div className="tutorial-sidebar-header">How to Play</div>

        <div className="tutorial-progress">
          <div
            className="tutorial-progress-bar"
            key={currentSlide}
            style={{
              animationDuration: `${autoPlayInterval}ms`,
              animationPlayState: 'running'
            }}
          />
        </div>

        <div className="tutorial-sidebar-content">
          <img
            src={slide.image}
            alt=""
            className="tutorial-sidebar-image"
            aria-hidden="true"
          />
          <h3 className="tutorial-sidebar-title">{slide.title}</h3>
          <p className="tutorial-sidebar-description">{slide.description}</p>
        </div>

        <div className="tutorial-sidebar-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`tutorial-dot-wrapper ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide ? 'true' : 'false'}
            >
              <span className="tutorial-dot" />
              {index === currentSlide && (
                <svg className="tutorial-dot-progress" viewBox="0 0 40 40" key={currentSlide}>
                  <circle
                    className="tutorial-dot-progress-ring"
                    cx="20"
                    cy="20"
                    r="17"
                    style={{ animationDuration: `${autoPlayInterval}ms` }}
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Modal variant - only visible when isOpen is true
  if (!isOpen) return null;

  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="tutorial-overlay" onClick={handleClose}>
      <div
        className="tutorial-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
      >
        <button className="tutorial-close" onClick={handleClose} aria-label="Close tutorial">
          ✕
        </button>

        <div className="tutorial-content">
          <img
            src={slide.image}
            alt=""
            className="tutorial-image"
            aria-hidden="true"
          />
          <h2 id="tutorial-title" className="tutorial-title">
            {slide.title}
          </h2>
          <p className="tutorial-description">
            {slide.description}
          </p>
        </div>

        <div className="tutorial-navigation">
          <button
            className="tutorial-nav-btn"
            onClick={() => setCurrentSlide(prev => prev - 1)}
            disabled={isFirst}
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="tutorial-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`tutorial-dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === currentSlide ? 'true' : 'false'}
              />
            ))}
          </div>

          <button
            className="tutorial-nav-btn"
            onClick={() => {
              if (isLast) {
                handleClose();
              } else {
                setCurrentSlide(prev => prev + 1);
              }
            }}
            aria-label={isLast ? 'Close tutorial' : 'Next slide'}
          >
            {isLast ? 'Done' : <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// Button for mobile - triggers modal
export const TutorialButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  useEffect(() => {
    slides.forEach(s => {
      const img = new Image();
      img.src = s.image;
    });
  }, []);

  return (
    <button className="tutorial-trigger-btn" onClick={onClick} aria-label="How to play">
      <HelpCircle size={18} />
      <span>How to Play</span>
    </button>
  );
};

export default TutorialCarousel;
