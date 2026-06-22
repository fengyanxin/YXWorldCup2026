/* 实时数据：从 worldcup26.ir 拉取并合并到 WC2026 */
/* API local_date 为球场当地时间，同步时按 stadium_id 换算为北京时间 */
function matchPairKey(home, away) {
  return [home, away].sort().join(' vs ');
}

const MATCH_BY_PAIR = Object.fromEntries(
  WC2026.matches.map((m) => [matchPairKey(m.home, m.away), m])
);

const LiveData = {
  API_PREFIX: '/api',
  SESSION_KEY: 'wc2026-sync-v1',
  SESSION_MAX_AGE_MS: 30 * 60 * 1000,
  teamsById: {},
  zhFlagMap: {},
  lastSync: null,
  error: null,
  syncing: false,
  onUpdate: null,

  init(onUpdate) {
    this.onUpdate = onUpdate;
    this.zhFlagMap = buildZhFlagMap();

    const snapshot = window.__SYNC_SNAPSHOT__;
    if (snapshot?.games?.length) {
      this.applySyncPayload(snapshot);
      this.lastSync = new Date(snapshot.syncedAt || Date.now());
      this.onUpdate?.('snapshot');
    } else {
      const cached = this.loadSessionCache();
      if (cached) {
        this.applySyncPayload(cached);
        this.lastSync = new Date(cached.syncedAt || Date.now());
        this.onUpdate?.('cache');
      }
    }

    return this.refresh();
  },

  loadSessionCache() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
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
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota errors */
    }
  },

  async fetchSync(force = false) {
    if (!force && window.__syncPrefetch) {
      const prefetched = await window.__syncPrefetch;
      window.__syncPrefetch = null;
      if (prefetched?.games) return prefetched;
    }

    const query = force ? '?force=1' : '';
    const res = await fetch(`${this.API_PREFIX}/sync${query}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API /sync → ${res.status}`);
    return res.json();
  },

  applySyncPayload(payload) {
    const teams = Array.isArray(payload.teams) ? payload.teams : payload.teams?.teams || [];
    this.teamsById = {};
    teams.forEach((t) => {
      this.teamsById[String(t.id)] = t;
    });

    const games = Array.isArray(payload.games) ? payload.games : payload.games?.games || [];
    const groups = Array.isArray(payload.groups) ? payload.groups : payload.groups?.groups || [];
    this.applyGames(games);
    this.applyStandings(groups);
    this.applyLiveMatch();
  },

  async refresh(options = {}) {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const payload = await this.fetchSync(Boolean(options.force));
      this.applySyncPayload(payload);
      this.saveSessionCache(payload);

      this.lastSync = new Date(payload.syncedAt || Date.now());
      this.error = null;
      this.onUpdate?.(payload.fromCache ? 'cache' : 'fresh');
    } catch (err) {
      this.error = err.message || '同步失败';
      if (!this.lastSync) this.onUpdate?.('error');
    } finally {
      this.syncing = false;
    }
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
