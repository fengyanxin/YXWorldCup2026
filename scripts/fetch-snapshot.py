#!/usr/bin/env python3
"""Netlify 构建时拉取最新数据，写入 sync-snapshot.js，加速首次加载。"""

import json
import os
import ssl
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

FALLBACK_API_BASE = 'https://worldcup26.ir'
FALLBACK_ENDPOINTS = {
    'games': '/get/games',
    'groups': '/get/groups',
    'teams': '/get/teams',
}
ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / 'scripts'
OUT = ROOT / 'js' / 'sync-snapshot.js'
SSL_CTX = ssl.create_default_context()

if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_dotenv(ROOT / '.env')


def get_apifootball_key() -> str:
    return (os.environ.get('APIFOOTBALL_KEY') or os.environ.get('API_FOOTBALL_KEY') or '').strip()


def normalize(key, raw):
    if key == 'games':
        return raw if isinstance(raw, list) else raw.get('games', raw)
    if key == 'groups':
        return raw if isinstance(raw, list) else raw.get('groups', raw)
    if key == 'teams':
        return raw if isinstance(raw, list) else raw.get('teams', raw)
    return raw


def fetch_fallback(key, path, timeout=30):
    url = f'{FALLBACK_API_BASE}{path}'
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'worldcup-2026-build/1.0', 'Accept': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return key, normalize(key, json.loads(resp.read()))


def fetch_apifootball():
    from apifootball_adapter import build_sync_payload

    return build_sync_payload(get_apifootball_key())


def main():
    payload = None
    errors = []

    if get_apifootball_key():
        try:
            payload = fetch_apifootball()
            print('fetch-snapshot: API-Football OK')
        except Exception as exc:
            err = str(exc)
            if 'Free plans do not have access' in err:
                print('fetch-snapshot: API-Football free plan skips 2026 season', file=sys.stderr)
            else:
                errors.append(f'apifootball: {exc}')
                print('fetch-snapshot: API-Football failed:', exc, file=sys.stderr)

    if payload is None:
        results = {}
        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = [pool.submit(fetch_fallback, key, path) for key, path in FALLBACK_ENDPOINTS.items()]
            for future in as_completed(futures):
                try:
                    key, data = future.result()
                    results[key] = data
                except Exception as exc:
                    errors.append(str(exc))

        if errors and len(results) < len(FALLBACK_ENDPOINTS):
            print('fetch-snapshot: partial failure:', '; '.join(errors), file=sys.stderr)
            if not results:
                print('fetch-snapshot: keeping existing snapshot', file=sys.stderr)
                return

        payload = {
            'games': results.get('games', []),
            'groups': results.get('groups', []),
            'teams': results.get('teams', []),
            'source': 'worldcup26.ir',
            'fromCache': False,
        }

    payload['syncedAt'] = int(time.time() * 1000)
    payload['fromCache'] = False
    # 构建快照不写入射手榜，避免覆盖实时 topscorers
    payload.pop('scorers', None)

    build_id = payload['syncedAt']
    build_meta = ROOT / 'js' / 'build-meta.js'
    build_meta.write_text(
        f"window.__BUILD_ID__='{build_id}';\n",
        encoding='utf-8',
    )

    OUT.write_text(
        f"window.__BUILD_ID__='{build_id}';\n"
        'window.__SYNC_SNAPSHOT__ = '
        + json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
        + ';\n',
        encoding='utf-8',
    )
    print(
        f'fetch-snapshot: wrote {OUT} ({len(payload["games"])} games, source={payload.get("source", "?")}), build {build_id}'
    )


if __name__ == '__main__':
    main()
