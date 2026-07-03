"""API-Football → worldcup26.ir 兼容格式转换（供 /api/sync 使用）"""

from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

APIFOOTBALL_BASE = 'https://v3.football.api-sports.io'
LEAGUE_ID = 1
SEASON = 2026
ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / 'data' / 'wc-sync-index.json'
SSL_CTX = ssl.create_default_context()

TEAM_ALIASES = {
    'korea republic': 'South Korea',
    'republic of korea': 'South Korea',
    'usa': 'United States',
    "cote d'ivoire": 'Ivory Coast',
    "côte d'ivoire": 'Ivory Coast',
    'cabo verde': 'Cape Verde',
    'ir iran': 'Iran',
    'dr congo': 'Democratic Republic of the Congo',
    'congo dr': 'Democratic Republic of the Congo',
    'congo-kinshasa': 'Democratic Republic of the Congo',
    'curacao': 'Curaçao',
    'turkiye': 'Turkey',
    'türkiye': 'Turkey',
    'bosnia & herzegovina': 'Bosnia and Herzegovina',
}

STADIUM_BY_VENUE = [
    (('mexico city', 'azteca'), '1'),
    (('guadalajara', 'akron'), '2'),
    (('monterrey', 'bbva'), '3'),
    (('dallas', 'arlington', 'at&t'), '4'),
    (('houston', 'nrg'), '5'),
    (('kansas', 'arrowhead'), '6'),
    (('atlanta', 'mercedes'), '7'),
    (('miami', 'hard rock'), '8'),
    (('boston', 'foxborough', 'gillette'), '9'),
    (('philadelphia', 'lincoln'), '10'),
    (('rutherford', 'new jersey', 'new york', 'metlife'), '11'),
    (('toronto', 'bmo'), '12'),
    (('vancouver', 'bc place'), '13'),
    (('seattle', 'lumen'), '14'),
    (('santa clara', 'san francisco', 'levis', "levi's"), '15'),
    (('los angeles', 'inglewood', 'sofi', 'pasadena'), '16'),
]

STADIUM_TZ = {
    '1': 'America/Mexico_City',
    '2': 'America/Mexico_City',
    '3': 'America/Monterrey',
    '4': 'America/Chicago',
    '5': 'America/Chicago',
    '6': 'America/Chicago',
    '7': 'America/New_York',
    '8': 'America/New_York',
    '9': 'America/New_York',
    '10': 'America/New_York',
    '11': 'America/New_York',
    '12': 'America/Toronto',
    '13': 'America/Vancouver',
    '14': 'America/Los_Angeles',
    '15': 'America/Los_Angeles',
    '16': 'America/Los_Angeles',
}

ROUND_TYPE = {
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
    'final': 'final',
}

KNOCKOUT_GROUP = {
    'r32': 'R32',
    'r16': 'R16',
    'qf': 'QF',
    'sf': 'SF',
    'third': '3RD',
    'final': 'FINAL',
}

_INDEX = None


def normalize_team_name(name: str | None) -> str:
    raw = (name or '').strip()
    if not raw:
        return raw
    key = raw.lower()
    if key in TEAM_ALIASES:
        return TEAM_ALIASES[key]
    for team in load_index()['teams']:
        en = team['name_en']
        if en.lower() == key:
            return en
    return raw


def load_index() -> dict:
    global _INDEX
    if _INDEX is None:
        with open(INDEX_PATH, encoding='utf-8') as f:
            _INDEX = json.load(f)
    return _INDEX


def team_lookup() -> dict[str, dict]:
    lookup = {}
    for team in load_index()['teams']:
        lookup[normalize_team_name(team['name_en']).lower()] = team
    return lookup


def match_lookup() -> dict[tuple[str, str], dict]:
    lookup = {}
    for match in load_index()['matches']:
        home = normalize_team_name(match['home_team_name_en'])
        away = normalize_team_name(match['away_team_name_en'])
        if home.startswith('Winner') or home.startswith('Runner') or home.startswith('3rd') or home.startswith('Loser'):
            continue
        lookup[(home.lower(), away.lower())] = match
        lookup[(away.lower(), home.lower())] = match
    return lookup


