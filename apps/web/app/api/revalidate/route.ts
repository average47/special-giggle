import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { SHARED_SITE } from '@/lib/wordpress';
import type { TMenuLocation } from '@/lib/typings';

/**
 * On-demand revalidation for the WordPress mu-plugin
 * (apps/cms/mu-plugins/headless-revalidate.php).
 *
 * The payload is deliberately semantic rather than a list of cache tags: this
 * app owns the tag format, which lives next to the functions that set it in
 * lib/wordpress.ts, so WordPress never has to know it.
 *
 *   { "networkPath": "truecrime", "pages": ["about"], "menuLocations": ["PRIMARY"] }
 *
 * `networkPath` is a tenant's subdirectory, or SHARED_SITE for the network root.
 */
interface IRevalidatePayload {
  networkPath?: unknown;
  pages?: unknown;
  menuLocations?: unknown;
}

const MENU_LOCATIONS: TMenuLocation[] = ['PRIMARY', 'SUBHEAD', 'FOOTER'];

function isAuthorized(request: Request): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  // Fail closed: without a configured secret there is nothing to verify against.
  if (!secret) {
    return false;
  }

  const provided = request.headers.get('x-revalidate-secret') ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);

  // timingSafeEqual throws on a length mismatch, which is itself a mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

export async function POST(request: Request) {
  if (!process.env.REVALIDATE_SECRET) {
    return Response.json(
      { error: 'REVALIDATE_SECRET is not configured' },
      { status: 503 }
    );
  }
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: IRevalidatePayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
  }

  const { networkPath } = payload;
  if (typeof networkPath !== 'string' || networkPath === '') {
    return Response.json({ error: 'networkPath is required' }, { status: 400 });
  }

  const tags = [
    ...asStringArray(payload.pages).map(
      (slug) => `page:${networkPath}:${slug}`
    ),
    ...asStringArray(payload.menuLocations)
      // Ignore anything that isn't a location this app queries.
      .filter((location): location is TMenuLocation =>
        (MENU_LOCATIONS as string[]).includes(location)
      )
      .map((location) => `menu:${networkPath}:${location}`),
  ];

  if (tags.length === 0) {
    return Response.json(
      { error: 'Nothing to revalidate: pass pages and/or menuLocations' },
      { status: 400 }
    );
  }

  // { expire: 0 } rather than the usual 'max' profile: an editor who just hit
  // Publish should see the change on the next request, not stale content while
  // a background revalidation runs. The cost is that this one request blocks on
  // WordPress. Switch to 'max' if never blocking matters more than immediacy.
  tags.forEach((tag) => revalidateTag(tag, { expire: 0 }));

  return Response.json({
    revalidated: tags,
    isSharedSite: networkPath === SHARED_SITE,
  });
}
