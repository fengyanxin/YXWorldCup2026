/* 实时数据：从 /api/sync 拉取（主源 API-Football，失败时 fallback worldcup26.ir） */
/* API local_date 为球场当地时间，同步时按 stadium_id 换算为北京时间 */
function matchPairKey(home, away) {
  return [home, away].sort().join(' vs ');
}

function parseOptionalScore(value) {
  if (value === null || value === undefined || value === '' || value === 'null') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const MATCH_BY_PAIR = Object.fromEntries(
  WC2026.matches.map((m) => [matchPairKey(m.home, m.away), m])
);

const LiveData = {
  API_PREFIX: '/api',
  SESSION_MAX_AGE_MS: 30 * 60 * 1000,
  teamsById: {},
  zhFlagMap: {},
  lastSync: null,
  scorersSyncedAt: null,
  scorersSource: 'none',
  scorerFinishedGames: 0,
  error: null,
  syncing: false,
  pendingRefresh: null,
  onUpdate: null,
  fallbackReason: null,

  resolveScorersSource(payload) {
    if (payload.source === 'apifootball') {
      return payload.fromCache ? 'cache' : 'live';
    }
    if (payload.scorersSource === 'wcup2026.org') {
      return 'wcup2026';
    }
    if (payload.fallback) {
      return 'fallback';
    }
    return payload.fromCache ? 'cache' : 'live';
  },

  sessionKey() {
    const buildId = window.__BUILD_ID__ || 'local';
    return `wc2026-sync-${buildId}`;
  },

  init(onUpdate) {
    this.onUpdate = onUpdate;
    this.zhFlagMap = buildZhFlagMap();
    this.clearStaleSessionCaches();

    const snapshot = window.__SYNC_SNAPSHOT__;
    if (snapshot?.games?.length) {
      this.applySyncPayload(snapshot, { includeScorers: false });
      this.lastSync = new Date(snapshot.syncedAt || Date.now());
      this.onUpdate?.('snapshot');
    } else {
      const cached = this.loadSessionCache();
      if (cached) {
        this.applySyncPayload(cached, { includeScorers: false });
        this.lastSync = new Date(cached.syncedAt || Date.now());
        this.onUpdate?.('cache');
      }
    }

    return this.refresh({ force: true, reason: 'init' });
  },

  clearStaleSessionCaches() {
    const current = this.sessionKey();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('wc2026-sync-') && key !== current) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
  },

  loadSessionCache() {
    try {
      const raw = sessionStorage.getItem(this.sessionKey());
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.games || !data?.groups || !data?.teams) return null;
      if (Date.now() - (data.syncedAt || 0) > this.SESSION_MAX_AGE_MS) return null;
      return data;
    } catch {
      return null;
    }
  },

  saveSessionCache(payload) {
    try {
      sessionStorage.setItem(this.sessionKey(), JSON.stringify(payload));
    } catch {
      /* ignore quota errors */
    }
  },

  normalizeList(key, raw) {
    if (Array.isArray(raw)) return raw;
    if (key === 'games') return raw?.games || [];
    if (key === 'groups') return raw?.groups || [];
    if (key === 'teams') return raw?.teams || [];
    return raw || [];
  },

  async fetchUpstream(key, path) {
    const res = await fetch(`${this.API_PREFIX}${path}?_=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
    const raw = await res.json();
    return this.normalizeList(key, raw);
  },

  async fetchSyncWithFallback(force = false) {
    try {
      return await this.fetchSync(force);
    } catch (syncErr) {
      const [games, groups, teams] = await Promise.all([
        this.fetchUpstream('games', '/get/games'),
        this.fetchUpstream('groups', '/get/groups'),
        this.fetchUpstream('teams', '/get/teams'),
      ]);
      return {
        games,
        groups,
        teams,
        syncedAt: Date.now(),
        fromCache: false,
        fallback: true,
        syncError: syncErr.message || String(syncErr),
      };
    }
  },

  async fetchSync(force = false) {
    if (!force && window.__syncPrefetch) {
      const prefetched = await window.__syncPrefetch;
      window.__syncPrefetch = null;
      if (prefetched?.games) return prefetched;
    }

    const params = new URLSearchParams();
    if (force) params.set('force', '1');
    params.set('_', String(Date.now()));
    const res = await fetch(`${this.API_PREFIX}/sync?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`API /sync → ${res.status}`);
    return res.json();
  },

  applySyncPayload(payload, options = {}) {
    const includeScorers = options.includeScorers !== false;
    const teams = Array.isArray(payload.teams) ? payload.teams : payload.teams?.teams || [];
    this.teamsById = {};
    teams.forEach((t) => {
      this.teamsById[String(t.id)] = t;
    });

    const games = Array.isArray(payload.games) ? payload.games : payload.games?.games || [];
    const groups = Array.isArray(payload.groups) ? payload.groups : payload.groups?.groups || [];
    this.applyGames(games);
    this.applyStandings(groups);
    if (includeScorers) {
      this.applyScorers(games, payload);
    }
    this.applyLiveMatch();
  },

  async refresh(options = {}) {
    if (this.syncing) {
      if (options.force) this.pendingRefresh = { ...options, force: true };
      return false;
    }
    this.syncing = true;

    try {
      const payload = await this.fetchSyncWithFallback(Boolean(options.force));
      this.applySyncPayload(payload, { includeScorers: true });
      this.saveSessionCache(payload);

      this.lastSync = new Date(payload.syncedAt || Date.now());
      this.scorersSyncedAt = this.lastSync;
      this.scorersSource = this.resolveScorersSource(payload);
      this.fallbackReason = payload.fallbackReason || null;
      this.error = payload.syncError || null;
      this.onUpdate?.(payload.fromCache ? 'cache' : payload.fallback ? 'fallback' : 'fresh');
      return true;
    } catch (err) {
      this.error = err.message || '同步失败';
      this.onUpdate?.(this.scorersSyncedAt ? 'stale' : 'error');
      return false;
    } finally {
      this.syncing = false;
      if (this.pendingRefresh) {
        const pending = this.pendingRefresh;
        this.pendingRefresh = null;
        await this.refresh(pending);
      }
    }
  },

  refreshScorers(options = {}) {
    return this.refresh({ force: true, reason: 'scorers', ...options });
  },

  mapStatus(game) {
    const elapsed = String(game.time_elapsed || '').toLowerCase();
    if (game.finished === 'TRUE' || elapsed === 'finished') return 'finished';
    if (elapsed === 'notstarted') return 'upcoming';
    return 'live';
  },

  mapMinute(game) {
    const e = game.time_elapsed;
    if (!e || e === 'notstarted' || String(e).toLowerCase() === 'finished') return null;
    const n = parseInt(e, 10);
    if (!Number.isNaN(n)) return n;
    if (e === 'HT') return 45;
    if (e === '1H') return 25;
    if (e === '2H') return 70;
    return null;
  },

  applyScheduleFromApi(match, game) {
    const sched = scheduleFromStadiumLocal(game.local_date, game.stadium_id);
    if (!sched) return;
    match.date = sched.date;
    match.time = sched.time;
    match.timeET = sched.timeET;
    if (sched.venue) match.venue = sched.venue;
  },

  resolveLocalMatch(g, home, away) {
    const byPair = MATCH_BY_PAIR[matchPairKey(home, away)];
    if (byPair) return byPair;

    const byId = WC2026.matches.find((m) => m.id === Number(g.id));
    if (byId && (g.home_team_label || g.away_team_label)) return byId;

    return null;
  },

  mapGroup(apiGroup, gameType) {
    if (gameType && gameType !== 'group') return 'KO';
    const ko = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'];
    if (ko.includes(apiGroup)) return 'KO';
    return apiGroup;
  },

  mapStage(game) {
    const map = {
      r32: '16强',
      r16: '8强',
      qf: '四分之一决赛',
      sf: '半决赛',
      third: '三四名决赛',
      final: '决赛',
    };
    return map[game.type] || null;
  },

  applyGames(games) {
    games.forEach((g) => {
      const homeEn = g.home_team_name_en || g.home_team_label;
      const awayEn = g.away_team_name_en || g.away_team_label;
      const home = teamNameZh(homeEn, this.teamsById, g.home_team_id);
      const away = teamNameZh(awayEn, this.teamsById, g.away_team_id);
      const match = this.resolveLocalMatch(g, home, away);
      if (!match) return;

      const status = this.mapStatus(g);
      const finished = status === 'finished';
      const homeScore = Number(g.home_score);
      const awayScore = Number(g.away_score);

      match.home = home;
      match.away = away;
      match.homeFlag = teamFlagZh(home, this.zhFlagMap);
      match.awayFlag = teamFlagZh(away, this.zhFlagMap);
      match.group = this.mapGroup(g.group, g.type);
      match.stage = this.mapStage(g);
      match.status = status;
      match.minute = this.mapMinute(g);
      match.score = finished || status === 'live' ? [homeScore, awayScore] : null;
      const homePen = parseOptionalScore(g.home_penalty_score);
      const awayPen = parseOptionalScore(g.away_penalty_score);
      match.penalties =
        homePen !== null && awayPen !== null && finished ? [homePen, awayPen] : null;
      this.applyScheduleFromApi(match, g);
    });
  },

  applyStandings(apiGroups) {
    apiGroups.forEach((g) => {
      const key = g.name;
      if (!WC2026.standings[key]) return;

      const rows = g.teams
        .map((t) => {
          const teamInfo = this.teamsById[t.team_id];
          const zh = teamNameZh(teamInfo?.name_en, this.teamsById, t.team_id);
          return {
            team: zh,
            flag: teamFlagZh(zh, this.zhFlagMap),
            p: Number(t.mp) || 0,
            w: Number(t.w) || 0,
            d: Number(t.d) || 0,
            l: Number(t.l) || 0,
            gf: Number(t.gf) || 0,
            ga: Number(t.ga) || 0,
            gd: Number(t.gd) || 0,
            pts: Number(t.pts) || 0,
          };
        })
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

      WC2026.standings[key] = rows;
    });
  },

  applyScorers(games, payload = {}) {
    if (Array.isArray(payload.scorers) && payload.scorers.length) {
      WC2026.scorers = buildScorersFromApi(payload.scorers, this.teamsById, this.zhFlagMap);
      this.scorerFinishedGames = Number(payload.scorerFinishedGames) || countScorerGames(games);
    } else {
      WC2026.scorers = buildScorersFromGames(games, this.teamsById, this.zhFlagMap);
      this.scorerFinishedGames = countScorerGames(games);
    }
    this.scorersSyncedAt = new Date(payload.syncedAt || Date.now());
    this.scorersSource = this.resolveScorersSource(payload);
    this.fallbackReason = payload.fallbackReason || null;
  },

  applyLiveMatch() {
    const live = WC2026.matches.find((m) => m.status === 'live');
    const next = WC2026.matches.find((m) => m.status === 'upcoming');

    const target = live || next;
    if (!target) return;

    const match = target;

    WC2026.liveMatch = WC2026.liveMatch || { id: match.id, commentary: [] };
    WC2026.liveMatch.id = match.id;

    if (live) {
      WC2026.liveMatch.commentary = [
        { minute: match.minute || 0, text: `进行中：${match.home} ${match.score?.[0] ?? 0} - ${match.score?.[1] ?? 0} ${match.away}` },
        { minute: match.minute || 0, text: `球场：${match.venue}` },
        { minute: match.minute || 0, text: '刷新页面可获取最新比分' },
      ];
    } else {
      WC2026.liveMatch.commentary = [
        { minute: 0, text: `即将开始：${match.home} vs ${match.away}` },
        { minute: 0, text: `${match.date} ${match.time} 北京 · ${match.timeET || ''} · ${match.venue}` },
        { minute: 0, text: '刷新页面可获取最新赛程' },
      ];
    }
  },
};
