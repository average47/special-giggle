import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getNetworkPath } from '@/lib/getNetworkPath';
import { resolvePage } from '@/lib/wordpress';

interface Props {
  /**
   * A catch-all, so a page nested in WordPress (`/legal/terms`) routes here as
   * well as a top-level one. Optional because this component also backs the
   * `/` route, which the middleware always rewrites before it renders.
   */
  params: Promise<{ slug?: string[] }>;
}

export default function SlugPage({ params }: Props) {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <WordPressPage params={params} />
    </Suspense>
  );
}

// Reads the request (params, and the tenant behind the hostname), so it can't
// be part of the prerendered shell -- hence the Suspense boundary above. The
// WordPress data itself is cached inside resolvePage.
async function WordPressPage({ params }: Props) {
  const { slug } = await params;
  const networkPath = await getNetworkPath();

  // WordPress resolves a nested page by its whole path, not its last segment:
  // `legal/terms` finds it, `terms` does not.
  const path = (slug ?? []).join('/');

  const resolved = await resolvePage(networkPath, path);
  if (!resolved) {
    notFound();
  }
  const { page, isShared } = resolved;

  // Tailwind's preflight strips heading sizes and paragraph spacing, so what
  // the browser used to provide is spelled out here.
  return (
    <article className="px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      {page.content && (
        <div
          className="mt-4 flex flex-col gap-4"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
      <footer className="mt-8 text-sm opacity-60">
        <p>
          Network Path: {networkPath}
          {isShared && ' (page shared from the network root)'}
        </p>
        <p>
          URI: {page.uri} (post {page.databaseId})
        </p>
        <p>Last modified: {page.modified}</p>
      </footer>
    </article>
  );
}
