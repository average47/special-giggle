import { Suspense } from 'react';
import Image from 'next/image';
import { getNetworkPath } from '@/lib/getNetworkPath';
import { getMenu } from '@/lib/wordpress';
import { siteConfigNetworkMap } from '@/lib/siteConfigDomainMap';
import { MenuItems } from '../MenuItems';
import { HeaderOverlay } from './HeaderOverlay';

const BAR =
  'flex items-center border-b border-hairline bg-brand p-4 h-23 border-b border-hairline text-white';
const WRAPPER =
  'mx-auto flex w-full max-w-7xl items-center justify-between gap-6';

export function Header() {
  // The menu depends on which tenant is being served, which is request data --
  // hence the boundary here rather than in the layout.
  return (
    <Suspense fallback={<header className={BAR} />}>
      <HeaderMenu />
    </Suspense>
  );
}

async function HeaderMenu() {
  const networkPath = await getNetworkPath();

  // siteConfigNetworkMap is keyed by networkPath, so it needs no domain lookup.
  // This is a server component, so the output lands in the server's terminal,
  // not the browser console.
  const siteConfig = siteConfigNetworkMap[networkPath];

  // Both menus for this tenant, fetched together since neither depends on the
  // other. Each is empty until an editor assigns a menu to that location.
  const [primary, subhead] = await Promise.all([
    getMenu(networkPath, 'PRIMARY'),
    getMenu(networkPath, 'SUBHEAD'),
  ]);

  return (
    <>
      <header className={BAR}>
        <div className={WRAPPER}>
          <Image
            src={`/${networkPath}.png`}
            width={siteConfig?.width || 130}
            height={siteConfig?.height || 40}
            alt="Brand Logo"
          />
          {/* Nothing assigned to the Primary location yet: render the bar, not an
              empty <nav>, so the page doesn't shift once an editor assigns one. */}
          {primary.length > 0 && (
            <nav aria-label="Primary">
              <MenuItems
                items={primary}
                // The Primary menu holds the social links: items with "Use icon"
                // ticked render their glyph from the sprite instead of a label.
                renderIcons
                listClassName="flex flex-wrap items-center gap-5"
                // Submenus sit inline next to their parent rather than in a dropdown:
                // there is no client-side JavaScript here, and a hover-only menu is a
                // trap on touch.
                nestedListClassName="ml-3 flex flex-wrap items-center gap-3 border-l border-hairline pl-3 [&_a]:text-sm [&_a]:font-normal [&_a]:opacity-75"
                linkClassName="text-[15px] font-medium hover:underline"
              />
            </nav>
          )}
          {/* ml-auto on the button keeps it hard against the right edge whether
              or not the Primary nav is present. */}
          <HeaderOverlay />
        </div>
      </header>

      {/* The Subhead menu as its own horizontal bar beneath the header. Rendered
          only when a menu is assigned to the location, matching the Primary nav
          above so the page doesn't shift once an editor assigns one. */}
      {subhead.length > 0 && (
        <nav aria-label="Subhead" className="border-b border-hairline">
          <MenuItems
            items={subhead}
            listClassName="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-5 p-4"
            nestedListClassName="ml-3 flex flex-wrap items-center gap-3 border-l border-hairline pl-3 [&_a]:text-sm [&_a]:font-normal [&_a]:opacity-75"
            linkClassName="text-[15px] font-medium hover:underline"
          />
        </nav>
      )}
    </>
  );
}
