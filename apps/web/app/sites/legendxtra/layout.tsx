import type { Metadata } from 'next';
import { SiteChrome } from '@/components/SiteChrome';
import { siteMetadata } from '@/lib/siteMetadata';

export function generateMetadata(): Promise<Metadata> {
  return siteMetadata('legendxtra');
}

export default function legendxtraLayout({
  children,
}: LayoutProps<'/sites/legendxtra'>) {
  return <SiteChrome brand="legendxtra">{children}</SiteChrome>;
}
