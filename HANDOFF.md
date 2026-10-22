# Handoff notes — 2026-10-22

Resuming on another machine. Throwaway doc — delete before the PR merges.

## Where to pick up (the live task)

**Integrating the pawa.tv TV schedule feed into the `/tv-guide/<day>` pages.**
Nothing built yet — we reviewed the feed and agreed a plan. Next step is to
implement it (and I was going to ask two questions first — see "Open decisions").

Feed: `https://distribution.assets.pawa.tv/metadatadistribution/channel_24/schedule.xml`

What the feed is:
- One channel per file (`channel_24`); root `<schedule>` with flat `<event>` kids.
- 2.67 MB, 1,081 events, **30 rolling days**, ~36 events/day. It's the whole
  channel in one file — no per-day endpoint.
- Per-event fields worth keeping: `ID`, `start`/`end` (`HH:MM:SS`), `txDay`
  (`YYYY-MM-DD`), `duration`/`runTime`, `title`, `Genre`/`subGenre`,
  `programmeEPGSynopsis`, `programmeImage` (original + cropped), `parentalRating`,
  `Series`/`EpisodeTitle`/`EpisodeNum`. ~45 tags total but most are empty.
- Headers: has `etag` + `last-modified`, **no `cache-control`**. Regenerates on a
  schedule (~hourly, per the generation timestamp). Flat CDN file, no webhook.
- **Gotcha: all `programmeImage` URLs are `http://`** → mixed content on HTTPS.

Agreed plan:
1. `getChannelSchedule(networkPath)` in a new `lib/schedule.ts` (or lib/wordpress.ts):
   `'use cache'` + `cacheLife('hours')` + `cacheTag('schedule:<channel>')`.
   Fetch once, parse with `fast-xml-parser`, normalize to a slim shape grouped by
   `txDay`, strip empty fields. The 2.67 MB download+parse is amortized server-side;
   the page slices one day (~36 events) in memory.
2. Map `networkPath -> channel feed URL` (like `siteConfigDomainMap`).
3. Render the day grid as a Server Component inside `<Suspense>` on the
   `/tv-guide/[day]` route. Never ship the feed to the client.
4. Images via `next/image` (fixes mixed content + optimizes); add
   `assets.metadata.pawa.tv` + `assets.pawa.tv` to `images.remotePatterns`; give
   fixed dimensions (Tailwind-preflight aspect-ratio warning — see gotchas).
