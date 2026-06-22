/* 官方视频地址映射 — FIFA / FOX Sports YouTube */

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

function buildAnthemEmbedSrc(anthem = ANTHEM_VIDEO) {
  if (anthem.provider === 'bilibili' && anthem.bvid) {
    const params = new URLSearchParams({
      bvid: anthem.bvid,
      page: '1',
      autoplay: '1',
      muted: '1',
      danmaku: '0',
      hideCoverInfo: '1',
      hideDanmakuButton: '1',
      noFullScreenButton: '1',
      hasMuteButton: '0',
      fjw: '0',
      t: '0',
    });
    if (anthem.aid) params.set('aid', String(anthem.aid));
    if (anthem.cid) params.set('cid', String(anthem.cid));
    return `https://www.bilibili.com/blackboard/html5mobileplayer.html?${params.toString()}`;
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

const FIFA_HIGHLIGHTS_HUB =
  'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/highlights/all-matches';

const FOX_HIGHLIGHTS_HUB =
  'https://www.foxsports.com/soccer/fifa-world-cup/highlights';

const FOX_SPORTS_YT_CHANNEL = 'UC78XUn4plmN5UT3zFziI2uA';

const CN_LIVE_LINKS = [
  {
    name: '咪咕视频',
    region: '中国移动',
    url: 'https://www.miguvideo.com/mgs/website/prd/sportLive.html',
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

/** @type {Record<number, {recap: string, source: string, extended?: string, thumb?: string, fifaUrl?: string, foxUrl?: string, goalClip?: string}>} */
const MATCH_VIDEOS = {
  1: { recap: 'PmevGCkUtM8', source: 'FIFA', extended: 'r1Afsds3ZD0', fifaUrl: 'https://www.youtube.com/watch?v=PmevGCkUtM8' },
  2: { recap: '6k18EJY8zIc', source: 'FIFA', extended: '6k18EJY8zIc' },
  3: { recap: 'w-_rY5morQY', source: 'FIFA', extended: 'w-_rY5morQY' },
  4: { recap: '0PVo3bk-TMk', source: 'FIFA', extended: 'lpDZwAxVkc4' },
  5: { recap: 'TcCufmPCsu4', source: 'FIFA' },
  6: { recap: '5eqzEDe8wHs', source: 'FIFA', extended: 'xyKJHekC7io' },
  7: { recap: 'ECnK7UzAjIs', source: 'FIFA' },
  8: { recap: 'KVz43-eddIQ', source: 'FIFA', extended: 'jSJs2nPJeLo' },
  9: { recap: '84xvEwRc0iQ', source: 'FIFA' },
  10: { recap: 'B6-Z5ul2ccQ', source: 'FIFA', extended: 'xHtIzadh4Lg' },
  11: { recap: 'r8SvHZxALQs', source: 'FIFA' },
  12: { recap: 'MM5hUuEzH3g', source: 'FIFA' },
  13: { recap: 'XrDExPcLCXY', source: 'FIFA' },
  14: { recap: 'W9Z4ER9oX0k', source: 'FIFA' },
  15: { recap: 'memCfdob60w', source: 'FIFA' },
  16: { recap: 'i8sD2Aea9_M', source: 'FIFA' },
  17: { recap: 'n3JDGlOwMJ4', source: 'FIFA' },
  18: { recap: 'UzSswKnmpgk', source: 'FIFA' },
  19: { recap: 'JH_WRKTCPK4', source: 'FIFA' },
  20: { recap: 'pU-mPZcuENY', source: 'FIFA' },
  21: { recap: 'hFO9DhasJ2A', source: 'FOX Sports', goalClip: 'esWHJAtjlCM', extended: 'hFO9DhasJ2A' },
  22: { recap: 'lGoe9nxRfyU', source: 'FOX Sports', extended: 'lGoe9nxRfyU' },
  23: { recap: 'SjumRdNESKg', source: 'FOX Sports', extended: 'SjumRdNESKg' },
  24: { recap: 'Qb3ipZFspnc', source: 'FOX Sports', extended: 'Qb3ipZFspnc' },
  // 6月18日场次 — FIFA/FOX 官方 YouTube 陆续发布，暂链至官方集锦页
  25: { pending: true, source: 'FIFA', fifaUrl: 'https://www.fifa.com/en/match-centre/match/17/285023/289273/400021440', foxUrl: FOX_HIGHLIGHTS_HUB },
  26: { pending: true, source: 'FIFA', fifaUrl: FIFA_HIGHLIGHTS_HUB, foxUrl: FOX_HIGHLIGHTS_HUB },
  27: { pending: true, source: 'FIFA', fifaUrl: FIFA_HIGHLIGHTS_HUB, foxUrl: FOX_HIGHLIGHTS_HUB },
  28: { pending: true, source: 'FIFA', fifaUrl: FIFA_HIGHLIGHTS_HUB, foxUrl: FOX_HIGHLIGHTS_HUB },
};

const COMPILATION_VIDEOS = [
  { videoId: 'MdvEN_oK7k0', source: 'FOX Sports', title: 'Matchday 7 精彩瞬间' },
  { videoId: 'r2jliefJq94', source: 'FOX Sports', title: 'Matchday 6 精彩瞬间' },
  { videoId: 'bRQ9AQ_e2cg', source: 'FOX Sports', title: 'Matchday 2 精彩瞬间' },
  { videoId: 'm4x9IwGx3yU', source: 'FOX Sports', title: 'Matchday 3 精彩瞬间' },
  { videoId: 'mhJ7ZHQesJY', source: 'FIFA', title: '世界杯历史十佳进球' },
  { videoId: 'PmevGCkUtM8', source: 'FIFA', title: '墨西哥开幕战' },
  { videoId: 'B6-Z5ul2ccQ', source: 'FIFA', title: '德国 7-1 库拉索' },
  { videoId: 'JH_WRKTCPK4', source: 'FIFA', title: '阿根廷 3-0 阿尔及利亚' },
];

function ytUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

function ytThumb(id) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function resolveHighlightVideo(matchId, clipKey, category, seed) {
  if (matchId && MATCH_VIDEOS[matchId]) {
    const mv = MATCH_VIDEOS[matchId];

    if (mv.pending) {
      return {
        videoId: null,
        videoUrl: mv.fifaUrl || FIFA_HIGHLIGHTS_HUB,
        videoSource: mv.source,
        extendedId: null,
        pending: true,
        externalUrl: mv.fifaUrl || FIFA_HIGHLIGHTS_HUB,
        foxUrl: mv.foxUrl,
        thumb: null,
      };
    }

    let videoId = mv.recap;
    if (clipKey === 'recap' && mv.extended) {
      videoId = mv.extended;
    }
    if (category === 'goal' && clipKey?.startsWith('goal') && mv.goalClip) {
      videoId = mv.goalClip;
    }

    return {
      videoId,
      videoUrl: ytUrl(videoId),
      videoSource: mv.source,
      extendedId: mv.extended || null,
      pending: false,
      externalUrl: mv.fifaUrl || ytUrl(videoId),
      foxUrl: mv.foxUrl || null,
      thumb: ytThumb(videoId),
    };
  }

  if (seed != null) {
    const c = COMPILATION_VIDEOS[seed % COMPILATION_VIDEOS.length];
    return {
      videoId: c.videoId,
      videoUrl: ytUrl(c.videoId),
      videoSource: c.source,
      extendedId: null,
      pending: false,
      externalUrl: ytUrl(c.videoId),
      foxUrl: null,
      thumb: ytThumb(c.videoId),
    };
  }

  return {
    videoId: null,
    videoUrl: FIFA_HIGHLIGHTS_HUB,
    videoSource: 'FIFA',
    extendedId: null,
    pending: true,
    externalUrl: FIFA_HIGHLIGHTS_HUB,
    foxUrl: FOX_HIGHLIGHTS_HUB,
    thumb: null,
  };
}

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

  if (match?.id && MATCH_VIDEOS[match.id] && !MATCH_VIDEOS[match.id].pending) {
    const mv = MATCH_VIDEOS[match.id];
    if (mv.recap) {
      sources.push({
        id: 'recap',
        label: mode === 'live' ? '相关视频' : '本场集锦',
        type: 'youtube',
        videoId: mv.recap,
        hint: `${mv.source} 官方集锦回放`,
        url: ytUrl(mv.recap),
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
