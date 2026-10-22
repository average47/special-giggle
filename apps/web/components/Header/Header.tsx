import { Suspense } from 'react';
import { connection } from 'next/server';
import Image from 'next/image';
import { getNetworkPath } from '@/lib/getNetworkPath';
import { getMenu } from '@/lib/wordpress';
import { withTvGuideDays } from '@/lib/tvGuideMenu';
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
  const [primary, rawSubhead] = await Promise.all([
    getMenu(networkPath, 'PRIMARY'),
    getMenu(networkPath, 'SUBHEAD'),
  ]);

  // The TV Guide's "Today"/"Tomorrow" items point at the matching weekday page
  // and those two weekday items are hidden -- recomputed each request so it
  // tracks the date. `connection()` marks this as request-time so Cache
  // Components allows the `new Date()` inside withTvGuideDays (it can't be read
  // while prerendering).
  await connection();
  const subhead = withTvGuideDays(rawSubhead);

  // The Subhead bar (md and up) shows only the top-level items, without their
  // submenus and without Search. The overlay below still gets the full menu.
  const subheadBar = subhead
    .filter((item) => item.label !== 'Search')
    .map((item) => ({ ...item, children: [] }));

  return (
    <>
      <header className={BAR}>
        <div className={WRAPPER}>
          <Image
            src={`/${networkPath}.png`}
            width={siteConfig?.width || 130}
            height={siteConfig?.height || 40}
            alt="Brand Logo"
            // Above the fold and the LCP element, so load it eagerly.
            priority
            // Tailwind's preflight forces `height: auto` on images; pin it back
            // to the configured height so the rendered size matches the width
            // and height props (a fixed box) and Next stops warning.
            style={{ height: siteConfig?.height || 40 }}
          />
          {/* Nothing assigned to the Primary location yet: render the bar, not an
              empty <nav>, so the page doesn't shift once an editor assigns one. */}
          {primary.length > 0 && (
            <nav aria-label="Primary" className="hidden md:block">
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
              or not the Primary nav is present. The overlay holds its own copy
              of both menus; the versions above and below stay put. */}
          <HeaderOverlay primary={primary} subhead={subhead} />
        </div>
      </header>

      {/* The Subhead menu as its own horizontal bar beneath the header. Rendered
          only when a menu is assigned to the location, matching the Primary nav
          above so the page doesn't shift once an editor assigns one. */}
      {subheadBar.length > 0 && (
        <nav aria-label="Subhead" className="hidden border-b border-hairline md:block">
          <MenuItems
            items={subheadBar}
            listClassName="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-5 p-4"
            linkClassName="text-[15px] font-medium hover:underline"
          />
        </nav>
      )}
    </>
  );
}
