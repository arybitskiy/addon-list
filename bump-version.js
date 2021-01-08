const fs = require('fs');
const fetch = require('node-fetch');

//https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const [, , addonName, oldVersion, newVersion] = process.argv;

if (!addonName || !oldVersion || !newVersion) {
  console.error('Specify addon, old and new version');
  process.exit();
}

const addonFile = `${__dirname}/addons/${addonName}.json`;

try {
  fs.statSync(addonFile);
} catch(e) {
  console.error('No addon found');
  process.exit();
}

const addonConfig = JSON.parse(fs.readFileSync(addonFile));

if (!('packages' in addonConfig)) {
  console.error('Missing packages');
  process.exit();
}

Promise.all(addonConfig.packages.map(async (pkg) => {
  const { version, url } = pkg;

  if (version !== oldVersion) {
    return pkg;
  }

  const newUrl = url.replace(new RegExp(escapeRegExp(oldVersion), 'g'), newVersion);
  const checksumUrl = `${newUrl}.sha256sum`;
  const response = await fetch(checksumUrl).then(res => res.text());
  const [newChecksum] = response.split(' ');
  
  return {
    ...pkg,
    version: newVersion,
    url: newUrl,
    checksum: newChecksum,
  };
})).then(pkgs => {
  fs.writeFileSync(addonFile, JSON.stringify({
    ...addonConfig,
    packages: pkgs,
  }, null, 2));
}).catch(console.error);
