"""wcup2026.org 公开 API — 主要用于射手榜（标准英文球员名）"""

import json
import ssl
import urllib.request

SCORERS_URL = 'https://wcup2026.org/api/data.php?action=scorers'
SSL_CTX = ssl.create_default_context()


def fetch_scorers(timeout=25) -> list[dict]:
    req = urllib.request.Request(
        SCORERS_URL,
        headers={'User-Agent': 'worldcup-2026/1.0', 'Accept': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        data = json.loads(resp.read())

    if not data.get('ok'):
        raise RuntimeError(data.get('error') or 'wcup2026 scorers failed')

    scorers = []
    for row in data.get('scorers') or []:
        goals = row.get('goals')
        if goals is None:
            continue
        scorers.append({
            'playerEn': (row.get('name') or '').strip(),
            'teamEn': (row.get('team') or '').strip(),
            'goals': int(goals),
            'assists': int(row.get('assists') or 0),
        })

    scorers.sort(key=lambda s: (-s['goals'], s['playerEn']))
    return scorers


def attach_scorers(payload: dict) -> dict:
    try:
        payload['scorers'] = fetch_scorers()
        payload['scorersSource'] = 'wcup2026.org'
    except Exception as exc:
        payload['scorersWarning'] = str(exc)
    return payload
