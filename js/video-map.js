/* 官方视频地址映射 — 集锦优先 B 站，直播保留多源 */

/** 2026 世界杯官方主题曲 MV — Shakira × Burna Boy（国内优先 B 站） */
const ANTHEM_VIDEO = {
  title: 'Dai Dai',
  artists: 'Shakira × Burna Boy',
  provider: 'bilibili',
  bvid: 'BV1J2VW6KEt6',
  aid: 116652687497738,
  cid: 38679875570,
  url: 'https://www.bilibili.com/video/BV1J2VW6KEt6/',
  poster: 'https://i2.hdslb.com/bfs/archive/a13ae7989b78e8d2012d1068e823d16fa38ff6b6.jpg',
  durationSec: 240,
  youtube: {
    id: 'fcnDmrtj6Sk',
    url: 'https://www.youtube.com/watch?v=fcnDmrtj6Sk',
  },
};

function buildBiliMobilePlayerSrc(video, options = {}) {
  const params = new URLSearchParams({
    bvid: video.bvid,
    page: '1',
    autoplay: options.autoplay ?? '1',
    muted: options.muted ?? '1',
    danmaku: '0',
    hideCoverInfo: '1',
    hideDanmakuButton: '1',
    noFullScreenButton: '1',
    hasMuteButton: '0',
    fjw: '0',
    t: String(options.start ?? 0),
  });
  if (options.loop) params.set('loop', '1');
  if (video.aid) params.set('aid', String(video.aid));
  if (video.cid) params.set('cid', String(video.cid));
  return `https://www.bilibili.com/blackboard/html5mobileplayer.html?${params.toString()}`;
}

function buildBiliOfficialPlayerSrc(video, options = {}) {
  const params = new URLSearchParams({
    isOutside: 'true',
    bvid: video.bvid,
    page: '1',
    autoplay: options.autoplay ?? '1',
    muted: options.muted ?? '1',
    danmaku: '0',
    t: String(options.start ?? 0),
  });
  if (video.aid) params.set('aid', String(video.aid));
  if (video.cid) params.set('cid', String(video.cid));
  return `https://player.bilibili.com/player.html?${params.toString()}`;
}

/** 默认 mobile 播放器（Netlify/Chrome 已验证）；Safari 下 official 反而易白屏 */
function buildBiliPlayerSrc(video, options = {}) {
  if (options.player === 'official') {
    return buildBiliOfficialPlayerSrc(video, options);
  }
  return buildBiliMobilePlayerSrc(video, options);
}

const BILI_IFRAME_ALLOW = 'autoplay; encrypted-media; picture-in-picture; fullscreen; web-share';

function mountBiliIframe(container, config = {}) {
  if (!container || !config.video?.bvid) return null;

  const {
    video,
    title = 'B站视频',
    pageUrl = `https://www.bilibili.com/video/${video.bvid}/`,
    autoplay = '1',
    muted = '1',
    loop = false,
    player = 'mobile',
    poster = '',
    showFallback = true,
    onReady,
  } = config;

  const src = buildBiliPlayerSrc(video, { autoplay, muted, loop, player });
  const safePoster = (poster || '').replace(/"/g, '&quot;');

  container.innerHTML = `
    <div class="bili-embed-wrap">
      <iframe
        src="${src}"
        title="${title}"
        scrolling="no"
        allow="${BILI_IFRAME_ALLOW}"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen></iframe>
      ${
        showFallback
          ? `<div class="bili-embed-fallback" hidden>
        ${safePoster ? `<img src="${safePoster}" alt="" class="bili-embed-poster" referrerpolicy="no-referrer">` : ''}
        <div class="bili-embed-fallback-body">
          <p class="bili-embed-fallback-title">内嵌播放不可用</p>
          <p class="bili-embed-fallback-sub">请点击下方按钮在 B 站观看（Safari 常见限制）</p>
          <a class="btn btn-primary" href="${pageUrl}" target="_blank" rel="noopener">在 B 站打开观看</a>
        </div>
      </div>`
          : ''
      }
    </div>`;

  const iframe = container.querySelector('iframe');
  const fallback = container.querySelector('.bili-embed-fallback');
  let finished = false;

  const revealFallback = () => {
    if (finished || !showFallback) return;
    finished = true;
    if (fallback) fallback.hidden = false;
    if (iframe) iframe.style.visibility = 'hidden';
  };

  const timer = showFallback
    ? window.setTimeout(revealFallback, 9000)
    : null;

  iframe?.addEventListener(
    'load',
    () => {
      if (timer) window.clearTimeout(timer);
      onReady?.();
    },
    { once: true }
  );

  return {
    player,
    revealFallback,
    tryAlternate() {
      if (player === 'mobile') {
        mountBiliIframe(container, { ...config, player: 'official', onReady });
      } else {
        revealFallback();
      }
    },
  };
}

function buildAnthemEmbedSrc(anthem = ANTHEM_VIDEO, options = {}) {
  if (anthem.provider === 'bilibili' && anthem.bvid) {
    return buildBiliPlayerSrc(anthem, {
      autoplay: '1',
      muted: '1',
      start: 0,
      loop: true,
      player: options.player,
    });
  }

  const ytId = anthem.youtube?.id || anthem.id;
  if (ytId) {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      controls: '0',
      rel: '0',
      loop: '1',
      playlist: ytId,
      playsinline: '1',
      modestbranding: '1',
      iv_load_policy: '3',
      disablekb: '1',
      fs: '0',
    });
    return `https://www.youtube-nocookie.com/embed/${ytId}?${params.toString()}`;
  }

  return anthem.url;
}

