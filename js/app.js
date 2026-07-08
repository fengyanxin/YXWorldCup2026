/* 2026 World Cup — App Logic */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const STATUS_LABEL = {
  live: '进行中',
  upcoming: '未开始',
  finished: '已结束',
};

const GROUP_LABELS = Object.fromEntries(
  Object.entries(WC2026.groups).map(([k, v]) => [k, v.name])
);

/* ===== Navigation ===== */
function initNav() {
  const links = $$('.nav-link');
  const sections = $$('.section');

  function showSection(id) {
    sections.forEach((s) => s.classList.remove('section-active'));
    links.forEach((l) => l.classList.remove('active'));

    const target = $(`#${id}`);
    if (target) target.classList.add('section-active');

    const link = $(`.nav-link[data-section="${id}"]`);
    if (link) link.classList.add('active');

    document.body.classList.toggle('home-view', id === 'home');

    if (id === 'home') {
      resumeHeroVideo();
    } else {
      clearHeroVideoLoop();
    }

    if (id === 'standings') {
      refreshStandingsData({ force: true });
    }

    if (id === 'knockout' && knockoutView === 'bracket') {
      requestAnimationFrame(() => applyBracketViewportScale());
    }

    $('#mainNav')?.classList.remove('open');
    window.scrollTo({ top: 0, behavior: id === 'home' ? 'auto' : 'smooth' });
  }

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  $$('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => showSection(btn.dataset.goto));
  });

  $('#menuToggle')?.addEventListener('click', () => {
    $('#mainNav').classList.toggle('open');
  });

  return showSection;
}

/* ===== Hero Video Background ===== */
let heroVideoLoopTimer = null;
let heroVideoPlayerMode = 'mobile';
let heroVideoFallbackTimer = null;

function getAnthemLocalVideo() {
  const meta = window.__ANTHEM_LOCAL_VIDEO__;
  return meta?.available && meta?.src ? meta : null;
}

function mountHeroLocalVideo() {
  const frame = $('#heroVideoFrame');
  const local = getAnthemLocalVideo();
  if (!frame || !local) return false;

  const poster = ANTHEM_VIDEO.poster || '';
  frame.innerHTML = `
    <video
      class="hero-video-el"
      src="${local.src}"
      ${poster ? `poster="${poster}"` : ''}
      autoplay
      muted
      loop
      playsinline
      webkit-playsinline
      disablePictureInPicture
      preload="auto"></video>`;

  const video = frame.querySelector('video');
  if (!video) return false;

  const play = () => {
    video.play().catch(() => {});
  };
  video.addEventListener('canplay', play, { once: true });
  play();
  return true;
}

function mountHeroPlayer(options = {}) {
  const frame = $('#heroVideoFrame');
  if (!frame) return;

  if (heroVideoFallbackTimer) {
    window.clearTimeout(heroVideoFallbackTimer);
    heroVideoFallbackTimer = null;
  }

  if (!options.forceIframe && mountHeroLocalVideo()) return;

  if (typeof mountBiliIframe !== 'function') return;

  const player = options.player || heroVideoPlayerMode || 'mobile';
  heroVideoPlayerMode = player;

  mountBiliIframe(frame, {
    video: ANTHEM_VIDEO,
    title: `${ANTHEM_VIDEO.title} — ${ANTHEM_VIDEO.artists}`,
    pageUrl: getAnthemWatchUrl(ANTHEM_VIDEO),
    autoplay: '1',
    muted: '1',
    loop: true,
    player,
    showFallback: false,
  });

  if (player !== 'mobile') return;

  heroVideoFallbackTimer = window.setTimeout(() => {
    mountHeroPlayer({ player: 'official', forceIframe: true });
  }, 9000);
}

function clearHeroVideoLoop() {
  if (heroVideoLoopTimer) {
    window.clearTimeout(heroVideoLoopTimer);
    heroVideoLoopTimer = null;
  }
  if (heroVideoFallbackTimer) {
    window.clearTimeout(heroVideoFallbackTimer);
    heroVideoFallbackTimer = null;
  }
}

function scheduleHeroVideoLoop() {
  clearHeroVideoLoop();
  if (getAnthemLocalVideo()) return;
  if (!ANTHEM_VIDEO.durationSec) return;
  heroVideoLoopTimer = window.setTimeout(() => {
    mountHeroPlayer({ forceIframe: true });
    scheduleHeroVideoLoop();
  }, ANTHEM_VIDEO.durationSec * 1000 + 600);
}

function resumeHeroVideo() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  mountHeroPlayer();
  scheduleHeroVideoLoop();
}

function initHeroVideo() {
  const frame = $('#heroVideoFrame');
  const link = $('#heroAnthemLink');
  if (!frame || typeof ANTHEM_VIDEO === 'undefined') return;

  if (ANTHEM_VIDEO.poster) {
    frame.style.backgroundImage = `url('${ANTHEM_VIDEO.poster}')`;
  }

  if (link) {
    link.href = getAnthemWatchUrl(ANTHEM_VIDEO);
    const sourceLabel = ANTHEM_VIDEO.provider === 'bilibili' ? 'B 站' : 'YouTube';
    link.textContent = `🎵 ${ANTHEM_VIDEO.title} · ${ANTHEM_VIDEO.artists} · ${sourceLabel} 观看 MV`;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  resumeHeroVideo();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && document.body.classList.contains('home-view')) {
      resumeHeroVideo();
    }
  });
}

/* ===== Hero ===== */
function renderHero() {
  const stats = [
    { value: WC2026.tournament.teams, label: '参赛球队' },
    { value: WC2026.tournament.totalMatches, label: '总场次' },
    { value: '12', label: '小组数量' },
    { value: WC2026.tournament.venues, label: '比赛球场' },
  ];

  $('#heroStats').innerHTML = stats
    .map(
      (s) => `
    <div class="stat-item">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>`
    )
    .join('');

  const featured = WC2026.matches
    .filter((m) => m.status === 'live' || m.status === 'upcoming')
    .slice(0, 4);
  // hero shows next upcoming matches

  $('#heroMatches').innerHTML = featured
    .map((m) => {
      const score =
        m.score
          ? `<span class="match-score">${m.score[0]} - ${m.score[1]}</span>`
          : `<span class="match-score">VS</span>`;
      const minute = m.minute ? ` · ${m.minute}'` : '';
      return `
      <div class="hero-match-card ${m.status}" data-match-id="${m.id}">
        <div class="match-teams">
          <span>${m.homeFlag} ${m.home}</span>
          ${score}
          <span>${m.away} ${m.awayFlag}</span>
        </div>
        <div class="match-meta">
          <span class="match-status ${m.status}">${STATUS_LABEL[m.status]}${minute}</span>
          <div>${m.venue}</div>
        </div>
      </div>`;
    })
    .join('');
}

