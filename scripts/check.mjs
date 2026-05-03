import { readFileSync, statSync } from 'node:fs';
const required = ['README.md','SAFETY.md','CONTRIBUTING.md','examples/local-fallback.mjs','tests/fixtures/local-fallback.json','docs/PRD.md','docs/TASKS.md','docs/ORCHESTRATION.md','docs/orchestration.json'];
for (const file of required) statSync(file);
const pkg = JSON.parse(readFileSync('package.json','utf8'));
if (pkg.name !== '@voicepath/core') throw new Error('package name must be @voicepath/core');
if (!pkg.keywords?.includes('voice-agents')) throw new Error('missing voice-agents keyword');
console.log('voicepath check passed');
