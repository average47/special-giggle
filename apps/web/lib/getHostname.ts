import type { NextRequest } from 'next/server';

export function getHostname(request: NextRequest): string {
  const hostHeader = request.headers.get('host');
  const reqHost = hostHeader?.split(':')[0] ?? 'localhost';
  return reqHost === 'localhost' ? 'truecrime-tv.co.uk' : reqHost;
}
