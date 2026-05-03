import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('package metadata points at the public OSS repo', () => {
  assert.equal(pkg.name, '@voicepath/core');
  assert.match(pkg.description, /voice routing/i);
  assert.equal(pkg.repository.url, 'git+ssh://git@github.com/rogerchappel/voicepath.git');
  assert.ok(pkg.keywords.includes('local-first'));
  assert.equal(pkg.bin.voicepath, './src/cli.js');
});
