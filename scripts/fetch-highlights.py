#!/usr/bin/env python3
"""抓取多平台世界杯集锦元数据，写入 data/highlights.json 与 js/highlights-snapshot.js"""

from __future__ import annotations

import json
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEEDS_PATH = ROOT / 'scripts' / 'highlights-seeds.json'
OUT_JSON = ROOT / 'data' / 'highlights.json'
OUT_JS = ROOT / 'js' / 'highlights-snapshot.js'

SSL_CTX = ssl.create_default_context()
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) worldcup-2026-highlights/1.0',
    'Referer': 'https://www.bilibili.com',
    'Accept': 'application/json',
}

SEARCH_KEYWORDS = [
    '2026世界杯集锦',
    '美加墨世界杯 进球',
    '世界杯 德国 库拉索',
    '世界杯 英格兰 克罗地亚',
    '世界杯 墨西哥 揭幕',
    '世界杯 阿根廷 2026',
    '世界杯 荷兰 日本',
    '夏奇拉 世界杯 Dai Dai',
    '2026世界杯 全场精华',
    '世界杯 冷门 2026',
]

INCLUDE_HINTS = (
    '世界杯', '足球', 'FIFA', '美加墨', '进球', '集锦', '精华', '开幕', '揭幕',
    '德国', '阿根廷', '墨西哥', '英格兰', '法国', '巴西', '葡萄牙', '荷兰',
    '克罗地亚', '日本', '库拉索', '夏奇拉', 'dai dai', '点球', '门将', '爆冷',
)
EXCLUDE_HINTS = (
    '电竞', 'LPL', 'LCK', 'LEC', '王者荣耀', '王楚钦', '乒乓球', '羽毛球',
    'AL vs', 'BLG vs', 'JDG vs', 'TES vs', 'WE vs', '篮球', 'NBA', 'CBA',
)


def http_json(url: str, timeout: int = 20) -> dict:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return json.loads(resp.read())


def strip_html(text: str) -> str:
    return re.sub(r'<[^>]+>', '', text or '').strip()


def normalize_cover_url(url: str) -> str:
    url = (url or '').strip()
    if not url:
        return ''
    url = url.replace('http://', 'https://')
    if url.startswith('//'):
        url = f'https:{url}'
    if 'hdslb.com' in url and '@' not in url.rsplit('/', 1)[-1]:
        url = f'{url}@672w_378h.jpg'
    return url


def fetch_page_html(url: str, timeout: int = 15) -> str:
    req = urllib.request.Request(url, headers={**HEADERS, 'Accept': 'text/html,application/xhtml+xml'})
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return resp.read().decode('utf-8', errors='ignore')


def fetch_og_image(url: str) -> str:
    try:
        html = fetch_page_html(url)
    except Exception:
        return ''
    for pattern in (
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)',
    ):
        match = re.search(pattern, html, re.I)
        if match:
            return normalize_cover_url(match.group(1))
    return ''


def fetch_cctv_cover(url: str) -> str:
    try:
        html = fetch_page_html(url)
    except Exception:
        return ''
    for key in ('commentimg2', 'commentimg3', 'commentimg1'):
        match = re.search(rf'var {key}="([^"]+)"', html)
        if match:
            return normalize_cover_url(match.group(1))
    return fetch_og_image(url)


def fetch_external_cover(page_url: str, platform: str = '') -> str:
    if not page_url:
        return ''
    if 'cctv.com' in page_url or 'cctvpic.com' in page_url:
        return fetch_cctv_cover(page_url)
    return fetch_og_image(page_url)


def format_duration(seconds: int) -> str:
    seconds = max(0, int(seconds or 0))
    m, s = divmod(seconds, 60)
    if m >= 60:
        h, m = divmod(m, 60)
        return f'{h}:{m:02d}:{s:02d}'
    return f'{m}:{s:02d}'


def format_views(n) -> str:
    try:
        n = int(n)
    except (TypeError, ValueError):
        return '—'
    if n >= 100_000_000:
        return f'{n / 100_000_000:.1f}亿'
    if n >= 10_000:
        return f'{n / 10_000:.1f}万'
    if n >= 1000:
        return f'{n / 1000:.1f}K'
    return str(n)


def detect_category(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ('进球', '破门', '世界波', '帽子', 'goal')):
        return 'goal'
    if any(k in t for k in ('扑救', '门将', '神扑', 'save')):
        return 'save'
    if any(k in t for k in ('冷门', '爆冷', ' upset', '逆转')):
        return 'upset'
    return 'classic'


def is_relevant(title: str) -> bool:
    t = title.lower()
    if any(x.lower() in t for x in EXCLUDE_HINTS):
        return False
    if '世界杯' in title or 'fifa' in t or '美加墨' in title:
        return True
    return any(h.lower() in t for h in INCLUDE_HINTS)


def search_bilibili(keyword: str, page_size: int = 15) -> list[dict]:
    q = urllib.parse.quote(keyword)
    url = (
        'https://api.bilibili.com/x/web-interface/wbi/search/type'
        f'?search_type=video&keyword={q}&page=1&page_size={page_size}&order=click'
    )
    data = http_json(url)
    rows = []
    for item in data.get('data', {}).get('result', []) or []:
        if item.get('type') != 'video':
            continue
        title = strip_html(item.get('title', ''))
        if not title or not is_relevant(title):
            continue
        rows.append(
            {
                'bvid': item['bvid'],
                'aid': item['aid'],
                'title': title,
                'author': item.get('author', ''),
                'cover': normalize_cover_url(item.get('pic') or ''),
                'views': item.get('play', 0),
            }
        )
    return rows