/* ===== Schedule ===== */
let scheduleFilter = { status: 'all', group: 'all', date: null };

function getScheduleDates() {
  return [...new Set(WC2026.matches.map((m) => m.date))].sort();
}

function getDefaultScheduleDate() {
  const today = beijingToday();
  const dates = getScheduleDates();
  if (!dates.length) return today;
  if (dates.includes(today)) return today;
  const next = dates.find((d) => d >= today);
  return next || dates[dates.length - 1];
}

function setScheduleDate(date) {
  scheduleFilter.date = date;
  const dateInput = $('#dateFilter');
  if (dateInput && date) dateInput.value = date;
  renderSchedule();
}

function shiftScheduleDate(delta) {
  const dates = getScheduleDates();
  if (!dates.length) return;

  const current = scheduleFilter.date || beijingToday();
  let idx = dates.indexOf(current);
  if (idx === -1) {
    idx = dates.findIndex((d) => d >= current);
    if (idx === -1) idx = dates.length - 1;
  }

  const nextIdx = idx + delta;
  if (nextIdx >= 0 && nextIdx < dates.length) {
    setScheduleDate(dates[nextIdx]);
  }
}

function bindScheduleDateActions(root = document) {
  root.querySelectorAll('[data-goto-date]').forEach((btn) => {
    btn.addEventListener('click', () => setScheduleDate(btn.dataset.gotoDate));
  });
  root.querySelectorAll('[data-day-delta]').forEach((btn) => {
    btn.addEventListener('click', () => shiftScheduleDate(Number(btn.dataset.dayDelta)));
  });
}

function parseMatchTime(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function compareMatchesBySchedule(a, b) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  const timeDiff = parseMatchTime(a.time) - parseMatchTime(b.time);
  if (timeDiff !== 0) return timeDiff;
  return a.id - b.id;
}

function getScheduleMatches(opts = {}) {
  const { skipDate = false } = opts;
  let matches = [...WC2026.matches];

  if (scheduleFilter.status !== 'all') {
    matches = matches.filter((m) => m.status === scheduleFilter.status);
  }
  if (scheduleFilter.group !== 'all') {
    matches = matches.filter((m) => m.group === scheduleFilter.group);
  }
  if (!skipDate && scheduleFilter.date) {
    matches = matches.filter((m) => m.date === scheduleFilter.date);
  }
  return matches.sort(compareMatchesBySchedule);
}

function renderScheduleDateNav() {
  const base = getScheduleMatches({ skipDate: true });
  const counts = {};
  base.forEach((m) => {
    counts[m.date] = (counts[m.date] || 0) + 1;
  });
  const dates = Object.keys(counts).sort();
  const today = beijingToday();

  const datePills = dates.map((d) => {
    const isToday = d === today;
    const active = scheduleFilter.date === d;
    return `<button class="date-pill ${active ? 'active' : ''} ${isToday ? 'today' : ''}" data-date="${d}">
      ${isToday ? '今天 · ' : ''}${formatDateShort(d)}
      <span class="date-pill-count">${counts[d]}</span>
    </button>`;
  });

  const allPill = `<button class="date-pill ${!scheduleFilter.date ? 'active' : ''}" data-date="">
    全部日期 <span class="date-pill-count">${base.length}</span>
  </button>`;

  $('#scheduleDateNav').innerHTML = [...datePills, allPill].join('');

  $$('.date-pill').forEach((pill) => {
    pill.addEventListener('click', () => setScheduleDate(pill.dataset.date));
  });

  const activePill = $('.date-pill.active');
  activePill?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function renderScheduleDayHeader(date, dayMatches) {
  const el = $('#scheduleDayHeader');
  if (!el) return;

  if (!date) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }

  el.style.display = '';
  const today = beijingToday();
  const dates = getScheduleDates();
  const idx = dates.indexOf(date);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < dates.length - 1;

  const live = dayMatches.filter((m) => m.status === 'live').length;
  const finished = dayMatches.filter((m) => m.status === 'finished').length;
  const upcoming = dayMatches.filter((m) => m.status === 'upcoming').length;

  const dateLabel = date === today ? `今天 · ${formatDate(date)}` : formatDate(date);
  const statsParts = [];
  if (dayMatches.length) statsParts.push(`${dayMatches.length} 场`);
  if (live) statsParts.push(`${live} 进行中`);
  if (upcoming) statsParts.push(`${upcoming} 未开始`);
  if (finished) statsParts.push(`${finished} 已结束`);
  const statsText = statsParts.length ? statsParts.join(' · ') : '当日无比赛';

  el.innerHTML = `
    <button class="schedule-day-btn" data-day-delta="-1" ${hasPrev ? '' : 'disabled'} aria-label="前一天">←</button>
    <div class="schedule-day-center">
      <div class="schedule-day-label">${dateLabel}</div>
      <div class="schedule-day-stats">${statsText}</div>
    </div>
    <button class="schedule-day-btn" data-day-delta="1" ${hasNext ? '' : 'disabled'} aria-label="后一天">→</button>`;

  bindScheduleDateActions(el);
}

