import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react';
import { getTranslation, getCurrentLanguage } from '../utils/gameTranslations';

interface TutorialSlide {
  image: string;
  titleKey: string;
  descriptionKey: string;
}

const slideData: TutorialSlide[] = [
  {
    image: `${import.meta.env.BASE_URL}images/1.webp`,
    titleKey: 'tutorial.slide1Title',
    descriptionKey: 'tutorial.slide1Description'
  },
  {
    image: `${import.meta.env.BASE_URL}images/2.webp`,
    titleKey: 'tutorial.slide2Title',
    descriptionKey: 'tutorial.slide2Description'
  },
  {
    image: `${import.meta.env.BASE_URL}images/3.webp`,
    titleKey: 'tutorial.slide3Title',
    descriptionKey: 'tutorial.slide3Description'
  },
  {
    image: `${import.meta.env.BASE_URL}images/4.webp`,
    titleKey: 'tutorial.slide4Title',
    descriptionKey: 'tutorial.slide4Description'
  },
  {
    image: `${import.meta.env.BASE_URL}images/5.webp`,
    titleKey: 'tutorial.slide5Title',
    descriptionKey: 'tutorial.slide5Description'
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
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as keyof typeof import('../utils/gameTranslations').translations.en, language);

  // Memoize slides with translated content
  const slides = useMemo(() => slideData.map(s => ({
    image: s.image,
    title: t(s.titleKey),
    description: t(s.descriptionKey)
  })), [language]);

  // Auto-play logic for sidebar variant
  useEffect(() => {
    if (variant !== 'sidebar' || !autoPlay) return;

    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slideData.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [variant, autoPlay, autoPlayInterval, currentSlide]);

  // Preload images on mount
  useEffect(() => {
    slideData.forEach(s => {
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

  // Focus the close button when the modal opens (matches Card Legend / Rules).
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (variant === 'modal' && isOpen) closeButtonRef.current?.focus();
  }, [variant, isOpen]);

  const slide = slides[currentSlide];

  // Sidebar variant - always visible
  if (variant === 'sidebar') {
    return (
      <div className="tutorial-sidebar">
        <div className="tutorial-sidebar-header">{t('tutorial.howToPlay')}</div>

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
              aria-label={t('tutorial.goToSlide').replace('{number}', String(index + 1))}
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

  const modalContent = (
    <div
      className="settings-modal-backdrop"
      data-broadcast-mirror-portal="tutorial"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      onPointerDown={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="settings-modal-panel hg-panel hg-candlelight tutorial-panel"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="settings-modal-header">
          <div className="settings-modal-title">
            <div className="settings-modal-eyebrow">{currentSlide + 1} / {slides.length}</div>
            <h2 id="tutorial-title">{t('tutorial.howToPlay')}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-modal-close"
            onClick={handleClose}
            aria-label={t('tutorial.closeTutorial')}
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="settings-modal-content tutorial-content"
          data-mirror-scroll-region="tutorial-content"
        >
          <div className="tutorial-stage">
            <img
              src={slide.image}
              alt=""
              className="tutorial-image"
              aria-hidden="true"
            />
            <h3 className="tutorial-slide-title">{slide.title}</h3>
            <p className="tutorial-description">{slide.description}</p>
          </div>
        </div>

        <div className="settings-modal-footer tutorial-navigation">
          <button
            type="button"
            className="ps-btn ps-btn--ghost ps-btn--sm tutorial-nav-btn"
            onClick={() => setCurrentSlide(prev => prev - 1)}
            disabled={isFirst}
            aria-label={t('tutorial.previousSlide')}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="tutorial-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`tutorial-dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={t('tutorial.goToSlide').replace('{number}', String(index + 1))}
                aria-current={index === currentSlide ? 'true' : 'false'}
              />
            ))}
          </div>

          <button
            type="button"
            className="ps-btn ps-btn--primary ps-btn--sm tutorial-nav-btn"
            onClick={() => {
              if (isLast) {
                handleClose();
              } else {
                setCurrentSlide(prev => prev + 1);
              }
            }}
            aria-label={isLast ? t('tutorial.closeTutorial') : t('tutorial.nextSlide')}
          >
            {isLast ? t('tutorial.done') : <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Button for mobile - triggers modal
export const TutorialButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const language = getCurrentLanguage();
  const t = (key: string) => getTranslation(key as keyof typeof import('../utils/gameTranslations').translations.en, language);

  useEffect(() => {
    slideData.forEach(s => {
      const img = new Image();
      img.src = s.image;
    });
  }, []);

  return (
    <button className="tutorial-trigger-btn" onClick={onClick} aria-label={t('tutorial.howToPlay')}>
      <HelpCircle size={18} />
      <span>{t('tutorial.howToPlay')}</span>
    </button>
  );
};

export default TutorialCarousel;