5. Freshness: time-based `cacheLife` + optional cron hitting `/api/revalidate`
   with a `schedule:<channel>` tag (pawa can't push). Optional `If-None-Match`
   conditional GET to skip re-parsing on 304.
6. "On now / up next": compute from the cached day via `connection()` in its own
   small dynamic hole; keep the grid cached.

## Open decisions (ask before wiring "now"/day logic)
- **Weekday -> date rule.** Menu uses weekday names (`/tv-guide/thursday`); feed
  uses absolute `txDay`. Need a rule, e.g. "this week's Thursday" vs "next".
- **Timezone.** Feed has NO timezone on `start`/`end`. Must pin the channel TZ
  (almost certainly `Europe/London`) or "now" is off by the server's UTC offset.

## Branch / PR
- Branch: `menu-options-icons-overlay`, PR #1 -> `main`
  (https://github.com/average47/special-giggle/pull/1).
- Committed before this handoff:
  - `6c20843` menu item options, Subhead location, social icons, header overlay,
    proxy WebSocket fix, gitignore.
  - `d530d50` content-only CMS export/import scripts.
- This handoff commits the rest of the session (was uncommitted): see below.

## Work committed in the handoff (was the working tree)
- **Site metadata from WordPress**: `getSiteInfo` + `generalSettings` query
  (lib/wordpress.ts), `IWordPressSiteInfo` (lib/typings), `lib/siteMetadata.ts`,
  `generateMetadata` in each `app/sites/<tenant>/layout.tsx` (per-tenant title/
  tagline) and root `app/layout.tsx` (network-root default). Must live in the
  tenant layouts (static tenant) not the root layout reading headers — that broke
  the build on `/_not-found`.
- **Overlay** (`components/Header/HeaderOverlay.tsx`): renders Primary + Subhead
  menus inside the panel; Subhead first then Primary; Primary as icons w/ Search
  hidden and `justify-evenly`; transparent-white scrim; top-level items brand +
  bold + uppercase + `text-md`, subitems black + `text-sm` + normal + horizontal
  pipe-separated wrapping; bottom border on each top-level Subhead `<li>`.
- **Header** (`components/Header/Header.tsx`): fetches Primary + Subhead; Subhead
  bar (md+) shows top-level only, no Search (`subheadBar`); Primary nav renders
  icons; responsive `hidden md:block` on both navs and `md:hidden` on the overlay
  button; `priority` + `style={{height}}` on the logo (image warnings fix);
  `await connection()` before the TV Guide date transform.
- **TV Guide menu** (`lib/tvGuideMenu.ts`): `withTvGuideDays` — Today/Tomorrow
  link to the matching weekday page, those weekday items hidden, remaining days
  reordered forward from the day after tomorrow. Applied to Subhead in Header.
- **Footer** (`components/Footer/Footer.tsx`): logo image warning fix
  (`style={{height:30}}`) + the pre-existing layout/logo WIP.
- **Revalidate** (`app/api/revalidate/route.ts`): added `'SUBHEAD'` to
  `MENU_LOCATIONS` (was missing; subhead menu never revalidated).

## Environment / how to run
- `apps/cms` — WordPress 7.1.3 subdirectory Multisite in Docker (MariaDB + WP +
  wp-cli). `cd apps/cms && npm start` (docker compose up). WP at
  http://localhost:8080, wp-admin admin/admin. Data was restored from
  `apps/cms/exports/wordpress-export-2026-10-21/database.sql`. 5 sites: primary,
  truecrime, truecrimextra, legend, legendxtra.
- `apps/web` — Next.js 16, `cacheComponents: true` (dynamicIO) + PPR, Tailwind v4.
  `cd apps/web && pnpm dev` (next-server on :3000). `pnpm build` to verify.
  `WORDPRESS_URL` defaults to localhost:8080.
- `apps/proxy` — reverse proxy on :3001 mapping `*-tv.localhost` -> real hostnames
  -> Next :3000, for tenant routing. Runs under nodemon. **View the app through
  the proxy** (e.g. http://truecrime-tv.localhost:3001), not :3000 directly, or
  use :3000 which maps to truecrime.
- CMS export/import: `cd apps/cms && npm run export` (content-only bundle to
  exports/, gitignored) / `npm run import -- <bundle.zip>` (into a FRESH install).

## Gotchas learned this session
- **Dev menu cache is stale after WP edits.** `getMenu` is `'use cache'` for hours
  and dev has no revalidate webhook, so menu changes (and the TV Guide transform)
  may not show until you **restart `pnpm dev`**. Verified real behavior against a
  throwaway `next start` on a spare port instead of the running dev server.
- **`new Date()` under cacheComponents** throws "unstable value while
  prerendering" — gate with `await connection()` (Header) or wrap in `'use cache'`
  (Footer's `getCurrentYear`).
- **next/image + Tailwind preflight**: preflight forces `img { height: auto }`,
  which trips the aspect-ratio warning on fixed width/height. Pin height via
  `style={{ height }}`; add `priority` to the above-the-fold LCP logo.
- **`text-md` is not a real Tailwind utility** (resolves to inherited ~16px);
  it's used in Footer and the overlay by project convention.
- The `RAM` debug id on the overlay was reverted to `header-overlay`.
- Verification was done by driving headless Chrome over CDP with throwaway Node
  scripts in `/tmp` (not in the repo) — Node 22 has a built-in `WebSocket`.