function renderScheduleEmpty(date) {
  const today = beijingToday();
  const dates = getScheduleDates();
  const nextDate = dates.find((d) => d > date);
  const prevDate = [...dates].reverse().find((d) => d < date);
  const isToday = date === today;

  $('#scheduleList').innerHTML = `
    <div class="schedule-empty">
      <span class="schedule-empty-icon">📅</span>
      <p>${isToday ? '今天暂无比赛安排' : `${formatDate(date)} 暂无比赛`}</p>
      <p class="schedule-empty-hint">试试切换前后日期，或查看全部赛程</p>
      <div class="schedule-empty-actions">
        ${prevDate ? `<button class="btn btn-secondary btn-sm" data-goto-date="${prevDate}">← ${formatDateShort(prevDate)}</button>` : ''}
        ${nextDate ? `<button class="btn btn-secondary btn-sm" data-goto-date="${nextDate}">${formatDateShort(nextDate)} →</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-goto-date="">全部赛程</button>
      </div>
    </div>`;

  bindScheduleDateActions($('#scheduleList'));
}

function renderScheduleSummary(count) {
  const el = $('#scheduleSummary');
  if (!el) return;
  const parts = [];
  if (scheduleFilter.status !== 'all') parts.push(STATUS_LABEL[scheduleFilter.status]);
  if (scheduleFilter.group !== 'all') {
    parts.push(scheduleFilter.group === 'KO' ? '淘汰赛' : GROUP_LABELS[scheduleFilter.group]);
  }
  if (scheduleFilter.date) {
    const today = beijingToday();
    parts.push(scheduleFilter.date === today ? `今天 · ${formatDate(scheduleFilter.date)}` : formatDate(scheduleFilter.date));
  }
  const filterText = parts.length ? parts.join(' · ') : '全部赛程';
  el.textContent = `${filterText} · 共 ${count} 场`;
}

function renderSchedule() {
  const matches = getScheduleMatches();
  renderScheduleDateNav();
  renderScheduleSummary(matches.length);

  const activeDate = scheduleFilter.date;

  if (activeDate) {
    renderScheduleDayHeader(activeDate, matches);
    if (matches.length === 0) {
      renderScheduleEmpty(activeDate);
      return;
    }
    $('#scheduleList').innerHTML = `<div class="schedule-timeline">${matches
      .map(renderScheduleMatchRow)
      .join('')}</div>`;
    return;
  }

  renderScheduleDayHeader(null, []);

  const grouped = {};
  matches.forEach((m) => {
    if (!grouped[m.date]) grouped[m.date] = [];
    grouped[m.date].push(m);
  });

  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) {
    $('#scheduleList').innerHTML =
      '<div class="schedule-empty"><span class="schedule-empty-icon">📅</span><p>暂无匹配的比赛</p><p class="schedule-empty-hint">试试切换日期或放宽筛选条件</p></div>';
    return;
  }

  $('#scheduleList').innerHTML = dates
    .map((date) => {
      const dayMatches = grouped[date].sort(compareMatchesBySchedule);
      const finished = dayMatches.filter((m) => m.status === 'finished').length;
      const live = dayMatches.filter((m) => m.status === 'live').length;
      const upcoming = dayMatches.filter((m) => m.status === 'upcoming').length;
      const stats = [
        live ? `${live} 场进行中` : '',
        finished ? `${finished} 场已结束` : '',
        upcoming ? `${upcoming} 场未开始` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      const rows = dayMatches.map(renderScheduleMatchRow).join('');
      return `<div class="schedule-date-group">
        <div class="date-header">
          <div class="date-label">${formatDate(date)}</div>
          <div class="date-stats">${stats}</div>
        </div>
        <div class="schedule-timeline">${rows}</div>
      </div>`;
    })
    .join('');
}

function renderScheduleMatchRow(m) {
  const stage = m.stage || GROUP_LABELS[m.group] || m.group;
  const minute = m.minute ? ` ${m.minute}'` : '';
  const { homeWin, awayWin, isDraw } = getMatchOutcome(m);
  const hasScore = m.score !== null && m.score !== undefined;

  const scoreHtml = hasScore
    ? `<div class="match-score-wrap">
        <span class="schedule-row-score">${m.score[0]}<span class="score-sep">:</span>${m.score[1]}</span>
        ${formatMatchPenaltyHtml(m)}
      </div>`
    : `<span class="schedule-row-score vs">VS</span>`;

  return `
    <article class="schedule-row ${m.status}">
      <div class="schedule-row-time">
        <time class="schedule-row-clock">${m.time}</time>
        ${m.timeET ? `<span class="schedule-row-et">${m.timeET}</span>` : ''}
      </div>
      <div class="schedule-row-body">
        <div class="schedule-row-matchup">
          <div class="schedule-row-team home ${homeWin ? 'winner' : ''} ${isDraw ? 'draw' : ''}">
            <span class="schedule-row-flag">${m.homeFlag}</span>
            <span class="schedule-row-name">${m.home}</span>
          </div>
          ${scoreHtml}
          <div class="schedule-row-team away ${awayWin ? 'winner' : ''} ${isDraw ? 'draw' : ''}">
            <span class="schedule-row-flag">${m.awayFlag}</span>
            <span class="schedule-row-name">${m.away}</span>
          </div>
        </div>
        <div class="schedule-row-meta">
          <span class="match-group-tag">${stage}</span>
          <span class="schedule-row-venue">📍 ${m.venue}</span>
          <span class="match-status ${m.status}">${STATUS_LABEL[m.status]}${minute}</span>
        </div>
      </div>
    </article>`;
}

function renderMatchRow(m) {
  return renderScheduleMatchRow(m);
}

function initScheduleFilters() {
  scheduleFilter.date = getDefaultScheduleDate();

  const groupSelect = $('#groupFilter');
  Object.keys(WC2026.groups).forEach((g) => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = GROUP_LABELS[g];
    groupSelect.appendChild(opt);
  });
  groupSelect.innerHTML += '<option value="KO">淘汰赛</option>';

  const dateInput = $('#dateFilter');
  if (dateInput) {
    dateInput.value = scheduleFilter.date;
    dateInput.min = WC2026.tournament.startDate;
    dateInput.max = WC2026.tournament.endDate;
  }

  $$('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      scheduleFilter.status = btn.dataset.filter;
      renderSchedule();
    });
  });

  groupSelect.addEventListener('change', () => {
    scheduleFilter.group = groupSelect.value;
    renderSchedule();
  });

  dateInput?.addEventListener('change', (e) => {
    setScheduleDate(e.target.value);
  });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ===== Knockout ===== */
const KO_ROUND_ORDER = ['16强', '8强', '四分之一决赛', '半决赛', '三四名决赛', '决赛'];

const KO_ROUND_LABELS = {
  '16强': '32强 · 1/16 决赛',
  '8强': '16强 · 1/8 决赛',
  四分之一决赛: '8强 · 1/4 决赛',
  半决赛: '半决赛',
  三四名决赛: '三四名决赛',
  决赛: '决赛',
};

const knockoutFilter = { round: 'all', status: 'all' };
let knockoutView = 'bracket';

/** 2026 淘汰赛对阵拓扑（与 scripts/gen-bracket.py 一致） */
const KO_BRACKET_TREE = {
  left: {
    pairs: [
      [73, 75, 90],
      [74, 77, 89],
      [76, 78, 91],
      [79, 80, 92],
    ],
    qf: [
      [90, 89, 97],
      [91, 92, 98],
    ],
    sf: [97, 98, 101],
  },
  right: {
    pairs: [
      [81, 82, 94],
      [83, 84, 93],
      [86, 88, 95],
      [85, 87, 96],
    ],
    qf: [
      [94, 93, 99],
      [95, 96, 100],
    ],
    sf: [99, 100, 102],
  },
  final: [101, 102, 104],
  third: 103,
};

