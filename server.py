#!/usr/bin/env python3
"""静态站点 + 世界杯实时数据 API 代理（解决浏览器 CORS 限制）"""

import json
import os
import ssl
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PORT = 8765
ROOT = os.path.dirname(os.path.abspath(__file__))
API_BASE = 'https://worldcup26.ir'
ALLOWED_API_PREFIXES = ('/get/games', '/get/groups', '/get/teams', '/get/stadiums', '/get/game/')
SYNC_ENDPOINTS = ('/get/games', '/get/groups', '/get/teams')
SYNC_CACHE_TTL = 60

SYNC_CACHE = {'payload': None, 'ts': 0.0}
SYNC_LOCK = threading.Lock()
SSL_CTX = ssl.create_default_context()


def normalize_api_payload(endpoint, raw):
    if endpoint.endswith('/get/games'):
        return raw if isinstance(raw, list) else raw.get('games', raw)
    if endpoint.endswith('/get/groups'):
        return raw if isinstance(raw, list) else raw.get('groups', raw)
    if endpoint.endswith('/get/teams'):
        return raw if isinstance(raw, list) else raw.get('teams', raw)
    return raw


def fetch_upstream_json(endpoint, timeout=25):
    url = f'{API_BASE}{endpoint}'
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'worldcup-2026-local/1.0', 'Accept': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return normalize_api_payload(endpoint, json.loads(resp.read()))


def build_sync_payload(force=False):
    now = time.time()
    with SYNC_LOCK:
        cached = SYNC_CACHE['payload']
        if not force and cached and now - SYNC_CACHE['ts'] < SYNC_CACHE_TTL:
            return {**cached, 'fromCache': True}, True

    results = {}
    errors = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(fetch_upstream_json, ep): ep for ep in SYNC_ENDPOINTS}
        for future in as_completed(futures):
            endpoint = futures[future]
            key = endpoint.rsplit('/', 1)[-1]
            try:
                results[key] = future.result()
            except Exception as exc:
                errors.append(f'{key}: {exc}')

    if errors:
        raise RuntimeError('; '.join(errors))
    if len(results) != len(SYNC_ENDPOINTS):
        raise RuntimeError('sync incomplete')

    payload = {
        'games': results['games'],
        'groups': results['groups'],
        'teams': results['teams'],
        'syncedAt': int(now * 1000),
        'fromCache': False,
    }

    with SYNC_LOCK:
        SYNC_CACHE['payload'] = payload
        SYNC_CACHE['ts'] = now

    return payload, False


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        if not self.path.startswith('/api/sync'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/sync':
            self.proxy_sync(parsed.query)
            return
        if parsed.path.startswith('/api/'):
            self.proxy_api(parsed.path[4:] + (f'?{parsed.query}' if parsed.query else ''))
            return
        super().do_GET()

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

        url = f'{API_BASE}{endpoint}'
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
    print(f'🏆 世界杯站点: http://127.0.0.1:{PORT}')
    print(f'📡 聚合同步: http://127.0.0.1:{PORT}/api/sync')
    server.serve_forever()
