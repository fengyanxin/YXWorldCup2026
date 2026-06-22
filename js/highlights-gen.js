/* 从赛程自动生成数百条精彩集锦 */

const HL_THUMBS = [
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1551958219-acbc608c7027?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1517466787929-bc90951f0ca0?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1489944440615-453fc3b6a9a0?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1614632537423-1e6c2ee6b34c?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1459865269677-52d88546c0bc?w=640&h=360&fit=crop',
];

const HL_CLIP_TYPES = [
  { key: 'recap', category: 'classic', suffix: '全场精华回顾', duration: [4, 7], tags: ['全场', '精华'] },
  { key: 'goal1', category: 'goal', suffix: '首开纪录进球', duration: [1, 3], tags: ['进球', '首开'] },
  { key: 'goal2', category: 'goal', suffix: '关键进球慢镜头', duration: [1, 2], tags: ['进球', '慢镜'] },
  { key: 'save', category: 'save', suffix: '门将神扑瞬间', duration: [1, 2], tags: ['扑救', '门将'] },
  { key: 'skill', category: 'classic', suffix: '过人技巧集锦', duration: [2, 4], tags: ['技巧', '过人'] },
  { key: 'celebration', category: 'classic', suffix: '进球庆祝时刻', duration: [1, 2], tags: ['庆祝', '球迷'] },
  { key: 'tactical', category: 'classic', suffix: '战术解析', duration: [5, 8], tags: ['战术', '解析'] },
  { key: 'controversy', category: 'upset', suffix: '争议判罚回放', duration: [2, 4], tags: ['VAR', '判罚'] },
];

const HL_KNOCKOUT_TYPES = [
  { key: 'preview', category: 'classic', suffix: '赛前前瞻', duration: [3, 5], tags: ['前瞻', '预测'] },
  { key: 'recap', category: 'classic', suffix: '全场精华', duration: [5, 9], tags: ['淘汰赛', '精华'] },
  { key: 'goal', category: 'goal', suffix: '进球合集', duration: [3, 6], tags: ['进球', '淘汰赛'] },
  { key: 'penalty', category: 'upset', suffix: '点球大战回放', duration: [4, 8], tags: ['点球', '悬念'] },
  { key: 'save', category: 'save', suffix: '门将高光', duration: [2, 4], tags: ['扑救', '关键'] },
];

const HL_COMPILATIONS = [
  { title: '2026世界杯十佳进球 · 小组赛', match: '小组赛大盘点', category: 'goal', duration: '12:30', tags: ['十佳', '进球'] },
  { title: '2026世界杯五佳扑救 · 小组赛', match: '小组赛大盘点', category: 'save', duration: '8:45', tags: ['五佳', '扑救'] },
  { title: '小组赛冷门时刻全回顾', match: '小组赛大盘点', category: 'upset', duration: '10:20', tags: ['冷门', '回顾'] },
  { title: '美加墨球迷现场狂欢合辑', match: '世界杯现场', category: 'classic', duration: '9:15', tags: ['球迷', '现场'] },
  { title: '巨星进球混剪：梅西 · 姆巴佩 · 哈兰德', match: '球星集锦', category: 'goal', duration: '11:00', tags: ['巨星', '混剪'] },
  { title: '亚洲球队高光时刻', match: '亚洲足球', category: 'classic', duration: '7:40', tags: ['亚洲', '韩国', '日本'] },
  { title: '非洲球队崛起之路', match: '非洲足球', category: 'classic', duration: '8:10', tags: ['非洲', '塞内加尔', '加纳'] },
  { title: '东道主三地开幕盛典', match: '世界杯开幕', category: 'classic', duration: '14:00', tags: ['开幕', '墨西哥', '美国'] },
  { title: 'VAR 争议判罚本周回顾', match: '裁判专题', category: 'upset', duration: '6:30', tags: ['VAR', '裁判'] },
  { title: '远射世界波专项集锦', match: '进球专题', category: 'goal', duration: '9:50', tags: ['远射', '世界波'] },
  { title: '替补奇兵绝杀合集', match: '进球专题', category: 'goal', duration: '8:25', tags: ['替补', '绝杀'] },
  { title: '小组赛末轮生死战精华', match: '小组赛第三轮', category: 'classic', duration: '15:30', tags: ['生死战', '第三轮'] },
  { title: '16强对阵前瞻 · 全部8场', match: '淘汰赛前瞻', category: 'classic', duration: '18:00', tags: ['16强', '前瞻'] },
  { title: '历史时刻：48队世界杯首次呈现', match: '世界杯历史', category: 'classic', duration: '10:45', tags: ['历史', '48队'] },
  { title: '教练席激情瞬间', match: '场边花絮', category: 'classic', duration: '5:20', tags: ['教练', '花絮'] },
  { title: '赛后采访精华合辑', match: '球员采访', category: 'classic', duration: '12:10', tags: ['采访', '球员'] },
  { title: '乌龙球与险情合集', match: '趣味花絮', category: 'upset', duration: '6:55', tags: ['乌龙', '花絮'] },
  { title: '定位球战术破门精选', match: '战术专题', category: 'goal', duration: '7:35', tags: ['定位球', '战术'] },
  { title: '快速反击进球 TOP20', match: '进球专题', category: 'goal', duration: '13:40', tags: ['反击', '速度'] },
  { title: '门将点球大战扑救合集', match: '门将专题', category: 'save', duration: '9:05', tags: ['点球', '门将'] },
];

