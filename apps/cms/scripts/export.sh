#!/usr/bin/env bash
#
# Exports the running CMS as a *content-only* bundle: one WXR file per site plus
# the settings WXR does not carry (options, menus, active theme). No
# database.sql and no users -- safe to share outside the team. Recipients import
# each wxr/<site>.xml into their own WordPress via Tools -> Import.
#
# Usage (from apps/cms):   ./scripts/export.sh   (or: npm run export)
#
# Runs in two passes: a host pass that drives Docker and zips, and an --inner
# pass that runs inside the wp-cli container (where `wp` and the install live)
# and writes the tree to the mounted /exports. The container image has no zip,
# so the host pass does that.
set -euo pipefail

OPTIONS="blogname blogdescription admin_email timezone_string date_format \
time_format start_of_week permalink_structure page_on_front show_on_front \
posts_per_page template stylesheet"

if [[ "${1:-}" == "--inner" ]]; then
  # -------- Runs inside the wp-cli container --------
  name="wordpress-export-$(date +%F_%H%M%S)-content-only"
  root="/exports/$name"
  mkdir -p "$root/wxr" "$root/config"

  primary_url=$(wp site list --fields=url --format=csv | tail -n +2 | head -1)

  # Network-level facts.
  wp core version >"$root/config/core-version.txt"
  wp plugin list --url="$primary_url" --format=json >"$root/config/network-plugins.json"
  wp site list --fields=blog_id,url,path,registered,public,archived,deleted \
    --format=json >"$root/config/sites.json"

  # Per site.
  wp site list --fields=url --format=csv | tail -n +2 | while read -r url; do
    [ -z "$url" ] && continue
    path=${url#*://*/} # strip scheme + host + first slash
    slug=${path%/}
    [ -z "$slug" ] && slug="primary"
    mkdir -p "$root/config/$slug"

    # Content.
    wp export --url="$url" --stdout 2>/dev/null >"$root/wxr/$slug.xml"

    # Options WXR omits, as a name<TAB>json-value table.
    : >"$root/config/$slug/settings.tsv"
    for opt in $OPTIONS; do
      val=$(wp option get "$opt" --url="$url" --format=json 2>/dev/null || echo '""')
      printf '%s\t%s\n' "$opt" "$val" >>"$root/config/$slug/settings.tsv"
    done
    stylesheet=$(wp option get stylesheet --url="$url" 2>/dev/null || true)
    if [ -n "$stylesheet" ]; then
      val=$(wp option get "theme_mods_$stylesheet" --url="$url" --format=json 2>/dev/null || echo '[]')
      printf '%s\t%s\n' "theme_mods_$stylesheet" "$val" >>"$root/config/$slug/settings.tsv"
    fi

    wp theme list --status=active --url="$url" --format=json >"$root/config/$slug/active-theme.json"
    wp menu location list --url="$url" --format=json >"$root/config/$slug/menu-locations.json"
    wp menu list --url="$url" --format=json >"$root/config/$slug/menus.json"

    # One file of items per menu.
    wp menu list --url="$url" --fields=slug --format=csv | tail -n +2 | while read -r mslug; do
      [ -z "$mslug" ] && continue
      wp menu item list "$mslug" --url="$url" --fields=db_id,type,title,link,position \
        --format=json >"$root/config/$slug/menu-items-$mslug.json"
    done
  done

  cat >"$root/README.md" <<'MD'
# WordPress export (content only)

Per-site content plus the settings a WXR does not carry. No `database.sql` and
no users, so this is safe to share outside the team.

| Path | What it is |
| --- | --- |
| `wxr/<site>.xml` | One WordPress eXtended RSS file per site: posts, pages, terms, menu items, custom fields, authors. Import via **Tools -> Import -> WordPress**. |
| `config/sites.json` | The network's sites: blog ids, URLs, paths. |
| `config/network-plugins.json` | Plugins and activation status. |
| `config/core-version.txt` | WordPress core version. |
| `config/<site>/settings.tsv` | Options WXR omits: title, permalink structure, front page, active theme, `nav_menu_locations`. |
| `config/<site>/active-theme.json` | Active theme and version. |
| `config/<site>/menus.json` | Menus and the location each is assigned to. |
| `config/<site>/menu-locations.json` | Locations the theme registers. |
| `config/<site>/menu-items-<menu>.json` | A menu's items, in order. |

## Restoring, per site

Install the WordPress Importer, then **Tools -> Import -> WordPress** and upload
the relevant `wxr/<site>.xml`.

A WXR restores a menu but leaves it unassigned, because menu-to-location is a
theme mod, not part of the menu. Re-assign it under **Appearance -> Menus**
(see `nav_menu_locations` in each site's `settings.tsv`), or nothing comes back
over GraphQL for that location.
MD

  echo "wrote $root"
  exit 0
fi

# -------- Host pass --------
cd "$(dirname "$0")/.." # apps/cms

if ! docker compose ps --status running --format '{{.Service}}' | grep -q '^wordpress$'; then
  echo "The CMS stack is not running. Start it first: npm start" >&2
  exit 1
fi

mkdir -p exports
docker compose run --rm -v "$PWD/exports:/exports" --entrypoint bash -T wp-cli \
  /scripts/export.sh --inner

cd exports
dir=$(ls -dt wordpress-export-*-content-only/ 2>/dev/null | head -1)
dir=${dir%/}
if [ -z "$dir" ]; then
  echo "No export directory was produced." >&2
  exit 1
fi
rm -f "$dir.zip"
zip -rq "$dir.zip" "$dir"
echo "Export ready to share: apps/cms/exports/$dir.zip"
