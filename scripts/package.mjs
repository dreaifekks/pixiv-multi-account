import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const version = manifest.version;
if (typeof version !== 'string' || !/^[0-9]+(?:\.[0-9]+){0,3}$/.test(version)) {
  throw new Error('Invalid manifest version');
}
if (pkg.version !== version) {
  throw new Error('package.json and manifest.json versions must match');
}

// Runtime files live at the root; exclude tests, tools, notes and dependencies.
const entries = await readdir(root, { withFileTypes: true });
const names = ['manifest.json', ...entries
  .filter(entry => entry.isFile() && /\.(js|html|css)$/.test(entry.name))
  .map(entry => entry.name).sort()];
const required = [manifest.background.service_worker, manifest.action.default_popup,
  ...(manifest.content_scripts ?? []).flatMap(script => [
    ...(script.js ?? []), ...(script.css ?? []),
  ])];
for (const name of required) {
  if (!names.includes(name)) {
    throw new Error(`Manifest resource missing from package: ${name}`);
  }
}

const files = Object.fromEntries(await Promise.all(names.map(async name => [
  name, await readFile(new URL(name, root)),
])));
const output = new URL(`dist/pixiv-multi-account-${version}.zip`, root);
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(output, zipSync(files));
console.log(fileURLToPath(output));
