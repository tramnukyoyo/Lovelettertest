import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type DrawerPosition = 'bottom' | 'left' | 'right';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: DrawerPosition;
  title?: string;
  children: React.ReactNode;
  showHandle?: boolean;
  fullHeight?: boolean;
  className?: string;
  hideHeader?: boolean; // New prop
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  position = 'bottom',
  title,
  children,
  showHandle = position === 'bottom',
  fullHeight = false,
  className = '',
  hideHeader = false, // Default to false
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const shouldShowHandle = showHandle || hideHeader; // Always show handle if header is hidden

  return (
    <>
      {/* Backdrop */}
      <div
        className={`mobile-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        ref={drawerRef}
        className={`mobile-drawer mobile-drawer-${position} ${isOpen ? 'open' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
      >
        {/* Handle (for bottom drawer) */}
        {shouldShowHandle && (
          <div className="drawer-handle" aria-hidden="true" />
        )}

        {/* Header */}
        {!hideHeader && title && (
          <div className="drawer-header">
            <h2 className="drawer-title">{title}</h2>
            <button
              className="drawer-close-btn"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className={`drawer-content ${fullHeight ? 'full-height' : ''}`}
        >
          {children}
        </div>
      </div>
    </>
  );
};
