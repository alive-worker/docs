// Site health check for ponr.org (docs).
// Run from repo root: node tools/verify-site.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const TOPIC_HUB = {
  basics: 'topics/basics',
  'virtual-card': 'topics/virtual-card',
  stablecoin: 'topics/stablecoin',
  special: 'topics/billing-account',
};

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf-8');
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function listHtml(rel) {
  return fs.readdirSync(path.join(root, rel)).filter((n) => n.endsWith('.html')).map((n) => n.replace(/\.html$/, ''));
}
function md5_10(rel) {
  return crypto.createHash('md5').update(fs.readFileSync(path.join(root, rel))).digest('hex').slice(0, 10);
}

const checks = [];
function check(label, ok, detail) {
  checks.push([label, ok, detail]);
}

const index = read('index.html');
check('this is docs, not docs-coin', index.includes('https://ponr.org/') && !index.includes('coin.ponr.org'));

const zhSlugs = listHtml('articles');
const enSlugs = listHtml('en/articles');
check('zh/en article file counts match', zhSlugs.length === enSlugs.length, `zh=${zhSlugs.length} en=${enSlugs.length}`);

const siteJs = read('js/site.js');
let zhDates = 0;
let enDates = 0;
const dateKeys = [...siteJs.matchAll(/'(\/(?:en\/)?articles\/[a-z0-9-]+\.html)'/g)].map((m) => m[1]);
for (const key of dateKeys) {
  if (key.startsWith('/en/articles/')) enDates++;
  else if (key.startsWith('/articles/')) zhDates++;
}
check('DATES /articles/ count matches zh files', zhDates === zhSlugs.length, `DATES=${zhDates} files=${zhSlugs.length}`);
check('DATES /en/articles/ count matches en files', enDates === enSlugs.length, `DATES=${enDates} files=${enSlugs.length}`);

const sitemap = read('sitemap.xml');
let sitemapMissing = 0;
for (const slug of zhSlugs) {
  if (!sitemap.includes(`https://ponr.org/articles/${slug}.html`)) sitemapMissing++;
}
for (const slug of enSlugs) {
  if (!sitemap.includes(`https://ponr.org/en/articles/${slug}.html`)) sitemapMissing++;
}
check('sitemap has every zh+en article URL', sitemapMissing === 0, `missing=${sitemapMissing}`);

const archive = read('articles.html');
const tagCounts = {};
for (const m of archive.matchAll(/data-topic="([^"]+)"[^>]*>[\s\S]*?<span class="topic-tag-count">(\d+)<\/span>/g)) {
  tagCounts[m[1]] = Number(m[2]);
}
const actualTopic = { basics: 0, 'virtual-card': 0, stablecoin: 0, special: 0 };
for (const m of archive.matchAll(/<li class="archive-item" data-topic="([^"]+)"/g)) {
  actualTopic[m[1]] = (actualTopic[m[1]] || 0) + 1;
}
for (const topic of Object.keys(actualTopic)) {
  check(`topic-tag-count ${topic} matches archive items`, tagCounts[topic] === actualTopic[topic], `label=${tagCounts[topic]} items=${actualTopic[topic]}`);
}
const topicSum = Object.values(actualTopic).reduce((a, b) => a + b, 0);
check('archive data-topic sum equals zh article count', topicSum === zhSlugs.length, `sum=${topicSum} files=${zhSlugs.length}`);

let hreflangMissing = 0;
for (const slug of zhSlugs) {
  const html = read(`articles/${slug}.html`);
  const enHref = (html.match(/hreflang="en" href="https:\/\/ponr\.org(\/en\/articles\/[a-z0-9-]+\.html)"/) || [])[1];
  if (!enHref) {
    hreflangMissing++;
    continue;
  }
  const enFile = enHref.replace(/^\//, '');
  if (!exists(enFile)) hreflangMissing++;
}
check('every zh article hreflang=en target file exists', hreflangMissing === 0, `bad=${hreflangMissing}`);

const cssHash = md5_10('styles.min.css');
const jsHash = md5_10('js/site.min.js');
check('index.html CSS hash matches styles.min.css', index.includes(`styles.min.css?v=${cssHash}`), `file=${cssHash}`);
check('index.html JS hash matches js/site.min.js', index.includes(`site.min.js?v=${jsHash}`), `file=${jsHash}`);

let hubMissing = 0;
for (const [topic, hub] of Object.entries(TOPIC_HUB)) {
  if (!exists(`${hub}/index.html`)) {
    hubMissing++;
    continue;
  }
  const hubHtml = read(`${hub}/index.html`);
  const slugsInHub = [...archive.matchAll(new RegExp(`<li class="archive-item" data-topic="${topic}"[\\s\\S]*?href="/articles/([a-z0-9-]+)\\.html"`, 'g'))].map((m) => m[1]);
  for (const slug of slugsInHub) {
    if (!hubHtml.includes(`/articles/${slug}.html`)) hubMissing++;
  }
}
check('topic hubs list every archive item of that topic', hubMissing === 0, `missing=${hubMissing}`);

let pass = 0;
let fail = 0;
for (const [label, ok, detail] of checks) {
  if (ok) {
    pass++;
  } else {
    fail++;
    console.log('FAIL  ' + label + (detail ? '  (' + detail + ')' : ''));
  }
}
console.log('\nResult: ' + pass + '/' + checks.length + ' passed' + (fail ? ' (' + fail + ' failed)' : ' ALL OK'));
process.exit(fail ? 1 : 0);
