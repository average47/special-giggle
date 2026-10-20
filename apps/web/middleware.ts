import { type NextRequest, NextResponse } from 'next/server';
import { getHostname } from './lib/getHostname';
import { getSiteConfig } from './lib/getSiteConfig';

export const config = {
  matcher: '/((?!api|static|.*\\..*|_next|ifc|marketing|styleguide).*)',
};

export function middleware(request: NextRequest) {
  const reqHost = getHostname(request);
  const siteConfig = getSiteConfig(reqHost);

  const response = NextResponse.rewrite(
    new URL(
      `/sites/${siteConfig.networkPath}${request.nextUrl.pathname}${request.nextUrl.search}${request.nextUrl.pathname === '/' ? 'home' : ''}`,
      request.url
    )
  );
  response.headers.set('x-network-path', siteConfig.networkPath);
  response.headers.set('x-pathname', request.nextUrl.pathname);
  return response;
}