function hlRand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function hlDuration(min, max, seed) {
  const m = Math.floor(min + hlRand(seed) * (max - min + 1));
  const s = Math.floor(hlRand(seed + 1) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function hlViews(seed) {
  const n = 0.3 + hlRand(seed) * 28;
  return n >= 10 ? `${n.toFixed(1)}M` : `${Math.round(n * 1000)}K`;
}

function hlThumb(seed) {
  return HL_THUMBS[Math.floor(hlRand(seed) * HL_THUMBS.length)];
}

function matchLabel(m) {
  return `${m.home} vs ${m.away}`;
}

function scoreLabel(m) {
  if (!m.score) return '';
  return ` ${m.score[0]}-${m.score[1]}`;
}

function isKnockout(m) {
  return m.group === 'KO';
}

function isUpsetMatch(m) {
  if (!m.score) return false;
  const total = m.score[0] + m.score[1];
  const diff = Math.abs(m.score[0] - m.score[1]);
  return total <= 2 && diff === 1;
}

function isHighScoring(m) {
  if (!m.score) return false;
  return m.score[0] + m.score[1] >= 5;
}

function buildHighlight(id, base) {
  const video = resolveHighlightVideo(
    base.matchId,
    base.clipKey,
    base.category,
    base.matchId ? null : id
  );
  return {
    id,
    title: base.title,
    match: base.match,
    duration: base.duration,
    views: base.views,
    category: base.category,
    thumbnail: video.thumb || base.thumb,
    videoId: video.videoId,
    videoUrl: video.videoUrl,
    videoSource: video.videoSource,
    extendedId: video.extendedId,
    pending: video.pending,
    externalUrl: video.externalUrl,
    foxUrl: video.foxUrl,
    tags: base.tags,
    matchId: base.matchId || null,
    date: base.date || null,
  };
}

function generateMatchHighlights(matches) {
  const list = [];
  let id = 1;

  matches.forEach((m, mi) => {
    const label = matchLabel(m);
    const types = isKnockout(m) ? HL_KNOCKOUT_TYPES : HL_CLIP_TYPES;
    const clipCount = isKnockout(m) ? 5 : m.status === 'finished' ? 6 : 4;

    for (let i = 0; i < clipCount; i++) {
      const t = types[i % types.length];
      const seed = m.id * 100 + i;
      let title = `${label}${scoreLabel(m)} · ${t.suffix}`;
      let category = t.category;

      if (t.key === 'controversy' && m.status !== 'finished') continue;
      if (isUpsetMatch(m) && i === 0) {
        title = `冷门！${label}${scoreLabel(m)} 爆冷取胜`;
        category = 'upset';
      }
      if (isHighScoring(m) && t.key === 'recap') {
        title = `进球大战！${label}${scoreLabel(m)} 全场${m.score[0] + m.score[1]}球`;
      }
      if (m.stage && t.key === 'recap') {
        title = `${m.stage} · ${label}${scoreLabel(m)} 全场精华`;
      }
      if (m.status === 'upcoming' && t.key === 'preview') {
        title = `${label} 赛前前瞻 · ${m.venue}`;
      }

      list.push(
        buildHighlight(id++, {
          title,
          match: m.stage ? `${m.stage} · ${label}` : label,
          duration: hlDuration(...t.duration, seed),
          views: hlViews(seed),
          category,
          thumb: hlThumb(seed),
          tags: [...t.tags, m.home, m.away, m.venue].slice(0, 4),
          matchId: m.id,
          clipKey: t.key,
          date: m.date,
        })
      );
    }

    if (m.score) {
      const goals = m.score[0] + m.score[1];
      for (let g = 1; g <= goals; g++) {
        const seed = m.id * 1000 + g;
        const scorer = g % 2 === 1 ? m.home : m.away;
        list.push(
          buildHighlight(id++, {
            title: `第${g}球 · ${scorer}破门 ${label}${scoreLabel(m)}`,
            match: label,
            duration: hlDuration(0, 2, seed),
            views: hlViews(seed),
            category: 'goal',
            thumb: hlThumb(seed),
            tags: ['进球', scorer, `第${g}球`],
            matchId: m.id,
            clipKey: `goal${g}`,
            date: m.date,
          })
        );
      }
    }
  });

  return list;
}

function generateCompilations(startId) {
  let id = startId;
  return HL_COMPILATIONS.map((c, i) => {
    const seed = 90000 + i;
    return buildHighlight(id++, {
      title: c.title,
      match: c.match,
      duration: c.duration,
      views: hlViews(seed),
      category: c.category,
      thumb: hlThumb(seed),
      tags: c.tags,
      date: '2026-06-18',
    });
  });
}

function generateGroupHighlights(matches, startId) {
  let id = startId;
  const groups = {};
  matches.forEach((m) => {
    if (m.group === 'KO') return;
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  });

  const list = [];
  Object.entries(groups).forEach(([g, ms], gi) => {
    const names = ms.flatMap((m) => [m.home, m.away]).filter((v, i, a) => a.indexOf(v) === i);
    for (let i = 0; i < 8; i++) {
      const seed = 50000 + gi * 10 + i;
      const templates = [
        { title: `${g}组第${i + 1}比赛日五佳进球`, category: 'goal', tags: [g + '组', '五佳', '进球'] },
        { title: `${g}组球队高光混剪`, category: 'classic', tags: [g + '组', '混剪'] },
        { title: `${g}组门将扑救精选`, category: 'save', tags: [g + '组', '扑救'] },
        { title: `${g}组冷门与惊喜`, category: 'upset', tags: [g + '组', '冷门'] },
        { title: `${names[i % names.length]} 世界杯进球全记录`, category: 'goal', tags: [names[i % names.length], '全记录'] },
        { title: `${g}组战术板解析 EP.${i + 1}`, category: 'classic', tags: [g + '组', '战术'] },
        { title: `${g}组球迷文化纪录片`, category: 'classic', tags: [g + '组', '球迷'] },
        { title: `${g}组赛后发布会精华`, category: 'classic', tags: [g + '组', '发布会'] },
      ];
      const t = templates[i];
      list.push(
        buildHighlight(id++, {
          title: t.title,
          match: `${g}组专题`,
          duration: hlDuration(4, 12, seed),
          views: hlViews(seed),
          category: t.category,
          thumb: hlThumb(seed),
          tags: t.tags,
          date: '2026-06-18',
        })
      );
    }
  });
  return list;
}

function generateAllHighlights(matches) {
  const fromMatches = generateMatchHighlights(matches);
  const fromGroups = generateGroupHighlights(matches, fromMatches.length + 1);
  const fromComp = generateCompilations(fromMatches.length + fromGroups.length + 1);
  const all = [...fromMatches, ...fromGroups, ...fromComp];
  return all.map((h, i) => ({ ...h, id: i + 1 }));
}
