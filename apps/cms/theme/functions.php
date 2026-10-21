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
			'subhead' => __('Subhead', 'srp-headless'),
			'footer'  => __('Footer', 'srp-headless'),
		]);
	}
);

/**
 * Per-item menu options.
 *
 * Two options sit on each menu item, both consumed by the headless frontend
 * (apps/web/components/MenuItems.tsx):
 *
 *   - "Open in new tab" is WordPress's own `target` field. Core hides its column
 *     in the menu editor by default and stores the preference per user, so the
 *     filter below unhides it for everyone rather than making each editor turn
 *     it on under Screen Options. WPGraphQL already exposes it as
 *     `MenuItem.target` (`_blank` when ticked), so nothing else is needed.
 *
 *   - "Use icon" is ours. It has no native field, meta key, or GraphQL field, so
 *     all three are added here: the checkbox in the editor, the
 *     `_menu_item_use_icon` post meta it saves to, and the `MenuItem.useIcon`
 *     boolean the frontend reads.
 */

/**
 * Unhide the native "Link Target" column (the "open in a new tab" checkbox).
 *
 * The nav-menus screen stores hidden columns in the `managenav-menuscolumnshidden`
 * user option and ships with `link-target` among them. Filtering the option as it
 * is read shows the column for every editor without touching their saved choices
 * for the other advanced columns.
 */
add_filter(
	'get_user_option_managenav-menuscolumnshidden',
	static function ($columns) {
		if (is_array($columns)) {
			return array_values(array_diff($columns, ['link-target']));
		}

		return $columns;
	}
);

/**
 * Render the "Use icon" checkbox in the menu item editor.
 *
 * The hidden companion input always posts, so the save handler can tell an
 * unticked box in a submitted form (delete the meta) from an item that was not
 * part of the form at all (leave it alone) -- a bare checkbox posts nothing when
 * unticked and the two cases would be indistinguishable.
 */
add_action(
	'wp_nav_menu_item_custom_fields',
	static function (int $item_id): void {
		$checked = get_post_meta($item_id, '_menu_item_use_icon', true) === '1';
		?>
		<p class="field-use-icon description description-wide">
			<label for="edit-menu-item-use-icon-<?php echo esc_attr((string) $item_id); ?>">
				<input type="hidden" name="menu-item-use-icon-present[<?php echo esc_attr((string) $item_id); ?>]" value="1" />
				<input
					type="checkbox"
					id="edit-menu-item-use-icon-<?php echo esc_attr((string) $item_id); ?>"
					name="menu-item-use-icon[<?php echo esc_attr((string) $item_id); ?>]"
					value="1"
					<?php checked($checked); ?>
				/>
				<?php esc_html_e('Use Icon', 'srp-headless'); ?>
			</label>
		</p>
		<?php
	},
	10,
	1
);

/**
 * Persist "Use icon" to post meta when a menu is saved.
 *
 * Core verifies the `update-nav_menu` nonce before firing this action on an
 * admin save; the companion marker scopes us to items our own field was rendered
 * for, so programmatic `wp_update_nav_menu_item()` calls elsewhere are ignored.
 */
add_action(
	'wp_update_nav_menu_item',
	static function (int $menu_id, int $menu_item_db_id): void {
		if (!isset($_POST['menu-item-use-icon-present'][$menu_item_db_id])) {
			return;
		}

		if (isset($_POST['menu-item-use-icon'][$menu_item_db_id])) {
			update_post_meta($menu_item_db_id, '_menu_item_use_icon', '1');
		} else {
			delete_post_meta($menu_item_db_id, '_menu_item_use_icon');
		}
	},
	10,
	2
);

/**
 * Expose "Use icon" over WPGraphQL as `MenuItem.useIcon`.
 *
 * This action only fires when WPGraphQL is active, which it is network-wide, so
 * register_graphql_field() is always defined here.
 */
add_action(
	'graphql_register_types',
	static function (): void {
		register_graphql_field(
			'MenuItem',
			'useIcon',
			[
				'type'        => 'Boolean',
				'description' => __(
					'Whether the frontend should render this item as an icon rather than a text label.',
					'srp-headless'
				),
				'resolve'     => static function ($menu_item): bool {
					$id = is_object($menu_item) && isset($menu_item->databaseId)
						? (int) $menu_item->databaseId
						: 0;

					return $id > 0
						&& get_post_meta($id, '_menu_item_use_icon', true) === '1';
				},
			]
		);
	}
);
