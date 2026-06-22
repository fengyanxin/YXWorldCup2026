#!/usr/bin/env python3
"""Netlify 构建时拉取最新数据，写入 sync-snapshot.js，加速首次加载。"""

import json
import ssl
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

API_BASE = 'https://worldcup26.ir'
ENDPOINTS = {
    'games': '/get/games',
    'groups': '/get/groups',
    'teams': '/get/teams',
}
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'js' / 'sync-snapshot.js'
SSL_CTX = ssl.create_default_context()


def normalize(key, raw):
    if key == 'games':
        return raw if isinstance(raw, list) else raw.get('games', raw)
    if key == 'groups':
        return raw if isinstance(raw, list) else raw.get('groups', raw)
    if key == 'teams':
        return raw if isinstance(raw, list) else raw.get('teams', raw)
    return raw


def fetch(key, path, timeout=30):
    url = f'{API_BASE}{path}'
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'worldcup-2026-build/1.0', 'Accept': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return key, normalize(key, json.loads(resp.read()))


def main():
    results = {}
    errors = []

    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(fetch, key, path) for key, path in ENDPOINTS.items()]
        for future in as_completed(futures):
            try:
                key, data = future.result()
                results[key] = data
            except Exception as exc:
                errors.append(str(exc))

    if errors and len(results) < len(ENDPOINTS):
        print('fetch-snapshot: partial failure:', '; '.join(errors), file=sys.stderr)
        if not results:
            print('fetch-snapshot: keeping existing snapshot', file=sys.stderr)
            return

    payload = {
        'games': results.get('games', []),
        'groups': results.get('groups', []),
        'teams': results.get('teams', []),
        'syncedAt': int(time.time() * 1000),
        'fromCache': False,
    }

    OUT.write_text(
        'window.__SYNC_SNAPSHOT__ = '
        + json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
        + ';\n',
        encoding='utf-8',
    )
    print(f'fetch-snapshot: wrote {OUT} ({len(payload["games"])} games)')


if __name__ == '__main__':
    main()
