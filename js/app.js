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
  const homeWin = m.score && m.score[0] > m.score[1];
  const awayWin = m.score && m.score[1] > m.score[0];
  const isDraw = m.score && m.score[0] === m.score[1];
  const hasScore = m.score !== null && m.score !== undefined;

  const scoreHtml = hasScore
    ? `<span class="schedule-row-score">${m.score[0]}<span class="score-sep">:</span>${m.score[1]}</span>`
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
    <div style="display:grid;grid-template-columns:40px 1fr 60px 60px 60px;gap:12px;padding:8px 20px;font-size:12px;color:var(--text-dim);margin-bottom:4px;">
      <span>#</span><span>球员</span><span style="text-align:center">进球</span>
      <span style="text-align:center">助攻</span><span style="text-align:center">分钟</span>
    </div>
    ${rows
      .map(
        (s) => `
      <div class="scorer-row">
        <span class="scorer-rank ${s.rank <= 2 ? 'top' : ''}">${s.rank}</span>
        <div class="scorer-info">
          <span class="scorer-name">${s.flag} ${s.player}</span>
          <span class="scorer-team">${s.team}</span>
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
