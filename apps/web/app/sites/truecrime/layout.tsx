import { SiteChrome } from '@/components/SiteChrome';

export default function truecrimeLayout({
  children,
}: LayoutProps<'/sites/truecrime'>) {
  return <SiteChrome brand="truecrime">{children}</SiteChrome>;
}
