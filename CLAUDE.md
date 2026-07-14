# ponr.org — SEO 标准（新增/修改文章必须遵守）

静态站点，无构建工具，中文根目录 + `/en/` 英文目录，`hreflang` 成对互链。本规范源自 2026-07-09 的全站 SEO 审计（44 页），此后所有新文章、所有首页/列表页改动都必须满足以下标准，不再需要用户重复提醒。

## 1. 标题（`<title>`）

- **中文**：`{文章标题} - AI订阅指南`，中文信息密度高，天然落在合理长度内，无需刻意压缩。
- **英文**：`<title>` 总长度 **≤ 60 字符**，文章页不加 `- AI Access Guide` 品牌后缀（预算不够），只有首页可以用 `AI Access Guide｜{slogan}` 形式（因为品牌词本身就是关键词）。
- 核心关键词放在标题前 60 字符内。
- `og:title` / `twitter:title` 与 `<title>` 内容保持完全一致。

## 2. 描述（`<meta name="description">`）

- **中文**：目标 **70–100 个字符**（不是英文常见的 150–160，那是按拉丁字符像素宽度算的，中文字形更宽，实际预算小得多）。
- **英文**：目标 **140–160 字符**，不超过 160。
- `og:description` / `twitter:description` / JSON-LD `Article.description` 三处必须与 `<meta name="description">` **完全相同的字符串**（含转义方式：HTML 属性里用 `&amp;`，JSON-LD 字符串里用原始 `&`，两处的原文不能靠字符串复制粘贴混用，否则批量替换脚本会漏掉不匹配的那一份）。
- 新增/修改文案后，写一个 Node 脚本量长度，不要靠肉眼数字符。

## 3. 封面图与社交分享图（关键：SVG 不能直接进 og:image）

- 页面上可见的封面图继续用 SVG（`<img class="article-cover" src="/img/cover-xxx.svg">`），矢量图在浏览器里正常渲染，不受影响。
- 但 `og:image` / `twitter:image` **必须是 PNG**，Twitter/X 完全不支持 SVG 卡片图，SVG 会导致分享出去没有封面图。
- 标准流程：画完 SVG 封面后，立即用无头 Chrome 光栅化出同名 PNG，两个文件都保留：
  ```bash
  "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --hide-scrollbars \
    --screenshot="D:/m-project/src/docs/img/cover-xxx.png" --window-size=800,400 \
    --default-background-color=FFFFFF "file:///D:/m-project/src/docs/img/cover-xxx.svg"
  ```
  文章封面固定 `viewBox="0 0 800 400"`，用 `--window-size=800,400`；首页/关于页这种大卡片式的用 `1200,630`。
- `og:image` / `twitter:image` / JSON-LD `ImageObject.url` / `Article.image` 四处都指向 `.png`，`og:image:type` 写 `image/png`，`og:image:width`/`height` 与光栅化尺寸一致（800/400 或 1200/630，不要照抄别的页面的尺寸）。
- 系统里没有 ImageMagick/rsvg-convert 之类的 CLI 工具，`C:\WINDOWS\system32\convert.exe` 是磁盘转换工具、不是图片转换工具，不要被名字误导；无头 Chrome 截图是当前唯一可用的光栅化手段。

## 4. 新文章上线检查清单

生成新文章（中英文各一篇）时，除了正文本身，以下**全部**要同步完成，不要遗漏：

1. 标题/描述按上面 1、2 条把关，中英文都要量长度。
2. 封面 SVG + 光栅化 PNG（中英文各一套，配色/图标可以共用，只换文字）。
3. `sitemap.xml`：新增 `<url>` 条目，`lastmod` 用真实发布时间戳（`date` 命令获取，不要瞎写），**不需要**再加 `priority`/`changefreq`（Google 2020 年后已忽略，站点已统一去掉）。
4. `feed.xml` / `en/feed.xml`：在顶部插入新 `<item>`，`pubDate` 与 sitemap 的 `lastmod` 一致，同时更新 `lastBuildDate`。
5. `js/site.js` 的 `DATES` 映射表：补充新文章的时间戳条目。
6. hreflang 互链：中英文页面互相 `<link rel="alternate" hreflang="...">`，发布后建议跑一遍互链核对（不能只单向声明）。
7. 首页（`index.html` + `en/index.html`）卡片网格、`articles.html` + `en/articles.html` 归档列表、所有相关旧文章侧边栏「相关阅读」都要插入新文章条目。
8. JSON-LD `ItemList`（首页/归档页）里的 position 需要整体重新编号。
9. 从 2–3 篇最相关的已有文章里加一条指向新文章的内链（反向也可以考虑）。
10. 新文章置顶为首页精选（featured）时，同步把 `index.html` / `en/index.html` `<head>` 里的 `<link rel="preload" as="image" fetchpriority="high">` 指向新文章的封面图（LCP 优化，2026-07 从 docs-coin 项目同步过来的写法）——这个 preload 链接必须和当前精选卡片的封面图保持一致，忘记改就是白做，浏览器还是优先加载旧图。

