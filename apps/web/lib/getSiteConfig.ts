import siteConfigDomainMap from './siteConfigDomainMap';
import type { ISiteConfig } from './typings';

const fallbackSiteConfig = siteConfigDomainMap['truecrime-tv.co.uk']!;

/**
 * Resolves a request hostname to its site config.
 *
 * The keys of siteConfigDomainMap don't all have the same number of labels --
 * `legend-tv.localhost` has two, `legend-tv.co.uk` has three -- and a request
 * can arrive with extra labels in front of either (`www.legend-tv.co.uk`). So
 * instead of assuming a label count, drop one label at a time from the front
 * and take the first key that matches, which is the most specific one.
 *
 * Anything with no match at all (a bare `localhost`, an unknown domain, the
 * literal `'default'`) falls back to the primary site.
 */
export function getSiteConfig(reqHost: string): ISiteConfig {
  const labels = reqHost.split('.');

  // Stops before the last label: every key has at least two, so a lone TLD
  // can never match.
  for (let i = 0; i < labels.length - 1; i += 1) {
    const candidate = labels.slice(i).join('.');
    // hasOwn, not `in`: reqHost comes from the Host header, and `in` would
    // match inherited keys like `constructor`.
    if (Object.hasOwn(siteConfigDomainMap, candidate)) {
      return siteConfigDomainMap[candidate]!;
    }
  }

  return fallbackSiteConfig;
}
