import type { Metadata } from 'next';
import { SiteChrome } from '@/components/SiteChrome';
import { siteMetadata } from '@/lib/siteMetadata';

export function generateMetadata(): Promise<Metadata> {
  return siteMetadata('truecrime');
}

export default function truecrimeLayout({
  children,
}: LayoutProps<'/sites/truecrime'>) {
  return <SiteChrome brand="truecrime">{children}</SiteChrome>;
}
