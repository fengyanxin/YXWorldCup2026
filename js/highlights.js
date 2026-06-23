/* 多平台集锦 — B站 / 抖音 / 小红书 / 咪咕 / 央视频 */

const Highlights = (() => {
  const HL_CATEGORY = {
    goal: '进球',
    save: '扑救',
    upset: '冷门',
    classic: '经典',
  };

  const PLATFORM_LABEL = {
    bilibili: 'B站',
    douyin: '抖音',
    xiaohongshu: '小红书',
    migu: '咪咕',
    yangshipin: '央视频',
  };

  let items = [];
  let meta = { total: 0, platforms: {}, fetchedAt: 0 };
  let categoryFilter = 'all';
  let platformFilter = 'all';
  let searchQuery = '';
  let page = 1;
  const PAGE_SIZE = 36;

  function applyPayload(payload) {
    if (!payload || !Array.isArray(payload.items)) return;
    items = payload.items;
    meta = {
      total: payload.total || items.length,
      platforms: payload.platforms || {},
      fetchedAt: payload.fetchedAt || 0,
    };
  }

  async function load() {
    if (window.__HIGHLIGHTS_SNAPSHOT__) {
      applyPayload(window.__HIGHLIGHTS_SNAPSHOT__);
    }

    try {
      const res = await fetch('/api/highlights', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) applyPayload(await res.json());
    } catch (_) {
      /* 离线或 Netlify 静态部署时使用 snapshot */
    }
  }

  function getFiltered() {
    let list = items;
    if (categoryFilter !== 'all') {
      list = list.filter((h) => h.category === categoryFilter);
    }
    if (platformFilter !== 'all') {
      list = list.filter((h) => h.platform === platformFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          (h.matchLabel || '').toLowerCase().includes(q) ||
          (h.author || '').toLowerCase().includes(q) ||
          (h.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }

  function resolveCoverUrl(h) {
    let url = (h?.cover || '').trim();
    if (!url) return '';
    url = url.replace(/^http:\/\//i, 'https://');
    if (url.startsWith('//')) url = `https:${url}`;
    if (url.includes('hdslb.com') && !url.includes('@')) {
      url = `${url}@672w_378h.jpg`;
    }
    return url;
  }

  function cardHtml(h) {
    const platformClass = `platform-${h.platform || 'external'}`;
    const cover = resolveCoverUrl(h);
    const duration = h.duration && h.duration !== '—' ? h.duration : '';
    return `
    <div class="highlight-card" data-highlight-id="${h.id}">
      <div class="highlight-thumb">
        <img src="${cover}" alt="${h.title}" loading="lazy" referrerpolicy="no-referrer" decoding="async" onerror="this.classList.add('cover-failed'); this.removeAttribute('src')">
        <div class="play-btn"><div class="play-icon">▶</div></div>
        ${duration ? `<span class="highlight-duration">${duration}</span>` : ''}
        ${h.category ? `<span class="highlight-cat">${HL_CATEGORY[h.category] || h.category}</span>` : ''}
        <span class="highlight-source ${platformClass}">${h.platformLabel || PLATFORM_LABEL[h.platform] || h.platform}</span>
      </div>
      <div class="highlight-body">
        <div class="highlight-title">${h.title}</div>
        <div class="highlight-meta">
          <span>${h.matchLabel || '世界杯'}</span>
          <span>${h.views || ''} ${h.views === '官方' ? '' : '播放'}</span>
        </div>
        <div class="highlight-meta highlight-meta-sub">
          <span>${h.author || ''}</span>
          <span>${h.playMode === 'embed' ? '站内播放' : '跳转观看'}</span>
        </div>
        <div class="highlight-tags">
          ${(h.tags || []).slice(0, 4).map((t) => `<span class="highlight-tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function renderPlayer(h) {
    const player = document.querySelector('#videoPlayer');
    if (!player) return;

    if (h.playMode === 'embed' && h.platform === 'bilibili' && h.bvid && typeof buildBiliPlayerSrc === 'function') {
      const src = buildBiliPlayerSrc(
        { bvid: h.bvid, aid: h.aid, cid: h.cid },
        { autoplay: '1', muted: '0' }
      );
      player.innerHTML = `
        <iframe src="${src}"
          title="${h.title}"
          scrolling="no"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerpolicy="no-referrer"
          allowfullscreen></iframe>`;
      return;
    }

    const platform = h.platformLabel || PLATFORM_LABEL[h.platform] || '原平台';
    player.innerHTML = `
      <div class="video-external-preview">
        ${h.cover ? `<img src="${resolveCoverUrl(h)}" alt="${h.title}" class="video-external-cover" referrerpolicy="no-referrer" decoding="async">` : ''}
        <div class="video-external-body">
          <p class="video-external-platform">${platform}</p>
          <p>该平台视频需在官方 App 或网页中播放</p>
          <a class="btn btn-primary video-external-open" href="${h.pageUrl}" target="_blank" rel="noopener">
            打开${platform}观看
          </a>
        </div>
      </div>`;
  }

  function openModal(h) {
    const modal = document.querySelector('#videoModal');
    const info = document.querySelector('#videoInfo');
    if (!modal || !info || !h) return;

    renderPlayer(h);

    const links = [];
    if (h.pageUrl) {
      links.push(
        `<a class="video-link" href="${h.pageUrl}" target="_blank" rel="noopener">在 ${h.platformLabel || '原平台'} 打开</a>`
      );
    }

    const sourceLabel = h.platformLabel
      ? `<span class="video-source-tag platform-${h.platform}">${h.platformLabel}</span>`
      : '';

    info.innerHTML = `
      <h3>${h.title}</h3>
      <p>${h.matchLabel || '世界杯'} · ${h.author || ''} ${sourceLabel}</p>
      <div class="video-links">${links.join('')}</div>`;
    modal.classList.add('open');
  }

  function closeModal() {
    document.querySelector('#videoModal')?.classList.remove('open');
    const player = document.querySelector('#videoPlayer');
    if (player) player.innerHTML = '';
  }

  function updateSub() {
    const el = document.querySelector('#highlightsSub');
    if (!el) return;
    const parts = Object.entries(meta.platforms || {})
      .map(([k, n]) => `${PLATFORM_LABEL[k] || k} ${n}`)
      .join(' · ');
    el.textContent = `共 ${items.length} 条真实视频 · ${parts || '多平台聚合'}`;
  }

  function bindCards(root = document) {
    root.querySelectorAll('.highlight-card').forEach((card) => {
      card.addEventListener('click', () => {
        const h = items.find((x) => x.id === Number(card.dataset.highlightId));
        if (h) openModal(h);
      });
    });
  }

  function render() {
    const filtered = getFiltered();
    const end = page * PAGE_SIZE;
    const slice = filtered.slice(0, end);
    const grid = document.querySelector('#highlightsGrid');
    const countEl = document.querySelector('#hlCount');
    const loadBtn = document.querySelector('#hlLoadMore');

    if (!grid) return;

    if (slice.length === 0) {
      grid.innerHTML =
        '<p class="highlights-empty">未找到匹配的视频，试试切换平台或关键词</p>';
      if (countEl) countEl.textContent = '共 0 条';
      if (loadBtn) loadBtn.style.display = 'none';
      return;
    }

    grid.innerHTML = slice.map(cardHtml).join('');
    bindCards(grid);

    if (countEl) {
      countEl.textContent = `显示 ${slice.length} / 共 ${filtered.length} 条（总计 ${items.length} 条）`;
    }
    if (loadBtn) {
      if (slice.length < filtered.length) {
        loadBtn.style.display = 'inline-flex';
        loadBtn.textContent = `加载更多（还有 ${filtered.length - slice.length} 条）`;
      } else {
        loadBtn.style.display = 'none';
      }
    }
  }

  function initFilters() {
    document.querySelectorAll('.hl-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hl-filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        categoryFilter = btn.dataset.hlFilter;
        page = 1;
        render();
      });
    });

    document.querySelectorAll('.hl-platform-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hl-platform-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        platformFilter = btn.dataset.platform;
        page = 1;
        render();
      });
    });

    document.querySelector('#hlSearch')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      page = 1;
      render();
    });

    document.querySelector('#hlLoadMore')?.addEventListener('click', () => {
      page += 1;
      render();
    });

    document.querySelector('#videoModalClose')?.addEventListener('click', closeModal);
    document.querySelector('.video-modal-backdrop')?.addEventListener('click', closeModal);
  }

  async function init() {
    initFilters();
    await load();
    updateSub();
    render();
  }

  return {
    init,
    load,
    render,
    openModal,
    closeModal,
    get items() {
      return items;
    },
  };
})();