const BRACKET_NODE_H = 84;
const BRACKET_NODE_GAP = 14;
const BRACKET_PAIR_H = BRACKET_NODE_H * 2 + BRACKET_NODE_GAP;
const BRACKET_TOTAL_H = BRACKET_PAIR_H * 4;
const BRACKET_COL_W = 124;
const BRACKET_COL_GAP = 14;
const BRACKET_CENTER_COL_W = 136;
const BRACKET_CENTER_COL = 4;
const BRACKET_LABEL_H = 24;
const BRACKET_FINAL_GAP = 44;
const BRACKET_DEFAULT_SCALE = 0.93;

let bracketUserZoom = 1;
let bracketBoardMetrics = { w: 0, h: 0, labelH: BRACKET_LABEL_H };

function getMatchOutcome(m) {
  if (!m?.score) {
    return { homeWin: false, awayWin: false, isDraw: false, hasPenalties: false };
  }

  const hasPenalties = Array.isArray(m.penalties);
  let homeWin = m.score[0] > m.score[1];
  let awayWin = m.score[1] > m.score[0];
  let isDraw = m.score[0] === m.score[1];

  if (isDraw && hasPenalties) {
    homeWin = m.penalties[0] > m.penalties[1];
    awayWin = m.penalties[1] > m.penalties[0];
    isDraw = false;
  }

  return { homeWin, awayWin, isDraw, hasPenalties };
}

function formatMatchScoreText(m, { compact = false } = {}) {
  if (!m?.score) return '';
  let text = `${m.score[0]}:${m.score[1]}`;
  if (m.penalties) {
    text += compact
      ? ` (${m.penalties[0]}:${m.penalties[1]})`
      : ` · 点球 ${m.penalties[0]}:${m.penalties[1]}`;
  }
  return text;
}

function formatMatchPenaltyHtml(m) {
  if (!m?.penalties) return '';
  return `<span class="match-pens">点球 ${m.penalties[0]}:${m.penalties[1]}</span>`;
}

function getMatchById(id) {
  return WC2026.matches.find((m) => m.id === id);
}

function bracketColLeft(index) {
  if (index <= BRACKET_CENTER_COL) {
    return index * (BRACKET_COL_W + BRACKET_COL_GAP);
  }
  const centerLeft = BRACKET_CENTER_COL * (BRACKET_COL_W + BRACKET_COL_GAP);
  const afterCenter = centerLeft + BRACKET_CENTER_COL_W + BRACKET_COL_GAP;
  return afterCenter + (index - BRACKET_CENTER_COL - 1) * (BRACKET_COL_W + BRACKET_COL_GAP);
}

function bracketColWidth(index) {
  return index === BRACKET_CENTER_COL ? BRACKET_CENTER_COL_W : BRACKET_COL_W;
}

function bracketColRight(index) {
  return bracketColLeft(index) + bracketColWidth(index);
}

function bracketColBridge(index) {
  return bracketColRight(index) + BRACKET_COL_GAP / 2;
}

function getKnockoutMatches() {
  return WC2026.matches.filter((m) => m.group === 'KO').sort((a, b) => a.id - b.id);
}

function getFilteredKnockoutMatches() {
  return getKnockoutMatches().filter((m) => {
    if (knockoutFilter.status !== 'all' && m.status !== knockoutFilter.status) return false;
    if (knockoutFilter.round === 'all') return true;
    if (knockoutFilter.round === '决赛') {
      return m.stage === '三四名决赛' || m.stage === '决赛';
    }
    return m.stage === knockoutFilter.round;
  });
}

function groupKnockoutByRound(matches) {
  const grouped = {};
  matches.forEach((m) => {
    const key = m.stage || '其他';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });
  return KO_ROUND_ORDER.filter((k) => grouped[k]?.length).map((k) => ({
    stage: k,
    label: KO_ROUND_LABELS[k] || k,
    matches: grouped[k].sort(compareMatchesBySchedule),
  }));
}

function renderKnockoutProgress() {
  const el = $('#koProgress');
  if (!el) return;

  const all = getKnockoutMatches();
  const steps = [
    { key: '16强', short: '32强' },
    { key: '8强', short: '16强' },
    { key: '四分之一决赛', short: '8强' },
    { key: '半决赛', short: '半决' },
    { key: '决赛', short: '决赛', stages: ['三四名决赛', '决赛'] },
  ];

  el.innerHTML = steps
    .map((step) => {
      const roundMatches = all.filter((m) =>
        step.stages ? step.stages.includes(m.stage) : m.stage === step.key
      );
      const total = roundMatches.length;
      const done = roundMatches.filter((m) => m.status === 'finished').length;
      const live = roundMatches.filter((m) => m.status === 'live').length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      const active = live > 0 ? ' live' : done === total && total > 0 ? ' done' : '';

      return `<div class="ko-progress-step${active}">
        <div class="ko-progress-bar"><span style="width:${pct}%"></span></div>
        <span class="ko-progress-label">${step.short}</span>
        <span class="ko-progress-count">${done}/${total}</span>
      </div>`;
    })
    .join('');
}

function computeBracketPositions(side) {
  const tree = KO_BRACKET_TREE[side];
  const pos = {};

  tree.pairs.forEach(([a, b, r16], i) => {
    const base = i * BRACKET_PAIR_H;
    pos[a] = base;
    pos[b] = base + BRACKET_NODE_H + BRACKET_NODE_GAP;
    pos[r16] = base + (BRACKET_PAIR_H - BRACKET_NODE_H) / 2;
  });

  tree.qf.forEach(([a, b, qf]) => {
    const ca = pos[a] + BRACKET_NODE_H / 2;
    const cb = pos[b] + BRACKET_NODE_H / 2;
    pos[qf] = (ca + cb) / 2 - BRACKET_NODE_H / 2;
  });

  const [a, b, sfId] = tree.sf;
  const ca = pos[a] + BRACKET_NODE_H / 2;
  const cb = pos[b] + BRACKET_NODE_H / 2;
  pos[sfId] = (ca + cb) / 2 - BRACKET_NODE_H / 2;

  return pos;
}

