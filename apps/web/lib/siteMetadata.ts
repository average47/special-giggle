import type { Metadata } from 'next';
import { getSiteInfo } from './wordpress';

/**
 * Page metadata built from a site's WordPress Site Title and Tagline.
 *
 * Takes a networkPath rather than reading the request, so it stays cacheable
 * and a layout that knows its tenant statically can prerender its metadata.
 */
export async function siteMetadata(networkPath: string): Promise<Metadata> {
  const { title, description } = await getSiteInfo(networkPath);

  return {
    title,
    description: description || undefined,
  };
}
