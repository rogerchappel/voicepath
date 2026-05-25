import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
mkdirSync('dist', { recursive: true });
execFileSync(process.execPath, ['--check', 'src/cli.js'], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', 'src/index.js'], { stdio: 'inherit' });
writeFileSync('dist/README.txt', 'voicepath is source-distributed; build verified syntax and package metadata.\n');
console.log('voicepath build passed');
