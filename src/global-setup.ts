import path from 'path';
import waitOn from 'wait-on';
import fetch from 'node-fetch';
import type { PlaywrightTestConfig } from '@playwright/test';
import type { IndexEntry, StoryIndex } from '@storybook/types';
import { log, debug } from './util';

let _index: IndexEntry[];

export const lookupTitle = (filename: string) => {
  const relativePath = './' + path.relative(process.cwd(), filename);
  debug('lookupTitle', filename, relativePath, _index);
  const entry = _index.find((entry) => entry.importPath.startsWith(relativePath));
  if (!entry) {
    throw new Error(
      `Could not find title for ${relativePath} in ${_index.map((entry) => entry.importPath)}`
    );
  }
  return entry.title;
};

// Set up the path => title index
const setup = async (config: PlaywrightTestConfig) => {
  const webServerUrl = Array.isArray(config.webServer)
    ? config.webServer[0].url
    : config.webServer?.url;
  const url = `${webServerUrl}/index.json`;
  log('Fetching...', url);
  await waitOn({ resources: [url], interval: 50 });
  const index = (await fetch(url).then((res) => res.json())) as StoryIndex;
  const deduped = {} as Record<string, IndexEntry>;
  Object.values(index.entries).forEach((entry) => {
    deduped[entry.importPath] = entry;
  });
  _index = Object.values(deduped);
};

export default setup;
