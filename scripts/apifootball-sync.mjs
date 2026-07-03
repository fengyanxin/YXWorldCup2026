const APIFOOTBALL_BASE = 'https://v3.football.api-sports.io';
let indexCache = null;
const LEAGUE_ID = 1;
const SEASON = 2026;

const TEAM_ALIASES = {
  'korea republic': 'South Korea',
  'republic of korea': 'South Korea',
  usa: 'United States',
  "cote d'ivoire": 'Ivory Coast',
  "côte d'ivoire": 'Ivory Coast',
  'cabo verde': 'Cape Verde',
  'ir iran': 'Iran',
  'dr congo': 'Democratic Republic of the Congo',
  'congo dr': 'Democratic Republic of the Congo',
  'congo-kinshasa': 'Democratic Republic of the Congo',
  curacao: 'Curaçao',
  turkiye: 'Turkey',
  türkiye: 'Turkey',
  'bosnia & herzegovina': 'Bosnia and Herzegovina',
};

const STADIUM_BY_VENUE = [
  [['mexico city', 'azteca'], '1'],
  [['guadalajara', 'akron'], '2'],
  [['monterrey', 'bbva'], '3'],
  [['dallas', 'arlington', 'at&t'], '4'],
  [['houston', 'nrg'], '5'],
  [['kansas', 'arrowhead'], '6'],
  [['atlanta', 'mercedes'], '7'],
  [['miami', 'hard rock'], '8'],
  [['boston', 'foxborough', 'gillette'], '9'],
  [['philadelphia', 'lincoln'], '10'],
  [['rutherford', 'new jersey', 'new york', 'metlife'], '11'],
  [['toronto', 'bmo'], '12'],
  [['vancouver', 'bc place'], '13'],
  [['seattle', 'lumen'], '14'],
  [['santa clara', 'san francisco', 'levis', "levi's"], '15'],
  [['los angeles', 'inglewood', 'sofi', 'pasadena'], '16'],
];

const STADIUM_TZ = {
  1: 'America/Mexico_City',
  2: 'America/Mexico_City',
  3: 'America/Monterrey',
  4: 'America/Chicago',
  5: 'America/Chicago',
  6: 'America/Chicago',
  7: 'America/New_York',
  8: 'America/New_York',
  9: 'America/New_York',
  10: 'America/New_York',
  11: 'America/New_York',
  12: 'America/Toronto',
  13: 'America/Vancouver',
  14: 'America/Los_Angeles',
  15: 'America/Los_Angeles',
  16: 'America/Los_Angeles',
};

const ROUND_TYPE = {
  'group stage': 'group',
  'round of 32': 'r32',
  'round of 16': 'r16',
  '8th finals': 'r16',
  'quarter-finals': 'qf',
  'quarter-final': 'qf',
  'semi-finals': 'sf',
  'semi-final': 'sf',
  '3rd place final': 'third',
  'third place': 'third',
  final: 'final',
};

const KNOCKOUT_GROUP = {
  r32: 'R32',
  r16: 'R16',
  qf: 'QF',
  sf: 'SF',
  third: '3RD',
  final: 'FINAL',
};

async function loadIndex(origin) {
  if (indexCache) return indexCache;
  const base = origin || 'https://example.com';
  const res = await fetch(`${base}/data/wc-sync-index.json`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`wc-sync-index.json → ${res.status}`);
  indexCache = await res.json();
  return indexCache;
}

function normalizeTeamName(name, index) {
  const raw = String(name || '').trim();
  if (!raw) return raw;
  const key = raw.toLowerCase();
  if (TEAM_ALIASES[key]) return TEAM_ALIASES[key];
  const hit = index.teams.find((t) => t.name_en.toLowerCase() === key);
  return hit ? hit.name_en : raw;
}

function teamLookup(index) {
  const lookup = {};
  index.teams.forEach((team) => {
    lookup[normalizeTeamName(team.name_en, index).toLowerCase()] = team;
  });
  return lookup;
}