## 5. 改动首页/列表页/关于页时

只要碰了 `index.html`、`en/index.html`、`articles.html`、`en/articles.html`、`about.html`、`en/about.html` 中的任意一个，**顺手把 `sitemap.xml` 里对应 URL 的 `lastmod` 改成当天日期**——这几个页面改动频繁，`lastmod` 长期不更新会让搜索引擎误判「无新内容」而降低抓取优先级。

## 6. 站点搜索的 SearchAction 结构化数据

首页/关于页/文章列表页的 JSON-LD `WebSite` 节点带 `potentialAction`（`SearchAction`），指向 `articles.html?q={search_term_string}` / `en/articles.html?q={search_term_string}`。这依赖 `articles.html` 和 `en/articles.html` 的内联脚本在页面加载时读取 URL 的 `?q=` 参数、回填搜索框并触发一次过滤（逻辑在这两个文件 `</body>` 前的内联 `<script>` 里，不在 `site.js` 里，因为只有这两个页面需要）。改动这两个页面的搜索框结构时，注意同步检查这段回填逻辑还能不能找到 `.sidebar-search-input`。

## 7. CSS / JS 压缩（必须同步重新构建）

`styles.css` 与 `js/site.js` 是可读的源文件，**页面实际引用的是压缩后的 `styles.min.css` 与 `js/site.min.js`**（全站 46 个页面的 `<link>`/`<script>` 都指向压缩版）。修改 `styles.css` 或 `js/site.js` 后，必须重新生成压缩版，否则线上效果会和源文件不一致（压缩版没更新，等于改动没生效）：

```bash
npx --yes clean-css-cli@5 -o styles.min.css styles.css
npx --yes terser js/site.js -c -m -o js/site.min.js
```

这两个工具通过 `npx` 临时拉取，不需要预装依赖，但需要环境有网络访问权限。改完 CSS/JS 后，务必在预览里冒烟测试一遍主题切换、搜索过滤等交互，确认压缩没有引入运行时错误（`clean-css`/`terser` 都很成熟，但压缩后的代码更难读，出问题也更难肉眼发现）。

## 8. CSS / JS 缓存清除（改完必须同步更新版本号，否则线上看到的是旧版）

`nginx` 给 `styles.min.css` / `js/site.min.js` 设置了 `Cache-Control: public, max-age=604800`（7 天），Cloudflare 会按这个头在边缘缓存这两个文件整整 7 天，且**源站文件更新后不会自动通知 Cloudflare 刷新缓存**。如果只改了源文件、重新压缩、部署上线，用户看到的可能还是 7 天缓存窗口内第一次被缓存下来的旧版本（表现为：新加的 CSS 规则/JS 逻辑在线上不生效，但源码和压缩产物本身都是对的）。

为此站点给这两个文件的引用加了内容哈希版本号（`?v=xxxx`），全站 60+ 个页面的 `<link>`/`<script>` 都要保持一致。**每次重新压缩 `styles.min.css` 或 `js/site.min.js` 之后，必须重新计算哈希并批量更新所有页面的引用**，否则版本号不变 = URL 不变 = Cloudflare 照样返回旧缓存，压缩这一步等于白做：

```bash
node -e "
const fs = require('fs');
const crypto = require('crypto');
function hash(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
}
console.log('CSS_HASH=' + hash('styles.min.css'));
console.log('JS_HASH=' + hash('js/site.min.js'));
"
```

拿到新哈希后，把所有页面里的 `href="/styles.min.css?v=旧哈希"` 和 `src="/js/site.min.js?v=旧哈希"` 批量替换成新哈希（可以写一个一次性 Node 脚本遍历全部 `.html` 文件做字符串替换，模式参考本仓库历史提交）。改完用 `curl https://ponr.org/styles.min.css?v=新哈希 | grep 关键规则` 确认线上确实拿到了新内容，而不是只在本地验证。
