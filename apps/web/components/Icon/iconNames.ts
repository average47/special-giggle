// The ids of every <symbol> in sprite.svg, the single source of truth for which
// icon names are renderable. Regenerate when the sprite changes:
//
//   grep -oE '<symbol[^>]*id="[^"]*"' sprite.svg \
//     | grep -oE 'id="[^"]*"' | sed -E 's/id="([^"]*)"/\1/' | sort
export const ICON_NAMES = [
  'accountCircle', 'add', 'addCard', 'addLink', 'arrowBack', 'arrowDownward',
  'arrowDropDown', 'arrowDropUp', 'arrowForward', 'arrowLeft', 'arrowRight',
  'arrowUpward', 'audioDescription', 'chat', 'chatBubble', 'check', 'checkSmall',
  'chevronDown', 'chevronLeft', 'chevronRight', 'chevronUp', 'chromecast',
  'clockLoader10', 'clockLoader20', 'clockLoader40', 'clockLoader60',
  'clockLoader80', 'clockLoader90', 'close', 'closedCaption',
  'closedCaptionDisabled', 'collections', 'collectionsBookmark', 'comment',
  'connectedTV', 'creditCard', 'creditCardOff', 'creditScore', 'delete',
  'doDisturb', 'download', 'downloadDone', 'downloading', 'downloadingPause',
  'downloadingStop', 'email', 'error', 'explore', 'facebook', 'fastForward',
  'fastRewind', 'featuredVideo', 'fiberDVR', 'filterList', 'forward10',
  'forward30', 'forward5', 'fullscreen', 'gridView', 'group', 'groupAdd',
  'groupOff', 'hd', 'hdrOff', 'hdrOn', 'headphones', 'help', 'home', 'info',
  'instagram', 'iosShare', 'keyboardDoubleArrowDown', 'keyboardDoubleArrowLeft',
  'keyboardDoubleArrowRight', 'keyboardDoubleArrowUp', 'launch', 'list', 'live',
  'loading', 'locationOff', 'locationOn', 'login', 'logout', 'moreHorizontal',
  'moreVertical', 'movies', 'myStuff', 'pauseCircle', 'payment', 'payments',
  'people', 'play', 'playArrow', 'playCircle', 'playDisabled', 'playPause',
  'reddit', 'refresh', 'remove', 'repeat', 'repeatOne', 'replay10', 'replay15',
  'replay30', 'reportProblem', 'resume', 'search', 'selectToSpeak', 'series',
  'settings', 'settingsAlert', 'share', 'skipNext', 'skipPrevious', 'sort',
  'starHalf', 'starOutline', 'stop', 'subscriptions', 'subtitles',
  'subtitlesOff', 'thumbDown', 'thumbUp', 'tiktok', 'tv', 'tvOff', 'twitter',
  'unfoldLess', 'unfoldMore', 'videoSettings', 'visibility', 'visibilityOff',
  'volumeDown', 'volumeMute', 'volumeOff', 'volumeUp', 'watchLater', 'x',
  'youtube',
] as const;

export type TIconName = (typeof ICON_NAMES)[number];

// Lowercased, alphanumeric-only key -> canonical id, so a human label resolves
// case- and separator-insensitively: "TikTok" and "Account Circle" both land.
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const bySlug = new Map<string, TIconName>(
  ICON_NAMES.map((name) => [normalize(name), name])
);

/**
 * The sprite id a menu label maps to, or null when the sprite has no icon for
 * it -- the caller falls back to the text label in that case.
 */
export function resolveIconName(label: string): TIconName | null {
  return bySlug.get(normalize(label)) ?? null;
}
