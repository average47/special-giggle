'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../Icon/Icon';

/**
 * The far-right header button and the panel it toggles. A disclosure, not a
 * modal: the button owns the open state (aria-expanded / aria-controls) and the
 * panel is a plain region, so no focus trap is needed.
 *
 * The panel is `fixed` and offset by the header's height (top-23 matches the
 * header's h-23), so it sits directly beneath the header and covers the rest of
 * the window -- full width, down to the bottom edge -- over the page content.
 */
export function HeaderOverlay() {
  const [open, setOpen] = useState(false);

  // Escape closes it, the baseline expectation for anything over the page.
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="header-overlay"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="ml-auto inline-flex items-center justify-center rounded p-1 hover:opacity-80"
      >
        <Icon name={open ? 'close' : 'list'} size="lg" />
      </button>

      {open && (
        <div
          id="header-overlay"
          // Dim the page so the open state is unmistakable. A click anywhere on
          // it closes, since it has no interactive content of its own yet.
          onClick={() => setOpen(false)}
          className="fixed inset-x-0 bottom-0 top-23 z-40 overflow-auto bg-black/60 text-white backdrop-blur-sm"
        >
          {/* Overlay content goes here. */}
        </div>
      )}
    </>
  );
}
