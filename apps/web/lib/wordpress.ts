import { cacheLife, cacheTag } from 'next/cache';
import type {
  IResolvedPage,
  IWordPressMenuItem,
  IWordPressMenuItemNode,
  IWordPressPage,
  TMenuLocation,
} from './typings';

// Each tenant of the Multisite network serves its own endpoint under its own
// subdirectory, and those subdirectories are the networkPath values in
// siteConfigDomainMap -- so the site config is all that's needed to address one.
const WORDPRESS_URL = process.env.WORDPRESS_URL ?? 'http://localhost:8080';

/**
 * The network root site (blog 1), which is not a tenant: it holds the pages
 * every tenant shares, such as Privacy Policy and Community Guidelines.
 *
 * The `@` makes this safe to pass around as a networkPath -- a Multisite
 * subdirectory is `[_0-9a-zA-Z-]+`, so no real tenant can ever collide with it.
 */
export const SHARED_SITE = '@network-root';

// The root site answers at /graphql, with no subdirectory of its own.
const graphqlEndpoint = (networkPath: string) =>
  networkPath === SHARED_SITE
    ? `${WORDPRESS_URL}/graphql`
    : `${WORDPRESS_URL}/${networkPath}/graphql`;

interface IGraphQLResponse<TData> {
  data?: TData;
  errors?: { message: string }[];
}

async function queryTenant<TData>(
  networkPath: string,
  query: string,
  variables: Record<string, unknown>
): Promise<TData> {
  const endpoint = graphqlEndpoint(networkPath);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(
      `${endpoint} responded ${response.status} ${response.statusText}`
    );
  }

  const payload: IGraphQLResponse<TData> = await response.json();

  // GraphQL reports query errors in a 200 response, so status alone isn't enough.
  if (payload.errors?.length) {
    throw new Error(
      `${endpoint} returned errors: ${payload.errors.map(({ message }) => message).join('; ')}`
    );
  }
  if (!payload.data) {
    throw new Error(`${endpoint} returned no data`);
  }

  return payload.data;
}

const PAGE_BY_SLUG = /* GraphQL */ `
  query PageBySlug($slug: ID!) {
    page(id: $slug, idType: URI) {
      databaseId
      slug
      uri
      title
      content
      date
      modified
    }
  }
`;

/**
 * One tenant's page, or null when that tenant has no page at that slug.
 *
 * Cached rather than streamed on every request: the arguments form the cache
 * key, so tenants never share an entry, and the tag lets a single page be
 * revalidated on demand (`revalidateTag`) from a WordPress webhook later.
 */
export async function getPageBySlug(
  networkPath: string,
  slug: string
): Promise<IWordPressPage | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(`page:${networkPath}:${slug}`);

  const { page } = await queryTenant<{ page: IWordPressPage | null }>(
    networkPath,
    PAGE_BY_SLUG,
    { slug }
  );

  return page;
}

const MENU_BY_LOCATION = /* GraphQL */ `
  query MenuByLocation($location: MenuLocationEnum!) {
    menuItems(where: { location: $location }, first: 100) {
      nodes {
        databaseId
        parentDatabaseId
        label
        uri
        target
        order
      }
    }
  }
`;

/** Nests the flat list WordPress returns, sorting each level by menu order. */
function toMenuTree(nodes: IWordPressMenuItemNode[]): IWordPressMenuItem[] {
  const byId = new Map<number, IWordPressMenuItem>(
    nodes.map((node) => [node.databaseId, { ...node, children: [] }])
  );
  const roots: IWordPressMenuItem[] = [];

  for (const node of nodes) {
    const parent = node.parentDatabaseId
      ? byId.get(node.parentDatabaseId)
      : undefined;
    // An item whose parent is missing from the response is treated as top
    // level rather than dropped.
    (parent?.children ?? roots).push(byId.get(node.databaseId)!);
  }

  const sortLevel = (items: IWordPressMenuItem[]): void => {
    items.sort((a, b) => a.order - b.order);
    items.forEach(({ children }) => sortLevel(children));
  };
  sortLevel(roots);

  return roots;
}

/**
 * The menu a tenant has assigned to one of the theme's locations, nested, or an
 * empty array when nothing is assigned there.
 *
 * WPGraphQL only exposes a menu to an unauthenticated caller once an editor has
 * assigned it to a location in Appearance -> Menus, so an empty array covers
 * both "no menu" and "menu not assigned yet".
 */
export async function getMenu(
  networkPath: string,
  location: TMenuLocation
): Promise<IWordPressMenuItem[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(`menu:${networkPath}:${location}`);

  const { menuItems } = await queryTenant<{
    menuItems: { nodes: IWordPressMenuItemNode[] };
  }>(networkPath, MENU_BY_LOCATION, { location });

  return toMenuTree(menuItems.nodes);
}

/**
 * A page for a tenant, taking the tenant's own copy when it has one and falling
 * back to the shared copy on the network root. Null when neither has it.
 *
 * Deliberately sequential rather than two parallel queries: almost every
 * request is for a tenant's own page, and asking the root in parallel would
 * double the load on WordPress to discard the answer. The cost is one extra
 * round trip the first time a shared page is requested, before it caches.
 */
export async function resolvePage(
  networkPath: string,
  slug: string
): Promise<IResolvedPage | null> {
  const tenantPage = await getPageBySlug(networkPath, slug);
  if (tenantPage) {
    return { page: tenantPage, isShared: false };
  }

  const sharedPage = await getPageBySlug(SHARED_SITE, slug);
  return sharedPage ? { page: sharedPage, isShared: true } : null;
}