function matchLookup(index) {
  const lookup = {};
  index.matches.forEach((match) => {
    const home = normalizeTeamName(match.home_team_name_en, index);
    const away = normalizeTeamName(match.away_team_name_en, index);
    if (/^(Winner|Runner|3rd|Loser)/.test(home)) return;
    lookup[`${home.toLowerCase()}::${away.toLowerCase()}`] = match;
    lookup[`${away.toLowerCase()}::${home.toLowerCase()}`] = match;
  });
  return lookup;
}

async function fetchApi(path, apiKey) {
  const res = await fetch(`${APIFOOTBALL_BASE}${path}`, {
    headers: {
      'x-apisports-key': apiKey,
      Accept: 'application/json',
      'User-Agent': 'worldcup-2026/1.0',
    },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data;
}

function guessStadiumId(venueName, city) {
  const blob = `${venueName || ''} ${city || ''}`.toLowerCase();
  for (const [needles, sid] of STADIUM_BY_VENUE) {
    if (needles.some((n) => blob.includes(n))) return sid;
  }
  return '11';
}

function utcToLocalDate(isoDate, stadiumId) {
  const tz = STADIUM_TZ[Number(stadiumId)] || 'America/New_York';
  const dt = new Date(isoDate);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(dt);
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('month')}/${get('day')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

function parseGroup(roundName) {
  if (!roundName) return null;
  const m = roundName.match(/group\s+([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

function parseMatchday(roundName) {
  if (!roundName) return '';
  const m = roundName.match(/group stage\s*-\s*(\d+)/i);
  return m ? m[1] : '';
}

function parseStage(roundName) {
  if (!roundName) return ['group', null];
  const lower = roundName.toLowerCase();
  if (lower.includes('group stage')) return ['group', parseGroup(roundName)];
  for (const [key, stage] of Object.entries(ROUND_TYPE)) {
    if (key !== 'group stage' && lower.includes(key)) {
      return [stage, KNOCKOUT_GROUP[stage] || null];
    }
  }
  if (lower.trim() === 'final') return ['final', 'FINAL'];
  return ['group', parseGroup(roundName)];
}

function mapStatus(short, elapsed) {
  const code = String(short || 'NS').toUpperCase();
  if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(code)) return ['TRUE', 'finished'];
  if (['NS', 'TBD', 'PST', 'CANC', 'ABD'].includes(code)) return ['FALSE', 'notstarted'];
  if (code === 'HT') return ['FALSE', 'HT'];
  if (code === '1H') return ['FALSE', String(elapsed ?? 25)];
  if (code === '2H') return ['FALSE', String(elapsed ?? 70)];
  if (['ET', 'BT', 'P', 'LIVE', 'INT'].includes(code)) {
    return ['FALSE', elapsed != null ? String(elapsed) : code];
  }
  if (elapsed != null) return ['FALSE', String(elapsed)];
  return ['FALSE', 'notstarted'];
}

function fixtureGoals(item) {
  const goals = item.goals || {};
  const score = item.score || {};
  let home = goals.home;
  let away = goals.away;
  if (home == null) home = score.fulltime?.home;
  if (away == null) away = score.fulltime?.away;
  return [home ?? 0, away ?? 0];
}

function convertFixture(item, teams, matches, index) {
  const fixture = item.fixture || {};
  const teamsInfo = item.teams || {};
  const homeName = normalizeTeamName(teamsInfo.home?.name, index);
  const awayName = normalizeTeamName(teamsInfo.away?.name, index);
  if (!homeName || !awayName) return null;

  const homeTeam = teams[homeName.toLowerCase()] || {};
  const awayTeam = teams[awayName.toLowerCase()] || {};
  const matchMeta = matches[`${homeName.toLowerCase()}::${awayName.toLowerCase()}`];
  const [stage, groupCodeRaw] = parseStage(item.league?.round);
  let groupCode = groupCodeRaw;
  if (stage === 'group' && !groupCode) groupCode = homeTeam.groups || awayTeam.groups;

  const venue = fixture.venue || {};
  const stadiumId = guessStadiumId(venue.name, venue.city);
  const [finished, elapsed] = mapStatus(fixture.status?.short, fixture.status?.elapsed);
  const [homeScore, awayScore] = fixtureGoals(item);
  const localId = matchMeta?.id || String(fixture.id || '');

  return {
    id: String(localId),
    home_team_id: String(homeTeam.id || teamsInfo.home?.id || ''),
    away_team_id: String(awayTeam.id || teamsInfo.away?.id || ''),
    home_score: String(homeScore),
    away_score: String(awayScore),
    home_scorers: 'null',
    away_scorers: 'null',
    group: groupCode || matchMeta?.group || 'KO',
    matchday: parseMatchday(item.league?.round),
    local_date: utcToLocalDate(fixture.date || '', stadiumId),
    stadium_id: stadiumId,
    finished,
    time_elapsed: elapsed,
    type: stage,
    home_team_name_en: homeName,
    away_team_name_en: awayName,
    apifootball_fixture_id: fixture.id,
  };
}

function convertStandings(data, teams, index) {
  const groups = [];
  for (const block of data.response || []) {
    for (const groupRows of block.league?.standings || []) {
      if (!groupRows?.length) continue;
      const groupName = String(groupRows[0].group || '').replace('Group ', '').trim();
      if (!groupName) continue;
      const rows = groupRows.map((row) => {
        const teamName = normalizeTeamName(row.team?.name, index);
        const team = teams[teamName.toLowerCase()] || {};
        const allStats = row.all || {};
        return {
          team_id: String(team.id || row.team?.id || ''),
          mp: String(allStats.played || 0),
          w: String(allStats.win || 0),
          d: String(allStats.draw || 0),
          l: String(allStats.lose || 0),
          pts: String(row.points || 0),
          gf: String(allStats.goals?.for || 0),
          ga: String(allStats.goals?.against || 0),
          gd: String(row.goalsDiff || 0),
        };
      });
      groups.push({ name: groupName, teams: rows });
    }
  }
  return groups;
}

function playerDisplayName(player) {
  const first = String(player.firstname || '').trim();
  const last = String(player.lastname || '').trim();
  if (first && last) return `${first} ${last}`;
  return String(player.name || '').trim();
}

function convertTopScorers(data, index) {
  const scorers = [];
  for (const item of data.response || []) {
    const player = item.player || {};
    const stats = (item.statistics || [])[0];
    if (!stats) continue;
    const goals = stats.goals?.total;
    if (goals == null) continue;
    scorers.push({
      playerEn: playerDisplayName(player),
      teamEn: normalizeTeamName(stats.team?.name, index),
      goals: Number(goals),
      assists: Number(stats.goals?.assists || 0),
    });
  }
  scorers.sort((a, b) => b.goals - a.goals || a.playerEn.localeCompare(b.playerEn));
  return scorers;
}

function buildTeamsList(index) {
  return index.teams.map((team) => ({
    id: String(team.id),
    name_en: team.name_en,
    fifa_code: team.fifa_code || '',
    iso2: team.iso2 || '',
    groups: team.groups || '',
    flag: `https://flagcdn.com/w80/${String(team.iso2 || '').toLowerCase()}.png`,
  }));
}

export async function buildApifootballSyncPayload(apiKey, origin) {
  const index = await loadIndex(origin);
  const teams = teamLookup(index);
  const matches = matchLookup(index);
  const q = new URLSearchParams({ league: String(LEAGUE_ID), season: String(SEASON) }).toString();

  const [fixturesRaw, standingsRaw, scorersRaw] = await Promise.all([
    fetchApi(`/fixtures?${q}`, apiKey),
    fetchApi(`/standings?${q}`, apiKey),
    fetchApi(`/players/topscorers?${q}`, apiKey),
  ]);

  const games = (fixturesRaw.response || [])
    .map((item) => convertFixture(item, teams, matches, index))
    .filter(Boolean)
    .sort((a, b) => (Number(a.id) || 999) - (Number(b.id) || 999));

  const groups = convertStandings(standingsRaw, teams, index);
  const scorers = convertTopScorers(scorersRaw, index);
  const finishedGames = games.filter((g) => g.finished === 'TRUE').length;

  return {
    games,
    groups,
    teams: buildTeamsList(index),
    scorers,
    scorerFinishedGames: finishedGames,
    source: 'apifootball',
    fromCache: false,
  };
}

export function getApifootballKey(env = {}) {
  return String(env.APIFOOTBALL_KEY || env.API_FOOTBALL_KEY || '').trim();
}
