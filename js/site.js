(function () {
  'use strict';

  // --- i18n: the /en/ tree shares this exact script with the zh-CN pages, so every
  // user-facing string it injects at runtime is looked up by language here. ---
  var IS_EN = location.pathname.indexOf('/en/') === 0;
  var STR = IS_EN ? {
    prev: 'Previous', next: 'Next',
    recentHeading: 'Recent Articles', allHeading: 'Latest Articles', searchHeading: 'Search Results',
    viewAll: 'View all articles →', noMatch: 'No matching articles found', publishedOn: 'Published ',
    toDark: 'Switch to dark mode', toLight: 'Switch to light mode'
  } : {
    prev: '上一页', next: '下一页',
    recentHeading: '近期文章', allHeading: '最新文章', searchHeading: '搜索结果',
    viewAll: '查看全部文章 →', noMatch: '没有找到匹配的文章', publishedOn: '发布于 ',
    toDark: '切换到深色模式', toLight: '切换到浅色模式'
  };

  // --- Theme toggle: the <head> inline script already set data-theme before paint to
  // avoid a flash of the wrong theme; this just wires up the button and persists choices. ---
  var themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    var refreshThemeLabel = function () {
      var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? STR.toLight : STR.toDark);
    };
    refreshThemeLabel();
    themeToggle.addEventListener('click', function () {
      var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      if (isDark) { document.documentElement.setAttribute('data-theme', 'light'); }
      else { document.documentElement.removeAttribute('data-theme'); }
      try { localStorage.setItem('theme', isDark ? 'light' : 'dark'); } catch (e) {}
      refreshThemeLabel();
    });
  }

  // Measure the real rendered height of header + search bar and publish it as a CSS var,
  // so sticky offsets below never drift from a hardcoded guess (avoids a sub-pixel gap
  // where scrolled content could peek through between the sticky layers).
  function syncStickyOffset() {
    var header = document.querySelector('.site-header');
    var bar = document.querySelector('.search-bar:not(.search-bar--inline)');
    var topics = document.querySelector('.hot-topics');
    if (!header) return;
    var headerHeight = header.getBoundingClientRect().height;
    var barHeight = bar ? bar.getBoundingClientRect().height : 0;
    var topicsOffset = headerHeight + barHeight;
    var topicsHeight = topics ? topics.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--header-offset', Math.ceil(headerHeight) + 'px');
    document.documentElement.style.setProperty('--topics-offset', Math.ceil(topicsOffset) + 'px');
    document.documentElement.style.setProperty('--sticky-offset', Math.ceil(topicsOffset + topicsHeight) + 'px');
  }
  syncStickyOffset();
  window.addEventListener('resize', syncStickyOffset);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncStickyOffset);
  }

  // Homepage-only inline search box (see .search-bar--inline): normally a plain static block
  // inside the hero, but once scrolled out of view it would just disappear — pin it back to a
  // top bar (.is-pinned, styled to match the original sticky search-bar) so it's still reachable
  // no matter how far down the page you are. A spacer keeps the layout from jumping when the
  // box leaves normal flow for position:fixed.
  (function () {
    var bar = document.querySelector('.search-bar--inline');
    if (!bar) return;
    var spacer = document.createElement('div');
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.display = 'none';
    bar.parentNode.insertBefore(spacer, bar.nextSibling);
    // Plain in-flow sibling right before the bar, not a positioned child inside it — setting
    // position on `bar` itself via inline style would out-specificity the .is-pinned class
    // rule's own `position: fixed` and the pin would silently never actually apply.
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'width:1px;height:1px;pointer-events:none;';
    bar.parentNode.insertBefore(sentinel, bar);

    var observer = new IntersectionObserver(function (entries) {
      var entry = entries[0];
      var pin = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      if (pin === bar.classList.contains('is-pinned')) return;
      if (pin) {
        spacer.style.height = bar.getBoundingClientRect().height + 'px';
        spacer.style.display = 'block';
        bar.classList.add('is-pinned');
      } else {
        bar.classList.remove('is-pinned');
        spacer.style.display = 'none';
      }
    }, { threshold: 0 });
    observer.observe(sentinel);
  })();

  // The sidebar is position:fixed (viewport-pinned, immune to how tall its former grid
  // sibling .main happens to be — a position:sticky sidebar shares .main's containing
  // block and can run out of room and slide away before the page actually ends if main's
  // content is short). Since .layout is centered and its left edge shifts with viewport
  // width, the fixed sidebar's left offset has to be measured and reapplied by hand.
  function syncSidebarPosition() {
    var sidebar = document.querySelector('.sidebar');
    var layout = document.querySelector('.layout');
    if (!sidebar || !layout) return;
    if (window.matchMedia('(max-width: 880px)').matches) return; // mobile resets position via CSS
    var layoutRect = layout.getBoundingClientRect();
    var layoutPaddingLeft = parseFloat(getComputedStyle(layout).paddingLeft) || 0;
    document.documentElement.style.setProperty('--sidebar-left', Math.round(layoutRect.left + layoutPaddingLeft) + 'px');
  }
  syncSidebarPosition();
  window.addEventListener('resize', syncSidebarPosition);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncSidebarPosition);
  }

  // Dock the fixed sidebar once the page's remaining content runs out, so it stops right
  // above the footer instead of continuing to float over it (see .sidebar.is-docked in CSS).
  function updateSidebarDock() {
    var sidebar = document.querySelector('.sidebar');
    var layout = document.querySelector('.layout');
    var main = document.querySelector('.main');
    if (!sidebar || !layout || !main) return;
    if (window.matchMedia('(max-width: 880px)').matches) { sidebar.classList.remove('is-docked'); sidebar.style.maxHeight = ''; return; }
    var stickyOffset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sticky-offset')) || 0;
    var layoutRect = layout.getBoundingClientRect();
    // .layout itself now stretches to fill short pages (flex:1 0 auto, so the footer docks to
    // the viewport bottom instead of leaving a gap) — its own bottom no longer reflects where
    // the real content ends, so it can't tell us when the sidebar is about to run past it.
    // .main isn't stretched, only its parent .layout is, so .main's bottom still tracks the
    // actual content height and is what we want to compare against.
    var mainRect = main.getBoundingClientRect();
    var sidebarHeight = sidebar.getBoundingClientRect().height;
    var docked = mainRect.bottom < stickyOffset + sidebarHeight;
    sidebar.classList.toggle('is-docked', docked);
    // Fixed mode caps height against the viewport (100vh - sticky offset), but the docked
    // area is .layout's own box, which can be much shorter — e.g. .layout now stretches to
    // fill a short page (see the body/.layout flex rule) so its height no longer matches the
    // sidebar's real content height. Without an explicit cap here the box renders at full
    // content height and bottom-anchors, pushing the top items above the viewport with no way
    // to scroll to them. Clamp it to the actual docked space and let .sidebar-nav's own
    // overflow-y:auto handle the rest.
    sidebar.style.maxHeight = docked ? Math.max(160, layoutRect.height) + 'px' : '';
  }
  var dockTicking = false;
  function requestSidebarDockUpdate() {
    if (dockTicking) return;
    dockTicking = true;
    requestAnimationFrame(function () { updateSidebarDock(); dockTicking = false; });
  }
  updateSidebarDock();
  window.addEventListener('scroll', requestSidebarDockUpdate, { passive: true });
  window.addEventListener('resize', updateSidebarDock);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateSidebarDock);
  }

  // Reusable client-side paginator: shows `pageSize` items per page and builds controls in `pager`.
  function paginate(anchor, items, pageSize, pager) {
    if (!pager || items.length <= pageSize) return;
    var pageCount = Math.ceil(items.length / pageSize);
    var current = 1;
    function make(label, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', onClick);
      return b;
    }
    function toTop() {
      var y = anchor.getBoundingClientRect().top + window.pageYOffset - 84;
      window.scrollTo({ top: y < 0 ? 0 : y, behavior: 'smooth' });
    }
    function render() {
      items.forEach(function (el, i) {
        el.style.display = (Math.floor(i / pageSize) + 1 === current) ? '' : 'none';
      });
      pager.innerHTML = '';
      var prev = make(STR.prev, function () { if (current > 1) { current--; render(); toTop(); } });
      prev.disabled = current === 1;
      pager.appendChild(prev);
      for (var p = 1; p <= pageCount; p++) {
        (function (p) {
          var b = make(String(p), function () { if (current !== p) { current = p; render(); toTop(); } });
          if (p === current) b.setAttribute('aria-current', 'true');
          pager.appendChild(b);
        })(p);
      }
      var next = make(STR.next, function () { if (current < pageCount) { current++; render(); toTop(); } });
      next.disabled = current === pageCount;
      pager.appendChild(next);
    }
    render();
    return { render: render };
  }

  // Publish dates keyed by article URL — single source for the sidebar time labels.
  var DATES = {
    '/articles/ai-subscription-company-acquisition.html': '2026-08-20 14:17:08',
    '/en/articles/ai-subscription-company-acquisition.html': '2026-08-20 14:17:08',
    '/articles/ai-subscription-addon-bundle-upsell.html': '2026-08-20 11:39:31',
    '/en/articles/ai-subscription-addon-bundle-upsell.html': '2026-08-20 11:39:31',
    '/articles/ai-subscription-downgrade-data-loss.html': '2026-08-20 10:09:14',
    '/en/articles/ai-subscription-downgrade-data-loss.html': '2026-08-20 10:09:14',
    '/articles/ai-subscription-zombie-charge.html': '2026-08-19 14:24:25',
    '/en/articles/ai-subscription-zombie-charge.html': '2026-08-19 14:24:25',
    '/articles/ai-subscription-currency-mismatch.html': '2026-08-19 10:42:27',
    '/en/articles/ai-subscription-currency-mismatch.html': '2026-08-19 10:42:27',
    '/articles/ai-subscription-chargeback-dispute.html': '2026-08-18 17:48:18',
    '/en/articles/ai-subscription-chargeback-dispute.html': '2026-08-18 17:48:18',
    '/articles/ai-subscription-price-hike-notice.html': '2026-08-18 14:00:06',
    '/en/articles/ai-subscription-price-hike-notice.html': '2026-08-18 14:00:06',
    '/articles/ai-startup-shutdown-data-refund.html': '2026-08-18 13:57:44',
    '/en/articles/ai-startup-shutdown-data-refund.html': '2026-08-18 13:57:44',
    '/articles/free-trial-auto-renewal-trap.html': '2026-08-18 11:26:56',
    '/en/articles/free-trial-auto-renewal-trap.html': '2026-08-18 11:26:56',
    '/articles/ai-tool-evaluation-framework.html': '2026-08-17 11:26:58',
    '/en/articles/ai-tool-evaluation-framework.html': '2026-08-17 11:26:58',
    '/articles/ai-subscription-payment-economics.html': '2026-08-17 11:26:58',
    '/en/articles/ai-subscription-payment-economics.html': '2026-08-17 11:26:58',
    '/articles/ai-application-scenarios-deep-dive.html': '2026-08-13 11:07:02',
    '/en/articles/ai-application-scenarios-deep-dive.html': '2026-08-13 11:07:02',
    '/articles/ai-tool-cost-virtual-card-tutorial.html': '2026-08-12 12:39:53',
    '/en/articles/ai-tool-cost-virtual-card-tutorial.html': '2026-08-12 12:39:53',
    '/articles/ai-application-scenarios-guide.html': '2026-08-11 12:50:25',
    '/en/articles/ai-application-scenarios-guide.html': '2026-08-11 12:50:25',
    '/articles/ai-tool-subscription-compare.html': '2026-08-10 12:33:19',
    '/en/articles/ai-tool-subscription-compare-guide.html': '2026-08-10 12:33:19',
    '/articles/ai-education-equity.html': '2026-08-07 14:20:29',
    '/en/articles/ai-education-equity.html': '2026-08-07 14:20:29',
    '/articles/ai-companionship-trust.html': '2026-08-07 11:17:02',
    '/en/articles/ai-companionship-trust.html': '2026-08-07 11:17:02',
    '/articles/ai-elderly-care.html': '2026-08-06 16:45:00',
    '/en/articles/ai-elderly-care.html': '2026-08-06 16:45:00',
    '/articles/ai-saves-lives.html': '2026-08-06 14:30:00',
    '/en/articles/ai-saves-lives.html': '2026-08-06 14:30:00',
    '/articles/ai-serving-humanity.html': '2026-08-05 15:30:00',
    '/en/articles/ai-serving-humanity.html': '2026-08-05 15:30:00',
    '/articles/overseas-ai-writing-assistant-billing-guide.html': '2026-08-04 11:00:00',
    '/en/articles/ai-writing-assistant-billing-guide.html': '2026-08-04 11:00:00',
    '/articles/overseas-ai-search-engine-billing-guide.html': '2026-08-03 15:20:00',
    '/en/articles/ai-search-engine-billing-guide.html': '2026-08-03 15:20:00',
    '/articles/overseas-ai-onchain-forensics.html': '2026-07-31 10:30:00',
    '/en/articles/onchain-forensics-guide.html': '2026-07-31 10:30:00',
    '/articles/overseas-ai-flash-loan-attack.html': '2026-07-30 14:20:00',
    '/en/articles/flash-loan-attack-guide.html': '2026-07-30 14:20:00',
    '/articles/overseas-ai-mev-sandwich.html': '2026-07-29 14:24:25',
    '/en/articles/mev-sandwich-guide.html': '2026-07-29 14:24:25',
    '/articles/overseas-ai-bridge-security.html': '2026-07-28 14:05:15',
    '/en/articles/bridge-security-guide.html': '2026-07-28 14:05:15',
    '/articles/overseas-ai-stablecoin-reserve-transparency.html': '2026-07-27 15:53:05',
    '/en/articles/stablecoin-reserve-transparency-guide.html': '2026-07-27 15:53:05',
    '/articles/overseas-ai-token-billing.html': '2026-07-24 02:39:52',
    '/en/articles/token-billing-guide.html': '2026-07-24 02:39:52',
    '/articles/overseas-ai-voice-music-billing-guide.html': '2026-07-23 18:01:04',
    '/en/articles/voice-music-billing-guide.html': '2026-07-23 18:01:04',
    '/articles/overseas-ai-video-gen-billing-guide.html': '2026-07-23 13:34:38',
    '/en/articles/video-gen-billing-guide.html': '2026-07-23 13:34:38',
    '/articles/overseas-ai-image-gen-billing-guide.html': '2026-07-20 10:07:43',
    '/en/articles/midjourney-billing-guide.html': '2026-07-20 10:07:43',
    '/articles/overseas-ai-coding-assistant-guide.html': '2026-07-16 09:58:03',
    '/en/articles/coding-assistant-billing-guide.html': '2026-07-16 09:58:03',
    '/articles/overseas-ai-service-categories.html': '2026-07-15 17:53:35',
    '/en/articles/ai-service-types-guide.html': '2026-07-15 17:53:35',
    '/articles/overseas-ai-virtual-card-solution.html': '2026-07-14 14:19:48',
    '/en/articles/virtual-card-solution-guide.html': '2026-07-14 14:19:48',
    '/articles/domestic-ai-subscription-guide.html': '2026-07-14 11:07:41',
    '/en/articles/domestic-ai-subscription-guide.html': '2026-07-14 11:07:41',
    '/articles/overseas-ai-virtual-card-validity.html': '2026-07-13 17:43:43',
    '/en/articles/virtual-card-validity-guide.html': '2026-07-13 17:43:43',
    '/articles/overseas-ai-virtual-card-hub.html': '2026-07-10 16:10:40',
    '/en/articles/virtual-card-hub-guide.html': '2026-07-10 16:10:40',
    '/articles/overseas-ai-virtual-card-limit.html': '2026-07-10 15:33:23',
    '/en/articles/virtual-card-limit-guide.html': '2026-07-10 15:33:23',
    '/articles/overseas-ai-virtual-card-allocation.html': '2026-07-10 15:02:17',
    '/en/articles/virtual-card-allocation-guide.html': '2026-07-10 15:02:17',
    '/articles/overseas-ai-virtual-card-type.html': '2026-07-10 11:30:56',
    '/en/articles/virtual-card-type-guide.html': '2026-07-10 11:30:56',
    '/articles/overseas-ai-stablecoin-diversification.html': '2026-07-10 10:48:37',
    '/en/articles/stablecoin-diversification-guide.html': '2026-07-10 10:48:37',
    '/articles/overseas-ai-virtual-card-provider.html': '2026-07-10 10:35:25',
    '/en/articles/virtual-card-provider-guide.html': '2026-07-10 10:35:25',
    '/articles/overseas-ai-billing-cycle.html': '2026-07-10 10:09:17',
    '/en/articles/annual-vs-monthly-guide.html': '2026-07-10 10:09:17',
    '/articles/overseas-ai-stablecoin-consolidation.html': '2026-07-09 17:09:19',
    '/en/articles/stablecoin-consolidation-guide.html': '2026-07-09 17:09:19',
    '/articles/overseas-ai-stablecoin-troubleshooting.html': '2026-07-08 15:01:37',
    '/en/articles/stablecoin-payment-troubleshooting-guide.html': '2026-07-08 15:01:37',
    '/articles/overseas-ai-stablecoin-swap-tools.html': '2026-07-08 14:15:55',
    '/en/articles/stablecoin-swap-tools-guide.html': '2026-07-08 14:15:55',
    '/articles/overseas-ai-tool-selection.html': '2026-07-07 16:00:49',
    '/en/articles/tool-selection-guide.html': '2026-07-07 16:00:49',
    '/articles/overseas-ai-cross-chain-recovery.html': '2026-07-07 15:39:43',
    '/en/articles/cross-chain-recovery-guide.html': '2026-07-07 15:39:43',
    '/articles/overseas-ai-virtual-card-troubleshooting.html': '2026-07-07 12:29:26',
    '/en/articles/virtual-card-troubleshooting-guide.html': '2026-07-07 12:29:26',
    '/articles/overseas-ai-fund-reserve.html': '2026-07-07 12:15:45',
    '/articles/overseas-ai-family-plan.html': '2026-07-07 11:26:04',
    '/articles/overseas-ai-invoice-reimbursement.html': '2026-07-07 10:30:00',
    '/articles/overseas-ai-student-discount.html': '2026-07-07 09:40:00',
    '/articles/overseas-ai-exchange-rate-fees.html': '2026-07-06 13:35:00',
    '/articles/overseas-ai-cancellation-refund.html': '2026-07-06 10:58:00',
    '/articles/overseas-ai-account-security.html': '2026-07-03 10:11:23',
    '/articles/overseas-ai-renewal-emergency.html': '2026-07-02 18:20:00',
    '/articles/overseas-ai-network-environment.html': '2026-07-02 15:45:00',
    '/articles/overseas-ai-stablecoin-payment.html': '2026-07-02 09:30:09',
    '/articles/overseas-ai-virtual-card-guide.html': '2026-07-01 22:34:44',
    '/articles/overseas-ai-subscription-team.html': '2026-07-01 17:33:12',
    '/articles/overseas-ai-payment-methods.html': '2026-07-01 16:25:22',
    '/articles/overseas-ai-subscription-guide.html': '2026-07-01 14:30:45',
    '/en/articles/fund-reserve-guide.html': '2026-07-07 12:15:45',
    '/en/articles/family-plan-guide.html': '2026-07-07 11:26:04',
    '/en/articles/invoice-reimbursement-guide.html': '2026-07-07 10:30:00',
    '/en/articles/student-discount-guide.html': '2026-07-07 09:40:00',
    '/en/articles/exchange-rate-fees-guide.html': '2026-07-06 13:35:00',
    '/en/articles/cancellation-refund-guide.html': '2026-07-06 10:58:00',
    '/en/articles/account-security-guide.html': '2026-07-03 10:11:23',
    '/en/articles/renewal-failure-guide.html': '2026-07-02 18:20:00',
    '/en/articles/network-region-check.html': '2026-07-02 15:45:00',
    '/en/articles/stablecoin-payment-guide.html': '2026-07-02 09:30:09',
    '/en/articles/virtual-card-guide.html': '2026-07-01 22:34:44',
    '/en/articles/team-subscription-management.html': '2026-07-01 17:33:12',
    '/en/articles/payment-methods-guide.html': '2026-07-01 16:25:22',
    '/en/articles/subscription-guide.html': '2026-07-01 14:30:45'
  };

  // --- Sidebar: add date labels, keep the recent N, link the rest to the archive page ---
  // Mobile shows the list right under the search box, so a shorter teaser (3) reads better
  // than the desktop panel's 10 — the rest is always one tap away via "查看全部文章".
  var SIDEBAR_LIMIT_DESKTOP = 10;
  var SIDEBAR_LIMIT_MOBILE = 3;
  var mobileMedia = window.matchMedia('(max-width: 880px)');
  function currentSidebarLimit() {
    return mobileMedia.matches ? SIDEBAR_LIMIT_MOBILE : SIDEBAR_LIMIT_DESKTOP;
  }
  var onArchive = location.pathname === '/articles.html' || location.pathname === '/en/articles.html';
  var nav = document.querySelector('.sidebar-nav');
  var sidebarItems = [];
  var sidebarHeading = null;
  var sidebarMoreLink = null;
  var sidebarCollapsed = false;
  var gridPaginator = null; // set once .card-grid pagination is created below; lets search-clear restore the current page instead of showing every item

  if (nav) {
    sidebarItems = Array.prototype.slice.call(nav.querySelectorAll('.side-item'));
    sidebarItems.forEach(function (a) {
      var d = DATES[a.getAttribute('href')];
      var body = a.querySelector('.side-body');
      var descEl = a.querySelector('.side-desc');
      if (d && body && descEl && !body.querySelector('.side-date')) {
        // Wrap the description so the date badge sits beside it on the same row instead of its own line.
        // The line-clamp box goes in its own flex child (descWrap) because -webkit-box ignores flex-shrink directly.
        var metaWrap = document.createElement('span');
        metaWrap.className = 'side-meta';
        var descWrap = document.createElement('span');
        descWrap.className = 'side-desc-wrap';
        descEl.parentNode.insertBefore(metaWrap, descEl);
        descWrap.appendChild(descEl);
        metaWrap.appendChild(descWrap);
        var badge = document.createElement('span');
        badge.className = 'side-date';
        var iso = d.replace(' ', 'T') + '+08:00';
        badge.innerHTML = '<svg class="side-cal" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg><span class="sr-only">' + STR.publishedOn + '</span><time datetime="' + iso + '">' + d + '</time>';
        metaWrap.appendChild(badge);
      }
    });

    var aside = nav.closest('.sidebar');
    sidebarHeading = aside && aside.querySelector('h2 .sidebar-heading-text');

    // Restores the default (non-search) sidebar state: recent N items + "view all" link if collapsed.
    // Re-evaluates the limit each call so resizing across the mobile breakpoint updates it live.
    function showDefaultSidebar() {
      var limit = currentSidebarLimit();
      sidebarCollapsed = sidebarItems.length > limit;
      if (sidebarCollapsed) {
        sidebarItems.forEach(function (a, i) {
          a.style.display = (i >= limit && !a.classList.contains('active')) ? 'none' : '';
        });
        if (sidebarHeading) sidebarHeading.textContent = STR.recentHeading;
        if (!onArchive) {
          if (!sidebarMoreLink) {
            sidebarMoreLink = document.createElement('a');
            sidebarMoreLink.className = 'side-more';
            sidebarMoreLink.href = IS_EN ? '/en/articles.html' : '/articles.html';
            sidebarMoreLink.textContent = STR.viewAll;
            nav.appendChild(sidebarMoreLink);
          }
          sidebarMoreLink.style.display = '';
        }
      } else {
        sidebarItems.forEach(function (a) { a.style.display = ''; });
        if (sidebarHeading) sidebarHeading.textContent = STR.allHeading;
        if (sidebarMoreLink) sidebarMoreLink.style.display = 'none';
      }
    }
    showDefaultSidebar();

    // --- Mobile: the "近期文章" panel starts collapsed (heading only) since it now sits
    // right under the search box, ahead of the page's actual content. Desktop never collapses.
    var sidebarToggle = aside && aside.querySelector('h2');
    function setSidebarCollapsed(collapsed) {
      if (!aside) return;
      aside.classList.toggle('is-collapsed', collapsed);
      if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
    }
    if (sidebarToggle) {
      sidebarToggle.setAttribute('role', 'button');
      sidebarToggle.setAttribute('tabindex', '0');
      sidebarToggle.addEventListener('click', function () {
        if (!mobileMedia.matches) return;
        setSidebarCollapsed(!aside.classList.contains('is-collapsed'));
      });
      sidebarToggle.addEventListener('keydown', function (e) {
        if (!mobileMedia.matches) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSidebarCollapsed(!aside.classList.contains('is-collapsed'));
        }
      });
    }
    setSidebarCollapsed(mobileMedia.matches);

    mobileMedia.addEventListener('change', function (e) {
      // Don't clobber an in-progress search — it'll pick up the new limit/collapse state next time it's cleared.
      var searchInput = document.querySelector('.sidebar-search-input');
      if (!searchInput || !searchInput.value.trim()) {
        showDefaultSidebar();
        setSidebarCollapsed(e.matches);
      }
    });

    // --- Sidebar search: filters the visible article list in place (reads titles/descriptions already in the DOM) ---
    var searchInput = document.querySelector('.sidebar-search-input');
    var searchWrap = document.querySelector('.sidebar-search');
    var searchClear = document.querySelector('.sidebar-search-clear');
    if (searchInput && searchWrap) {
      var emptyMsg = document.createElement('p');
      emptyMsg.className = 'sidebar-search-empty';
      emptyMsg.hidden = true;
      emptyMsg.textContent = STR.noMatch;
      nav.parentNode.insertBefore(emptyMsg, nav.nextSibling);

      var applySearch = function () {
        var q = searchInput.value.trim().toLowerCase();
        searchWrap.classList.toggle('has-value', !!q);
        if (!q) {
          showDefaultSidebar();
          setSidebarCollapsed(mobileMedia.matches);
          emptyMsg.hidden = true;
          return;
        }
        setSidebarCollapsed(false);
        if (sidebarMoreLink) sidebarMoreLink.style.display = 'none';
        var anyMatch = false;
        sidebarItems.forEach(function (a) {
          var titleEl = a.querySelector('.side-title');
          var descEl = a.querySelector('.side-desc');
          var title = titleEl ? titleEl.textContent.toLowerCase() : '';
          var desc = descEl ? descEl.textContent.toLowerCase() : '';
          var match = title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
          a.style.display = match ? '' : 'none';
          if (match) anyMatch = true;
        });
        emptyMsg.hidden = anyMatch;
        if (sidebarHeading) sidebarHeading.textContent = STR.searchHeading;
      };

      searchInput.addEventListener('input', applySearch);
      if (searchClear) {
        searchClear.addEventListener('click', function () {
          searchInput.value = '';
          applySearch();
          searchInput.focus();
        });
      }
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.activeElement === searchInput && searchInput.value) {
          searchInput.value = '';
          applySearch();
        }
      });
    }
  } else {
    // No sidebar list on this page — search filters whatever list is shown in the main
    // column instead: the archive page's title list, or the homepage's teaser card grid.
    var archiveList = document.querySelector('.archive-list');
    var cardGrid = document.querySelector('.post-list .card-grid');
    var listEl = archiveList || cardGrid;
    var searchInput2 = document.querySelector('.sidebar-search-input');
    var searchWrap2 = document.querySelector('.sidebar-search');
    var searchClear2 = document.querySelector('.sidebar-search-clear');
    // Home: the teaser grid under "最新文章" is a fixed 9-card preview (no pagination) —
    // "查看全部" links out to the full archive instead. gridPaginator stays null here on
    // purpose, so the search-clear handler below just un-hides all 9 cards.
    var pager = document.querySelector('.pager');
    // Topic-tag row atop the archive page (articles.html only) — clicking a tag filters
    // the list below by each item's data-topic and re-paginates just the matching subset.
    var topicButtons = archiveList ? Array.prototype.slice.call(document.querySelectorAll('.topic-tag-btn[data-topic]')) : [];
    var activeTopic = null;

    if (listEl && searchInput2 && searchWrap2) {
      var itemSelector = archiveList ? '.archive-item' : '.post-card';
      var titleSelector = archiveList ? '.archive-title' : '.post-card-title';
      var descSelector = archiveList ? null : '.post-card-desc';
      var archiveItems = Array.prototype.slice.call(listEl.querySelectorAll(itemSelector));
      var emptyMsg2 = document.createElement('p');
      emptyMsg2.className = 'sidebar-search-empty';
      emptyMsg2.hidden = true;
      emptyMsg2.textContent = STR.noMatch;
      listEl.parentNode.insertBefore(emptyMsg2, listEl.nextSibling);

      var applyArchiveSearch = function () {
        var q = searchInput2.value.trim().toLowerCase();
        searchWrap2.classList.toggle('has-value', !!q);
        // Homepage only: collapse the hero/featured sections while searching so the
        // filtered "最新文章" grid sits right under the search box instead of way down the page.
        document.body.classList.toggle('is-searching', !!q && !!cardGrid);

        if (!q && !activeTopic) {
          if (gridPaginator) { gridPaginator.render(); }
          else if (archiveList) { if (pager) pager.innerHTML = ''; archiveItems.forEach(function (li) { li.style.display = ''; }); paginate(archiveList, archiveItems, 20, pager); }
          else { archiveItems.forEach(function (li) { li.style.display = ''; }); }
          emptyMsg2.hidden = true;
          if (pager && !archiveList) pager.style.display = '';
          return;
        }

        var anyMatch = false;
        var matching = [];
        archiveItems.forEach(function (li) {
          var topicOk = !activeTopic || li.getAttribute('data-topic') === activeTopic;
          if (!topicOk) { li.style.display = 'none'; return; }
          var titleEl = li.querySelector(titleSelector);
          var descEl = descSelector ? li.querySelector(descSelector) : null;
          var title = titleEl ? titleEl.textContent.toLowerCase() : '';
          var desc = descEl ? descEl.textContent.toLowerCase() : '';
          var match = !q || title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
          if (match) { anyMatch = true; matching.push(li); } else { li.style.display = 'none'; }
        });
        emptyMsg2.hidden = anyMatch;
        if (archiveList) {
          // Archive list supports real pagination even while filtered by topic and/or
          // text — re-run paginate() on just the matching subset so a category with
          // more than one page's worth of articles still pages correctly.
          matching.forEach(function (li) { li.style.display = ''; });
          if (pager) pager.innerHTML = '';
          paginate(archiveList, matching, 20, pager);
        } else if (pager) {
          // Homepage teaser grid: no pagination while searching, just show every match.
          pager.style.display = 'none';
        }
      };

      topicButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var topic = btn.getAttribute('data-topic');
          activeTopic = activeTopic === topic ? null : topic;
          topicButtons.forEach(function (b) { b.classList.toggle('is-active', b === btn && activeTopic !== null); });
          applyArchiveSearch();
        });
      });

      // Makes the topic filter addressable by URL (?topic=...) so footer/nav links can land
      // straight on a pre-filtered archive view instead of requiring a manual tag click.
      var urlTopic = new URLSearchParams(location.search).get('topic');
      if (urlTopic) {
        var urlTopicBtn = topicButtons.filter(function (b) { return b.getAttribute('data-topic') === urlTopic; })[0];
        if (urlTopicBtn) {
          activeTopic = urlTopic;
          topicButtons.forEach(function (b) { b.classList.toggle('is-active', b === urlTopicBtn); });
        }
      }

      // Makes the client-side search addressable by URL (?q=...) so a real "search results
      // page" exists for the WebSite SearchAction structured data to point at.
      var urlQuery = new URLSearchParams(location.search).get('q');
      if (urlQuery) {
        searchInput2.value = urlQuery;
        applyArchiveSearch();
      } else if (archiveList) {
        applyArchiveSearch(); // sets up the initial full pagination
      }

      searchInput2.addEventListener('input', applyArchiveSearch);
      if (searchClear2) {
        searchClear2.addEventListener('click', function () {
          searchInput2.value = '';
          applyArchiveSearch();
          searchInput2.focus();
        });
      }
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.activeElement === searchInput2 && searchInput2.value) {
          searchInput2.value = '';
          applyArchiveSearch();
        }
      });
    }
  }

  // --- Back-to-top: fades in once you've scrolled past ~one screen, not just near the bottom ---
  var backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    var updateBackToTop = function () { backToTop.classList.toggle('is-visible', window.scrollY > 480); };
    var backToTopTicking = false;
    var requestBackToTopUpdate = function () {
      if (backToTopTicking) return;
      backToTopTicking = true;
      requestAnimationFrame(function () { updateBackToTop(); backToTopTicking = false; });
    };
    updateBackToTop();
    window.addEventListener('scroll', requestBackToTopUpdate, { passive: true });
    // #top targets the sticky header, and native fragment-scroll treats a
    // position:sticky element as already "in view" (its box stays pinned to
    // the viewport top once stuck), so the browser skips scrolling. Scroll
    // explicitly instead of relying on anchor navigation.
    backToTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Article page: highlight the current section in the right-rail TOC while scrolling ---
  var tocRail = document.querySelector('.article-columns .toc');
  if (tocRail && 'IntersectionObserver' in window) {
    var tocLinks = Array.prototype.slice.call(tocRail.querySelectorAll('a[href^="#"]'));
    var sections = tocLinks
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);
    var setActive = function (id) {
      tocLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    };
    var visible = new Set();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });
      if (visible.size) {
        var topMost = sections.find(function (s) { return visible.has(s.id); });
        if (topMost) setActive(topMost.id);
      }
    }, { rootMargin: '-96px 0px -70% 0px', threshold: 0 });
    sections.forEach(function (s) { observer.observe(s); });
  }

  // --- Homepage hero carousel: left image carousel with prev/next arrows + dot indicators ---
  var carousel = document.querySelector('.carousel');
  if (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-slide'));
    var infos = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-slide-info'));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-dot'));
    var idx = slides.findIndex(function (s) { return s.classList.contains('is-active'); });
    if (idx < 0) idx = 0;
    var show = function (i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === idx); });
      infos.forEach(function (info, n) { info.hidden = n !== idx; });
      dots.forEach(function (d, n) { d.classList.toggle('is-active', n === idx); });
    };
    var prevBtn = carousel.querySelector('.carousel-arrow--prev');
    var nextBtn = carousel.querySelector('.carousel-arrow--next');

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var AUTOPLAY_MS = 6000;
    var timer = null;
    var stopAutoplay = function () { if (timer) { clearInterval(timer); timer = null; } };
    var startAutoplay = function () {
      if (reduceMotion || slides.length < 2) return;
      stopAutoplay();
      timer = setInterval(function () { show(idx + 1); }, AUTOPLAY_MS);
    };
    // Any manual interaction restarts the autoplay clock instead of just pausing forever,
    // so the carousel keeps advancing on its own after the user lets go.
    var goTo = function (i) { show(i); startAutoplay(); };

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(idx - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(idx + 1); });
    dots.forEach(function (d, n) { d.addEventListener('click', function () { goTo(n); }); });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAutoplay(); else startAutoplay();
    });

    show(idx);
    startAutoplay();
  }
})();
