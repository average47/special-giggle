<?php
/**
 * Plugin Name: Headless Revalidation
 * Description: Pings the frontend's revalidation endpoint when a tenant's pages
 *              or menus change, so cached GraphQL results don't go stale.
 * Network:     true
 *
 * The frontend caches every GraphQL result for hours (see `use cache` in
 * apps/web/lib/wordpress.ts), which means an edit here is invisible there until
 * the entry expires. This tells it what changed instead.
 *
 * The payload is semantic, not a list of cache tags -- the frontend owns its own
 * tag format, right next to the functions that set it:
 *
 *   { "networkPath": "truecrime", "pages": ["about"], "menuLocations": ["PRIMARY"] }
 *
 * Configured with two environment variables, both unset by default, which
 * leaves this plugin dormant:
 *
 *   CMS_REVALIDATE_URL     e.g. http://host.docker.internal:3000/api/revalidate
 *   CMS_REVALIDATE_SECRET  must match REVALIDATE_SECRET in apps/web
 *
 * Requests are non-blocking, so a slow or absent frontend can't make saving a
 * page slow or fail. The flip side is that failures are invisible: nothing here
 * can see the response status. Check the frontend's log if a change doesn't
 * land.
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
	exit;
}

/**
 * The frontend's identifier for the current site: a tenant's subdirectory, or
 * the sentinel for the network root, which is not a tenant but holds the pages
 * every tenant shares. Keep in step with SHARED_SITE in
 * apps/web/lib/wordpress.ts.
 */
function srp_revalidate_network_path(): string {
	$path = trim((string) get_blog_details(get_current_blog_id())->path, '/');

	return '' === $path ? '@network-root' : $path;
}

/**
 * Posts one semantic payload to the frontend. Both keys are optional; the
 * endpoint rejects a request carrying neither.
 *
 * @param string[] $pages          Page slugs whose cached result is now wrong.
 * @param string[] $menu_locations Menu locations whose cached result is now wrong.
 */
function srp_revalidate(array $pages = array(), array $menu_locations = array()): void {
	$url    = (string) getenv('CMS_REVALIDATE_URL');
	$secret = (string) getenv('CMS_REVALIDATE_SECRET');

	if ('' === $url || '' === $secret) {
		return;
	}

	$pages          = array_values(array_unique(array_filter($pages)));
	$menu_locations = array_values(array_unique(array_filter($menu_locations)));

	if (array() === $pages && array() === $menu_locations) {
		return;
	}

	wp_remote_post(
		$url,
		array(
			'blocking' => false,
			'timeout'  => 1,
			'headers'  => array(
				'Content-Type'        => 'application/json',
				'x-revalidate-secret' => $secret,
			),
			'body'     => wp_json_encode(
				array(
					'networkPath'    => srp_revalidate_network_path(),
					'pages'          => $pages,
					'menuLocations'  => $menu_locations,
				)
			),
		)
	);
}

/**
 * Pages.
 *
 * The frontend keys a page on its whole path, not its last segment, because a
 * nested page is addressed that way: `legal/terms`, not `terms`. So everything
 * below reports paths from get_page_uri(), never post_name.
 *
 * @return string[] The paths of every descendant of a page, as they are now.
 */
function srp_revalidate_descendant_paths(int $post_id): array {
	$children = get_pages(
		array(
			'child_of'    => $post_id,
			'post_status' => 'publish,draft,pending,private',
		)
	);

	return array_map(
		static fn(WP_Post $child): string => get_page_uri($child),
		$children ?: array()
	);
}

/**
 * `post_updated` carries the before and after, so a slug or parent change can
 * invalidate both paths -- the old one would otherwise keep serving this page.
 *
 * Re-slugging or re-parenting a page moves every descendant too, so their old
 * paths need invalidating as well. A descendant's current path begins with the
 * page's new path, so swapping that prefix back reconstructs where it used to
 * live.
 *
 * Only the `page` post type is wired up, because that is all the frontend reads
 * -- extend the guard when posts get consumed too.
 */
add_action(
	'post_updated',
	static function (int $post_id, WP_Post $after, WP_Post $before): void {
		if ('page' !== $after->post_type || wp_is_post_revision($post_id)) {
			return;
		}

		$new_path = get_page_uri($after);
		$old_path = get_page_uri($before);
		$paths    = array($new_path, $old_path);

		if ($new_path !== $old_path) {
			foreach (srp_revalidate_descendant_paths($post_id) as $descendant_path) {
				$paths[] = $descendant_path;
				$paths[] = $old_path . substr($descendant_path, strlen($new_path));
			}
		}

		srp_revalidate($paths);
	},
	10,
	3
);

// A first publish, and a trash or restore, don't go through post_updated with a
// meaningful before/after pair -- status transitions cover those.
add_action(
	'transition_post_status',
	static function (string $new_status, string $old_status, WP_Post $post): void {
		if ('page' !== $post->post_type || $new_status === $old_status) {
			return;
		}

		srp_revalidate(array(get_page_uri($post)));
	},
	10,
	3
);

add_action(
	'before_delete_post',
	static function (int $post_id, WP_Post $post): void {
		if ('page' !== $post->post_type) {
			return;
		}

		// Descendants are about to be orphaned or deleted with it.
		srp_revalidate(
			array_merge(
				array(get_page_uri($post)),
				srp_revalidate_descendant_paths($post_id)
			)
		);
	},
	10,
	2
);

/**
 * Menus.
 *
 * The frontend caches a menu per location, not per menu, so a changed menu
 * invalidates whichever locations it is assigned to -- and an unassigned menu
 * invalidates nothing, since nothing can read it.
 *
 * @return string[]
 */
function srp_revalidate_locations_for_menu(int $menu_id): array {
	$locations = get_theme_mod('nav_menu_locations');

	if (!is_array($locations)) {
		return array();
	}

	return array_map(
		'strtoupper',
		array_keys(
			array_filter(
				$locations,
				static fn($assigned_menu_id): bool => (int) $assigned_menu_id === $menu_id
			)
		)
	);
}

// Renaming a menu, reordering it, or editing one of its items.
add_action(
	'wp_update_nav_menu',
	static function (int $menu_id): void {
		srp_revalidate(array(), srp_revalidate_locations_for_menu($menu_id));
	}
);

add_action(
	'wp_update_nav_menu_item',
	static function (int $menu_id): void {
		srp_revalidate(array(), srp_revalidate_locations_for_menu($menu_id));
	}
);

// Deleting a menu empties whatever location held it, but the assignment is gone
// by the time this fires, so every location has to be invalidated.
add_action(
	'wp_delete_nav_menu',
	static function (): void {
		srp_revalidate(array(), array_map('strtoupper', array_keys(get_registered_nav_menus())));
	}
);

/**
 * Assigning a menu to a location, or clearing one, is a theme mod rather than a
 * menu edit. Both the locations that changed and the menus involved matter, so
 * this compares old and new and invalidates the difference.
 */
add_action(
	'update_option_theme_mods_srp-headless',
	static function ($old_value, $new_value): void {
		$old = is_array($old_value) && isset($old_value['nav_menu_locations'])
			? (array) $old_value['nav_menu_locations']
			: array();
		$new = is_array($new_value) && isset($new_value['nav_menu_locations'])
			? (array) $new_value['nav_menu_locations']
			: array();

		$changed = array_keys(
			array_merge(
				array_diff_assoc($old, $new),
				array_diff_assoc($new, $old)
			)
		);

		srp_revalidate(array(), array_map('strtoupper', $changed));
	},
	10,
	2
);
