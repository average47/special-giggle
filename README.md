# super-rotary-phone

A [Turborepo](https://turbo.build) monorepo using pnpm workspaces.

## Layout

| Path                   | What it is                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| [`apps/web`](apps/web) | Next.js 16 frontend — TypeScript, ESLint, App Router                                         |
| [`apps/cms`](apps/cms) | Headless multi-tenant WordPress + GraphQL, via Docker — see its [README](apps/cms/README.md) |
| [`index.js`](index.js) | Schedule feed fetcher (see [below](#schedule-fetcher))                                       |

Workspaces are `apps/*` and `packages/*`, declared in
[`pnpm-workspace.yaml`](pnpm-workspace.yaml). There is no `packages/` yet.

## Requirements

- Node 22+ — `index.js` relies on the built-in `fetch`
- pnpm 12+ (the repo is pnpm-based; there's no npm or yarn lockfile) — the
  `packageManager` pin in `package.json` lets Corepack fetch the right version
- Docker, for `apps/cms` only

## Getting started

```sh
pnpm install       # installs every workspace
pnpm dev           # turbo: starts apps/web on :3000
pnpm build         # turbo: builds every workspace that has a build task
pnpm lint          # turbo: lints every workspace that has a lint task
pnpm format        # prettier: formats the repo in place
pnpm format:check  # prettier: reports what isn't formatted, changes nothing
```

Formatting is Prettier, configured once at the root in
[`.prettierrc`](.prettierrc) and applied to every workspace — there's no
per-app config. [`.prettierignore`](.prettierignore) holds the exclusions;
`pnpm-lock.yaml` and `pnpm-workspace.yaml` are in it because pnpm rewrites both
itself.

**Format on save** is already set up for VS Code in
[`.vscode/settings.json`](.vscode/settings.json), but it needs the
[Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
(`esbenp.prettier-vscode`) — VS Code will offer it on first open via
[`.vscode/extensions.json`](.vscode/extensions.json). Without the extension the
settings do nothing and `pnpm format` is the fallback. In another editor, point
it at the same root config. ESLint has no formatting rules here, so the two
don't overlap and `eslint-config-prettier` isn't needed.

`apps/cms` is excluded from `dev`, `build` and `lint` on purpose — it's a Docker
stack, not something that should start as a side effect of a build. Drive it
directly instead:

```sh
pnpm --filter cms start        # start WordPress (first run takes a minute or two)
pnpm --filter cms logs:setup   # follow the initializer log
pnpm --filter cms down         # stop, keeping data
pnpm --filter cms clean        # stop and delete the volumes (full reset)
```

Once up, the network admin is at http://localhost:8080/wp-admin (`admin` /
`admin`) and each tenant serves its own GraphQL endpoint. Port, tenants and
credentials are all configurable — see [`apps/cms/README.md`](apps/cms/README.md).

## Schedule fetcher

`index.js` fetches the TRUE CRIME EPG feed (Pawa.tv `channel_24`) and prints it
to stdout as JSON — roughly a thousand events, so redirect it somewhere:

```sh
pnpm start > schedule.json
```

Two quirks of that feed are handled in the script: it's served with a UTF-8 BOM
that the XML parser rejects as stray content, and the `programmeImage`,
`seriesImage` and `episodeImage` tags each appear twice per event, as
`type="original"` and `type="cropped"` (preserved as `@type`).

The fetcher still lives at the repo root rather than in a workspace, which is
why the root `package.json` carries both the `fast-xml-parser` dependency and a
`start` script. Moving it under `packages/` is a known tidy-up.

## Caveats

- **`apps/cms` port is 8080, not 80.** Subdirectory Multisite records each
  tenant's domain _and port_ in the database at install time, so it can't be
  changed afterwards without a search-replace. Details in the CMS README.
- **`pnpm audit` reports one high-severity finding** from `braces`, reaching in
  via `eslint-config-next`. It's lint-time only and never enters a production
  bundle, and there's no patched `braces` to move to — pinning one through
  `pnpm.overrides` would only paper over the advisory. It ships this way from
  `create-next-app`, so it's upstream.
- **pnpm doesn't run dependency build scripts unless they're allowed.** The one
  this repo needs is listed under `allowBuilds` in
  [`pnpm-workspace.yaml`](pnpm-workspace.yaml); if a new dependency's
  postinstall gets blocked, `pnpm install` says so and
  `pnpm approve-builds <pkg>` records the decision there.
