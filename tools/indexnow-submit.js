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
const ENDPOINT = 'api.indexnow.org';

function urlsFromSitemap() {
  const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

function submit(urlList) {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  });

  const req = https.request(
    {
      hostname: ENDPOINT,
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
        console.log(`IndexNow response: ${res.statusCode} ${res.statusMessage}`);
        if (data) console.log(data);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Submitted ${urlList.length} URL(s).`);
        } else {
          console.error('Submission was not accepted — check host/key/keyLocation match the live site.');
          process.exitCode = 1;
        }
      });
    }
  );
  req.on('error', (err) => {
    console.error('IndexNow request failed:', err.message);
    process.exitCode = 1;
  });
  req.write(body);
  req.end();
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
