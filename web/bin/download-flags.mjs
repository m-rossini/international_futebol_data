#!/usr/bin/env node

/**
 * Downloads flag SVGs from flagcdn.com to web/public/flags/.
 *
 * Extracts unique ISO codes from the countryFlags mapping so only
 * flags that the app actually needs are downloaded.
 *
 * Usage:
 *   node bin/download-flags.mjs          # download missing flags
 *   node bin/download-flags.mjs --force  # re-download all
 */

import { mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { get } from 'node:https';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const FLAGS_DIR = join(PROJECT_ROOT, 'public', 'flags');
const SOURCE_FILE = join(PROJECT_ROOT, 'src', 'lib', 'countryFlags.ts');
const BASE_URL = 'https://flagcdn.com';

const force = process.argv.includes('--force');

// ---------------------------------------------------------------------------
// Extract unique codes from the TypeScript mapping file
// ---------------------------------------------------------------------------
async function extractCodes() {
  const src = await readFile(SOURCE_FILE, 'utf-8');

  // Match all string → string entries: Key: "code",
  const codeSet = new Set();
  // Match lines like:   Key: "value",
  const regex = /:\s*"([a-z]{2}(?:-[a-z]{2,3})?)"/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    const code = match[1];
    // Skip if it looks like a full country name (too long for ISO code)
    if (code.length <= 6) {
      codeSet.add(code);
    }
  }

  return [...codeSet].sort();
}

// ---------------------------------------------------------------------------
// Download a single SVG
// ---------------------------------------------------------------------------
function downloadFlag(code) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}/${code}.svg`;
    const dest = join(FLAGS_DIR, `${code}.svg`);

    if (!force && existsSync(dest)) {
      console.log(`  ✓ ${code}.svg — exists, skipping`);
      resolve();
      return;
    }

    const file = createWriteStream(dest);

    get(url, (res) => {
      if (res.statusCode !== 200) {
        // Clean up partial file
        file.close();
        try {
          import('node:fs').then((fs) => fs.unlinkSync(dest));
        } catch {}
        console.warn(`  ✗ ${code}.svg — HTTP ${res.statusCode}, skipping`);
        resolve();
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  ✓ ${code}.svg — downloaded`);
        resolve();
      });
    }).on('error', (err) => {
      try {
        import('node:fs').then((fs) => fs.unlinkSync(dest));
      } catch {}
      console.warn(`  ✗ ${code}.svg — ${err.message}, skipping`);
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🔍 Extracting country codes from countryFlags.ts...\n');
  const codes = await extractCodes();

  console.log(`   Found ${codes.length} unique codes\n`);
  console.log(`📁 Target: ${FLAGS_DIR}\n`);

  mkdirSync(FLAGS_DIR, { recursive: true });

  console.log('⬇️  Downloading flags...\n');

  // Sequential to avoid overwhelming the server
  for (const code of codes) {
    await downloadFlag(code);
  }

  console.log(`\n✅ Done — ${codes.length} flags processed in ${FLAGS_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
