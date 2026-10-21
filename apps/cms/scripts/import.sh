#!/usr/bin/env bash
#
# Imports a *content-only* bundle (as produced by export.sh) into the running
# CMS: per-site WXR, then the settings and menu-to-location assignments a WXR
# does not carry. The inverse of export.sh.
#
# Usage (from apps/cms):
#   ./scripts/import.sh <bundle>         # bundle = a .zip or an unzipped dir
#   npm run import -- ./exports/wordpress-export-....zip
#
# Import content into a FRESH install. The WordPress Importer skips posts it
# already has (by GUID) but will duplicate menu items, so re-importing into a
# site that already holds this content creates duplicates.
#
# Two passes like export.sh: a host pass that resolves the bundle, drives Docker
# and unzips, and an --inner pass that runs inside the wp-cli container.
set -euo pipefail

# Options safe to reapply. Deliberately omits admin_email, template, stylesheet
# (theme is network-set) and page_on_front (its post id changes on import).
IMPORT_OPTIONS="blogname blogdescription timezone_string date_format \
time_format start_of_week permalink_structure posts_per_page show_on_front"

if [[ "${1:-}" == "--inner" ]]; then
  # -------- Runs inside the wp-cli container --------
  src=/import
  [ -d "$src/wxr" ] || {
    echo "No wxr/ folder in the bundle." >&2
    exit 1
  }

  # The WordPress Importer provides the WXR parser `wp import` needs.
  if ! wp plugin is-installed wordpress-importer >/dev/null 2>&1; then
    wp plugin install wordpress-importer || {
      echo "Could not install the WordPress Importer (needs internet)." >&2
      exit 1
    }
  fi
  wp plugin activate wordpress-importer --network >/dev/null 2>&1 || true

  wp site list --fields=url --format=csv | tail -n +2 | while read -r url; do
    [ -z "$url" ] && continue
    path=${url#*://*/}
    slug=${path%/}
    [ -z "$slug" ] && slug="primary"

    wxr="$src/wxr/$slug.xml"
    [ -f "$wxr" ] || {
      echo "skip $slug (no WXR in bundle)"
      continue
    }
    echo "== $slug =="
    wp import "$wxr" --authors=create --url="$url"

    cfg="$src/config/$slug"

    # Reapply the options WXR dropped.
    if [ -f "$cfg/settings.tsv" ]; then
      while IFS=$'\t' read -r opt val; do
        [ -z "$opt" ] && continue
        case " $IMPORT_OPTIONS " in
          *" $opt "*)
            wp option update "$opt" "$val" --format=json --url="$url" >/dev/null
            ;;
        esac
      done <"$cfg/settings.tsv"
      wp rewrite flush --url="$url" >/dev/null 2>&1 || true
    fi

    # Re-assign menus to locations. Looked up by the imported menu's slug so a
    # menu's new term id is used, not the stale one from the source network.
    if [ -f "$cfg/menus.json" ]; then
      php -r '$m=json_decode(file_get_contents($argv[1]),true)?:[]; foreach($m as $x){foreach(($x["locations"]??[]) as $l){echo $x["slug"]."\t".$l."\n";}}' \
        "$cfg/menus.json" | while IFS=$'\t' read -r mslug loc; do
        [ -z "$mslug" ] && continue
        if wp menu location assign "$mslug" "$loc" --url="$url" >/dev/null 2>&1; then
          echo "  assigned '$mslug' -> $loc"
        else
          echo "  WARN: could not assign '$mslug' -> $loc"
        fi
      done
    fi
  done

  echo "Import complete."
  exit 0
fi

# -------- Host pass --------
cd "$(dirname "$0")/.." # apps/cms

bundle="${1:-}"
if [ -z "$bundle" ]; then
  echo "Usage: ./scripts/import.sh <bundle.zip | bundle-dir>" >&2
  exit 1
fi
[ -e "$bundle" ] || {
  echo "Not found: $bundle" >&2
  exit 1
}

if ! docker compose ps --status running --format '{{.Service}}' | grep -q '^wordpress$'; then
  echo "The CMS stack is not running. Start it first: npm start" >&2
  exit 1
fi

tmp=""
src="$bundle"
if [[ "$bundle" == *.zip ]]; then
  tmp="exports/.import-tmp-$$"
  rm -rf "$tmp"
  mkdir -p "$tmp"
  unzip -q "$bundle" -d "$tmp"
  src="$tmp"
fi

# The bundle root is whatever directory contains wxr/.
wxr_dir=$(find "$src" -maxdepth 3 -type d -name wxr 2>/dev/null | head -1)
if [ -z "$wxr_dir" ]; then
  echo "No wxr/ folder found inside $bundle" >&2
  [ -n "$tmp" ] && rm -rf "$tmp"
  exit 1
fi
bundle_abs=$(cd "$(dirname "$wxr_dir")" && pwd)

docker compose run --rm -v "$bundle_abs:/import:ro" --entrypoint bash -T wp-cli \
  /scripts/import.sh --inner

[ -n "$tmp" ] && rm -rf "$tmp"
