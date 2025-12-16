import React, { useState } from 'react';
import { SettingsModal } from './SettingsModal';

/**
 * Settings Button - Floating Action Button (FAB)
 * Provides access to audio settings (volume, mute) from any page/state
 */
export const SettingsButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      {/* Floating Settings Button */}
      <button
        className="settings-fab"
        onClick={openModal}
        aria-label="Settings"
        title="Settings"
      >
        <svg
          className="settings-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24M19.78 19.78l-4.24-4.24m-5.08-5.08l-4.24-4.24" />
        </svg>
      </button>

      {/* Settings Modal */}
      {isModalOpen && <SettingsModal onClose={closeModal} />}
    </>
  );
};

export default SettingsButton;