def fetch_bilibili_view(bvid: str) -> dict:
    data = http_json(f'https://api.bilibili.com/x/web-interface/view?bvid={bvid}')['data']
    return {
        'cid': data['cid'],
        'cover': normalize_cover_url(data.get('pic') or ''),
        'durationSec': int(data.get('duration') or 0),
        'title': data.get('title') or '',
        'author': (data.get('owner') or {}).get('name') or '',
        'views': (data.get('stat') or {}).get('view', 0),
    }


def normalize_bilibili(raw: dict) -> dict:
    bvid = raw['bvid']
    return {
        'platform': 'bilibili',
        'platformLabel': 'B站',
        'playMode': 'embed',
        'bvid': bvid,
        'aid': raw.get('aid'),
        'cid': raw.get('cid'),
        'title': raw.get('title') or '',
        'author': raw.get('author') or '',
        'cover': normalize_cover_url(raw.get('cover') or ''),
        'pageUrl': f'https://www.bilibili.com/video/{bvid}/',
        'duration': format_duration(raw.get('durationSec') or 0),
        'durationSec': raw.get('durationSec') or 0,
        'views': format_views(raw.get('views')),
        'category': detect_category(raw.get('title') or ''),
        'tags': ['B站', '2026世界杯'],
        'matchLabel': '世界杯集锦',
    }


def enrich_seed(seed: dict) -> dict:
    item = normalize_seed(seed)

    if seed.get('bvid'):
        try:
            meta = fetch_bilibili_view(seed['bvid'])
            item['cid'] = meta['cid']
            item['cover'] = meta['cover']
            item['durationSec'] = meta['durationSec']
            item['duration'] = format_duration(meta['durationSec'])
            item['author'] = meta['author'] or item['author']
            if meta.get('views'):
                item['views'] = format_views(meta['views'])
            if meta.get('title'):
                item['title'] = meta['title']
        except Exception as exc:
            print(f'fetch-highlights: seed bvid failed [{seed["bvid"]}]: {exc}', file=sys.stderr)
    elif seed.get('pageUrl'):
        cover = fetch_external_cover(seed['pageUrl'], seed.get('platform', ''))
        if cover:
            item['cover'] = cover

    return item


def normalize_seed(seed: dict) -> dict:
    platform = seed['platform']
    item = {
        'platform': platform,
        'platformLabel': seed.get('platformLabel') or platform,
        'playMode': 'embed' if platform == 'bilibili' and seed.get('bvid') else 'external',
        'title': seed['title'],
        'author': seed.get('author') or seed.get('platformLabel') or platform,
        'cover': normalize_cover_url(seed.get('cover') or ''),
        'pageUrl': seed['pageUrl'],
        'duration': format_duration(seed.get('durationSec') or 0) if seed.get('durationSec') else '—',
        'durationSec': seed.get('durationSec') or 0,
        'views': seed.get('views') or '官方',
        'category': seed.get('category') or detect_category(seed['title']),
        'tags': seed.get('tags') or [seed.get('platformLabel', platform)],
        'matchLabel': seed.get('matchLabel') or '世界杯',
    }
    if seed.get('bvid'):
        item['bvid'] = seed['bvid']
        item['aid'] = seed.get('aid')
        item['cid'] = seed.get('cid')
        item['pageUrl'] = seed.get('pageUrl') or f"https://www.bilibili.com/video/{seed['bvid']}/"
    return item


def fetch_bilibili_pool() -> list[dict]:
    seen: set[str] = set()
    pool: list[dict] = []

    for kw in SEARCH_KEYWORDS:
        try:
            hits = search_bilibili(kw)
        except Exception as exc:
            print(f'fetch-highlights: search failed [{kw}]: {exc}', file=sys.stderr)
            continue

        for hit in hits:
            bvid = hit['bvid']
            if bvid in seen:
                continue
            seen.add(bvid)
            try:
                meta = fetch_bilibili_view(bvid)
                merged = {**hit, **meta}
                if merged.get('title') and not is_relevant(merged['title']):
                    continue
                pool.append(normalize_bilibili(merged))
            except Exception as exc:
                print(f'fetch-highlights: view failed [{bvid}]: {exc}', file=sys.stderr)
            time.sleep(0.12)

        if len(pool) >= 60:
            break

    return pool[:80]


def build_payload() -> dict:
    seeds = json.loads(SEEDS_PATH.read_text(encoding='utf-8'))
    items: list[dict] = []
    seen_urls: set[str] = set()

    for seed in seeds:
        item = enrich_seed(seed)
        key = item.get('pageUrl') or item.get('bvid')
        if key in seen_urls:
            continue
        seen_urls.add(key)
        items.append(item)

    for item in fetch_bilibili_pool():
        key = item.get('bvid') or item.get('pageUrl')
        if key in seen_urls:
            continue
        seen_urls.add(key)
        items.append(item)

    for idx, item in enumerate(items, start=1):
        item['id'] = idx

    platforms = {}
    for item in items:
        p = item['platform']
        platforms[p] = platforms.get(p, 0) + 1

    return {
        'items': items,
        'total': len(items),
        'platforms': platforms,
        'fetchedAt': int(time.time() * 1000),
        'sources': ['bilibili', 'douyin', 'xiaohongshu', 'migu', 'yangshipin'],
    }


def main() -> None:
    payload = build_payload()
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    OUT_JS.write_text(
        'window.__HIGHLIGHTS_SNAPSHOT__ = '
        + json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
        + ';\n',
        encoding='utf-8',
    )
    print(
        f"fetch-highlights: wrote {len(payload['items'])} items → {OUT_JSON.name}, {OUT_JS.name}"
    )
    print('fetch-highlights: platforms', payload['platforms'])


if __name__ == '__main__':
    main()
