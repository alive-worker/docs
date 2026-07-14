// One-shot site-wide integration for publishing a new article.
// Fill in CONFIG below, then: node tools/publish-article.js
//
// Ported from D:\m-project\src\docs-coin\tools\publish-article.js (2026-07 sync) and
// adapted for this project's real differences from docs-coin:
//   - docs uses a DIFFERENT slug per language (overseas-ai-xxx.html vs xxx-guide.html),
//     not one shared slug reused under articles/ and en/articles/. CONFIG now takes
//     zhSlug + enSlug, and every path/regex below is slug-pair aware.
//   - docs's article template has no left sidebar (removed when the article layout
//     was redesigned to a right-hand TOC rail) — only 404.html/en/404.html still
//     carry a `.side-item` list, so insertSidebarItems() only ever touches those two
//     files in practice; it's left generic (and gracefully skips everywhere else)
//     in case a sidebar ever comes back.
//   - docs does NOT insert a new article's related-link into every other existing
//     article — the site's actual practice (see CLAUDE.md section 4, item 9) is to
//     hand-pick 2-3 most relevant existing articles per new article. CONFIG.crossLinkSlugs
//     is that curated list; nothing is touched unless you name it explicitly.
//   - docs's homepage grid is NOT capped — dropping the oldest grid card (like
//     docs-coin does to hold at a fixed count) doesn't match how this site has
//     actually been growing it, so the demoted previous-featured article is
//     inserted at the top of the grid and nothing is removed.
//   - the previously-featured article's card copy (title/desc/date/tag) is scraped
//     directly out of the CURRENT featured-article block before it's overwritten,
//     so there's no "TODO-cardDesc-not-auto-extracted" placeholder to fix by hand.
//   - docs's sitemap.xml deliberately omits <priority>/<changefreq> (Google ignores
//     them post-2020, see CLAUDE.md section 4) — the generated entries don't have them.
//   - docs ships MINIFIED styles.min.css / js/site.min.js with a content-hash query
//     string (CLAUDE.md sections 7-8), not raw styles.css/site.js like docs-coin.
//     Step 9 re-runs the real clean-css/terser build, then hashes the MINIFIED
//     output (md5, 10 hex chars) and propagates `?v=` — not a sha1-of-source hash
//     of the unminified files.
//   - "个主题"/"Topics" hero-stat count is NOT auto-bumped: on this site it tracks
//     the footer's curated "热门主题" list, not article count or reading-path
//     category count, so it isn't safe to derive automatically. Only "篇文章"/
//     "Articles" (a literal article count) gets bumped.
//   - no manual "existingSlugsNewestFirst" list to keep in sync: discoverArticles()
//     reads every file in articles/*.html directly, pulls h1/description/published-
//     time/cover straight from each article's own <head>, resolves its EN slug from
//     its own hreflang="en" link, and pulls tagColor/tagLabel from articles.html's
//     archive-list (the one place per-article tag assignments actually live, since
//     article pages themselves don't carry a tag pill). Sorted newest-first by
//     published time automatically.
//
// What it does NOT do (do these yourself first, same as docs-coin):
//   - Write the article's own two HTML pages (zh + en).
//   - Add a brand-new archive-tag color to styles.css if the topic needs one not
//     already defined (grep for archive-tag--<color> first).
//   - Draw the AI-tech cover SVGs (zh + en) if the topic is new, and rasterize them
//     to PNG (CLAUDE.md section 3).
//
// Idempotent: safe to re-run — each step early-outs if the new slug is already present.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CONFIG — fill this in for each new article, then run the script.
// ---------------------------------------------------------------------------
const CONFIG = {
  zhSlug: 'REPLACE-ME-zh-slug',   // e.g. 'overseas-ai-virtual-card-validity' (no .html, no dir)
  enSlug: 'REPLACE-ME-en-slug',   // e.g. 'virtual-card-validity-guide'
  publishedISO: '2026-01-01T00:00:00+08:00',
  tagColor: 'REPLACE-ME',          // must already exist as .archive-tag--<color> in styles.css

  zh: {
    h1: 'REPLACE ME',
    tagLabel: 'REPLACE ME',        // short archive-tag/sidebar label, e.g. "有效期设置"
    cardDesc: 'REPLACE ME',        // short one-liner used in featured-desc / grid post-card-desc
  },
  en: {
    h1: 'REPLACE ME',
    tagLabel: 'REPLACE ME',
    cardDesc: 'REPLACE ME',
  },

  // Feature the new article on the homepage and demote the current featured
  // article into the grid, per this site's standing rule that the newest
  // article stays pinned. Set false for a non-featured (e.g. evergreen hub) publish.
  promoteToFeatured: true,

  // Zh slugs of the 2-3 most relevant EXISTING articles to add a cross-link into
  // (CLAUDE.md section 4, item 9). Deliberately NOT auto-applied to every article —
  // pick these by hand. Leave empty to skip this step entirely.
  crossLinkSlugs: [],
};
// ---------------------------------------------------------------------------

