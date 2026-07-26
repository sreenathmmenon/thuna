'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';

interface DisclosureProps {
  label: string;
  open: boolean;
  onToggle: (next: boolean) => void;
  children: ReactNode;
}

/**
 * A quiet expand/collapse container. Used to keep secondary ways of talking
 * (typing, demo audio, upload) one tap away without crowding the Talk screen.
 * Controlled, so the page can open it automatically when the microphone fails.
 */
export function Disclosure({ label, open, onToggle, children }: DisclosureProps): JSX.Element {
  const bodyId = useId();

  return (
    <div className="disclosure">
      <button
        type="button"
        className="disclosure__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => onToggle(!open)}
      >
        <span>{label}</span>
        <span className="disclosure__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div id={bodyId} className="disclosure__body">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default Disclosure;
