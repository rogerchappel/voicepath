import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { main, parseArgs } from '../src/cli.js';
const execFileAsync = promisify(execFile);

test('parseArgs supports commands, flags, and trailing text', () => {
  assert.deepEqual(parseArgs(['speak', '--fixture', 'f.json', 'hello', 'there']), { command: 'speak', flags: { fixture: 'f.json', _: ['hello', 'there'] } });
});

test('CLI smoke falls back to device with fixture', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['src/cli.js', 'speak', '--fixture', 'tests/fixtures/local-fallback.json'], { cwd: new URL('..', import.meta.url).pathname });
  const report = JSON.parse(stdout);
  assert.equal(report.ok, true);
  assert.equal(report.providerId, 'device');
  assert.equal(report.summary.fallbackCount, 1);
});

test('CLI main can run doctor without throwing', async () => {
  const original = console.log;
  let output = '';
  console.log = (value) => { output += value; };
  try { await main(['doctor']); } finally { console.log = original; }
  assert.equal(JSON.parse(output).ok, true);
});

test('CLI supports help and version flags', async () => {
  const help = await execFileAsync(process.execPath, ['src/cli.js', '--help'], { cwd: new URL('..', import.meta.url).pathname });
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /voicepath doctor/);

  const version = await execFileAsync(process.execPath, ['src/cli.js', '--version'], { cwd: new URL('..', import.meta.url).pathname });
  assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/);
});