function getAnthemWatchUrl(anthem = ANTHEM_VIDEO) {
  return anthem.url || anthem.youtube?.url || '#';
}

const CN_HIGHLIGHTS_HUB =
  'https://search.bilibili.com/all?keyword=2026%E4%B8%96%E7%95%8C%E6%9D%AF%E9%9B%86%E9%94%A6';

const FIFA_HIGHLIGHTS_HUB =
  'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/highlights/all-matches';

const FOX_HIGHLIGHTS_HUB =
  'https://www.foxsports.com/soccer/fifa-world-cup/highlights';

const FOX_SPORTS_YT_CHANNEL = 'UC78XUn4plmN5UT3zFziI2uA';

/** B 站世界杯集锦池（缩略图 + 播放元数据） */
const BILIBILI_HIGHLIGHT_POOL = [
  {
    bvid: 'BV1bNEy6pEmV',
    aid: 116735483057618,
    cid: 39257508417,
    pic: 'https://i2.hdslb.com/bfs/archive/2d9129730a8d6d545847172852cc168db5c34228.jpg',
    source: 'B站',
    label: '墨西哥揭幕战现场',
  },
  {
    bvid: 'BV1YJJM6cEuD',
    aid: 116750297400456,
    cid: 39123224284,
    pic: 'https://i0.hdslb.com/bfs/archive/5df99b674f6d272513411c3926c5.jpg',
    source: 'B站',
    label: '德国 7-1 库拉索',
  },
  {
    bvid: 'BV1u4JM6xEFc',
    aid: 116750280559574,
    cid: 39123222868,
    pic: 'https://i2.hdslb.com/bfs/archive/706a5c84442fba83a3d86c326bd3.jpg',
    source: 'B站',
    label: '德国 7-1 全场精华',
  },
  {
    bvid: 'BV1vYja6ZERp',
    aid: 116772007124827,
    cid: 39224083271,
    pic: 'https://i0.hdslb.com/bfs/archive/d232a4a4123139598db190e0722c.jpg',
    source: 'B站',
    label: '英格兰 4-2 克罗地亚',
  },
  {
    bvid: 'BV1BTJK6hETH',
    aid: 116749391436580,
    cid: 39120996123,
    pic: 'https://i0.hdslb.com/bfs/archive/459378527d6e4054ceebdc566fa0.jpg',
    source: 'B站',
    label: '荷兰 2-2 日本',
  },
  {
    bvid: 'BV1MkJj67Eqm',
    aid: 116740231007541,
    cid: 39076432043,
    pic: 'https://i2.hdslb.com/bfs/archive/99edd47a59a8d22ba0f8b31302cd.jpg',
    source: 'B站',
    label: '墨西哥 3-1 捷克',
  },
  {
    bvid: 'BV1G2Jn6cEj5',
    aid: 116741858399949,
    cid: 39086129843,
    pic: 'https://i1.hdslb.com/bfs/archive/b0ab0fc65e02beaad2118c2f64db.jpg',
    source: 'B站',
    label: '世界杯现场纪录',
  },
  {
    bvid: 'BV1CbEr6uE1R',
    aid: 116734845519078,
    cid: 39051461670,
    pic: 'https://i1.hdslb.com/bfs/archive/2e40b871a4a9b512a27452669275.jpg',
    source: 'B站',
    label: '世界杯开幕',
  },
  {
    bvid: 'BV1PcJH6DEVv',
    aid: 116742026166887,
    cid: 39135676728,
    pic: 'https://i1.hdslb.com/bfs/archive/d315c84a20d1f81dac36f7423f46.jpg',
    source: 'B站',
    label: '世界杯开赛',
  },
  {
    bvid: 'BV1J2VW6KEt6',
    aid: 116652687497738,
    cid: 38679875570,
    pic: 'https://i2.hdslb.com/bfs/archive/a13ae7989b78e8d2012d1068e823d16fa38ff6b6.jpg',
    source: 'B站',
    label: '主题曲 Dai Dai',
  },
  {
    bvid: 'BV1yZVf6yEEJ',
    aid: 116675269626384,
    cid: 38778372539,
    pic: 'https://i0.hdslb.com/bfs/archive/ddb62e56a15dbf1b3d9505cc188d.jpg',
    source: 'B站',
    label: '揭幕战全场集锦',
  },
  {
    bvid: 'BV1HSCMBPEMZ',
    aid: 115546565711687,
    cid: 33994506901,
    pic: 'https://i1.hdslb.com/bfs/archive/286e2e67d69982bbf5f2261de3b8.jpg',
    source: 'B站',
    label: '世界杯主题曲',
  },
];

