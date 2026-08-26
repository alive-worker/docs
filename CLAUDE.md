# ponr.org — SEO 标准（新增/修改文章必须遵守）

静态站点，无构建工具，中文根目录 + `/en/` 英文目录，`hreflang` 成对互链。本规范源自 2026-07-09 的全站 SEO 审计（44 页），此后所有新文章、所有首页/列表页改动都必须满足以下标准，不再需要用户重复提醒。

## 1. 标题（`<title>`）

- **中文文章页不加品牌后缀**：不用 `{标题} - AI订阅指南` 这种机械拼接格式（2026-07-14 已把全站 30 篇文章的标题和 H1 都改掉了这个模式）。品牌名 `AI订阅指南` 只在首页 `<title>`（`AI订阅指南｜{slogan}` 形式）和关于页保留，文章页标题就是标题本身，不额外拼后缀。
- **避免全站标题模板化**：不要让多篇文章的标题都长成同一个句式（之前全站 30 篇里有 15+ 篇都是「海外AI订阅{主题}指南」，这种整齐划一的模板化标题会被搜索引擎判定为批量生成/程序化内容，导致收录困难甚至被判为低质。新文章标题要各自有自然、独立的句式——用疑问句、对比句、"怎么办/怎么选/避坑/实操"等不同收尾方式混搭，不要全部用"指南"收尾，也不要全部以"海外AI订阅"开头。
- **英文**：`<title>` 总长度 **≤ 60 字符**，文章页不加 `- AI Access Guide` 品牌后缀（预算不够），只有首页可以用 `AI Access Guide｜{slogan}` 形式（因为品牌词本身就是关键词）。英文标题本来就没有走中文这套模板化的老路，继续保持自然多样即可。
- 核心关键词放在标题前 60 字符内。
- `og:title` / `twitter:title` 与 `<title>` 内容保持完全一致。
- 文章标题一旦被其他文章的「相关文章」侧边栏、首页/归档页 JSON-LD `ItemList`、RSS `feed.xml`、封面图 `alt` 文本等处引用，改标题时必须全站同步替换，不能只改文章自己的 `<title>`/`<h1>`——这类引用点分散在很多文件里，遗漏的话会出现新旧标题在站内互相矛盾。

## 2. 描述（`<meta name="description">`）

- **中文**：目标 **150–160 个字符**，跟英文标准统一（2026-08-22 起：Bing Webmaster Tools 对所有语言页面统一按150-160字符判定"描述过短"，此前按中文字形像素宽度定的70-100/90-100会被持续标红，所以改成跟英文一致，不再区分语言）。
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

## 3.5 选题：别只写海外AI，国内AI大模型也要时不时覆盖

站内 75+ 篇文章绝大多数标题带 `overseas-ai-`/`ai-subscription-`，全是围绕海外AI服务（ChatGPT/Claude/Gemini）的支付、账单、风控、虚拟卡、稳定币场景；专门讲国内AI大模型（DeepSeek、豆包、Kimi、文心一言、通义千问等）的只有 `domestic-ai-subscription-guide.html` 一篇入门导读，且没有进首页可见网格（被标了 `post-card--overflow`）。这是 2026-08-25 用户明确提出的反馈：以后新增文章时，不能每次都默认写海外AI主题，要时不时选国内大模型相关的具体场景/机制作为选题（比如国内大模型的会员计费规则、企业API定价、账号实名/合规要求、算力紧张导致的限流、国内支付渠道特有的坑等），跟海外AI主题交替安排，不要长期只发一种。新增国内AI主题文章时，同样要满足本文件其余全部标准（标题/描述/封面图/核验清单/资料来源等），资料来源改用国内官方文档/公告（比如各厂商自己的定价页、公告）。

## 4. 新文章上线检查清单

生成新文章（中英文各一篇）时，除了正文本身，以下**全部**要同步完成，不要遗漏：