def fetch_api(path: str, api_key: str, timeout: int = 30) -> dict:
    url = f'{APIFOOTBALL_BASE}{path}'
    req = urllib.request.Request(
        url,
        headers={
            'x-apisports-key': api_key,
            'Accept': 'application/json',
            'User-Agent': 'worldcup-2026/1.0',
        },
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        data = json.loads(resp.read())
    errors = data.get('errors') or {}
    if errors:
        raise RuntimeError(json.dumps(errors, ensure_ascii=False))
    return data


def guess_stadium_id(venue_name: str | None, city: str | None) -> str:
    blob = f'{venue_name or ""} {city or ""}'.lower()
    for needles, sid in STADIUM_BY_VENUE:
        if any(n in blob for n in needles):
            return sid
    return '11'


def utc_to_local_date(iso_date: str, stadium_id: str) -> str:
    tz_name = STADIUM_TZ.get(stadium_id, 'America/New_York')
    dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
    local = dt.astimezone(ZoneInfo(tz_name))
    return local.strftime('%m/%d/%Y %H:%M')


def parse_group(round_name: str | None) -> str | None:
    if not round_name:
        return None
    m = re.search(r'group\s+([A-L])', round_name, re.I)
    if m:
        return m.group(1).upper()
    return None


def parse_matchday(round_name: str | None) -> str | None:
    if not round_name:
        return None
    m = re.search(r'group stage\s*-\s*(\d+)', round_name, re.I)
    return m.group(1) if m else None


def parse_stage(round_name: str | None) -> tuple[str, str | None]:
    if not round_name:
        return 'group', None
    lower = round_name.lower()
    if 'group stage' in lower:
        return 'group', parse_group(round_name)
    for key, stage in ROUND_TYPE.items():
        if key in lower and key != 'group stage':
            return stage, KNOCKOUT_GROUP.get(stage)
    if lower.strip() == 'final':
        return 'final', 'FINAL'
    return 'group', parse_group(round_name)


def map_status(short: str | None, elapsed: int | None) -> tuple[str, str]:
    code = (short or 'NS').upper()
    if code in ('FT', 'AET', 'PEN', 'AWD', 'WO'):
        return 'TRUE', 'finished'
    if code in ('NS', 'TBD', 'PST', 'CANC', 'ABD'):
        return 'FALSE', 'notstarted'
    if code == 'HT':
        return 'FALSE', 'HT'
    if code == '1H':
        return 'FALSE', str(elapsed or 25)
    if code == '2H':
        return 'FALSE', str(elapsed or 70)
    if code in ('ET', 'BT', 'P', 'LIVE', 'INT'):
        if elapsed is not None:
            return 'FALSE', str(elapsed)
        return 'FALSE', code
    if elapsed is not None:
        return 'FALSE', str(elapsed)
    return 'FALSE', 'notstarted'


def fixture_goals(item: dict) -> tuple[int | None, int | None]:
    goals = item.get('goals') or {}
    score = item.get('score') or {}
    home = goals.get('home')
    away = goals.get('away')
    if home is None:
        home = (score.get('fulltime') or {}).get('home')
    if away is None:
        away = (score.get('fulltime') or {}).get('away')
    return home, away


def convert_fixture(item: dict, teams: dict[str, dict], matches: dict[tuple[str, str], dict]) -> dict | None:
    fixture = item.get('fixture') or {}
    teams_info = item.get('teams') or {}
    home_name = normalize_team_name((teams_info.get('home') or {}).get('name'))
    away_name = normalize_team_name((teams_info.get('away') or {}).get('name'))
    if not home_name or not away_name:
        return None

    home_team = teams.get(home_name.lower()) or {}
    away_team = teams.get(away_name.lower()) or {}
    match_meta = matches.get((home_name.lower(), away_name.lower()))

    stage, group_code = parse_stage((item.get('league') or {}).get('round'))
    if stage == 'group' and not group_code:
        group_code = home_team.get('groups') or away_team.get('groups')

    venue = fixture.get('venue') or {}
    stadium_id = guess_stadium_id(venue.get('name'), venue.get('city'))
    finished, elapsed = map_status(
        (fixture.get('status') or {}).get('short'),
        (fixture.get('status') or {}).get('elapsed'),
    )
    home_score, away_score = fixture_goals(item)
    if finished != 'TRUE':
        home_score = home_score if home_score is not None else 0
        away_score = away_score if away_score is not None else 0
    else:
        home_score = home_score if home_score is not None else 0
        away_score = away_score if away_score is not None else 0

    local_id = (match_meta or {}).get('id') or str(fixture.get('id') or '')

    return {
        'id': str(local_id),
        'home_team_id': str(home_team.get('id') or (teams_info.get('home') or {}).get('id') or ''),
        'away_team_id': str(away_team.get('id') or (teams_info.get('away') or {}).get('id') or ''),
        'home_score': str(home_score),
        'away_score': str(away_score),
        'home_scorers': 'null',
        'away_scorers': 'null',
        'group': group_code or (match_meta or {}).get('group') or 'KO',
        'matchday': parse_matchday((item.get('league') or {}).get('round')) or '',
        'local_date': utc_to_local_date(fixture.get('date', ''), stadium_id),
        'stadium_id': stadium_id,
        'finished': finished,
        'time_elapsed': elapsed,
        'type': stage,
        'home_team_name_en': home_name,
        'away_team_name_en': away_name,
        'apifootball_fixture_id': fixture.get('id'),
    }


def convert_standings(data: dict, teams: dict[str, dict]) -> list[dict]:
    groups = []
    for block in data.get('response') or []:
        for group_rows in (block.get('league') or {}).get('standings') or []:
            if not group_rows:
                continue
            group_name = (group_rows[0].get('group') or '').replace('Group ', '').strip()
            if not group_name:
                continue
            rows = []
            for row in group_rows:
                team_name = normalize_team_name((row.get('team') or {}).get('name'))
                team = teams.get(team_name.lower()) or {}
                all_stats = row.get('all') or {}
                rows.append({
                    'team_id': str(team.get('id') or (row.get('team') or {}).get('id') or ''),
                    'mp': str((row.get('all') or {}).get('played') or 0),
                    'w': str(all_stats.get('win') or 0),
                    'd': str(all_stats.get('draw') or 0),
                    'l': str(all_stats.get('lose') or 0),
                    'pts': str(row.get('points') or 0),
                    'gf': str((all_stats.get('goals') or {}).get('for') or 0),
                    'ga': str((all_stats.get('goals') or {}).get('against') or 0),
                    'gd': str(row.get('goalsDiff') or 0),
                })
            groups.append({'name': group_name, 'teams': rows})
    return groups


def player_display_name(player: dict) -> str:
    first = (player.get('firstname') or '').strip()
    last = (player.get('lastname') or '').strip()
    if first and last:
        return f'{first} {last}'
    return (player.get('name') or '').strip()


def convert_top_scorers(data: dict) -> list[dict]:
    scorers = []
    for item in data.get('response') or []:
        player = item.get('player') or {}
        stats_list = item.get('statistics') or []
        if not stats_list:
            continue
        stats = stats_list[0]
        goals = (stats.get('goals') or {}).get('total')
        if goals is None:
            continue
        team_name = normalize_team_name((stats.get('team') or {}).get('name'))
        assists = (stats.get('goals') or {}).get('assists')
        scorers.append({
            'playerEn': player_display_name(player),
            'teamEn': team_name,
            'goals': int(goals),
            'assists': int(assists or 0),
        })
    scorers.sort(key=lambda s: (-s['goals'], s['playerEn']))
    return scorers


def build_teams_list(teams_index: list[dict]) -> list[dict]:
    out = []
    for team in teams_index:
        out.append({
            'id': str(team['id']),
            'name_en': team['name_en'],
            'fifa_code': team.get('fifa_code', ''),
            'iso2': team.get('iso2', ''),
            'groups': team.get('groups', ''),
            'flag': f"https://flagcdn.com/w80/{str(team.get('iso2', '')).lower()}.png",
        })
    return out


def build_sync_payload(api_key: str) -> dict:
    teams_map = team_lookup()
    matches_map = match_lookup()
    q = urllib.parse.urlencode({'league': LEAGUE_ID, 'season': SEASON})

    fixtures_raw = fetch_api(f'/fixtures?{q}', api_key)
    standings_raw = fetch_api(f'/standings?{q}', api_key)
    scorers_raw = fetch_api(f'/players/topscorers?{q}', api_key)

    games = []
    for item in fixtures_raw.get('response') or []:
        converted = convert_fixture(item, teams_map, matches_map)
        if converted:
            games.append(converted)

    games.sort(key=lambda g: int(g['id']) if str(g['id']).isdigit() else 999)

    groups = convert_standings(standings_raw, teams_map)
    teams = build_teams_list(load_index()['teams'])
    scorers = convert_top_scorers(scorers_raw)
    finished_games = sum(1 for g in games if g.get('finished') == 'TRUE')

    return {
        'games': games,
        'groups': groups,
        'teams': teams,
        'scorers': scorers,
        'scorerFinishedGames': finished_games,
        'source': 'apifootball',
        'fromCache': False,
    }
