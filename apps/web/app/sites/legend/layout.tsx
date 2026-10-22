import type { Metadata } from 'next';
import { SiteChrome } from '@/components/SiteChrome';
import { siteMetadata } from '@/lib/siteMetadata';

export function generateMetadata(): Promise<Metadata> {
  return siteMetadata('legend');
}

export default function legendLayout({
  children,
}: LayoutProps<'/sites/legend'>) {
  return <SiteChrome brand="legend">{children}</SiteChrome>;
}