function readFile(rel) { return fs.readFileSync(path.join(root, rel), 'utf-8'); }
function writeFile(rel, content) { fs.writeFileSync(path.join(root, rel), content, 'utf-8'); }

function extractMeta(html) {
  const h1 = (html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const pub = (html.match(/<meta property="article:published_time" content="([^"]*)"/) || [])[1] || '';
  const cover = (html.match(/<img class="article-cover" src="([^"]*)"/) || [])[1] || '';
  return { h1, desc, pub, cover };
}

// --- Discovery: read every existing article directly off disk, no manual slug list ---
function discoverArticles() {
  const zhDir = path.join(root, 'articles');
  const files = fs.readdirSync(zhDir).filter(f => f.endsWith('.html'));

  // tagColor/tagLabel per zh slug lives only in articles.html's archive-list —
  // article pages themselves don't carry a tag pill.
  const archiveHtml = readFile('articles.html');
  const tagMap = {};
  const itemRe = /<a href="\/articles\/([a-z0-9-]+)\.html">\s*<span class="archive-tag archive-tag--([a-z]+)"[^>]*>([^<]*)<\/span>/g;
  let m;
  while ((m = itemRe.exec(archiveHtml))) {
    tagMap[m[1]] = { tagColor: m[2], tagLabel: m[3] };
  }

  const articles = [];
  for (const f of files) {
    const zhSlug = f.replace(/\.html$/, '');
    const html = readFile(`articles/${f}`);
    const meta = extractMeta(html);
    const enSlug = (html.match(/<link rel="alternate" hreflang="en" href="https:\/\/ponr\.org\/en\/articles\/([a-z0-9-]+)\.html">/) || [])[1] || '';
    const tag = tagMap[zhSlug] || { tagColor: '', tagLabel: '' };
    articles.push({ zhSlug, enSlug, ...meta, ...tag });
  }
  articles.sort((a, b) => new Date(b.pub) - new Date(a.pub));
  return articles;
}

// --- Step 1: sidebar item (only 404.html / en/404.html carry one on this site) ---
function insertSidebarItems() {
  const files = ['404.html', 'en/404.html'];
  const zhItem = `        <a class="side-item" href="/articles/${CONFIG.zhSlug}.html">
          <span class="side-body">
            <span class="side-title"><span class="side-tag archive-tag archive-tag--${CONFIG.tagColor}">${CONFIG.zh.tagLabel}</span>${CONFIG.zh.h1}</span>
            <span class="side-desc">${CONFIG.zh.cardDesc}</span>
          </span>
        </a>
`;
  const enItem = `        <a class="side-item" href="/en/articles/${CONFIG.enSlug}.html">
          <span class="side-body">
            <span class="side-title"><span class="side-tag archive-tag archive-tag--${CONFIG.tagColor}">${CONFIG.en.tagLabel}</span>${CONFIG.en.h1}</span>
            <span class="side-desc">${CONFIG.en.cardDesc}</span>
          </span>
        </a>
`;
  let count = 0;
  for (const rel of files) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    let t = fs.readFileSync(p, 'utf-8');
    const isEn = rel.startsWith('en/');
    const slugCheck = isEn ? CONFIG.enSlug : CONFIG.zhSlug;
    if (t.includes(`${slugCheck}.html`)) continue;
    const re = /(<nav class="sidebar-nav">\n)(\s*<a class="side-item)/;
    if (!re.test(t)) { console.log(`  [sidebar] no sidebar-nav in ${rel}, skip`); continue; }
    t = t.replace(re, (m0, g1, g2) => g1 + (isEn ? enItem : zhItem) + g2);
    fs.writeFileSync(p, t, 'utf-8');
    count++;
  }
  console.log(`[1/9] sidebar items inserted: ${count}`);
}

// --- Step 2: curated related-article cross-links (not blanket, see CONFIG.crossLinkSlugs) ---
function insertRelatedItems(articles) {
  if (!CONFIG.crossLinkSlugs.length) { console.log('[2/9] no crossLinkSlugs configured, skip'); return; }
  let count = 0;
  for (const zhSlug of CONFIG.crossLinkSlugs) {
    const article = articles.find(a => a.zhSlug === zhSlug);
    if (!article) { console.log(`  [related] unknown slug, skip: ${zhSlug}`); continue; }
    for (const [rel, slug, h1] of [
      [`articles/${zhSlug}.html`, CONFIG.zhSlug, CONFIG.zh.h1],
      [`en/articles/${article.enSlug}.html`, CONFIG.enSlug, CONFIG.en.h1],
    ]) {
      const p = path.join(root, rel);
      if (!fs.existsSync(p)) continue;
      let t = fs.readFileSync(p, 'utf-8');
      if (t.includes(`${slug}.html`)) continue;
      const isEn = rel.startsWith('en/');
      const link = isEn
        ? `          <li><a href="/en/articles/${CONFIG.enSlug}.html">${h1}</a></li>\n`
        : `          <li><a href="/articles/${CONFIG.zhSlug}.html">${h1}</a></li>\n`;
      const re = /(<aside class="related"[^>]*>[\s\S]*?)(\s*<\/ul>\s*<\/aside>)/;
      if (!re.test(t)) { console.log(`  [related] SKIP (pattern not found): ${rel}`); continue; }
      t = t.replace(re, (m0, before, after) => before + link + after);
      fs.writeFileSync(p, t, 'utf-8');
      count++;
    }
  }
  console.log(`[2/9] related-article cross-links inserted: ${count}`);
}

// --- Step 3: ItemList JSON-LD (position renumbering) ---
function updateItemLists() {
  const targets = [
    { file: 'articles.html', slug: CONFIG.zhSlug, dir: 'articles', name: CONFIG.zh.h1 },
    { file: 'index.html', slug: CONFIG.zhSlug, dir: 'articles', name: CONFIG.zh.h1 },
    { file: 'en/articles.html', slug: CONFIG.enSlug, dir: 'en/articles', name: CONFIG.en.h1 },
    { file: 'en/index.html', slug: CONFIG.enSlug, dir: 'en/articles', name: CONFIG.en.h1 },
  ];
  let count = 0;
  for (const t of targets) {
    let content = readFile(t.file);
    const url = `https://ponr.org/${t.dir}/${t.slug}.html`;
    if (content.includes(`"url": "${url}"`)) continue;
    const start = content.indexOf('"@type": "ItemList"');
    const blockEnd = content.indexOf('] }', start) + 3;
    let block = content.slice(start, blockEnd);
    const anchor = /(itemListElement": \[\n)/;
    if (!anchor.test(block)) { console.log(`  [itemlist] SKIP (anchor not found): ${t.file}`); continue; }
    const newItem = `        { "@type": "ListItem", "position": 1, "name": "${t.name}", "url": "${url}" },\n`;
    block = block.replace(anchor, (m0, g1) => g1 + newItem);
    const positions = [...block.matchAll(/"position": (\d+)/g)];
    for (let i = positions.length - 1; i >= 1; i--) {
      const m0 = positions[i];
      const newNum = parseInt(m0[1], 10) + 1;
      block = block.slice(0, m0.index) + `"position": ${newNum}` + block.slice(m0.index + m0[0].length);
    }
    content = content.slice(0, start) + block + content.slice(blockEnd);
    writeFile(t.file, content);
    count++;
  }
  console.log(`[3/9] ItemList JSON-LD updated: ${count}`);
}

// --- Step 4: archive list row ---
function insertArchiveItem(lang) {
  const file = lang === 'en' ? 'en/articles.html' : 'articles.html';
  const slug = lang === 'en' ? CONFIG.enSlug : CONFIG.zhSlug;
  let t = readFile(file);
  if (t.includes(`${slug}.html`)) return;
  const cfgLang = lang === 'en' ? CONFIG.en : CONFIG.zh;
  const artPrefix = lang === 'en' ? '/en/articles/' : '/articles/';
  const pubDisplay = CONFIG.publishedISO.replace('T', ' ').replace(/\+.*/, '');
  const item = `        <li class="archive-item">
          <a href="${artPrefix}${slug}.html">
            <span class="archive-tag archive-tag--${CONFIG.tagColor}" aria-hidden="true">${cfgLang.tagLabel}</span>
            <span class="archive-title">${cfgLang.h1}</span>
            <span class="archive-date"><svg class="side-cal" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg><time datetime="${CONFIG.publishedISO}">${pubDisplay}</time></span>
          </a>
        </li>
`;
  const re = /(<ul class="archive-list"[^>]*>\n)(\s*<li class="archive-item">)/;
  if (!re.test(t)) { console.log(`  [archive-${lang}] SKIP (anchor not found)`); return; }
  t = t.replace(re, (m0, g1, g2) => g1 + item + g2);
  writeFile(file, t);
  console.log(`[4/9] archive item inserted (${lang})`);
}

// --- Step 5: homepage featured + grid ---
function updateHomepage(lang, articles) {
  const file = lang === 'en' ? 'en/index.html' : 'index.html';
  const slug = lang === 'en' ? CONFIG.enSlug : CONFIG.zhSlug;
  let t = readFile(file);
  if (t.includes(`${slug}.html`)) { console.log(`  [homepage-${lang}] already updated, skip`); return; }

  const cfgLang = lang === 'en' ? CONFIG.en : CONFIG.zh;
  const artPrefix = lang === 'en' ? '/en/articles/' : '/articles/';
  const coverPrefix = lang === 'en' ? `cover-${CONFIG.zhSlug.replace(/^overseas-ai-/, '')}-en` : `cover-${CONFIG.zhSlug.replace(/^overseas-ai-/, '')}`;

  // bump the literal article-count hero-stat only ("个主题"/"Topics" tracks a
  // separate curated list on this site and is never auto-derived, see header note).
  const newArticleCount = articles.length + 1;
  t = t.replace(
    /(<span class="hero-stat-num">)\d+(<\/span><span class="hero-stat-label">(?:篇文章|Articles))/,
    `$1${newArticleCount}$2`
  );

  const featuredRe = /<section class="featured-article"[\s\S]*?<\/section>/;
  const oldFeaturedMatch = t.match(featuredRe);
  if (!oldFeaturedMatch) throw new Error(`[homepage-${lang}] featured-article section not found`);
  const oldBlock = oldFeaturedMatch[0];

  if (CONFIG.promoteToFeatured) {
    // Scrape the CURRENT featured card's own copy before overwriting it, so the
    // demoted grid card doesn't need a manual TODO placeholder like docs-coin's version.
    const prevHref = (oldBlock.match(/<a class="featured-card" href="([^"]+)">/) || [])[1] || '';
    const prevSlug = prevHref.split('/').pop().replace('.html', '');
    const prevCover = (oldBlock.match(/<img class="featured-cover" src="([^"]+)"/) || [])[1] || '';
    const prevTagColor = (oldBlock.match(/archive-tag archive-tag--([a-z]+)"/) || [])[1] || '';
    const prevTagLabel = (oldBlock.match(/archive-tag archive-tag--[a-z]+">([^<]*)<\/span>/) || [])[1] || '';
    const prevTitle = (oldBlock.match(/<span class="featured-title">([\s\S]*?)<\/span>/) || [])[1] || '';
    const prevDesc = (oldBlock.match(/<span class="featured-desc">([\s\S]*?)<\/span>/) || [])[1] || '';
    const prevDatetime = (oldBlock.match(/<time datetime="([^"]+)">/) || [])[1] || '';
    const prevDateDisplay = prevDatetime.replace('T', ' ').replace(/\+.*/, '');
    const prevImgAlt = (oldBlock.match(/<img class="featured-cover"[^>]*alt="([^"]*)"/) || [])[1] || '';

    const label = lang === 'en' ? '— FEATURED' : '— 置顶阅读';
    const readMore = lang === 'en' ? 'Read more →' : '阅读详情 →';
    const ariaLabel = lang === 'en' ? 'Featured article' : '精选文章';
    const newFeatured = `<section class="featured-article" aria-label="${ariaLabel}">
        <a class="featured-card" href="${artPrefix}${slug}.html">
          <span class="featured-cover-wrap">
            <img class="featured-cover" src="/img/${coverPrefix}.svg" width="800" height="400" alt="${cfgLang.h1}${lang === 'en' ? ' cover image' : '封面图'}" fetchpriority="high">
          </span>
          <span class="featured-body">
            <span class="featured-label">${label}</span>
            <span class="featured-title-row">
              <span class="archive-tag archive-tag--${CONFIG.tagColor}">${cfgLang.tagLabel}</span>
              <span class="featured-title">${cfgLang.h1}</span>
            </span>
            <span class="featured-desc">${cfgLang.cardDesc}</span>
            <span class="featured-meta">
              <time datetime="${CONFIG.publishedISO}">${CONFIG.publishedISO.replace('T', ' ').replace(/\+.*/, '')}</time>
              <span class="featured-more">${readMore}</span>
            </span>
          </span>
        </a>
      </section>`;
    t = t.replace(featuredRe, newFeatured);

    if (prevHref) {
      const readLabel = lang === 'en' ? 'Read more' : '阅读详情';
      const newGridCard = `      <article class="post-card" id="${prevSlug}">
        <a class="post-card-cover-link" href="${prevHref}" tabindex="-1" aria-hidden="true"><img class="post-card-cover" src="${prevCover}" width="600" height="300" alt="${prevImgAlt}" loading="lazy"></a>
        <div class="post-card-body">
          <div class="post-card-tags"><span class="archive-tag archive-tag--${prevTagColor}">${prevTagLabel}</span></div>
          <h3 class="post-card-title"><a href="${prevHref}">${prevTitle}</a></h3>
          <p class="post-card-desc">${prevDesc}</p>
          <div class="post-card-meta">
            <time datetime="${prevDatetime}">${prevDateDisplay}</time>
            <a class="read-link" href="${prevHref}">${readLabel}</a>
          </div>
        </div>
      </article>
`;
      const gridOpenRe = /(<div class="card-grid" aria-label="[^"]*">\n)/;
      if (!gridOpenRe.test(t)) throw new Error(`[homepage-${lang}] card-grid opening not found`);
      t = t.replace(gridOpenRe, (m0, g1) => g1 + newGridCard);
    }
  }

  writeFile(file, t);
  console.log(`[5/9] homepage (${lang}) featured${CONFIG.promoteToFeatured ? '+grid' : ''} updated`);
}

// --- Step 6: sitemap.xml (no priority/changefreq — see CLAUDE.md section 4) ---
function updateSitemap() {
  let t = readFile('sitemap.xml');
  if (t.includes(`${CONFIG.zhSlug}.html`)) { console.log('[6/9] sitemap already updated, skip'); return; }
  const zhAnchorMatch = t.match(/  <url>\n    <loc>https:\/\/ponr\.org\/articles\/[a-z0-9-]+\.html<\/loc>/);
  const enAnchorMatch = t.match(/  <url>\n    <loc>https:\/\/ponr\.org\/en\/articles\/[a-z0-9-]+\.html<\/loc>/);
  if (!zhAnchorMatch || !enAnchorMatch) { console.log('[6/9] SKIP (no article <url> anchor found in sitemap.xml)'); return; }
  const zhEntry = `  <url>\n    <loc>https://ponr.org/articles/${CONFIG.zhSlug}.html</loc>\n    <lastmod>${CONFIG.publishedISO}</lastmod>\n  </url>\n`;
  const enEntry = `  <url>\n    <loc>https://ponr.org/en/articles/${CONFIG.enSlug}.html</loc>\n    <lastmod>${CONFIG.publishedISO}</lastmod>\n  </url>\n`;
  t = t.replace(zhAnchorMatch[0], zhEntry + zhAnchorMatch[0]);
  t = t.replace(enAnchorMatch[0], enEntry + enAnchorMatch[0]);
  if (CONFIG.promoteToFeatured) {
    const today = CONFIG.publishedISO.slice(0, 10);
    for (const loc of ['https://ponr.org/', 'https://ponr.org/articles.html', 'https://ponr.org/en/', 'https://ponr.org/en/articles.html']) {
      t = t.replace(new RegExp(`(<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/loc>\\n    <lastmod>)[^<]+`), `$1${today}`);
    }
  }
  writeFile('sitemap.xml', t);
  console.log('[6/9] sitemap.xml updated');
}

// --- Step 7: RSS feeds — full regenerate from discovered articles + the new one ---
function toRFC822(iso) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}):(\d{2})$/);
  if (!m) return '';
  const [, y, mo, da, hh, mm, ss, offH] = m;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const utcMs = Date.UTC(+y, +mo - 1, +da, +hh - parseInt(offH, 10), +mm, +ss);
  const dUtc = new Date(utcMs + parseInt(offH, 10) * 3600000);
  return `${days[dUtc.getUTCDay()]}, ${da} ${months[dUtc.getUTCMonth()]} ${y} ${hh}:${mm}:${ss} ${offH}00`;
}
function escapeXml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function regenerateFeeds(articles) {
  function buildFeed(lang) {
    const feedFile = lang === 'en' ? 'en/feed.xml' : 'feed.xml';
    const existing = readFile(feedFile);
    const channelTitle = (existing.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const channelLink = (existing.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const channelDesc = (existing.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
    const channelLang = (existing.match(/<language>([\s\S]*?)<\/language>/) || [])[1] || (lang === 'en' ? 'en-us' : 'zh-cn');
    const selfLink = `https://ponr.org/${lang === 'en' ? 'en/' : ''}feed.xml`;

    const artPrefix = lang === 'en' ? 'https://ponr.org/en/articles/' : 'https://ponr.org/articles/';
    const newItem = {
      title: lang === 'en' ? CONFIG.en.h1 : CONFIG.zh.h1,
      link: `${artPrefix}${(lang === 'en' ? CONFIG.enSlug : CONFIG.zhSlug)}.html`,
      pub: CONFIG.publishedISO,
      category: lang === 'en' ? CONFIG.en.tagLabel : CONFIG.zh.tagLabel,
      desc: lang === 'en' ? CONFIG.en.cardDesc : CONFIG.zh.cardDesc,
    };
    const otherItems = articles.map(a => {
      if (lang === 'zh') return { title: a.h1, link: `${artPrefix}${a.zhSlug}.html`, pub: a.pub, category: a.tagLabel, desc: a.desc };
      // EN meta lives in the EN article file, not the discovered zh record.
      const enHtml = readFile(`en/articles/${a.enSlug}.html`);
      const enMeta = extractMeta(enHtml);
      return { title: enMeta.h1, link: `${artPrefix}${a.enSlug}.html`, pub: enMeta.pub, category: a.tagLabel, desc: enMeta.desc };
    });
    const items = [newItem, ...otherItems].sort((a, b) => new Date(b.pub) - new Date(a.pub));
    const itemsXml = items.map(it => `  <item>
    <title><![CDATA[${it.title}]]></title>
    <link>${it.link}</link>
    <guid isPermaLink="true">${it.link}</guid>
    <pubDate>${toRFC822(it.pub)}</pubDate>
    <category>${escapeXml(it.category)}</category>
    <description><![CDATA[${it.desc}]]></description>
  </item>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${channelTitle}</title>
  <link>${channelLink}</link>
  <atom:link href="${selfLink}" rel="self" type="application/rss+xml"/>
  <description>${channelDesc}</description>
  <language>${channelLang}</language>
  <lastBuildDate>${toRFC822(items[0].pub)}</lastBuildDate>
${itemsXml}
</channel>
</rss>
`;
  }
  writeFile('feed.xml', buildFeed('zh'));
  writeFile('en/feed.xml', buildFeed('en'));
  console.log(`[7/9] feeds regenerated (${articles.length + 1} items each)`);
}

// --- Step 8: site.js DATES ---
function updateSiteJsDates() {
  let t = readFile('js/site.js');
  if (t.includes(`${CONFIG.zhSlug}.html`)) { console.log('[8/9] site.js DATES already updated, skip'); return; }
  const pubDisplay = CONFIG.publishedISO.replace('T', ' ').replace(/\+.*/, '');
  const anchor = '  var DATES = {\n';
  if (!t.includes(anchor)) { console.log('[8/9] SKIP (DATES anchor not found in site.js)'); return; }
  const entry = `    '/articles/${CONFIG.zhSlug}.html': '${pubDisplay}',\n    '/en/articles/${CONFIG.enSlug}.html': '${pubDisplay}',\n`;
  t = t.replace(anchor, anchor + entry);
  writeFile('js/site.js', t);
  console.log('[8/9] site.js DATES updated');
}

// --- Step 9: rebuild minified CSS/JS, hash, and propagate ?v= everywhere ---
function md5(filePath) {
  return execSync(`node -e "const c=require('crypto');const f=require('fs');console.log(c.createHash('md5').update(f.readFileSync('${filePath.replace(/\\/g, '/')}')).digest('hex').slice(0,10))"`).toString().trim();
}
function rebuildAndPropagateHashes() {
  execSync('npx --yes clean-css-cli@5 -o styles.min.css styles.css', { cwd: root, stdio: 'inherit' });
  execSync('npx --yes terser js/site.js -c -m -o js/site.min.js', { cwd: root, stdio: 'inherit' });

  const newCssHash = md5(path.join(root, 'styles.min.css'));
  const newJsHash = md5(path.join(root, 'js/site.min.js'));
  const sample = readFile('index.html');
  const oldCssHash = (sample.match(/styles\.min\.css\?v=([a-f0-9]+)/) || [])[1];
  const oldJsHash = (sample.match(/site\.min\.js\?v=([a-f0-9]+)/) || [])[1];

  function walkHtml(dir, files) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkHtml(full, files);
      else if (entry.name.endsWith('.html')) files.push(full);
    }
  }
  const allHtml = [];
  walkHtml(root, allHtml);

  function replaceEverywhere(oldHash, newHash, filePattern) {
    if (!oldHash || oldHash === newHash) return 0;
    let count = 0;
    for (const f of allHtml) {
      let t = fs.readFileSync(f, 'utf-8');
      const marker = `${filePattern}?v=${oldHash}`;
      if (!t.includes(marker)) continue;
      t = t.split(marker).join(`${filePattern}?v=${newHash}`);
      fs.writeFileSync(f, t, 'utf-8');
      count++;
    }
    return count;
  }
  const cssCount = replaceEverywhere(oldCssHash, newCssHash, 'styles.min.css');
  const jsCount = replaceEverywhere(oldJsHash, newJsHash, 'site.min.js');
  console.log(`[9/9] rebuilt + hash propagation: css ${oldCssHash}->${newCssHash} (${cssCount} files), js ${oldJsHash}->${newJsHash} (${jsCount} files)`);
}

// ---------------------------------------------------------------------------
function main() {
  if (CONFIG.zhSlug.startsWith('REPLACE-ME') || CONFIG.enSlug.startsWith('REPLACE-ME')) {
    console.error('Fill in CONFIG at the top of this script before running.');
    process.exit(1);
  }
  const articles = discoverArticles();
  console.log(`Discovered ${articles.length} existing articles (newest: ${articles[0] && articles[0].zhSlug}).`);

  insertSidebarItems();
  insertRelatedItems(articles);
  updateItemLists();
  insertArchiveItem('zh');
  insertArchiveItem('en');
  updateHomepage('zh', articles);
  updateHomepage('en', articles);
  updateSitemap();
  regenerateFeeds(articles);
  updateSiteJsDates();
  rebuildAndPropagateHashes();
  console.log('\nDone. Now: (1) spot-check JSON-LD validity and tag balance on the touched files,');
  console.log('(2) verify in the browser (featured card, archive list, dark-mode tag colors),');
  console.log('(3) run the SEO audit script.');
}

main();
