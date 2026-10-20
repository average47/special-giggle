# cms

Headless, multi-tenant WordPress with GraphQL, for local development.

Multi-tenancy is **subdirectory Multisite**: one WordPress install and one
database, with an isolated site per tenant. Each tenant gets its own content
tables, so posts, media, menus and settings do not leak between them. WPGraphQL
is network-activated, so every tenant — including ones added later — exposes its
own `/graphql` endpoint automatically.

"Headless" here means nothing consumes it yet. `apps/web` is deliberately
untouched; this app just stands up the content API.

## Quick start

Requires Docker.

```sh
pnpm --filter cms start        # start (first run installs WordPress, ~1-2 min)
pnpm --filter cms logs:setup   # follow the initializer log
```

Or from this directory: `pnpm start && pnpm logs:setup`.

| What            | Where                                              |
| --------------- | -------------------------------------------------- |
| Admin (network) | http://localhost:8080/wp-admin — `admin` / `admin` |
| Primary tenant  | http://localhost:8080/graphql                      |
| Tenant A        | http://localhost:8080/tenant-a/graphql             |
| Tenant B        | http://localhost:8080/tenant-b/graphql             |

Every tenant also serves REST at `<url>wp-json/wp/v2`.

```sh
curl -s -X POST http://localhost:8080/tenant-a/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ generalSettings { title url } }"}'
```

Other scripts: `pnpm down` (stop, keep data), `pnpm logs`, and `pnpm clean`
(stop and **delete both volumes** — full reset).

These names dodge pnpm's own commands on purpose. `start`, `down` and `logs`
are free or defer to the script; `clean` shadows a built-in that pnpm
documents as script-overridable. The two that _can't_ work as scripts are `up`
(pnpm's `update`) and `setup` (pnpm's installer) — hence `start` and
`logs:setup`. Keep that in mind before adding a script here.

## Configuration

Copy `.env.example` to `.env`; Compose picks it up from this directory
automatically. Everything has a working default, so `.env` is optional.

The credentials here are throwaway local defaults. Don't reuse them anywhere
that matters, and note the stack binds to all interfaces, not just loopback.

## Tenants

Tenants come from `WORDPRESS_TENANTS`, a comma-separated list of `slug:Title`:

```sh
WORDPRESS_TENANTS=tenant-a:Tenant A,tenant-b:Tenant B
```

Add one by appending to the list and re-running `pnpm start`. The initializer is
idempotent and matches existing sites **by path**, so re-runs skip sites that
already exist and titles you've since edited in the admin are preserved.

Removing a slug from the list does **not** delete the site — use
`wp site delete` in the admin or via wp-cli.

## Changing the port

Subdirectory Multisite stores each tenant's domain (including the port) in the
`wp_blogs` table at install time, so `WORDPRESS_PORT` is **not** safe to change
after the first `up`. The default is `8080`, chosen because port 80 is commonly
taken by other local stacks.

To change it, either reset with `pnpm clean` and set both `WORDPRESS_PORT`
and `WORDPRESS_SITE_URL` before the next `up`, or search-replace the stored
domain:

```sh
docker compose run --rm --entrypoint wp wp-cli search-replace \
  'localhost:8080' 'localhost:9090' --network --skip-columns=guid
```

The `--entrypoint wp` is load-bearing: this service's entrypoint is
`setup.sh`, so `docker compose run --rm wp-cli wp <command>` hands the wp
arguments to the initializer, which ignores them and re-runs the whole setup.
Any ad-hoc wp-cli command here needs the override.

## Theme

`theme/` is a minimal block theme, "Headless", bind-mounted to
`wp-content/themes/srp-headless` and activated on every tenant by the initializer.
It carries **one template, named Default**, which applies to every request. The
stock themes stay installed but inactive, so their templates don't appear
anywhere.

It exists for the template list, not for looks — nothing renders the front end,
so there's no styling to speak of. Two things are worth knowing before editing
it:

- **`templates/index.html` can't be renamed or removed.** Its presence is what
  makes WordPress treat this as a block theme at all; without it the Site
  Editor disappears and the theme is handled as a classic one. So the single
  template has to be `index`.
