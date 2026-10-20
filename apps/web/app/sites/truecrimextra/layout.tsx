import { SiteChrome } from '@/components/SiteChrome';

export default function truecrimeextraLayout({
  children,
}: LayoutProps<'/sites/truecrimextra'>) {
  return <SiteChrome brand="truecrimeextra">{children}</SiteChrome>;
}
