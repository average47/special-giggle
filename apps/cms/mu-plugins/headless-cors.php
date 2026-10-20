<?php
/**
 * Plugin Name: Headless GraphQL CORS
 * Description: Restricts browser access to /graphql to an allow-list of
 *              frontend origins, replacing WPGraphQL's wildcard default.
 * Network:     true
 *
 * Dropped in wp-content/mu-plugins, so it auto-activates for every tenant in
 * the Multisite network without a separate activation step.
 *
 * WPGraphQL ships `Access-Control-Allow-Origin: *` (see its Router.php), which
 * lets any page on the internet read the endpoint from a visitor's browser.
 * That is a reasonable default for a wholly public content API, but it also
 * means an allow-list is only meaningful if the wildcard is removed first --
 * so this filter unsets it unconditionally and then echoes back only an exact
 * match. Delete this file to return to WPGraphQL's open default.
 *
 * Scope is deliberately narrow: the filter only runs for WPGraphQL responses,
 * so it cannot affect wp-admin or the REST API. It also only governs *browser*
 * access -- CORS is enforced by the browser, so server-side callers (a Next.js
 * server component, curl, another service) are unaffected either way. This is
 * not an authentication boundary; use WPGraphQL's auth for that.
 *
 * Origins come from CMS_GRAPHQL_ALLOWED_ORIGINS as a comma-separated list, e.g.
 *
 *   CMS_GRAPHQL_ALLOWED_ORIGINS=http://localhost:3000,https://example.com
 *
 * Unset falls back to the local Next dev server.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'graphql_response_headers_to_send',
	static function ( $headers ) {
		$configured = (string) getenv( 'CMS_GRAPHQL_ALLOWED_ORIGINS' );
		$allowed    = '' !== $configured
			? array_filter( array_map( 'trim', explode( ',', $configured ) ) )
			: array( 'http://localhost:3000' );

		// Drop WPGraphQL's wildcard. Matched case-insensitively, since the key
		// casing is WPGraphQL's to change, not ours.
		foreach ( array_keys( (array) $headers ) as $key ) {
			if ( 0 === strcasecmp( 'Access-Control-Allow-Origin', (string) $key ) ) {
				unset( $headers[ $key ] );
			}
		}

		$origin = isset( $_SERVER['HTTP_ORIGIN'] )
			? esc_url_raw( wp_unslash( $_SERVER['HTTP_ORIGIN'] ) )
			: '';

		if ( '' !== $origin && in_array( $origin, $allowed, true ) ) {
			$headers['Access-Control-Allow-Origin'] = $origin;
			// Tell caches the response varies by requesting origin, so one
			// origin's allowed response is not served to another.
			$headers['Vary'] = 'Origin';
		}

		return $headers;
	}
);