function renderBracketNode(matchId) {
  const m = getMatchById(matchId);
  if (!m) return '';

  const { homeWin, awayWin, hasPenalties } = getMatchOutcome(m);
  const hasScore = m.score !== null && m.score !== undefined;
  const pending = m.home === '待定' || m.away === '待定';
  const minute = m.minute ? ` ${m.minute}'` : '';
  const isFinal = matchId === 104;
  const isThird = matchId === 103;
  const metaExtra =
    !hasScore && m.status === 'upcoming'
      ? `<span class="ko-bracket-node-time">${formatDateShort(m.date)} ${m.time}</span>`
      : hasScore
        ? `<span class="ko-bracket-node-time">${formatMatchScoreText(m, { compact: true })}</span>`
        : '';

  return `
    <div class="ko-bracket-node ${m.status}${pending ? ' pending' : ''}${hasPenalties ? ' pens' : ''}${isFinal ? ' final' : ''}${isThird ? ' third' : ''}" data-match-id="${m.id}">
      <div class="ko-bracket-node-meta">
        <span class="ko-bracket-node-id">M${m.id}</span>
        ${metaExtra}
        ${m.status === 'live' ? `<span class="match-status live">${STATUS_LABEL.live}${minute}</span>` : ''}
        ${isFinal ? '<span class="ko-bracket-badge">决赛</span>' : ''}
        ${isThird ? '<span class="ko-bracket-badge third">季军战</span>' : ''}
      </div>
      <div class="ko-bracket-teams">
        <div class="ko-bracket-team home ${homeWin ? 'winner' : ''}">
          <span class="ko-bracket-flag">${m.homeFlag}</span>
          <span class="ko-bracket-name" title="${m.home}">${m.home}</span>
          ${hasScore ? `<span class="ko-bracket-score">${m.score[0]}</span>` : ''}
        </div>
        <div class="ko-bracket-team away ${awayWin ? 'winner' : ''}">
          <span class="ko-bracket-flag">${m.awayFlag}</span>
          <span class="ko-bracket-name" title="${m.away}">${m.away}</span>
          ${hasScore ? `<span class="ko-bracket-score">${m.score[1]}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function renderBracketColumn(matchIds, positions, colIndex, label) {
  const left = bracketColLeft(colIndex);
  const width = bracketColWidth(colIndex);
  const nodes = matchIds
    .map((id) => {
      const top = positions[id];
      if (top === undefined) return '';
      return `<div class="ko-bracket-slot" style="top:${top}px">${renderBracketNode(id)}</div>`;
    })
    .join('');

  return `
    <div class="ko-bracket-col" style="left:${left}px;width:${width}px">
      <div class="ko-bracket-col-body" style="height:${BRACKET_TOTAL_H}px">${nodes}</div>
    </div>`;
}

function renderBracketLabels(labels) {
  return labels
    .map(
      ({ index, text }) =>
        `<span class="ko-bracket-col-label" style="left:${bracketColLeft(index)}px;width:${bracketColWidth(index)}px">${text}</span>`
    )
    .join('');
}

function bracketNodeCenter(positions, id) {
  return (positions[id] ?? 0) + BRACKET_NODE_H / 2;
}

function bracketFeedPath(xOut, ySource, xMid, yTarget, xIn) {
  return `M ${xOut} ${ySource} H ${xMid} V ${yTarget} H ${xIn}`;
}

function buildBracketSvgLines(leftPos, rightPos, finalTop) {
  const paths = [];

  const addPairLinks = (pairs, positions, fromCol, toCol) => {
    const xOut = bracketColRight(fromCol);
    const xMid = bracketColBridge(fromCol);
    const xIn = bracketColLeft(toCol);
    pairs.forEach(([a, b, target]) => {
      const yt = bracketNodeCenter(positions, target);
      paths.push(bracketFeedPath(xOut, bracketNodeCenter(positions, a), xMid, yt, xIn));
      paths.push(bracketFeedPath(xOut, bracketNodeCenter(positions, b), xMid, yt, xIn));
    });
  };

  const addMergeLinks = (merges, positions, fromCol, toCol) => {
    const xOut = bracketColRight(fromCol);
    const xMid = bracketColBridge(fromCol);
    const xIn = bracketColLeft(toCol);
    merges.forEach(([a, b, target]) => {
      const yt = bracketNodeCenter(positions, target);
      paths.push(bracketFeedPath(xOut, bracketNodeCenter(positions, a), xMid, yt, xIn));
      paths.push(bracketFeedPath(xOut, bracketNodeCenter(positions, b), xMid, yt, xIn));
    });
  };

  addPairLinks(KO_BRACKET_TREE.left.pairs, leftPos, 0, 1);
  addMergeLinks(KO_BRACKET_TREE.left.qf, leftPos, 1, 2);
  addMergeLinks([KO_BRACKET_TREE.left.sf], leftPos, 2, 3);

  const addRightLinks = (merges, positions, fromCol, toCol) => {
    const xOut = bracketColLeft(fromCol);
    const xMid = bracketColLeft(fromCol) - BRACKET_COL_GAP / 2;
    const xIn = bracketColRight(toCol);
    merges.forEach(([a, b, target]) => {
      const yt = bracketNodeCenter(positions, target);
      paths.push(`M ${xOut} ${bracketNodeCenter(positions, a)} H ${xMid} V ${yt} H ${xIn}`);
      paths.push(`M ${xOut} ${bracketNodeCenter(positions, b)} H ${xMid} V ${yt} H ${xIn}`);
    });
  };

  addRightLinks(KO_BRACKET_TREE.right.pairs, rightPos, 8, 7);
  addRightLinks(KO_BRACKET_TREE.right.qf, rightPos, 7, 6);
  addRightLinks([KO_BRACKET_TREE.right.sf], rightPos, 6, 5);

  const finalY = finalTop + BRACKET_NODE_H / 2;
  const finalX = bracketColLeft(BRACKET_CENTER_COL) + BRACKET_CENTER_COL_W / 2;
  paths.push(
    bracketFeedPath(
      bracketColRight(3),
      bracketNodeCenter(leftPos, 101),
      bracketColBridge(3),
      finalY,
      finalX
    )
  );
  paths.push(
    `M ${bracketColLeft(5)} ${bracketNodeCenter(rightPos, 102)} H ${bracketColBridge(4)} V ${finalY} H ${finalX}`
  );

  return paths.map((d) => `<path d="${d}"/>`).join('');
}

function renderKnockoutBracket() {
  const container = $('#koBracket');
  if (!container) return;

  const leftPos = computeBracketPositions('left');
  const rightPos = computeBracketPositions('right');

  const leftR32 = KO_BRACKET_TREE.left.pairs.flatMap(([a, b]) => [a, b]);
  const rightR32 = KO_BRACKET_TREE.right.pairs.flatMap(([a, b]) => [a, b]);
  const leftR16 = KO_BRACKET_TREE.left.pairs.map(([, , id]) => id);
  const rightR16 = KO_BRACKET_TREE.right.pairs.map(([, , id]) => id);
  const leftQf = KO_BRACKET_TREE.left.qf.map(([, , id]) => id);
  const rightQf = KO_BRACKET_TREE.right.qf.map(([, , id]) => id);

  const leftSf = KO_BRACKET_TREE.left.sf[2];
  const rightSf = KO_BRACKET_TREE.right.sf[2];
  const finalTop =
    (bracketNodeCenter(leftPos, leftSf) + bracketNodeCenter(rightPos, rightSf)) / 2 -
    BRACKET_NODE_H / 2;
  const thirdTop = finalTop + BRACKET_NODE_H + BRACKET_FINAL_GAP;

  const boardW = bracketColLeft(8) + BRACKET_COL_W;
  const boardH = BRACKET_TOTAL_H;
  const centerBodyH = Math.max(boardH, thirdTop + BRACKET_NODE_H + 8);
  const canvasH = centerBodyH;
  const svgPaths = buildBracketSvgLines(leftPos, rightPos, finalTop);
  const labels = [
    { index: 0, text: '32强' },
    { index: 1, text: '16强' },
    { index: 2, text: '8强' },
    { index: 3, text: '半决赛' },
    { index: 4, text: '决赛阶段' },
    { index: 5, text: '半决赛' },
    { index: 6, text: '8强' },
    { index: 7, text: '16强' },
    { index: 8, text: '32强' },
  ];

  container.innerHTML = `
    <div class="ko-bracket-toolbar">
      <span class="ko-bracket-toolbar-label">缩放</span>
      <button type="button" class="ko-bracket-zoom-btn" data-bracket-zoom="out" aria-label="缩小">−</button>
      <span class="ko-bracket-zoom-value" id="koZoomLabel">100%</span>
      <button type="button" class="ko-bracket-zoom-btn" data-bracket-zoom="in" aria-label="放大">+</button>
      <button type="button" class="ko-bracket-zoom-btn ko-bracket-zoom-reset" data-bracket-zoom="reset">适应屏幕</button>
    </div>
    <div class="ko-bracket-viewport" id="koBracketViewport">
      <div class="ko-bracket-scaler" id="koBracketScaler">
        <div class="ko-bracket-board" id="koBracketBoard" style="width:${boardW}px;--bracket-node-h:${BRACKET_NODE_H}px">
          <div class="ko-bracket-labels" style="height:${BRACKET_LABEL_H}px">${renderBracketLabels(labels)}</div>
          <div class="ko-bracket-canvas" style="height:${canvasH}px">
            <svg class="ko-bracket-svg" width="${boardW}" height="${canvasH}" aria-hidden="true">
              ${svgPaths}
            </svg>
            ${renderBracketColumn(leftR32, leftPos, 0)}
            ${renderBracketColumn(leftR16, leftPos, 1)}
            ${renderBracketColumn(leftQf, leftPos, 2)}
            ${renderBracketColumn([leftSf], leftPos, 3)}
            <div class="ko-bracket-col" style="left:${bracketColLeft(4)}px;width:${BRACKET_CENTER_COL_W}px">
              <div class="ko-bracket-col-body" style="height:${centerBodyH}px">
                <div class="ko-bracket-slot" style="top:${finalTop}px">${renderBracketNode(104)}</div>
                <div class="ko-bracket-slot" style="top:${thirdTop}px">${renderBracketNode(103)}</div>
              </div>
            </div>
            ${renderBracketColumn([rightSf], rightPos, 5)}
            ${renderBracketColumn(rightQf, rightPos, 6)}
            ${renderBracketColumn(rightR16, rightPos, 7)}
            ${renderBracketColumn(rightR32, rightPos, 8)}
          </div>
        </div>
      </div>
    </div>`;

  bracketBoardMetrics = { w: boardW, h: canvasH, labelH: BRACKET_LABEL_H };
  requestAnimationFrame(() => applyBracketViewportScale());
}

function applyBracketViewportScale() {
  const viewport = $('#koBracketViewport');
  const scaler = $('#koBracketScaler');
  if (!viewport || !scaler || !bracketBoardMetrics.w) return;

  const { w, h, labelH } = bracketBoardMetrics;
  const totalH = labelH + 8 + h;
  const availW = Math.max(viewport.clientWidth - 4, 320);
  const widthScale = availW / w;
  // 默认 93%；仅当视口宽度不足时再缩小（不再按高度压到 72%）
  const baseScale = Math.min(BRACKET_DEFAULT_SCALE, widthScale);
  const scale = Math.max(0.45, Math.min(1.5, baseScale * bracketUserZoom));

  scaler.style.width = `${w}px`;
  scaler.style.height = `${totalH}px`;
  scaler.style.transform = `scale(${scale})`;
  viewport.style.height = `${Math.ceil(totalH * scale) + 4}px`;

  const label = $('#koZoomLabel');
  if (label) label.textContent = `${Math.round(scale * 100)}%`;
}

function initBracketZoomControls() {
  const container = $('#koBracket');
  if (!container || container.dataset.zoomBound) return;
  container.dataset.zoomBound = '1';

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bracket-zoom]');
    if (!btn) return;
    const action = btn.dataset.bracketZoom;
    if (action === 'in') bracketUserZoom = Math.min(1.5, +(bracketUserZoom + 0.1).toFixed(2));
    else if (action === 'out') bracketUserZoom = Math.max(0.5, +(bracketUserZoom - 0.1).toFixed(2));
    else if (action === 'reset') bracketUserZoom = 1;
    applyBracketViewportScale();
  });

  if (!window.__bracketResizeBound) {
    window.__bracketResizeBound = true;
    window.addEventListener('resize', () => {
      if (knockoutView === 'bracket') applyBracketViewportScale();
    });
  }
}

