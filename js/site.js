(function () {
  'use strict';

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
      var prev = make('上一页', function () { if (current > 1) { current--; render(); toTop(); } });
      prev.disabled = current === 1;
      pager.appendChild(prev);
      for (var p = 1; p <= pageCount; p++) {
        (function (p) {
          var b = make(String(p), function () { if (current !== p) { current = p; render(); toTop(); } });
          if (p === current) b.setAttribute('aria-current', 'true');
          pager.appendChild(b);
        })(p);
      }
      var next = make('下一页', function () { if (current < pageCount) { current++; render(); toTop(); } });
      next.disabled = current === pageCount;
      pager.appendChild(next);
    }
    render();
  }

  // Publish dates keyed by article URL — single source for the sidebar time labels.
  var DATES = {
    '/articles/overseas-ai-account-security.html': '2026-07-03 10:11:23',
    '/articles/overseas-ai-renewal-emergency.html': '2026-07-02 18:20:00',
    '/articles/overseas-ai-network-environment.html': '2026-07-02 15:45:00',
    '/articles/overseas-ai-stablecoin-payment.html': '2026-07-02 09:30:09',
    '/articles/overseas-ai-virtual-card-guide.html': '2026-07-01 22:34:44',
    '/articles/overseas-ai-subscription-team.html': '2026-07-01 17:33:12',
    '/articles/overseas-ai-payment-methods.html': '2026-07-01 16:25:22',
    '/articles/overseas-ai-subscription-guide.html': '2026-07-01 14:30:45'
  };

  // --- Sidebar: add date labels, keep the recent N, link the rest to the archive page ---
  var SIDEBAR_LIMIT = 10;
  var onArchive = location.pathname === '/articles.html';
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
      if (d && body && !body.querySelector('.side-date')) {
        var badge = document.createElement('span');
        badge.className = 'side-date';
        var iso = d.replace(' ', 'T') + '+08:00';
        badge.innerHTML = '<svg class="side-cal" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg><span>发布于 <time datetime="' + iso + '">' + d + '</time></span>';
        body.appendChild(badge);
      }
    });

    var aside = nav.closest('.sidebar');
    sidebarHeading = aside && aside.querySelector('h2 .sidebar-heading-text');
    sidebarCollapsed = sidebarItems.length > SIDEBAR_LIMIT;

    // Restores the default (non-search) sidebar state: recent N items + "view all" link if collapsed.
    function showDefaultSidebar() {
      if (sidebarCollapsed) {
        sidebarItems.forEach(function (a, i) {
          a.style.display = (i >= SIDEBAR_LIMIT && !a.classList.contains('active')) ? 'none' : '';
        });
        if (sidebarHeading) sidebarHeading.textContent = '近期文章';
        if (!onArchive) {
          if (!sidebarMoreLink) {
            sidebarMoreLink = document.createElement('a');
            sidebarMoreLink.className = 'side-more';
            sidebarMoreLink.href = '/articles.html';
            sidebarMoreLink.textContent = '查看全部文章 →';
            nav.appendChild(sidebarMoreLink);
          }
          sidebarMoreLink.style.display = '';
        }
      } else {
        sidebarItems.forEach(function (a) { a.style.display = ''; });
        if (sidebarHeading) sidebarHeading.textContent = '全部文章';
      }
    }
    showDefaultSidebar();

    // --- Sidebar search: filters the visible article list in place (reads titles/descriptions already in the DOM) ---
    var searchInput = document.querySelector('.sidebar-search-input');
    var searchWrap = document.querySelector('.sidebar-search');
    var searchClear = document.querySelector('.sidebar-search-clear');
    if (searchInput && searchWrap) {
      var emptyMsg = document.createElement('p');
      emptyMsg.className = 'sidebar-search-empty';
      emptyMsg.hidden = true;
      emptyMsg.textContent = '没有找到匹配的文章';
      nav.parentNode.insertBefore(emptyMsg, nav.nextSibling);

      var applySearch = function () {
        var q = searchInput.value.trim().toLowerCase();
        searchWrap.classList.toggle('has-value', !!q);
        if (!q) {
          showDefaultSidebar();
          emptyMsg.hidden = true;
          return;
        }
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
        if (sidebarHeading) sidebarHeading.textContent = '搜索结果';
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
  }

  var pager = document.querySelector('.pager');
  // --- Home: paginate the article cards (5 / page) ---
  var grid = document.querySelector('.summary-grid');
  if (grid) paginate(grid, Array.prototype.slice.call(grid.querySelectorAll('.summary-card')), 5, pager);
  // --- Archive page: paginate the titles list ---
  var archive = document.querySelector('.archive-list');
  if (archive) paginate(archive, Array.prototype.slice.call(archive.querySelectorAll('.archive-item')), 20, pager);
})();
