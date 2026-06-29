/**
 * CollapsibleSection — accordion wrapper used on mobile to fold secondary
 * content (e.g. Game Settings in the lobby) so the primary action keeps
 * the screen. Header is a full-width 44px+ tap target.
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultOpen = true,
  className = '',
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-section ${open ? 'is-open' : ''} ${className}`}>
      <button
        type="button"
        className="collapsible-section-header"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
      >
        <span className="collapsible-section-title">{title}</span>
        <ChevronDown className="collapsible-section-chevron" aria-hidden="true" />
      </button>
      {open && <div className="collapsible-section-body">{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
