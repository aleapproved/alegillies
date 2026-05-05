import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

// Comment annotations that are time-relative ("New:", "Recently...", etc.)
// rot the moment they ship: "new" relative to *what*? "Recently" *when*?
// Comments should describe what code IS, not when it was added — git history
// already records that. This test fails if these patterns reappear.
const STALE_PATTERNS = [
  /\/\*\s*new\b/i,         //  /* New ...
  /\/\/\s*new\b/i,          //  // New ...
  /\*\s+new\b/i,            //   * New ... (inside JSDoc / block comments)
  /\/\*\s*recently\b/i,
  /\/\/\s*recently\b/i,
  /\/\*\s*updated\b/i,
  /\/\/\s*updated\b/i,
  /\/\*\s*just added\b/i,
  /\/\/\s*just added\b/i,
];

const ROOT = new URL('..', import.meta.url).pathname;

const SCAN_GLOBS = [
  '*.css',
  '*.js',
  '*.html',
  '*/*.css',
  '*/*.js',
  '*/*.html',
];

const IGNORE_DIRS = ['node_modules', 'playwright-report', 'test-results', '.git', 'tests'];

test('source files contain no time-relative comment markers', async () => {
  const offenders = [];

  for (const pattern of SCAN_GLOBS) {
    for await (const relPath of glob(pattern, { cwd: ROOT })) {
      if (IGNORE_DIRS.some(d => relPath.startsWith(d + '/') || relPath === d)) continue;

      const content = await readFile(`${ROOT}${relPath}`, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, i) => {
        for (const re of STALE_PATTERNS) {
          if (re.test(line)) {
            offenders.push(`${relPath}:${i + 1}: ${line.trim()}`);
            break;
          }
        }
      });
    }
  }

  expect(
    offenders,
    'time-relative comment markers found:\n' + offenders.join('\n')
  ).toEqual([]);
});