function updateKnockoutViewUI() {
  const isBracket = knockoutView === 'bracket';
  $('#koBracket')?.classList.toggle('hidden', !isBracket);
  $('#koListPanel')?.classList.toggle('hidden', isBracket);
  $$('#koViewTabs .tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.koView === knockoutView);
  });
}

function renderKnockoutMatchCard(m) {
  const minute = m.minute ? ` ${m.minute}'` : '';
  const { homeWin, awayWin, isDraw } = getMatchOutcome(m);
  const hasScore = m.score !== null && m.score !== undefined;
  const pending = m.home === '待定' || m.away === '待定';

  const scoreHtml = hasScore
    ? `<div class="match-score-wrap">
        <span class="ko-card-score">${m.score[0]}<span class="score-sep">:</span>${m.score[1]}</span>
        ${formatMatchPenaltyHtml(m)}
      </div>`
    : `<span class="ko-card-score vs">VS</span>`;

  return `
    <article class="ko-card ${m.status}${pending ? ' pending' : ''}">
      <div class="ko-card-head">
        <span class="ko-card-id">M${m.id}</span>
        <time class="ko-card-datetime">${formatDateShort(m.date)} ${m.time}</time>
        <span class="match-status ${m.status}">${STATUS_LABEL[m.status]}${minute}</span>
      </div>
      <div class="ko-card-matchup">
        <div class="ko-card-team ${homeWin ? 'winner' : ''} ${isDraw ? 'draw' : ''}">
          <span class="ko-card-flag">${m.homeFlag}</span>
          <span class="ko-card-name">${m.home}</span>
        </div>
        ${scoreHtml}
        <div class="ko-card-team ${awayWin ? 'winner' : ''} ${isDraw ? 'draw' : ''}">
          <span class="ko-card-flag">${m.awayFlag}</span>
          <span class="ko-card-name">${m.away}</span>
        </div>
      </div>
      <div class="ko-card-foot">
        <span>📍 ${m.venue}</span>
        ${m.timeET ? `<span>${m.timeET}</span>` : ''}
      </div>
    </article>`;
}

