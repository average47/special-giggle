import { Suspense } from 'react';
import Image from 'next/image';
import { cacheLife } from 'next/cache';
import { getNetworkPath } from '@/lib/getNetworkPath';
import { getMenu } from '@/lib/wordpress';
import { MenuItems } from '../MenuItems';

const BAR =
  'mt-auto flex min-h-14 items-center border-t border-hairline p-6 flex-col gap-10  text-white bg-brand';

// The pipe between items. `[&>li+li]` skips the first one, and only reaches
// direct children, so a submenu -- which stacks -- doesn't get separators.
const SEPARATED =
  "[&>li+li]:before:mr-5 [&>li+li]:before:opacity-40 [&>li+li]:before:content-['|'] [&>li+li]:before:[content:'|'_/_'']";

/**
 * The current year, for the copyright line.
 *
 * `new Date()` can't be read straight from a prerendered component: Cache
 * Components has to know whether the value is captured once for everyone or
 * computed per request. The year is the same for every visitor, so it belongs
 * in the static shell -- which is what `use cache` does here. The lifetime
 * bounds how long the footer can lag after a New Year rollover.
 */
async function getCurrentYear(): Promise<number> {
  'use cache';
  cacheLife('hours');

  return new Date().getFullYear();
}

export function Footer() {
  return (
    <Suspense fallback={<footer className={BAR} />}>
      <FooterMenu />
    </Suspense>
  );
}

async function FooterMenu() {
  const networkPath = await getNetworkPath();
  const [items, year] = await Promise.all([
    getMenu(networkPath, 'FOOTER'),
    getCurrentYear(),
  ]);

  if (items.length === 0) {
    return <footer className={BAR} />;
  }

  return (
    <footer className={BAR}>
      <nav aria-label="Footer">
        <MenuItems
          items={items}
          listClassName={`flex flex-wrap gap-x-5 gap-y-2 ${SEPARATED}`}
          // A nested level reads as a group under its parent, not alongside it.
          nestedListClassName="mt-1.5 flex flex-col gap-1.5"
          linkClassName="text-md hover:underline hover:opacity-100"
        />
      </nav>
      <ul className="flex flex-col gap-y-2 items-center justify-center text-sm">
        <li>
          <p>
            Copyright &copy; {year} - CBS AMC Networks UK Channels Partnership
          </p>
        </li>
        <li>
          <p>CBS&reg; is a Registered Trademark of CBS Broadcasting Inc.</p>
        </li>
        <li>
          <p>
            All Rights Reserved. CBS AMC Networks UK Channels Partnership,
            Authorised User.
          </p>
        </li>
      </ul>
      <ul className="flex gap-x-5">
        <li style={{ display: networkPath === 'truecrime' ? 'none' : 'block' }}>
          <a
            href="https://www.truecrime-tv.co.uk/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/truecrime.png"
              width={98}
              height={30}
              alt="True Crime TV Logo"
            />
          </a>
        </li>
        <li
          style={{
            display: networkPath === 'truecrimextra' ? 'none' : 'block',
          }}
        >
          <a
            href="https://www.truecrimextra-tv.co.uk/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/truecrimextra.png"
              width={131}
              height={30}
              alt="True Crime Extra TV Logo"
            />
          </a>
        </li>
        <li>
          <a
            href="https://www.watchfreeuk.co.uk/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/watch.png"
              width={120}
              height={30}
              alt="Watch Free UK Logo"
            />
          </a>
        </li>
        <li style={{ display: networkPath === 'legend' ? 'none' : 'block' }}>
          <a
            href="https://www.legend-tv.co.uk/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/legend.png"
              width={67}
              height={30}
              alt="Legend TV Logo"
            />
          </a>
        </li>
        <li
          style={{ display: networkPath === 'legendxtra' ? 'none' : 'block' }}
        >
          <a
            href="https://www.legendxtra-tv.co.uk/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/legendxtra.png"
              width={100}
              height={30}
              alt="Legend Extra TV Logo"
            />
          </a>
        </li>
      </ul>
    </footer>
  );
}
