#!/usr/bin/env python3
"""静态站点 + 世界杯实时数据 API 代理（解决浏览器 CORS 限制）"""

import json
import os
import ssl
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

PORT = 8765
ROOT = Path(__file__).resolve().parent
SCRIPTS = ROOT / 'scripts'
HIGHLIGHTS_JSON = ROOT / 'data' / 'highlights.json'
FALLBACK_API_BASE = 'https://worldcup26.ir'
ALLOWED_API_PREFIXES = ('/get/games', '/get/groups', '/get/teams', '/get/stadiums', '/get/game/')
FALLBACK_SYNC_ENDPOINTS = ('/get/games', '/get/groups', '/get/teams')
SYNC_CACHE_TTL = 90

SYNC_CACHE = {'payload': None, 'ts': 0.0}
SYNC_LOCK = threading.Lock()
SSL_CTX = ssl.create_default_context()
APIFOOTBALL_PLAN_BLOCKED_UNTIL = 0.0

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


def is_apifootball_plan_error(message: str) -> bool:
    lower = (message or '').lower()
    return 'free plans do not have access' in lower or 'try from 2022 to 2024' in lower


def count_finished_games(games) -> int:
    total = 0
    for game in games or []:
        if game.get('finished') == 'TRUE':
            total += 1
            continue
        if str(game.get('time_elapsed') or '').lower() == 'finished':
            total += 1
    return total


def normalize_fallback_payload(endpoint, raw):
    if endpoint.endswith('/get/games'):
        return raw if isinstance(raw, list) else raw.get('games', raw)
    if endpoint.endswith('/get/groups'):
        return raw if isinstance(raw, list) else raw.get('groups', raw)
    if endpoint.endswith('/get/teams'):
        return raw if isinstance(raw, list) else raw.get('teams', raw)
    return raw


def fetch_fallback_json(endpoint, timeout=25):
    url = f'{FALLBACK_API_BASE}{endpoint}'
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'worldcup-2026-local/1.0', 'Accept': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return normalize_fallback_payload(endpoint, json.loads(resp.read()))


def build_fallback_sync_payload():
    results = {}
    errors = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(fetch_fallback_json, ep): ep for ep in FALLBACK_SYNC_ENDPOINTS}
        for future in as_completed(futures):
            endpoint = futures[future]
            key = endpoint.rsplit('/', 1)[-1]
            try:
                results[key] = future.result()
            except Exception as exc:
                errors.append(f'{key}: {exc}')

    if errors:
        raise RuntimeError('; '.join(errors))
    if len(results) != len(FALLBACK_SYNC_ENDPOINTS):
        raise RuntimeError('sync incomplete')

    return {
        'games': results['games'],
        'groups': results['groups'],
        'teams': results['teams'],
        'source': 'worldcup26.ir',
        'fromCache': False,
    }


def build_sync_payload(force=False):
    global APIFOOTBALL_PLAN_BLOCKED_UNTIL
    now = time.time()
    with SYNC_LOCK:
        cached = SYNC_CACHE['payload']
        if not force and cached and now - SYNC_CACHE['ts'] < SYNC_CACHE_TTL:
            return {**cached, 'fromCache': True}, True

    api_key = get_apifootball_key()
    payload = None
    sync_error = None
    fallback_reason = None

    if api_key and now >= APIFOOTBALL_PLAN_BLOCKED_UNTIL:
        try:
            from apifootball_adapter import build_sync_payload as build_apifootball_payload

            payload = build_apifootball_payload(api_key)
        except Exception as exc:
            sync_error = str(exc)
            if is_apifootball_plan_error(sync_error):
                fallback_reason = 'apifootball_plan'
                APIFOOTBALL_PLAN_BLOCKED_UNTIL = now + 86400
            else:
                fallback_reason = 'apifootball_error'
    elif api_key:
        fallback_reason = 'apifootball_plan'

    if payload is None:
        from wcup2026_adapter import attach_scorers

        payload = build_fallback_sync_payload()
        payload['scorerFinishedGames'] = count_finished_games(payload.get('games'))
        attach_scorers(payload)
        if fallback_reason or sync_error:
            payload['fallback'] = True
            payload['fallbackReason'] = fallback_reason or 'apifootball_error'
            if fallback_reason != 'apifootball_plan':
                payload['syncError'] = sync_error

    payload['syncedAt'] = int(now * 1000)
    payload['fromCache'] = False

    with SYNC_LOCK:
        SYNC_CACHE['payload'] = payload
        SYNC_CACHE['ts'] = now

    return payload, False


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        if not self.path.startswith('/api/sync'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/sync':
            self.proxy_sync(parsed.query)
            return
        if parsed.path == '/api/highlights':
            self.serve_highlights()
            return
        if parsed.path.startswith('/api/'):
            self.proxy_api(parsed.path[4:] + (f'?{parsed.query}' if parsed.query else ''))
            return
        super().do_GET()

    def serve_highlights(self):
        try:
            with open(HIGHLIGHTS_JSON, encoding='utf-8') as f:
                body = f.read().encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
        except FileNotFoundError:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'highlights.json not found'}, ensure_ascii=False).encode())
        except Exception as exc:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(exc)}, ensure_ascii=False).encode())

    def proxy_sync(self, query_string=''):
        force = parse_qs(query_string).get('force', ['0'])[0] in ('1', 'true', 'yes')
        try:
            payload, _ = build_sync_payload(force=force)
            body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(exc)}, ensure_ascii=False).encode())

    def proxy_api(self, endpoint):
        endpoint_path = endpoint.split('?', 1)[0]
        if not any(endpoint_path.startswith(p) for p in ALLOWED_API_PREFIXES):
            self.send_error(404, 'API route not allowed')
            return

        url = f'{FALLBACK_API_BASE}{endpoint}'
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'worldcup-2026-local/1.0', 'Accept': 'application/json'},
        )
        try:
            with urllib.request.urlopen(req, timeout=25, context=SSL_CTX) as resp:
                body = resp.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())


if __name__ == '__main__':
    os.chdir(ROOT)
    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    source = 'worldcup26.ir + wcup2026.org' if get_apifootball_key() else 'worldcup26.ir'
    if get_apifootball_key():
        source += ' (API-Football 免费版不含 2026，已自动备用)'
    print(f'🏆 世界杯站点: http://127.0.0.1:{PORT}')
    print(f'📡 聚合同步: http://127.0.0.1:{PORT}/api/sync  [{source}]')
    server.serve_forever()
