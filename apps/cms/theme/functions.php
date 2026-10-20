<?php
/**
 * A block theme must ship templates/index.html -- it's what makes WordPress
 * treat the theme as a block theme at all -- and core then forces that
 * template's title to "Index", overriding anything the theme declares, because
 * `index` is part of the default template hierarchy. See the
 * `$default_template_types` lookup in wp-includes/block-template-utils.php.
 *
 * The lookup is filterable, so this renames the one template this theme has to
 * "Default" wherever WordPress reports it: the Site Editor, the page-attributes
 * template dropdown and the /wp/v2/templates REST route.
 */

declare(strict_types=1);

add_filter(
	'default_template_types',
	static function (array $types): array {
		if (isset($types['index'])) {
			$types['index']['title']       = __('Default', 'srp-headless');
			$types['index']['description'] = __(
				'The only template in this theme. Applies to every request.',
				'srp-headless'
			);
		}

		return $types;
	}
);

/**
 * Menu locations.
 *
 * Registering any location is what puts "Menus" back under Appearance:
 * wp-admin/menu.php gates that screen on `current_theme_supports('menus')`,
 * and register_nav_menus() sets exactly that support. Block themes are not
 * excluded from the screen, only from Widgets and Customize.
 *
 * Classic menus, not the Site Editor's Navigation block, because this install
 * is consumed over GraphQL: WPGraphQL builds its MenuLocationEnum from the
 * locations registered here, and only exposes a menu to an unauthenticated
 * caller once that menu is assigned to one of them. A Navigation block lives
 * in a wp_navigation post instead and has no such connection.
 *
 * Locations are per-theme, not per-site, so every tenant in the network gets
 * the same set and fills them with its own menus.
 */
add_action(
	'after_setup_theme',
	static function (): void {
		register_nav_menus([
			'primary' => __('Primary', 'srp-headless'),
			'footer'  => __('Footer', 'srp-headless'),
		]);
	}
);
