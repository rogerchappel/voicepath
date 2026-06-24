#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

pack_json="$tmp_dir/pack.json"
npm pack --dry-run --json >"$pack_json"

node - "$pack_json" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))[0];
const packed = new Set(payload.files.map((file) => file.path));
const required = [
  'src/cli.js',
  'src/index.js',
  'src/index.d.ts',
  'examples/local-fallback.mjs',
  'demo/latency-fallback.mjs',
  'docs/CLI.md',
  'docs/PRIVACY.md',
  'README.md',
  'SAFETY.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md'
];
const missing = required.filter((file) => !packed.has(file));
if (missing.length) {
  console.error(`Missing package files: ${missing.join(', ')}`);
  process.exit(1);
}
NODE

node src/cli.js --help >/dev/null
node src/cli.js doctor >/dev/null
