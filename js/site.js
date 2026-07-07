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
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.setAttribute('aria-label', isDark ? STR.toLight : STR.toDark);
    };
    refreshThemeLabel();
    themeToggle.addEventListener('click', function () {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) { document.documentElement.removeAttribute('data-theme'); }
      else { document.documentElement.setAttribute('data-theme', 'dark'); }
      try { localStorage.setItem('theme', isDark ? 'light' : 'dark'); } catch (e) {}
      refreshThemeLabel();
    });
  }

  // Measure the real rendered height of header + search bar and publish it as a CSS var,
  // so sticky offsets below never drift from a hardcoded guess (avoids a sub-pixel gap
  // where scrolled content could peek through between the sticky layers).
  function syncStickyOffset() {
    var header = document.querySelector('.site-header');
    var bar = document.querySelector('.search-bar');
    if (!header) return;
    var headerHeight = header.getBoundingClientRect().height;
    var barHeight = bar ? bar.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--header-offset', Math.ceil(headerHeight) + 'px');
    document.documentElement.style.setProperty('--sticky-offset', Math.ceil(headerHeight + barHeight) + 'px');
  }
  syncStickyOffset();
  window.addEventListener('resize', syncStickyOffset);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncStickyOffset);
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
  }

  // Publish dates keyed by article URL — single source for the sidebar time labels.
  var DATES = {
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
    // Archive page has no sidebar list — search filters the article list already shown in the main column instead.
    var archiveList = document.querySelector('.archive-list');
    var searchInput2 = document.querySelector('.sidebar-search-input');
    var searchWrap2 = document.querySelector('.sidebar-search');
    var searchClear2 = document.querySelector('.sidebar-search-clear');
    if (archiveList && searchInput2 && searchWrap2) {
      var archiveItems = Array.prototype.slice.call(archiveList.querySelectorAll('.archive-item'));
      var emptyMsg2 = document.createElement('p');
      emptyMsg2.className = 'sidebar-search-empty';
      emptyMsg2.hidden = true;
      emptyMsg2.textContent = STR.noMatch;
      archiveList.parentNode.insertBefore(emptyMsg2, archiveList.nextSibling);

      var applyArchiveSearch = function () {
        var q = searchInput2.value.trim().toLowerCase();
        searchWrap2.classList.toggle('has-value', !!q);
        if (!q) {
          archiveItems.forEach(function (li) { li.style.display = ''; });
          emptyMsg2.hidden = true;
          return;
        }
        var anyMatch = false;
        archiveItems.forEach(function (li) {
          var titleEl = li.querySelector('.archive-title');
          var title = titleEl ? titleEl.textContent.toLowerCase() : '';
          var match = title.indexOf(q) !== -1;
          li.style.display = match ? '' : 'none';
          if (match) anyMatch = true;
        });
        emptyMsg2.hidden = anyMatch;
      };

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

  var pager = document.querySelector('.pager');
  // --- Home: paginate the article card grid (9 / page = 3 rows of 3) ---
  var grid = document.querySelector('.card-grid');
  if (grid) paginate(grid, Array.prototype.slice.call(grid.querySelectorAll('.post-card')), 9, pager);
  // --- Archive page: paginate the titles list ---
  var archive = document.querySelector('.archive-list');
  if (archive) paginate(archive, Array.prototype.slice.call(archive.querySelectorAll('.archive-item')), 20, pager);
})();
