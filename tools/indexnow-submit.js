#!/usr/bin/env node
// Submit URLs to IndexNow (https://www.indexnow.org/documentation) so Bing/Yandex/other
// participating engines fetch new/changed pages immediately instead of waiting to recrawl.
//
// Usage:
//   node tools/indexnow-submit.js                 submit every <loc> in sitemap.xml + en/... (bootstrap / re-sync)
//   node tools/indexnow-submit.js <url> [url...]   submit only the given URLs (use after publishing new articles)
//
// Requires the key file at the site root (already created): 492c18170d39924679d2b2975e4e81f5.txt

const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'ponr.org';
const KEY = '492c18170d39924679d2b2975e4e81f5';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
// Submit to both the shared aggregator (fans out to Yandex/Seznam/Naver/etc.) AND Bing's own
// dedicated endpoint directly — Bing Webmaster Tools' own "IndexNow" dashboard/recommendation
// only reliably reflects submissions it received on its own endpoint, not ones that arrived via
// the shared aggregator's fanout (that hop isn't guaranteed to register in Bing's UI promptly).
const ENDPOINTS = ['api.indexnow.org', 'www.bing.com'];

function urlsFromSitemap() {
  const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

function submitToEndpoint(endpoint, urlList) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    });

    const req = https.request(
      {
        hostname: endpoint,
        path: '/indexnow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          console.log(`[${endpoint}] ${res.statusCode} ${res.statusMessage}${data ? ' — ' + data : ''}`);
          resolve(ok);
        });
      }
    );
    req.on('error', (err) => {
      console.error(`[${endpoint}] request failed:`, err.message);
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

async function submit(urlList) {
  const results = await Promise.all(ENDPOINTS.map((ep) => submitToEndpoint(ep, urlList)));
  if (results.every(Boolean)) {
    console.log(`Submitted ${urlList.length} URL(s) to all endpoints.`);
  } else {
    console.error('One or more endpoints rejected the submission — check host/key/keyLocation match the live site.');
    process.exitCode = 1;
  }
}

const args = process.argv.slice(2);
const urlList = args.length > 0 ? args : urlsFromSitemap();

if (urlList.length === 0) {
  console.error('No URLs to submit.');
  process.exit(1);
}
if (urlList.length > 10000) {
  console.error('IndexNow accepts at most 10,000 URLs per request; split the list.');
  process.exit(1);
}

console.log(`Submitting ${urlList.length} URL(s) to IndexNow...`);
submit(urlList);
