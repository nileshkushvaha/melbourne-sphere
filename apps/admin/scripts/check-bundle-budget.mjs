#!/usr/bin/env node
/**
 * Bundle budget (SRS NFR 005/013). The admin is behind a login, so the budget
 * is generous, but it must not drift silently: the entry chunk and the total
 * JavaScript shipped on first load are both capped. Run after `pnpm build`.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets');
/** Bytes, uncompressed; roughly a third of this once gzipped. */
const BUDGETS = { entry: 1_100_000, total: 2_600_000 };

let files;
try {
  files = readdirSync(dist).filter((name) => name.endsWith('.js'));
} catch {
  console.error(`No build output at ${dist}. Run "pnpm build" first.`);
  process.exit(1);
}

const sizes = files.map((name) => ({ name, bytes: statSync(join(dist, name)).size })).sort((a, b) => b.bytes - a.bytes);
const entry = sizes.find((file) => file.name.startsWith('index-'));
const total = sizes.reduce((sum, file) => sum + file.bytes, 0);
const problems = [];
if (!entry) problems.push('no entry chunk (index-*.js) was produced');
else if (entry.bytes > BUDGETS.entry) problems.push(`entry chunk ${entry.name} is ${entry.bytes} bytes, over the ${BUDGETS.entry} budget`);
if (total > BUDGETS.total) problems.push(`total JavaScript is ${total} bytes, over the ${BUDGETS.total} budget`);

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} kB`;
console.log(`Admin bundle: entry ${entry ? kb(entry.bytes) : 'missing'}, total ${kb(total)} across ${sizes.length} chunks`);
if (problems.length > 0) {
  console.error(`Bundle budget exceeded:\n${problems.map((p) => `  - ${p}`).join('\n')}\nSplit a route or move a dependency behind a lazy import.`);
  process.exit(1);
}
