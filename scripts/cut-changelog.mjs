#!/usr/bin/env node
/**
 * Generate a CHANGELOG.md entry from `git log <last-tag>..HEAD` and
 * splice it into the existing CHANGELOG.md right after the
 * `## [Unreleased]` block.
 *
 * Usage: node scripts/cut-changelog.mjs <version>
 *
 * Conventional Commits → CHANGELOG sections:
 *   feat               → Added
 *   fix                → Fixed
 *   refactor / perf    → Changed
 *   docs / chore / style / build / ci / test / revert  → omitted
 *
 * Anything that doesn't match a conventional prefix is dropped on
 * the floor — release notes should be coherent prose, not a
 * raw commit dump.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/cut-changelog.mjs <version>');
  process.exit(1);
}

function lastTag() {
  try {
    return execSync('git describe --tags --abbrev=0', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const since = lastTag();
const range = since ? `${since}..HEAD` : 'HEAD';
const log = execSync(`git log ${range} --pretty=format:%H%x09%s --no-merges`, {
  encoding: 'utf8',
});

const groups = {
  Added: [],
  Fixed: [],
  Changed: [],
};

const RE = /^(feat|fix|refactor|perf)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
for (const line of log.split('\n').filter(Boolean)) {
  const tab = line.indexOf('\t');
  const hash = line.slice(0, tab);
  const subject = line.slice(tab + 1);
  const short = hash.slice(0, 7);
  const m = subject.match(RE);
  if (!m) continue;
  const [, type, scope, , desc] = m;
  const prefix = scope ? `**${scope}**: ` : '';
  const item = `- ${prefix}${desc} (${short})`;
  if (type === 'feat') groups.Added.push(item);
  else if (type === 'fix') groups.Fixed.push(item);
  else groups.Changed.push(item);
}

const today = new Date().toISOString().slice(0, 10);
const sections = [];
for (const [name, items] of Object.entries(groups)) {
  if (items.length === 0) continue;
  sections.push(`### ${name}\n\n${items.join('\n')}`);
}

if (sections.length === 0) {
  // Nothing parseable — write a placeholder so the cut still goes through.
  sections.push('### Changed\n\n- Internal updates. See git log for details.');
}

const entry = `## [${version}] — ${today}\n\n${sections.join('\n\n')}\n`;

const path = 'CHANGELOG.md';
const content = fs.readFileSync(path, 'utf8');

// Insert after the Unreleased block (right before the next `## [version]`).
// Tolerant of whatever the Unreleased section contains.
const unreleasedRe = /(## \[Unreleased\][\s\S]*?)(\n## \[)/;
let updated;
if (unreleasedRe.test(content)) {
  updated = content.replace(unreleasedRe, (_m, unreleased, nextHeader) => {
    return `${unreleased}\n${entry}${nextHeader}`;
  });
} else {
  // No Unreleased section — splice right after the top header block.
  // Match the first `## [` section and insert before it.
  const firstSection = /(\n## \[)/;
  if (firstSection.test(content)) {
    updated = content.replace(firstSection, (_m, m1) => `\n${entry}${m1}`);
  } else {
    // Empty-ish CHANGELOG — append to the bottom.
    updated = `${content.replace(/\s+$/, '')}\n\n${entry}`;
  }
}

fs.writeFileSync(path, updated);
process.stdout.write(entry);
