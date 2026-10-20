import { XMLParser } from 'fast-xml-parser';

const FEED_URL =
  'https://distribution.assets.pawa.tv/metadatadistribution/channel_24/schedule.xml';

const response = await fetch(FEED_URL);
if (!response.ok) {
  throw new Error(
    `Feed request failed: ${response.status} ${response.statusText}`
  );
}

// The feed is served with a UTF-8 BOM, which the parser rejects as stray content.
const xml = (await response.text()).replace(/^﻿/, '');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  isArray: (name) => name === 'event',
});

const { schedule } = parser.parse(xml);

console.log(JSON.stringify(schedule.event ?? [], null, 2));
