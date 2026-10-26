#!/usr/bin/env node
/**
 * Static SEO contract check for the prerendered build.
 * No dependencies; run after `npm run prerender`.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const SITEMAP = readFileSync(path.join(ROOT, 'dist', 'sitemap.xml'), 'utf8');
const ROBOTS = readFileSync(path.join(ROOT, 'dist', 'robots.txt'), 'utf8');

const failures = [];
function check(name, fn) {
  try {
    const detail = fn();
    console.log(`PASS  ${name}${detail ? `  [${detail}]` : ''}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.log(`FAIL  ${name}\n      ${message}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function meta(name) {
  const tags = HTML.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key =
      tag.match(/\b(?:name|property)=["']([^"']+)["']/i)?.[1]?.toLowerCase() || '';
    if (key === name.toLowerCase()) {
      return tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || '';
    }
  }
  return '';
}
function link(rel) {
  const tags = HTML.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() === rel) {
      return tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
    }
  }
  return '';
}

const title = HTML.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || '';
const description = meta('description');
const canonical = link('canonical');
const ogUrl = meta('og:url');
const ogImage = meta('og:image');
const robots = meta('robots');
const h1 = HTML.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, '').trim() || '';

check('title contains name and "portfolio"', () => {
  assert(/saikrishna garikipati/i.test(title), `title="${title}"`);
  assert(/portfolio/i.test(title), `title="${title}"`);
  return title;
});
check('meta description mentions the portfolio and current role', () => {
  assert(/portfolio/i.test(description), 'missing "portfolio"');
  assert(/systems engineer expert/i.test(description), 'missing role');
  assert(description.length >= 80 && description.length <= 185, `${description.length} chars`);
  return `${description.length} chars`;
});
check('canonical and og:url point at the live portfolio', () => {
  const expected = 'https://saikrishnajava.github.io/portfolio/';
  assert(canonical === expected, `canonical="${canonical}"`);
  assert(ogUrl === expected, `og:url="${ogUrl}"`);
  return expected;
});
check('robots meta allows indexing', () => {
  assert(/index/i.test(robots) && /follow/i.test(robots), `robots="${robots}"`);
  assert(!/noindex/i.test(HTML), 'page contains noindex');
  return robots;
});
check('Open Graph and Twitter cards are complete', () => {
  assert(/summary_large_image/i.test(meta('twitter:card')), 'missing twitter card');
  assert(/^https:\/\//.test(ogImage), `og:image="${ogImage}"`);
  assert(/^https:\/\//.test(meta('twitter:image')), 'twitter:image is not absolute');
  assert(meta('og:site_name'), 'missing og:site_name');
  return ogImage;
});
check('sitemap link is present in the document', () => {
  const href = link('sitemap');
  assert(href.endsWith('/portfolio/sitemap.xml'), `href="${href}"`);
  return href;
});
check('h1 is the person name', () => {
  assert(/saikrishna garikipati/i.test(h1), `h1="${h1}"`);
  return h1;
});
check('prerendered HTML contains the page content', () => {
  for (const text of [
    'Systems Engineer Expert',
    'Charles Schwab',
    'Professional Experience',
    'Technical Skills',
    'Featured Projects',
    'Education &amp; Certification',
  ]) {
    assert(HTML.includes(text), `missing "${text}"`);
  }
  return 'content present without JavaScript';
});
check('JSON-LD contains a complete Person entity', () => {
  const blocks = [...HTML.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  assert(blocks.length > 0, 'no JSON-LD block');
  let person = null;
  for (const block of blocks) {
    const data = JSON.parse(block[1]);
    const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
    person = nodes.find((node) => node['@type'] === 'Person') || person;
  }
  assert(person, 'no Person entity');
  assert(/saikrishna garikipati/i.test(person.name || ''), 'Person.name missing');
  assert(/systems engineer expert/i.test(person.jobTitle || ''), 'Person.jobTitle missing');
  assert(/charles schwab/i.test(person.worksFor?.name || ''), 'Person.worksFor missing');
  assert((person.sameAs || []).length >= 3, 'expected LinkedIn + both GitHub profiles');
  assert((person.knowsAbout || []).length >= 5, 'Person.knowsAbout missing');
  return `${person.sameAs.length} sameAs, ${person.knowsAbout.length} topics`;
});
check('sitemap contains the canonical URL', () => {
  const loc = SITEMAP.match(/<loc>([^<]+)<\/loc>/)?.[1] || '';
  assert(loc === 'https://saikrishnajava.github.io/portfolio/', `loc="${loc}"`);
  return loc;
});
check('robots.txt points at the sitemap', () => {
  assert(/Sitemap:\s*https:\/\/saikrishnajava\.github\.io\/portfolio\/sitemap\.xml/i.test(ROBOTS), 'missing sitemap line');
  return 'sitemap declared';
});

console.log('');
if (failures.length > 0) {
  console.log(`SEO: FAIL (${failures.length} issue${failures.length === 1 ? '' : 's'})`);
  process.exitCode = 1;
} else {
  console.log('SEO: PASS');
}
