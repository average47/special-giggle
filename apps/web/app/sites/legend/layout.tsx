import { SiteChrome } from '@/components/SiteChrome';

export default function legendLayout({
  children,
}: LayoutProps<'/sites/legend'>) {
  return <SiteChrome brand="legend">{children}</SiteChrome>;
}
