import type { ReactNode } from 'react';
import type { TBrand } from '@/lib/typings';
import { Header } from './Header/Header';
import { Footer } from './Footer/Footer';

interface Props {
  /**
   * Scopes the tenant's brand colour to everything inside, via the
   * `[data-brand]` rules in app/globals.css.
   */
  brand: TBrand;
  children: ReactNode;
}

/**
 * The frame around a tenant's pages: header, content, footer.
 *
 * This lives in the per-tenant layouts rather than the root layout so `brand`
 * is a static value. The root layout would have to read the request to know
 * which tenant it is serving, which would put the whole frame behind a
 * <Suspense> boundary and keep it out of the static shell.
 */
export function SiteChrome({ brand, children }: Props) {
  return (
    <div data-brand={brand} className="flex flex-1 flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
