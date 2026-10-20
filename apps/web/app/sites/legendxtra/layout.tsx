import { SiteChrome } from '@/components/SiteChrome';

export default function legendxtraLayout({
  children,
}: LayoutProps<'/sites/legendxtra'>) {
  return <SiteChrome brand="legendxtra">{children}</SiteChrome>;
}
