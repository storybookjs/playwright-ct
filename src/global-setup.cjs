const path = require('path');
const waitOn = require('wait-on');
const fetch = require('node-fetch');

let _index;

const lookupTitle = (filename) => {
  console.log('lookupTitle', filename);
  const relativePath = './' + path.relative(path.join(process.cwd(), '..'), filename);
  const entry = _index.find((entry) => entry.importPath.startsWith(relativePath));
  if (!entry) throw new Error(`Could not find title for ${relativePath}`);
  return entry.title;
};

// Set up the path => title index
const setup = async (config) => {
  const url = `${config.webServer?.url}/index.json`;
  console.log('Fetching...', url);
  await waitOn({ resources: [url], interval: 50 });
  const index = await fetch(url).then((res) => res.json());
  const deduped = {};
  Object.values(index.entries).forEach((entry) => {
    deduped[entry.importPath] = entry;
  });
  _index = Object.values(deduped);
};

module.exports = {
  lookupTitle,
  default: setup,
};
