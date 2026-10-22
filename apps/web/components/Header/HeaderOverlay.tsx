'use client';

import { useEffect, useState } from 'react';
import type { IWordPressMenuItem } from '@/lib/typings';
import { Icon } from '../Icon/Icon';
import { MenuItems } from '../MenuItems';

interface Props {
  /** The Primary menu, also rendered in the header bar. */
  primary: IWordPressMenuItem[];
  /** The Subhead menu, also rendered in its own bar below the header. */
  subhead: IWordPressMenuItem[];
}

/**
 * The far-right header button and the panel it toggles. A disclosure, not a
 * modal: the button owns the open state (aria-expanded / aria-controls) and the
 * panel is a plain region, so no focus trap is needed.
 *
 * The panel is `fixed` and offset by the header's height (top-23 matches the
 * header's h-23), so it sits directly beneath the header and covers the rest of
 * the window -- full width, down to the bottom edge -- over the page content.
 * It holds its own copy of the Primary and Subhead menus; the versions in the
 * header bar and the Subhead bar stay where they are.
 */
export function HeaderOverlay({ primary, subhead }: Props) {
  const [open, setOpen] = useState(false);

  // The overlay's social row omits Search; the header bar keeps it.
  const overlayPrimary = primary.filter((item) => item.label !== 'Search');

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
        className="ml-auto inline-flex items-center justify-center rounded p-1 hover:opacity-80 md:hidden"
      >
        <Icon name={open ? 'close' : 'list'} size="lg" />
      </button>

      {open && (
        <div
          id="header-overlay"
          // Dim the page so the open state is unmistakable. A click anywhere on
          // it closes -- including a menu link, which navigates and then closes.
          onClick={() => setOpen(false)}
          className="fixed inset-x-0 bottom-0 top-23 z-40 overflow-auto bg-white/80 text-black backdrop-blur-sm"
        >
          <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
            {subhead.length > 0 && (
              <nav aria-label="Subhead (overlay)">
                <MenuItems
                  items={subhead}
                  listClassName="flex flex-col gap-4 [&>li]:border-b [&>li]:border-gray-300 [&>li]:pb-4"
                  nestedListClassName="ml-4 mt-2 flex flex-wrap items-center gap-y-1 [&>li+li]:before:mr-3 [&>li+li]:before:opacity-40 [&>li+li]:before:content-['|'] [&>li+li]:before:[content:'|'_/_''] [&_a]:mr-3 [&_a]:text-sm [&_a]:font-normal [&_a]:text-black [&_a]:normal-case [&_a]:opacity-75"
                  linkClassName="text-md font-bold uppercase text-brand hover:underline"
                />
              </nav>
            )}
            {overlayPrimary.length > 0 && (
              <nav aria-label="Primary (overlay)">
                <MenuItems
                  items={overlayPrimary}
                  // Icons here, like the header bar, rather than text labels.
                  renderIcons
                  listClassName="flex items-center justify-evenly"
                  linkClassName="hover:opacity-80"
                />
              </nav>
            )}
          </div>
        </div>
      )}
    </>
  );
}
