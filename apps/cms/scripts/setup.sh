#!/usr/bin/env bash
#
# Idempotent headless, multi-tenant WordPress initializer (run by `wp-cli`).
#
#  - Waits for wp-config.php (written by the wordpress container) and the DB.
#  - Installs WordPress core on first run.
#  - Converts the install into a subdirectory Multisite network.
#  - Creates each tenant site listed in WORDPRESS_TENANTS.
#  - Network-activates WPGraphQL so every tenant exposes /graphql.
#  - Activates the bundled 'srp-headless' theme (one template, 'Default').
#  - Writes the subdirectory-multisite .htaccess and flushes rewrites.
#
# Safe to re-run: every step checks current state first, so existing sites and
# any titles changed in the admin are left alone.
set -euo pipefail

BASE_URL="${WORDPRESS_SITE_URL}"

# Extra tenants beyond the primary site, as a comma-separated list of
# `slug:Title` pairs. Matched by path, so renaming a title in the admin sticks.
IFS=',' read -ra TENANTS <<< "${WORDPRESS_TENANTS:-}"

echo "Waiting for wp-config.php..."
until [ -f /var/www/html/wp-config.php ]; do
  sleep 3
done

echo "Waiting for database..."
until wp db check >/dev/null 2>&1; do
  sleep 3
done

# 1. Install WordPress core (single site) on first run.
if ! wp core is-installed >/dev/null 2>&1; then
  echo "Installing WordPress core..."
  wp core install \
    --url="${BASE_URL}" \
    --title="${WORDPRESS_SITE_TITLE}" \
    --admin_user="${WORDPRESS_ADMIN_USER}" \
    --admin_password="${WORDPRESS_ADMIN_PASSWORD}" \
    --admin_email="${WORDPRESS_ADMIN_EMAIL}" \
    --skip-email
else
  echo "WordPress core already installed - skipping."
fi

# 2. Convert to a subdirectory Multisite network on first run. This is what
# makes the install multi-tenant: one codebase and one DB, one site per tenant.
if ! wp core is-installed --network >/dev/null 2>&1; then
  echo "Converting to a Multisite network..."
  wp core multisite-convert --title="${WORDPRESS_SITE_TITLE} Network"
else
  echo "Multisite network already configured - skipping."
fi

# 3. Create the tenant sites.
existing_paths="$(wp site list --field=path 2>/dev/null || true)"
for entry in "${TENANTS[@]}"; do
  entry="$(echo "${entry}" | xargs)"   # trim surrounding whitespace
  [ -z "${entry}" ] && continue
  slug="${entry%%:*}"
  title="${entry#*:}"
  if printf '%s\n' "${existing_paths}" | grep -qx "/${slug}/"; then
    echo "Tenant '${slug}' already exists - skipping."
  else
    echo "Creating tenant '${slug}'..."
    wp site create --slug="${slug}" --title="${title}" --email="${WORDPRESS_ADMIN_EMAIL}"
  fi
done

# 4. Update core files to the target version, then apply DB upgrades. The
# official image only copies core into an *empty* volume, so an existing install
# has to be updated explicitly when the image tag is bumped.
if [ -n "${WORDPRESS_CORE_VERSION:-}" ] && \
   [ "$(wp core version)" != "${WORDPRESS_CORE_VERSION}" ]; then
  echo "Updating WordPress core to ${WORDPRESS_CORE_VERSION}..."
  wp core update --version="${WORDPRESS_CORE_VERSION}" --force
fi
echo "Applying core database upgrades (all tenants)..."
wp core update-db --network

# 5. Install + network-activate WPGraphQL so every tenant exposes /graphql.
# Network activation means new tenants get it automatically.
echo "Ensuring WPGraphQL is installed and network-activated..."
wp plugin is-installed wp-graphql || wp plugin install wp-graphql
wp plugin activate wp-graphql --network

# 6. Enable the bundled 'srp-headless' theme network-wide and activate it on
# every tenant. It carries a single template named Default; the stock themes are
# left installed but inactive, so their templates stay out of the Site Editor.
# The slug is prefixed so it can't collide with a wordpress.org theme, which
# would otherwise let the admin offer an "update" that overwrites the bind mount.
echo "Ensuring the 'srp-headless' theme is active on every tenant..."
wp theme enable srp-headless --network >/dev/null
wp site list --field=url | while read -r site_url; do
  if [ "$(wp theme list --status=active --field=name --url="${site_url}")" = "srp-headless" ]; then
    echo "  ${site_url} already on 'srp-headless' - skipping."
  else
    wp theme activate srp-headless --url="${site_url}"
  fi
done

# 7. Write the subdirectory-multisite .htaccess. wp-cli can't regenerate this
# one, and without it tenant paths 404 before WordPress is ever reached.
echo "Writing multisite .htaccess..."
cat > /var/www/html/.htaccess <<'HTACCESS'
# BEGIN WordPress Multisite
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\.php$ - [L]

# add a trailing slash to /wp-admin
RewriteRule ^([_0-9a-zA-Z-]+/)?wp-admin$ $1wp-admin/ [R=301,L]

RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^([_0-9a-zA-Z-]+/)?(wp-(content|admin|includes).*) $2 [L]
RewriteRule ^([_0-9a-zA-Z-]+/)?(.*\.php)$ $2 [L]
RewriteRule . index.php [L]
# END WordPress Multisite
HTACCESS

# 8. Flush rewrites per tenant so /graphql resolves on each one.
echo "Flushing rewrites for each tenant..."
wp site list --field=url | while read -r site_url; do
  wp rewrite structure '/%postname%/' --url="${site_url}" >/dev/null 2>&1 || true
  wp rewrite flush --url="${site_url}" >/dev/null 2>&1 || true
done

echo ""
echo "Headless multi-tenant WordPress is ready. Tenants:"
wp site list --fields=blog_id,url --format=table
echo ""
echo "Each tenant exposes:  <url>graphql  and  <url>wp-json/wp/v2"
echo "Admin: ${BASE_URL}/wp-admin  (user: ${WORDPRESS_ADMIN_USER})"