- **The name "Default" comes from a filter, not the filename.** Because `index`
  belongs to the default template hierarchy, core overrides whatever title the
  theme declares. `functions.php` filters `default_template_types` to rename it,
  which covers the Site Editor, the template dropdown in page attributes and
  the `/wp/v2/templates` REST route alike.

Adding a second template is just a file: `templates/<slug>.html`, plus a
`customTemplates` entry in `theme.json` if it should be selectable per page.

## Menus

The theme registers two menu locations, **Primary** and **Footer**, and that
registration is what puts **Appearance -> Menus** in the admin: core gates the
screen on `current_theme_supports('menus')`, which `register_nav_menus()` in
`theme/functions.php` sets. Block themes are kept out of Widgets and Customize,
but not out of Menus.

Locations are per theme and menus are per tenant, so every tenant offers the
same two slots and fills them with its own menus. Adding a third location is one
line in `theme/functions.php` and it appears on every tenant at once.

Assign a menu to a location before expecting it over GraphQL. WPGraphQL builds
`MenuLocationEnum` from the registered locations, and only exposes a menu to an
unauthenticated caller once it is assigned to one:

```sh
curl -s -X POST http://localhost:8080/truecrime/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ menuItems(where: {location: PRIMARY}) { nodes { label url } } }"}'
```

These are classic menus, not the Site Editor's Navigation block. A Navigation
block lives in a `wp_navigation` post with no link to a location, so nothing on
the GraphQL side can reliably find it.

## Revalidation

The frontend caches every GraphQL result for hours, so an edit here is invisible
there until the entry expires. `mu-plugins/headless-revalidate.php` closes that
gap: it pings the frontend on a page or menu change with a description of what
changed, and the frontend maps that onto its own cache tags.

It is dormant until both variables are set:

```sh
CMS_REVALIDATE_URL=http://host.docker.internal:3000/api/revalidate
CMS_REVALIDATE_SECRET=local-development-secret   # must match REVALIDATE_SECRET in apps/web
```

`host.docker.internal` is how a container reaches a dev server on the host; in
production this is the deployed frontend's URL. The variables are set on both
the `wordpress` and `wp-cli` services, so a change made with wp-cli pings too.

Requests are non-blocking, which keeps saves fast but makes failures silent --
nothing here sees the response. If a change doesn't land, check the frontend log
and confirm the two secrets match.

Hooked: page saves, publishes, trashes and deletes; menu renames, item edits and
deletions; and menu-to-location assignments, which are a theme mod rather than a
menu edit. Only the `page` post type is wired up, because that is all the
frontend reads.

Pages are reported by **path**, not slug -- `legal/terms`, since that is how the
frontend addresses a nested page. A slug or parent change reports the old path
as well as the new one, plus both paths of every descendant, because moving a
page moves everything under it.

## GraphQL CORS

WPGraphQL's default is `Access-Control-Allow-Origin: *`, which allows any page
to read the endpoint from a visitor's browser. `mu-plugins/headless-cors.php`
replaces that with an allow-list from `CMS_GRAPHQL_ALLOWED_ORIGINS`
(default: `http://localhost:3000`).

This governs browser access only — CORS is enforced client-side, so server-side
callers are unaffected regardless. It is not an authentication boundary; all
content exposed over `/graphql` is public either way. Delete the file to return
to WPGraphQL's open default.

## Notes

- WordPress core is pinned to `7.1.3` in two places that must stay in step: the
  `wordpress` image tag and `WORDPRESS_CORE_VERSION`. The official image only
  seeds core into an _empty_ volume, so the initializer runs `wp core update`
  explicitly when an existing install trails a bumped tag.
- `mu-plugins/` and `theme/` are bind-mounted, so edits apply immediately with
  no rebuild.
  Must-use plugins activate network-wide and can't be deactivated from the
  admin — delete the file instead.
- This app has no `build`, `dev` or `lint` script on purpose, so `turbo run`
  from the repo root never tries to start Docker as part of a build.
- The `.htaccess` for subdirectory Multisite is written by the initializer;
  wp-cli can't regenerate it, and tenant paths 404 without it.
