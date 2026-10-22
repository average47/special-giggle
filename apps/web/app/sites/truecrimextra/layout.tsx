import type { Metadata } from 'next';
import { SiteChrome } from '@/components/SiteChrome';
import { siteMetadata } from '@/lib/siteMetadata';

export function generateMetadata(): Promise<Metadata> {
  return siteMetadata('truecrimextra');
}

export default function truecrimeextraLayout({
  children,
}: LayoutProps<'/sites/truecrimextra'>) {
  return <SiteChrome brand="truecrimeextra">{children}</SiteChrome>;
}