function renderKnockout() {
  renderKnockoutProgress();
  updateKnockoutViewUI();

  if (knockoutView === 'bracket') {
    renderKnockoutBracket();
    return;
  }

  const matches = getFilteredKnockoutMatches();
  const summaryEl = $('#koSummary');
  if (summaryEl) {
    const live = matches.filter((m) => m.status === 'live').length;
    const parts = [`共 ${matches.length} 场`];
    if (live) parts.push(`${live} 场进行中`);
    summaryEl.textContent = parts.join(' · ');
  }

  const container = $('#koRounds');
  if (!container) return;

  if (!matches.length) {
    container.innerHTML =
      '<div class="schedule-empty"><span class="schedule-empty-icon">🏆</span><p>当前筛选下暂无淘汰赛</p><p class="schedule-empty-hint">试试切换轮次或状态</p></div>';
    return;
  }

  const rounds = groupKnockoutByRound(matches);
  container.innerHTML = rounds
    .map(
      (round) => `
    <section class="ko-round-block">
      <header class="ko-round-header">
        <h3 class="ko-round-title">${round.label}</h3>
        <span class="ko-round-count">${round.matches.length} 场</span>
      </header>
      <div class="ko-card-grid">${round.matches.map(renderKnockoutMatchCard).join('')}</div>
    </section>`
    )
    .join('');
}

function initKnockoutFilters() {
  initBracketZoomControls();

  $$('#koViewTabs .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      knockoutView = btn.dataset.koView || 'bracket';
      renderKnockout();
    });
  });

  $$('#koRoundTabs .filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('#koRoundTabs .filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      knockoutFilter.round = btn.dataset.koRound;
      renderKnockout();
    });
  });

  $$('#koStatusTabs .filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('#koStatusTabs .filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      knockoutFilter.status = btn.dataset.koStatus;
      renderKnockout();
    });
  });
}

/* ===== Standings ===== */
let activeGroup = 'A';

function renderGroupSelector() {
  $('#groupSelector').innerHTML = Object.keys(WC2026.groups)
    .map(
      (g) =>
        `<button class="group-chip ${g === activeGroup ? 'active' : ''}" data-group="${g}">${GROUP_LABELS[g]}</button>`
    )
    .join('');

  $$('.group-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeGroup = chip.dataset.group;
      renderGroupSelector();
      renderStandingsTable();
    });
  });
}

function renderStandingsTable() {
  const data = WC2026.standings[activeGroup];
  $('#standingsTable').innerHTML = `
    <table class="standings-table">
      <thead>
        <tr>
          <th>#</th><th>球队</th><th>赛</th><th>胜</th><th>平</th><th>负</th>
          <th>进</th><th>失</th><th>净胜</th><th>积分</th>
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (t, i) => `
          <tr>
            <td><span class="rank-badge rank-${i < 2 ? i + 1 : ''}">${i + 1}</span></td>
            <td><div class="team-cell">${t.flag} ${t.team}</div></td>
            <td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td>
            <td>${t.gf}</td><td>${t.ga}</td><td>${t.gd > 0 ? '+' : ''}${t.gd}</td>
            <td class="pts-cell">${t.pts}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>`;
}

function renderAllGroups() {
  $('#allGroupsGrid').innerHTML = Object.entries(WC2026.standings)
    .map(
      ([group, teams]) => `
      <div class="mini-group-card">
        <div class="mini-group-header">${GROUP_LABELS[group]}</div>
        ${teams
          .map(
            (t, i) => `
          <div class="mini-group-row">
            <span class="mini-rank">${i + 1}</span>
            <span class="mini-team">${t.flag} ${t.team}</span>
            <span class="mini-pts">${t.pts}</span>
          </div>`
          )
          .join('')}
      </div>`
    )
    .join('');
}

function renderScorers() {
  const rows = WC2026.scorers || [];

  if (!rows.length && LiveData.syncing) {
    $('#scorersTable').innerHTML = '<div class="stream-empty"><p>正在同步最新进球数据…</p></div>';
    return;
  }

  if (!rows.length) {
    $('#scorersTable').innerHTML = '<div class="stream-empty"><p>暂无射手数据，请稍后重试</p></div>';
    return;
  }

  $('#scorersTable').innerHTML = `
    <div class="scorers-table-head">
      <span>#</span><span>球员 / 国家</span><span>进球</span><span>助攻</span><span>分钟</span>
    </div>
    ${rows
      .map(
        (s) => `
      <div class="scorer-row">
        <span class="scorer-rank ${s.rank <= 2 ? 'top' : ''}">${s.rank}</span>
        <div class="scorer-info">
          <span class="scorer-name">${s.player}</span>
          <span class="scorer-team"><span class="scorer-team-flag">${s.teamFlag || s.flag || '⚽'}</span>${s.team}</span>
        </div>
        <span class="scorer-stat scorer-goals">${s.goals}</span>
        <span class="scorer-stat">${s.assists}</span>
        <span class="scorer-stat">${s.minutes}</span>
      </div>`
      )
      .join('')}`;
}

let scorersRefreshTimer = null;

function stopScorersAutoRefresh() {
  if (scorersRefreshTimer) {
    clearInterval(scorersRefreshTimer);
    scorersRefreshTimer = null;
  }
}

function startScorersAutoRefresh() {
  stopScorersAutoRefresh();
  scorersRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    if (!$('#scorersPanel')?.classList.contains('active')) return;
    refreshStandingsData({ force: true, silent: true });
  }, 45000);
}

function refreshStandingsData(options = {}) {
  if (!options.silent) renderScorers();
  return LiveData.refreshScorers(options).then((ok) => {
    refreshCoreViews();
    if ($('#scorersPanel')?.classList.contains('active')) startScorersAutoRefresh();
    return ok;
  });
}

function initStandingsTabs() {
  $$('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach((b) => b.classList.remove('active'));
      $$('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#${btn.dataset.tab}Panel`).classList.add('active');

      if (btn.dataset.tab === 'scorers') {
        refreshStandingsData({ force: true });
      } else {
        stopScorersAutoRefresh();
      }
    });
  });
}