1. 标题/描述按上面 1、2 条把关，中英文都要量长度。
2. 封面 SVG + 光栅化 PNG（中英文各一套，配色/图标可以共用，只换文字）。
3. `sitemap.xml`：新增 `<url>` 条目，`lastmod` 用真实发布时间戳（`date` 命令获取，不要瞎写），**不需要**再加 `priority`/`changefreq`（Google 2020 年后已忽略，站点已统一去掉）。
4. `feed.xml` / `en/feed.xml`：在顶部插入新 `<item>`，`pubDate` 与 sitemap 的 `lastmod` 一致，同时更新 `lastBuildDate`。
5. `js/site.js` 的 `DATES` 映射表：补充新文章的时间戳条目，同时手工同步改 `js/site.min.js`（不需要重新跑 terser，直接照抄格式加进去即可）。**改完 `site.min.js` 之后必须走一遍第8节的哈希重算流程**——哪怕只加了一行数据、没碰任何逻辑代码，文件字节也已经变了，`?v=` 版本号不重算，Cloudflare 就会用旧哈希对应的缓存继续伺候好几天，线上首页统计数字之类依赖这个文件的地方会卡在旧值上（2026-08-26 已经因为漏了这步导致线上文章数連续几次发布都没更新，见第8节记录）。
6. hreflang 互链：中英文页面互相 `<link rel="alternate" hreflang="...">`，发布后建议跑一遍互链核对（不能只单向声明）。
7. 首页（`index.html` + `en/index.html`）卡片网格、`articles.html` + `en/articles.html` 归档列表、所有相关旧文章侧边栏「相关阅读」都要插入新文章条目。首页三段式（轮播 carousel 5 篇 + 热门精选 hotpicks 4 篇 + 网格可见 9 篇，2026-08-23 起轮播从 3 篇扩到 5 篇）按最新发布时间顺序依次排列、互不重叠：最新 5 篇进轮播，其后 4 篇进 hotpicks，再其后 9 篇在网格里不带 `post-card--overflow`，更早的文章网格卡片都要带 `post-card--overflow`（网格里其实收录了全部文章，只是超出前 9 篇的用这个 class 隐藏）。
8. JSON-LD `ItemList`（首页/归档页）里的 position 需要整体重新编号。
9. 从 2–3 篇最相关的已有文章里加一条指向新文章的内链（反向也可以考虑）。
10. 新文章置顶为首页精选（featured）时，同步把 `index.html` / `en/index.html` `<head>` 里的 `<link rel="preload" as="image" fetchpriority="high">` 指向新文章的封面图（LCP 优化，2026-07 从 docs-coin 项目同步过来的写法）——这个 preload 链接必须和当前精选卡片的封面图保持一致，忘记改就是白做，浏览器还是优先加载旧图。
11. `articles.html` / `en/articles.html` 顶部「按主题分类阅读」的标签筛选（`.topic-tag-btn`）：新文章要归到入门与基础/虚拟卡专题/稳定币支付专题/特殊场景与账户管理这四类之一，同时给对应 `<li class="archive-item">` 加 `data-topic="basics|virtual-card|stablecoin|special"` 属性，并把该标签按钮里 `.topic-tag-count` 的计数 +1（这个数字是手工维护的静态计数，不是自动统计，改了文章分类却忘记同步这个数字，标签上显示的篇数就会跟点开后的实际结果对不上）。
12. 新文章按 `data-topic` 归类后，同步检查 `/topics/{basics|virtual-card|stablecoin|billing-account}/`（含 `en/topics/...`）对应的专题聚合页——这些页面（2026-08-22 新增）是手工维护的分组文章列表，不会跟着 `articles.html` 自动更新，漏加会导致专题页比归档页少收录文章。
13. 首页「热门精选」（hotpicks，4条）**不能跟轮播（carousel，最新5篇，2026-08-23 起从3篇扩到5篇）重复**，网格可见的 9 篇也不能跟轮播/hotpicks 重复——这是 2026-08-21 用户明确纠正过的标准（早期版本允许两者重叠，已废弃）。发新文章后用脚本核对 `index.html`/`en/index.html` 的 carousel（5个）、hotpicks（4个）、网格非 overflow（9个）三组文章 slug 两两交集必须为空。
14. **核验清单**（2026-08-23 新增，仿照 docs-coin 项目）：每篇新文章正文最前面（封面图之后、第一个 `<section>` 之前）加一个 `<div class="article-verify-panel">` 组件，标题固定「核验清单」/`Verification Checklist`，里面 3–5 条 `<li><span class="article-verify-check">✓</span>...</li>`。条目必须是**针对这篇文章具体机制、读者能直接照做去核对的动作**（比如"账单页显示的卡号后四位是否跟银行APP一致"），不能是"注意资金安全"这种没有可执行下一步的空泛提醒——标准与 `methodology.html` 第2节「核验清单标注标准」一致。2026-08-23 已把这个组件回填到全站彼时已发布的全部文章（71 篇 × 中英文），此后新文章直接照此标准写，不再有"暂不回填"的例外。
15. **资料来源与延伸阅读**（2026-08-23 新增，仿照 docs-coin 项目）：`<nav class="toc">` 之后（`.article-columns` 内、TOC 下方同一侧栏列）加一个 `<aside class="references" aria-label="资料来源与延伸阅读">`，标题固定「资料来源与延伸阅读」/`Sources and Further Reading`，2–3 条 `<li><a href="..." target="_blank" rel="noopener nofollow">来源名称</a>：一句话说明这个来源跟本文哪个具体论点相关</li>`，结尾一段 `<p class="ref-note">` 声明信息可能随时间变化、以官方最新信息为准。链接必须是**真实存在、发布前用 WebFetch/WebSearch 核实过的官方/权威页面**（卡组织、平台官方文档、监管机构等），不能凭记忆猜 URL——猜的 URL 大概率 404（本节标准建立时曾实测踩过坑：凭记忆写的 Visa/Mastercard 官方页面 URL 两条里一条 404、一条 403，改用 WebSearch 找到的真实链接才验证通过）。**链接不能是站内自己的赞助/联盟链接**（比如正文和页脚里带 `rel="sponsored"` 的 rdvcc.com、allswap.io、chdh.me 这类合作方引流链接）——2026-08-23 批量回填时曾有几篇文章把 allswap.io 当"官方来源"写进了这个板块，因为它在正文别处确实是以"非托管跨链兑换工具"的身份被提及，但它终究是本站的商业合作方而非独立第三方信源，核验清单式的"资料来源"必须是跟本站没有商业关系的中立信息源，发现后已改用其他真实第三方来源替换。2026-08-23 已把这个组件回填到全站彼时已发布的全部文章（71 篇 × 中英文），此后新文章直接照此标准写，不再有"暂不回填"的例外。

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

