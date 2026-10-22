import type { IWordPressMenuItem } from './typings';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Wire up the TV Guide's relative-day items against the current date:
 *
 *   - "Today" links to the weekday page for today, "Tomorrow" to tomorrow's.
 *   - The two weekday items those now cover are hidden.
 *   - The remaining weekday items are reordered to run forward from the day
 *     after tomorrow, wrapping around the week -- so on a Thursday the submenu
 *     reads Today, Tomorrow, Saturday, Sunday, Monday, Tuesday, Wednesday.
 *
 * Applies to any submenu that has a "Today" or "Tomorrow" item, matching the
 * weekday items by label. Recomputed from `now` each call -- run it per request,
 * not inside a cached fetch, or it goes stale overnight. Returns new nodes; the
 * (cached) menu passed in is never mutated.
 */
export function withTvGuideDays(
  items: IWordPressMenuItem[],
  now: Date = new Date()
): IWordPressMenuItem[] {
  const todayIndex = now.getDay();
  const todayName = WEEKDAYS[todayIndex];

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowName = WEEKDAYS[tomorrow.getDay()];

  const isWeekday = (label: string): boolean =>
    (WEEKDAYS as readonly string[]).includes(label);

  // Days ahead of today, 0 (today) .. 6, so sorting runs the week forward.
  const daysFromToday = (label: string): number =>
    (WEEKDAYS.indexOf(label as (typeof WEEKDAYS)[number]) - todayIndex + 7) % 7;

  const transform = (
    nodes: IWordPressMenuItem[]
  ): IWordPressMenuItem[] => {
    const recurse = (node: IWordPressMenuItem): IWordPressMenuItem => ({
      ...node,
      children: transform(node.children),
    });

    const hasRelativeDays = nodes.some(
      (node) => node.label === 'Today' || node.label === 'Tomorrow'
    );
    if (!hasRelativeDays) {
      return nodes.map(recurse);
    }

    const uriByWeekday = new Map(
      nodes
        .filter((node) => isWeekday(node.label))
        .map((node) => [node.label, node.uri] as const)
    );

    // Non-weekday items (Today, Tomorrow, ...) keep their order; Today and
    // Tomorrow get pointed at the matching weekday page.
    const leading = nodes
      .filter((node) => !isWeekday(node.label))
      .map((node) => {
        if (node.label === 'Today') {
          return { ...node, uri: uriByWeekday.get(todayName) ?? node.uri };
        }
        if (node.label === 'Tomorrow') {
          return { ...node, uri: uriByWeekday.get(tomorrowName) ?? node.uri };
        }
        return node;
      });

    // Visible weekday items, ordered forward from the day after tomorrow.
    const weekdays = nodes
      .filter(
        (node) =>
          isWeekday(node.label) &&
          node.label !== todayName &&
          node.label !== tomorrowName
      )
      .sort((a, b) => daysFromToday(a.label) - daysFromToday(b.label));

    return [...leading, ...weekdays].map(recurse);
  };

  return transform(items);
}