const BILIBILI_BY_BVID = Object.fromEntries(BILIBILI_HIGHLIGHT_POOL.map((v) => [v.bvid, v]));

/** @type {Record<number, {recap: string, extended?: string, goalClip?: string, source?: string, pending?: boolean}>} */
const MATCH_VIDEOS = {
  1: { recap: 'BV1bNEy6pEmV', extended: 'BV1MkJj67Eqm', source: 'B站' },
  4: { recap: 'BV1G2Jn6cEj5', source: 'B站' },
  10: { recap: 'BV1YJJM6cEuD', extended: 'BV1u4JM6xEFc', goalClip: 'BV1u4JM6xEFc', source: 'B站' },
  11: { recap: 'BV1BTJK6hETH', source: 'B站' },
  19: { recap: 'BV1G2Jn6cEj5', source: 'B站' },
  22: { recap: 'BV1vYja6ZERp', source: 'B站' },
  28: { recap: 'BV1MkJj67Eqm', source: 'B站' },
};

function biliPageUrl(bvid) {
  return `https://www.bilibili.com/video/${bvid}/`;
}

function getBiliEntry(bvid) {
  return BILIBILI_BY_BVID[bvid] || BILIBILI_HIGHLIGHT_POOL[0];
}

function makeBiliHighlight(entry, source) {
  return {
    provider: 'bilibili',
    bvid: entry.bvid,
    aid: entry.aid,
    cid: entry.cid,
    videoId: entry.bvid,
    videoUrl: biliPageUrl(entry.bvid),
    videoSource: source || entry.source || 'B站',
    extendedId: null,
    pending: false,
    externalUrl: biliPageUrl(entry.bvid),
    foxUrl: null,
    thumb: entry.pic,
  };
}

function pickMatchBvid(mv, clipKey, category) {
  let bvid = mv.recap;
  if (clipKey === 'recap' && mv.extended) bvid = mv.extended;
  if (category === 'goal' && clipKey?.startsWith('goal') && mv.goalClip) bvid = mv.goalClip;
  return bvid;
}

function resolveHighlightVideo(matchId, clipKey, category, seed) {
  if (matchId && MATCH_VIDEOS[matchId]) {
    const mv = MATCH_VIDEOS[matchId];

    if (mv.pending) {
      return {
        provider: 'bilibili',
        bvid: null,
        videoId: null,
        videoUrl: CN_HIGHLIGHTS_HUB,
        videoSource: mv.source || 'B站',
        extendedId: null,
        pending: true,
        externalUrl: CN_HIGHLIGHTS_HUB,
        foxUrl: null,
        thumb: null,
      };
    }

    const entry = getBiliEntry(pickMatchBvid(mv, clipKey, category));
    return makeBiliHighlight(entry, mv.source);
  }

  if (matchId) {
    const entry = BILIBILI_HIGHLIGHT_POOL[matchId % BILIBILI_HIGHLIGHT_POOL.length];
    return makeBiliHighlight(entry);
  }

  if (seed != null) {
    const entry = BILIBILI_HIGHLIGHT_POOL[seed % BILIBILI_HIGHLIGHT_POOL.length];
    return makeBiliHighlight(entry);
  }

  return {
    provider: 'bilibili',
    bvid: null,
    videoId: null,
    videoUrl: CN_HIGHLIGHTS_HUB,
    videoSource: 'B站',
    extendedId: null,
    pending: true,
    externalUrl: CN_HIGHLIGHTS_HUB,
    foxUrl: null,
    thumb: null,
  };
}

/** 咪咕 sportLive 须带 mgdbId；无参数会报错，专区入口见官方 worldCup2026 专题 */
const MIGU_WORLDCUP_URL =
  'https://m.miguvideo.com/mgs/promotion/subject/worldCup2026/prd/index.html?pageId=8b9060bb70f245eb85389c5718b7e593&iswww=1';