/* ===== Highlights（多平台真实视频，见 highlights.js） ===== */
function refreshHighlightsDeferred() {
  const run = () => {
    Highlights.load().then(() => Highlights.render());
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 1200 });
  } else {
    setTimeout(run, 0);
  }
}

/* ===== Live ===== */
let liveSourceId = 'cn';

function getFeaturedMatch() {
  const live = WC2026.matches.find((m) => m.status === 'live');
  if (live) return { match: live, mode: 'live' };
  const next = WC2026.matches.find((m) => m.status === 'upcoming');
  if (next) return { match: next, mode: 'next' };
  const lastFinished = [...WC2026.matches].reverse().find((m) => m.status === 'finished');
  if (lastFinished) return { match: lastFinished, mode: 'finished' };
  return null;
}

function renderLiveStreamArea(match, mode) {
  const stream = resolveLiveStream(match, mode);
  const sources = stream.sources;
  if (!sources.some((s) => s.id === liveSourceId)) {
    liveSourceId = stream.defaultSource;
  }
  const active = sources.find((s) => s.id === liveSourceId) || sources[0];

  $('#liveStream').innerHTML = `
    <div class="stream-frame">${renderLiveStreamHtml(active, match)}</div>`;

  const controls = $('#liveControls');
  if (controls) {
    controls.innerHTML = sources
      .map(
        (s) =>
          `<button class="ctrl-btn${s.id === liveSourceId ? ' active' : ''}" data-live-source="${s.id}">${s.label}</button>`
      )
      .join('');

    controls.querySelectorAll('[data-live-source]').forEach((btn) => {
      btn.addEventListener('click', () => {
        liveSourceId = btn.dataset.liveSource;
        renderLiveStreamArea(match, mode);
      });
    });
  }
}

function renderLive() {
  const featured = getFeaturedMatch();
  const liveMatch = featured?.match;

  if (liveMatch) {
    const isLive = featured.mode === 'live';
    const badgeEl = $('#livePlayerCard .live-badge-large');
    if (badgeEl) {
      badgeEl.className = `live-badge-large${isLive ? '' : ' next-badge'}`;
      badgeEl.innerHTML = isLive
        ? '<span class="live-dot"></span> LIVE'
        : featured.mode === 'finished'
          ? '最新回放'
          : '下一场预告';
    }

    const scoreHtml = liveMatch.score
      ? `<div class="live-score-big">${liveMatch.score[0]} : ${liveMatch.score[1]}</div>
         <div class="live-minute">${isLive ? `${liveMatch.minute || 0}' · 进行中` : featured.mode === 'finished' ? '已结束' : '未开始'}</div>`
      : `<div class="live-score-big" style="font-size:32px">VS</div>
         <div class="live-minute">${liveMatch.date} ${liveMatch.time} 北京 · ${liveMatch.timeET || ''}</div>`;

    $('#liveScoreboard').innerHTML = `
      <div class="live-match-teams">
        <div class="live-team">
          <span class="live-team-flag">${liveMatch.homeFlag}</span>
          <span class="live-team-name">${liveMatch.home}</span>
        </div>
        <div>${scoreHtml}</div>
        <div class="live-team">
          <span class="live-team-flag">${liveMatch.awayFlag}</span>
          <span class="live-team-name">${liveMatch.away}</span>
        </div>
      </div>`;

    renderLiveStreamArea(liveMatch, featured.mode);
  } else {
    $('#liveScoreboard').innerHTML = '<p class="stream-empty">暂无比赛数据</p>';
    $('#liveStream').innerHTML = '<div class="stream-empty"><p>等待赛程同步…</p></div>';
  }

  const commentary = WC2026.liveMatch?.commentary || [];
  $('#commentaryFeed').innerHTML = commentary
    .map(
      (c) => `
    <div class="commentary-item">
      <span class="comm-minute">${c.minute}'</span>
      <span>${c.text}</span>
    </div>`
    )
    .join('');

  const today = beijingToday();
  const todayMatches = WC2026.matches.filter((m) => m.date === today);

  $('#todayMatches').innerHTML = todayMatches
    .map((m) => {
      const score = m.score ? `${m.score[0]}-${m.score[1]}` : m.time;
      const statusText =
        m.status === 'live' ? `${score} LIVE` : m.status === 'finished' ? score : m.time;
      return `
      <div class="today-match-item" data-match-id="${m.id}">
        <span>${m.homeFlag} ${m.home} vs ${m.away} ${m.awayFlag}</span>
        <span class="match-status ${m.status}">${statusText}</span>
      </div>`;
    })
    .join('');

  $('#broadcasters').innerHTML = WC2026.broadcasters
    .map(
      (b) => `
    <a class="broadcaster-item" href="${b.url}" target="_blank" rel="noopener">
      <span class="broadcaster-logo">${b.logo}</span>
      <div>
        <div class="broadcaster-name">${b.name}</div>
        <div class="broadcaster-region">${b.region}</div>
      </div>
    </a>`
    )
    .join('');

  $('#miniScorers').innerHTML = WC2026.scorers
    .slice(0, 5)
    .map(
      (s) => `
    <div class="mini-scorer-item">
      <span>${s.flag}</span>
      <span>${s.player}</span>
      <span class="mini-scorer-goals">${s.goals}</span>
    </div>`
    )
    .join('');
}

/* ===== Utils ===== */
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}`;
}

/* ===== Init ===== */
function refreshCoreViews() {
  renderHero();
  renderSchedule();
  renderKnockout();
  renderGroupSelector();
  renderStandingsTable();
  renderAllGroups();
  renderScorers();
  renderLive();
}

function refreshAllViews() {
  refreshCoreViews();
  refreshHighlightsDeferred();
}

document.addEventListener('DOMContentLoaded', () => {
  const showSection = initNav();
  document.body.classList.toggle('home-view', $('#home')?.classList.contains('section-active'));
  initScheduleFilters();
  initKnockoutFilters();
  initStandingsTabs();
  Highlights.init();

  initHeroVideo();

  function onDataReady() {
    refreshCoreViews();
    refreshHighlightsDeferred();
  }

  LiveData.init(onDataReady);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') Highlights.closeModal();
  });
});
