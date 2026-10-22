import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { siteMetadata } from '@/lib/siteMetadata';
import { SHARED_SITE } from '@/lib/wordpress';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// The root layout has no tenant -- it can't read the request without pushing
// the whole shell behind Suspense -- so it defaults to the shared network-root
// site's title and tagline. Each tenant layout overrides this with its own.
export function generateMetadata(): Promise<Metadata> {
  return siteMetadata(SHARED_SITE);
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} overflow-x-hidden`}
    >
      {/* A column with min-height is what lets the footer's mt-auto hold it to
          the bottom on a short page; SiteChrome stretches into it. */}
      <body className="flex min-h-dvh max-w-[100vw] flex-col overflow-x-hidden bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
