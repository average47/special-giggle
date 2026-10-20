export interface ISiteConfig {
  networkPath: string;
  width?: number;
  height?: number;
}

export interface IWordPressPage {
  databaseId: number;
  slug: string;
  uri: string;
  title: string;
  /** Rendered block HTML; null for a page with an empty body. */
  content: string | null;
  date: string;
  modified: string;
}

/** The menu locations registered by the CMS theme (apps/cms/theme/functions.php). */
export type TMenuLocation = 'PRIMARY' | 'FOOTER';

export interface IWordPressMenuItemNode {
  databaseId: number;
  /** 0 for a top-level item. */
  parentDatabaseId: number;
  label: string;
  /**
   * Site-relative for an item pointing at CMS content (`/shows/`), absolute for
   * a custom link (`https://youtube.com/`). The relative form doubles as the
   * frontend path, since a tenant's site root is the frontend root.
   */
  uri: string;
  /** `_blank` when the editor ticked "open in new tab", otherwise null. */
  target: string | null;
  order: number;
}

export interface IWordPressMenuItem extends IWordPressMenuItemNode {
  children: IWordPressMenuItem[];
}

export interface IResolvedPage {
  page: IWordPressPage;
  /** True when the page came from the network root rather than the tenant. */
  isShared: boolean;
}

/**
 * A tenant's brand key, as used by the `[data-brand]` selectors in
 * app/globals.css. Spelled as those selectors spell it, which is not always the
 * tenant's networkPath.
 */
export type TBrand = 'truecrime' | 'truecrimeextra' | 'legend' | 'legendxtra';
