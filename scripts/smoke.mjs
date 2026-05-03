import { execFileSync } from 'node:child_process';
const stdout = execFileSync(process.execPath, ['src/cli.js', 'speak', '--fixture', 'tests/fixtures/local-fallback.json'], { encoding: 'utf8' });
const report = JSON.parse(stdout);
if (report.providerId !== 'device') throw new Error('expected local fallback smoke to use device');
console.log('voicepath smoke passed:', JSON.stringify({ providerId: report.providerId, fallbackCount: report.summary.fallbackCount }));
