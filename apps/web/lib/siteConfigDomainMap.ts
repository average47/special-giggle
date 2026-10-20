import type { ISiteConfig } from './typings';

const truecrimeConfig: ISiteConfig = {
  networkPath: 'truecrime',
  width: 200,
  height: 60,
};

const truecrimextraConfig: ISiteConfig = {
  networkPath: 'truecrimextra',
  width: 258,
  height: 60,
};

const legendConfig: ISiteConfig = {
  networkPath: 'legend',
  width: 132,
  height: 60,
};

const legendxtraConfig: ISiteConfig = {
  networkPath: 'legendxtra',
  width: 200,
  height: 60,
};

const siteConfigDomainMap: Record<string, ISiteConfig> = {
  'truecrime-tv.co.uk': truecrimeConfig,
  'truecrime-tv.localhost': truecrimeConfig,
  'truecrimextra-tv.co.uk': truecrimextraConfig,
  'truecrimextra-tv.localhost': truecrimextraConfig,
  'legend-tv.co.uk': legendConfig,
  'legend-tv.localhost': legendConfig,
  'legendxtra-tv.co.uk': legendxtraConfig,
  'legendxtra-tv.localhost': legendxtraConfig,
};

export const siteConfigNetworkMap: Record<string, ISiteConfig> = {
  truecrime: truecrimeConfig,
  truecrimextra: truecrimextraConfig,
  legend: legendConfig,
  legendxtra: legendxtraConfig,
};

export default siteConfigDomainMap;
