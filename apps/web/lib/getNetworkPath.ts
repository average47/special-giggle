import { headers } from 'next/headers';
import { getSiteConfig } from './getSiteConfig';

/**
 * The network path of the tenant this request belongs to -- the subdirectory of
 * its WordPress site, and the key everything tenant-specific hangs off.
 *
 * Reads the request, so a component calling this needs a <Suspense> boundary
 * above it under cacheComponents.
 */
export async function getNetworkPath(): Promise<string> {
  const headerList = await headers();

  // The middleware sets this on everything it rewrites; the Host header is the
  // fallback for any request that reaches a route without passing through it.
  return (
    headerList.get('x-network-path') ??
    getSiteConfig(headerList.get('host')?.split(':')[0] ?? 'default')
      .networkPath
  );
}