const CN_LIVE_LINKS = [
  {
    name: '咪咕视频',
    region: '2026 世界杯专区',
    url: MIGU_WORLDCUP_URL,
    logo: '📱',
    primary: true,
  },
  {
    name: '央视体育',
    region: 'CCTV',
    url: 'https://sports.cctv.com',
    logo: '📺',
  },
];

function resolveLiveStream(match, mode) {
  const sources = [
    {
      id: 'cn',
      label: '中国转播',
      type: 'links',
      hint: '世界杯正版直播需在咪咕 / 央视官方平台观看（中国大陆地区）',
      links: CN_LIVE_LINKS,
    },
    {
      id: 'fox',
      label: 'FOX 国际',
      type: 'youtube-channel',
      channelId: FOX_SPORTS_YT_CHANNEL,
      hint: 'FOX Sports YouTube 24 小时节目 · 部分场次可免费观看开场片段',
      url: 'https://www.youtube.com/@FoxSports',
    },
    {
      id: 'fifa',
      label: 'FIFA+',
      type: 'external',
      url: 'https://www.fifa.com/fifaplus/en',
      hint: 'FIFA+ 免费直播部分场次（需前往官网）',
      logo: '🌐',
      name: '打开 FIFA+',
    },
  ];

  if (match?.id) {
    const highlight = resolveHighlightVideo(match.id, 'recap', 'classic');
    if (highlight.bvid && !highlight.pending) {
      sources.push({
        id: 'recap',
        label: mode === 'live' ? '相关视频' : '本场集锦',
        type: 'bilibili',
        bvid: highlight.bvid,
        aid: highlight.aid,
        cid: highlight.cid,
        hint: `${highlight.videoSource} 集锦回放`,
        url: highlight.videoUrl,
      });
    }
  }

  return {
    sources,
    defaultSource: 'cn',
  };
}

function renderLiveStreamHtml(source, match) {
  if (!source) {
    return `<div class="stream-empty"><p>暂无可用直播源</p></div>`;
  }

  if (source.type === 'youtube-channel') {
    const src = `https://www.youtube-nocookie.com/embed/live_stream?channel=${source.channelId}&autoplay=1&mute=1&rel=0`;
    return `
      <div class="stream-player">
        <iframe src="${src}" title="FOX Sports Live"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen loading="lazy"></iframe>
      </div>
      <p class="stream-hint">${source.hint}</p>`;
  }

  if (source.type === 'bilibili') {
    const pageUrl = source.bvid ? `https://www.bilibili.com/video/${source.bvid}/` : '#';
    const src = buildBiliPlayerSrc(
      { bvid: source.bvid, aid: source.aid, cid: source.cid },
      { autoplay: '1', muted: '1' }
    );
    return `
      <div class="stream-player" id="liveBiliPlayer">
        <iframe src="${src}" title="比赛集锦"
          scrolling="no"
          allow="${BILI_IFRAME_ALLOW}"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen></iframe>
      </div>
      <p class="stream-hint">${source.hint || ''} · 若无画面请 <a href="${pageUrl}" target="_blank" rel="noopener">在 B 站打开</a></p>`;
  }

  if (source.type === 'youtube') {
    const src = `https://www.youtube-nocookie.com/embed/${source.videoId}?autoplay=1&rel=0`;
    return `
      <div class="stream-player">
        <iframe src="${src}" title="比赛视频"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen loading="lazy"></iframe>
      </div>
      <p class="stream-hint">${source.hint || ''}</p>`;
  }

  if (source.type === 'links') {
    const matchLine = match
      ? `<p class="stream-match-line">${match.home} vs ${match.away} · ${match.venue || ''}</p>`
      : '';
    const links = (source.links || [])
      .map(
        (l) => `
      <a class="stream-open-btn${l.primary ? ' primary' : ''}" href="${l.url}" target="_blank" rel="noopener">
        <span class="stream-open-logo">${l.logo}</span>
        <span>
          <strong>${l.name}</strong>
          <small>${l.region}</small>
        </span>
        <span class="stream-open-arrow">→</span>
      </a>`
      )
      .join('');
    return `
      <div class="stream-links-panel">
        ${matchLine}
        <p class="stream-hint">${source.hint}</p>
        <div class="stream-open-btns">${links}</div>
      </div>`;
  }

  if (source.type === 'external') {
    return `
      <div class="stream-links-panel">
        <p class="stream-hint">${source.hint}</p>
        <a class="stream-open-btn primary" href="${source.url}" target="_blank" rel="noopener">
          <span class="stream-open-logo">${source.logo || '🌐'}</span>
          <span><strong>${source.name || source.label}</strong></span>
          <span class="stream-open-arrow">→</span>
        </a>
      </div>`;
  }

  return `<div class="stream-empty"><p>暂不支持该直播源</p></div>`;
}
