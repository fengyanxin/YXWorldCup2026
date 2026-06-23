#!/usr/bin/env python3
"""构建时下载首页主题曲 MV 到本地 assets/video/，供 Safari 与离线播放。"""

from __future__ import annotations

import json
import ssl
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / 'assets' / 'video'
OUT_FILE = OUT_DIR / 'anthem-dai-dai.mp4'
META_JS = ROOT / 'js' / 'anthem-video-meta.js'

BVid = 'BV1J2VW6KEt6'
CID = 38679875570
QN = 80  # 1080P
SSL_CTX = ssl.create_default_context()
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) worldcup-2026-anthem/1.0',
    'Referer': 'https://www.bilibili.com',
}


def http_json(url: str, timeout: int = 25) -> dict:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return json.loads(resp.read())


def resolve_download_url() -> tuple[str, int, str]:
    view = http_json(f'https://api.bilibili.com/x/web-interface/view?bvid={BVid}')['data']
    cid = view.get('cid') or CID
    play = http_json(
        f'https://api.bilibili.com/x/player/playurl?bvid={BVid}&cid={cid}&qn={QN}&fnval=1&fourk=1'
    )
    durl = (play.get('data') or {}).get('durl') or []
    if not durl:
        raise RuntimeError('playurl 未返回 durl 流')
    item = durl[0]
    return item['url'], int(item.get('size') or 0), view.get('title') or 'Dai Dai'


def download_file(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as resp, dest.open('wb') as out:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)


def write_meta(available: bool, **extra) -> None:
    payload = {
        'available': available,
        'src': 'assets/video/anthem-dai-dai.mp4',
        'quality': '1080P',
        'title': 'Dai Dai',
        'fetchedAt': int(time.time() * 1000),
        **extra,
    }
    META_JS.write_text(
        'window.__ANTHEM_LOCAL_VIDEO__ = '
        + json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
        + ';\n',
        encoding='utf-8',
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        url, size_hint, title = resolve_download_url()
        print(f'fetch-anthem-video: downloading 1080P (~{size_hint // (1024 * 1024)}MB)…')
        download_file(url, OUT_FILE)
        actual = OUT_FILE.stat().st_size
        write_meta(True, bytes=actual, title=title)
        print(f'fetch-anthem-video: wrote {OUT_FILE} ({actual // 1024}KB) + {META_JS.name}')
    except Exception as exc:
        print(f'fetch-anthem-video: failed: {exc}', file=sys.stderr)
        write_meta(False, error=str(exc))
        if OUT_FILE.exists():
            print('fetch-anthem-video: keeping existing mp4', file=sys.stderr)
            write_meta(True, bytes=OUT_FILE.stat().st_size, note='cached')
        else:
            sys.exit(1)


if __name__ == '__main__':
    main()