为此站点给这两个文件的引用加了内容哈希版本号（`?v=xxxx`），全站 60+ 个页面的 `<link>`/`<script>` 都要保持一致。**判断要不要重算哈希的标准是"文件字节有没有变"，不是"有没有跑压缩工具"**——2026-08-26 踩过一次实锤的坑：连续几次发文只往 `js/site.min.js` 里手工加 `DATES` 数据条目（图省事没跑 terser，理由是"没改源码逻辑"），但 `site.min.js` 的**文件内容确实变了**，`?v=` 却没跟着变，导致 Cloudflare 用旧哈希对应的旧缓存连续伺候了好几次发布，线上首页"N篇实测文章"数字卡在了好几篇之前的旧值，直到专门排查才发现。**结论：不管是重新跑 `clean-css`/`terser`，还是手工直接改 `styles.min.css`/`js/site.min.js`（哪怕只加了一行 `DATES` 数据），只要这两个文件的字节内容变了，就必须重新计算哈希并批量替换全站引用，没有例外。**

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

## 9. 内容新鲜度：别写会过期的具体数字/型号

2026-08-22 的一次审计发现 `ai-application-scenarios-guide.html` 里 Perplexity Pro 宣称的模型（GPT-4o、Claude 3.7）和 ElevenLabs 价格（$5/月）都已经是过期数据，而文章的"发布时间"却是近期——这种"发布时间新但内容旧"的落差比不写具体数字更伤可信度。

- **能不写具体价格/型号就不写**：正文只在真的需要横向对比费用时才引用具体数字，且优先用"具体价格以官方页面为准，会随时间调整"这类不过期的表述；Cursor/Perplexity 这类会频繁更新可选模型的产品，不要点名具体型号。
- **一定要写具体数字时**：发布前用 WebFetch/WebSearch 核对官方定价页，不能凭记忆或训练数据写；并在文章 `article-meta`（发布时间那一行）里加一句「价格与模型信息最后核验于 YYYY-MM-DD」，跟发布时间分开标注，方便以后追踪是否过期。
- 全站目前只有个别文章真的引用了会过期的硬数字（多数文章本来就有意回避具体价格/型号），不需要为此在每篇文章套统一模板，按实际内容判断即可。

## 10. 全站统计类数字不手工维护

首页"N 篇实测文章"这类数字曾经是手工填的常量，2026-08-22 审计发现它跟归档页真实篇数（69）对不上（首页显示 65）。已经改成运行时从 `js/site.js` 里的 `DATES` 映射表按语言前缀（`/articles/` vs `/en/articles/`）自动统计（见 `js/site.js` 里 `data-count-source="articles"` 那段），`DATES` 表本来就在每次发文时更新（见第 4 节第 5 条），不需要再单独维护这个数字。以后如果要在页面上展示新的"全站统计"类数字，优先挂在已有的数据源（`DATES` 表、`articles.html` 的 `data-topic` 计数等）上自动算，不要新增一个手工常量。
