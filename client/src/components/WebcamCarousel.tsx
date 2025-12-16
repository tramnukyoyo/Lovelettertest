import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VideoFeed {
  playerId: string;
  stream: MediaStream | null;
  playerName: string;
  isActive: boolean;
  isMyVideo: boolean;
  hasCamera: boolean;
}

interface WebcamCarouselProps {
  feeds: VideoFeed[];
  isPreparationMode?: boolean;
}

export const WebcamCarousel: React.FC<WebcamCarouselProps> = ({ feeds, isPreparationMode = false }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Filter feeds to show: only active OR camera-enabled feeds
  const visibleFeeds = feeds.filter((feed) => {
    // In preparation mode, show all feeds with cameras
    if (isPreparationMode) return feed.hasCamera;
    // During game, show only active feeds
    return feed.isActive;
  });

  // Check scroll position
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Monitor scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollButtons();
    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [visibleFeeds]);

  // Scroll handler
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300; // Scroll distance in pixels
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="webcam-carousel-wrapper">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          className="carousel-nav-btn carousel-nav-left"
          onClick={() => scroll('left')}
          aria-label="Scroll webcams left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Carousel Container */}
      <div className="webcam-carousel-container" ref={scrollContainerRef}>
        {visibleFeeds.map((feed) => (
          <div key={feed.playerId} className="carousel-item">
            <div className="carousel-video-wrapper">
              {feed.stream ? (
                <video
                  autoPlay
                  playsInline
                  muted={feed.isMyVideo}
                  className="carousel-video"
                  ref={(video) => {
                    if (video && feed.stream) {
                      video.srcObject = feed.stream;
                    }
                  }}
                />
              ) : (
                <div className="carousel-video-placeholder">
                  📹
                </div>
              )}
            </div>
            <div className="carousel-label">{feed.playerName}</div>
          </div>
        ))}
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          className="carousel-nav-btn carousel-nav-right"
          onClick={() => scroll('right')}
          aria-label="Scroll webcams right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Empty State */}
      {visibleFeeds.length === 0 && (
        <div className="carousel-empty">
          <p>No camera feeds available</p>
        </div>
      )}
    </div>
  );
};
