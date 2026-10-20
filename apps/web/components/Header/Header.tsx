import { Suspense } from 'react';
import Image from 'next/image';
import { getNetworkPath } from '@/lib/getNetworkPath';
import { getMenu } from '@/lib/wordpress';
import { siteConfigNetworkMap } from '@/lib/siteConfigDomainMap';
import { MenuItems } from '../MenuItems';

const BAR = 'flex h-30 items-center border-b border-hairline px-6 bg-brand';

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
  console.log('[Header]', networkPath, {
    width: siteConfig?.width,
    height: siteConfig?.height,
  });

  const items = await getMenu(networkPath, 'PRIMARY');

  // Nothing assigned to the Primary location yet: render the bar, not an empty
  // <nav>, so the page doesn't shift once an editor assigns one.
  if (items.length === 0) {
    return (
      <header className={BAR}>
        <Image
          src={`/${networkPath}.png`}
          width={siteConfig?.width || 130}
          height={siteConfig?.height || 40}
          alt="Brand Logo"
        />
      </header>
    );
  }

  return (
    <header className={BAR}>
      <Image
        src={`/${networkPath}.png`}
        width={siteConfig?.width || 130}
        height={siteConfig?.height || 40}
        alt="Brand Logo"
      />
      <nav aria-label="Primary">
        <MenuItems
          items={items}
          listClassName="flex flex-wrap items-center gap-5"
          // Submenus sit inline next to their parent rather than in a dropdown:
          // there is no client-side JavaScript here, and a hover-only menu is a
          // trap on touch.
          nestedListClassName="ml-3 flex flex-wrap items-center gap-3 border-l border-hairline pl-3 [&_a]:text-sm [&_a]:font-normal [&_a]:opacity-75"
          linkClassName="text-[15px] font-medium hover:underline"
        />
      </nav>
    </header>
  );
}
