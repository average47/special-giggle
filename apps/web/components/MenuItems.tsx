import Link from 'next/link';
import type { IWordPressMenuItem } from '@/lib/typings';
import { Icon } from './Icon/Icon';
import { resolveIconName } from './Icon/iconNames';

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
  /**
   * Render items with "Use icon" ticked as their icon instead of their label.
   * The sprite id comes from the label (e.g. "Facebook" -> facebook); an item
   * whose label has no matching icon keeps its text. Off by default so only the
   * menu that opts in (the social Primary menu) swaps labels for glyphs.
   */
  renderIcons?: boolean;
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
  renderIcons,
}: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={listClassName}>
      {items.map((item) => (
        <li key={item.databaseId}>
          <MenuLink
            item={item}
            className={linkClassName}
            renderIcons={renderIcons}
          />
          <MenuItems
            items={item.children}
            listClassName={nestedListClassName ?? listClassName}
            nestedListClassName={nestedListClassName}
            linkClassName={linkClassName}
            renderIcons={renderIcons}
          />
        </li>
      ))}
    </ul>
  );
}

function MenuLink({
  item,
  className,
  renderIcons,
}: {
  item: IWordPressMenuItem;
  className?: string;
  renderIcons?: boolean;
}) {
  // An icon only when this menu opted in, the editor ticked "Use icon", and the
  // label actually maps to a sprite id. Otherwise the text label stands.
  const iconName =
    renderIcons && item.useIcon ? resolveIconName(item.label) : null;

  // With the label replaced by a glyph, the link needs the label as its
  // accessible name instead.
  const content = iconName ? (
    <Icon name={iconName} size="lg" />
  ) : (
    item.label
  );
  const ariaLabel = iconName ? item.label : undefined;

  // WordPress gives internal items a site-relative uri and custom links an
  // absolute one; only the former is a route this app can navigate to.
  if (!item.uri.startsWith('/')) {
    return (
      <a
        className={className}
        href={item.uri}
        target={item.target ?? undefined}
        rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
        aria-label={ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      className={className}
      href={item.uri}
      target={item.target ?? undefined}
      aria-label={ariaLabel}
    >
      {content}
    </Link>
  );
}
