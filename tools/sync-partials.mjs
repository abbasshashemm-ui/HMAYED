#!/usr/bin/env node
// Keeps the shared header and footer identical across every page.
//
// Each page marks the shared blocks like this:
//   <!-- partial:header --> ... <!-- /partial:header -->
//   <!-- partial:footer --> ... <!-- /partial:footer -->
// This script replaces whatever sits between the markers with the matching file
// from _partials/, then marks the current page in the primary nav with
// aria-current="page".
//
// Usage (from the repo root, Node 18+, no dependencies):
//   node tools/sync-partials.mjs           rewrite pages in place
//   node tools/sync-partials.mjs --check   exit 1 if any page is out of date

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const partialsDir = join(root, '_partials');
const checkOnly = process.argv.includes('--check');

const partials = Object.fromEntries(
  readdirSync(partialsDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [basename(f, '.html'), readFileSync(join(partialsDir, f), 'utf8').trim()])
);

const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
let stale = 0;

for (const page of pages) {
  const file = join(root, page);
  const before = readFileSync(file, 'utf8');
  const urlPath = page === 'index.html' ? '/' : `/${basename(page, '.html')}`;

  let after = before;
  for (const [name, html] of Object.entries(partials)) {
    const pattern = new RegExp(
      `(<!-- partial:${name} -->)[\\s\\S]*?(<!-- /partial:${name} -->)`,
      'g'
    );
    let block = html;
    if (name === 'header') {
      block = block.replace(
        `class="site-nav__link" href="${urlPath}"`,
        `class="site-nav__link" href="${urlPath}" aria-current="page"`
      );
    }
    after = after.replace(pattern, `$1\n${block}\n$2`);
  }

  if (after !== before) {
    stale += 1;
    if (checkOnly) console.log(`out of date: ${page}`);
    else {
      writeFileSync(file, after);
      console.log(`updated: ${page}`);
    }
  }
}

if (checkOnly && stale > 0) process.exit(1);
if (!checkOnly && stale === 0) console.log('all pages up to date');
