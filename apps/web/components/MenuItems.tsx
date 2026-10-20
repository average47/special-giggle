import Link from 'next/link';
import type { IWordPressMenuItem } from '@/lib/typings';

interface Props {
  items: IWordPressMenuItem[];
  /** Classes for this <ul>. */
  listClassName?: string;
  /**
   * Classes for every <ul> below this one, defaulting to listClassName. A
   * submenu usually wants different treatment from the level above it -- which
   * used to be a `.list .list` descendant selector, and is a separate class
   * now that the styling is utilities.
   */
  nestedListClassName?: string;
  /** Classes for every link, at any depth. */
  linkClassName?: string;
}

/**
 * A menu level and its submenus. Kept separate from Header and Footer so both
 * render WordPress's nesting the same way.
 */
export function MenuItems({
  items,
  listClassName,
  nestedListClassName,
  linkClassName,
}: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={listClassName}>
      {items.map((item) => (
        <li key={item.databaseId}>
          <MenuLink item={item} className={linkClassName} />
          <MenuItems
            items={item.children}
            listClassName={nestedListClassName ?? listClassName}
            nestedListClassName={nestedListClassName}
            linkClassName={linkClassName}
          />
        </li>
      ))}
    </ul>
  );
}

function MenuLink({
  item,
  className,
}: {
  item: IWordPressMenuItem;
  className?: string;
}) {
  // WordPress gives internal items a site-relative uri and custom links an
  // absolute one; only the former is a route this app can navigate to.
  if (!item.uri.startsWith('/')) {
    return (
      <a
        className={className}
        href={item.uri}
        target={item.target ?? undefined}
        rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      className={className}
      href={item.uri}
      target={item.target ?? undefined}
    >
      {item.label}
    </Link>
  );
}
