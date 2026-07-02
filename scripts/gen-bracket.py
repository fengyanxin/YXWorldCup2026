#!/usr/bin/env python3
"""Generate World Cup knockout prediction bracket PNG."""

import json
import re
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path("/Users/hepeng/Desktop/2026世界杯淘汰赛预测.png")
SNAPSHOT = Path(__file__).resolve().parents[1] / "js" / "sync-snapshot.js"
FLAG_CACHE = Path("/tmp/wc_flags")
FLAG_CACHE.mkdir(exist_ok=True)

W, H = 5400, 3600

BG = (128, 162, 198)
HEADER_BG = (255, 255, 255)
HEADER_BORDER = (90, 125, 165)
NODE_BG = (255, 255, 255)
NODE_BORDER = (160, 180, 200)
ROW_WIN_BG = (228, 242, 235)
LINE = (90, 125, 165)
TEXT_DIM = (55, 68, 88)
TEXT_WIN = (0, 75, 45)
SCORE = (210, 45, 25)
SCORE_PENS = (80, 100, 130)   # 点球比分：蓝灰色，与常规比分区分
TITLE = (15, 45, 85)
SUBTITLE = (55, 85, 125)
LABEL = (40, 70, 110)
FINAL_BG = (255, 255, 255)
FINAL_BORDER = (210, 45, 25)
CHAMP_BG = (255, 255, 255)
CHAMP_BORDER = (0, 95, 58)

FONT_PATHS = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
]

TEAMS = {
    "南非": "za", "加拿大": "ca", "德国": "de", "巴拉圭": "py",
    "荷兰": "nl", "摩洛哥": "ma", "巴西": "br", "日本": "jp",
    "法国": "fr", "瑞典": "se", "科特迪瓦": "ci", "挪威": "no",
    "墨西哥": "mx", "厄瓜多尔": "ec", "英格兰": "gb-eng", "刚果": "cd",
    "美国": "us", "波黑": "ba", "比利时": "be", "塞内加尔": "sn",
    "葡萄牙": "pt", "克罗地亚": "hr", "西班牙": "es", "奥地利": "at",
    "瑞士": "ch", "阿尔及利亚": "dz", "阿根廷": "ar", "佛得角": "cv",
    "哥伦比亚": "co", "加纳": "gh", "澳大利亚": "au", "埃及": "eg",
}

EN_ZH = {
    "South Africa": "南非", "Canada": "加拿大", "Germany": "德国", "Paraguay": "巴拉圭",
    "Netherlands": "荷兰", "Morocco": "摩洛哥", "Brazil": "巴西", "Japan": "日本",
    "France": "法国", "Sweden": "瑞典", "Ivory Coast": "科特迪瓦", "Norway": "挪威",
    "Mexico": "墨西哥", "Ecuador": "厄瓜多尔", "England": "英格兰",
    "Democratic Republic of the Congo": "刚果", "United States": "美国",
    "Bosnia and Herzegovina": "波黑", "Belgium": "比利时", "Senegal": "塞内加尔",
    "Portugal": "葡萄牙", "Croatia": "克罗地亚", "Spain": "西班牙", "Austria": "奥地利",
    "Switzerland": "瑞士", "Algeria": "阿尔及利亚", "Argentina": "阿根廷",
    "Cape Verde": "佛得角", "Colombia": "哥伦比亚", "Ghana": "加纳",
    "Australia": "澳大利亚", "Egypt": "埃及",
}

# (主队, 客队, 胜者, 常规比分, 点球比分或 None)
P = {
    73: ("南非", "加拿大", "加拿大", "0-1", None),
    74: ("德国", "巴拉圭", "巴拉圭", "1-1", "3-4"),
    75: ("荷兰", "摩洛哥", "摩洛哥", "1-1", "2-3"),
    76: ("巴西", "日本", "巴西", "2-1", None),
    77: ("法国", "瑞典", "法国", "2-0", None),
    78: ("科特迪瓦", "挪威", "挪威", "1-2", None),
    79: ("墨西哥", "厄瓜多尔", "墨西哥", "2-1", None),
    80: ("英格兰", "刚果", "英格兰", "2-0", None),
    81: ("美国", "波黑", "美国", "2-1", None),
    82: ("比利时", "塞内加尔", "塞内加尔", "1-2", None),
    83: ("葡萄牙", "克罗地亚", "葡萄牙", "2-1", None),
    84: ("西班牙", "奥地利", "西班牙", "2-0", None),
    85: ("瑞士", "阿尔及利亚", "瑞士", "2-0", None),
    86: ("阿根廷", "佛得角", "阿根廷", "3-0", None),
    87: ("哥伦比亚", "加纳", "哥伦比亚", "2-0", None),
    88: ("澳大利亚", "埃及", "埃及", "0-1", None),
    89: ("巴拉圭", "法国", "法国", "0-3", None),
    90: ("加拿大", "摩洛哥", "摩洛哥", "1-2", None),
    91: ("巴西", "挪威", "巴西", "2-1", None),
    92: ("墨西哥", "英格兰", "英格兰", "1-2", None),
    93: ("葡萄牙", "西班牙", "西班牙", "1-2", None),
    94: ("美国", "塞内加尔", "美国", "2-1", None),
    95: ("阿根廷", "埃及", "阿根廷", "3-0", None),
    96: ("瑞士", "哥伦比亚", "哥伦比亚", "0-2", None),
    97: ("法国", "摩洛哥", "法国", "2-1", None),
    98: ("西班牙", "美国", "西班牙", "2-0", None),
    99: ("巴西", "英格兰", "巴西", "2-1", None),
    100: ("阿根廷", "哥伦比亚", "阿根廷", "2-1", None),
    101: ("法国", "西班牙", "法国", "2-1", None),
    102: ("巴西", "阿根廷", "阿根廷", "2-1", None),
    104: ("法国", "阿根廷", "阿根廷", "2-1", None),
}

LEFT_PAIRS = [(73, 75, 90), (74, 77, 89), (76, 78, 91), (79, 80, 92)]
LEFT_QF = [(90, 89, 97), (91, 92, 98)]
LEFT_SF = (97, 98, 101)

RIGHT_PAIRS = [(81, 82, 94), (83, 84, 93), (86, 88, 95), (85, 87, 96)]
RIGHT_QF = [(94, 93, 99), (95, 96, 100)]
RIGHT_SF = (99, 100, 102)

NODE_W = 540
NODE_H = 132
FLAG_SZ = 54
FLAG_SZ_FINAL = 68
FLAG_GAP = 14
PAD = 14
LINE_W = 4
SCORE_COL = 102


def match_info(match_id):
    row = P[match_id]
    pens = row[4] if len(row) > 4 else None
    return row[0], row[1], row[2], row[3], pens


def merge_live_results():
    """用 sync-snapshot 覆盖已结束的淘汰赛比分（含点球）。"""
    if not SNAPSHOT.exists():
        return
    text = SNAPSHOT.read_text(encoding="utf-8")
    m = re.search(r"window\.__SYNC_SNAPSHOT__\s*=\s*(\{.*\});", text, re.DOTALL)
    if not m:
        return
    data = json.loads(m.group(1))
    for g in data.get("games", []):
        if g.get("type") == "group" or g.get("finished") != "TRUE":
            continue
        mid = int(g["id"])
        if mid not in P:
            continue
        home_en = g.get("home_team_name_en") or ""
        away_en = g.get("away_team_name_en") or ""
        home = EN_ZH.get(home_en, P[mid][0])
        away = EN_ZH.get(away_en, P[mid][1])
        hs, aws = g.get("home_score"), g.get("away_score")
        if hs in (None, "null") or aws in (None, "null"):
            continue
        score = f"{hs}-{aws}"
        hp, ap = g.get("home_penalty_score"), g.get("away_penalty_score")
        pens = None
        if hp not in (None, "null") and ap not in (None, "null"):
            pens = f"{hp}-{ap}"
        if pens and hs == aws:
            winner = home if int(hp) > int(ap) else away
        elif int(hs) > int(aws):
            winner = home
        elif int(aws) > int(hs):
            winner = away
        else:
            winner = P[mid][2]
        P[mid] = (home, away, winner, score, pens)


def draw_score_block(draw, scx, cy, score, pens, fonts, anchor="rm"):
    f_score, f_pens = fonts["score"], fonts["score_pens"]
    if pens:
        y_main, y_pens = cy - 14, cy + 16
        draw_bold_text(draw, (scx, y_main), score, SCORE, f_score, anchor=anchor)
        draw_bold_text(draw, (scx, y_pens), f"({pens})", SCORE_PENS, f_pens, anchor=anchor)
    else:
        draw_bold_text(draw, (scx, cy), score, SCORE, f_score, anchor=anchor)


def load_font(size, bold=False):
    for p in FONT_PATHS:
        try:
            return ImageFont.truetype(p, size, index=1 if bold else 0)
        except OSError:
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


def fetch_flag(code: str, size: int) -> Image.Image:
    path = FLAG_CACHE / f"{code}_{size}.png"
    if not path.exists():
        url = f"https://flagcdn.com/w320/{code}.png"
        req = urllib.request.Request(url, headers={"User-Agent": "wc-bracket/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            path.write_bytes(r.read())
    img = Image.open(path).convert("RGBA")
    h = int(size * img.height / img.width)
    return img.resize((size, h), Image.Resampling.LANCZOS)


def draw_bold_text(draw, pos, text, fill, font, anchor="lm"):
    x, y = pos
    if anchor == "rm":
        for dx in (0, 1, 2):
            draw.text((x - dx, y), text, fill=fill, font=font, anchor=anchor)
    elif anchor == "mm":
        for dx, dy in ((0, 0), (1, 0), (0, 1)):
            draw.text((x + dx, y + dy), text, fill=fill, font=font, anchor=anchor)
    elif anchor == "ra":
        for dx in (0, 1, 2):
            draw.text((x + dx, y), text, fill=fill, font=font, anchor=anchor)
    else:
        for dx, dy in ((0, 0), (1, 0), (0, 1)):
            draw.text((x + dx, y + dy), text, fill=fill, font=font, anchor=anchor)


def layout_side(pairs, qf_pairs, sf_triple, x_cols, y_top, y_bottom, positions):
    leaf_h = (y_bottom - y_top) / 8
    for i, (a, b, r16) in enumerate(pairs):
        ys_a = y_top + leaf_h * (i * 2 + 0.5)
        ys_b = y_top + leaf_h * (i * 2 + 1.5)
        positions[a] = (x_cols[0], ys_a)
        positions[b] = (x_cols[0], ys_b)
        positions[r16] = (x_cols[1], (ys_a + ys_b) / 2)
    for ra, rb, qf in qf_pairs:
        positions[qf] = (x_cols[2], (positions[ra][1] + positions[rb][1]) / 2)
    sf_a, sf_b, sf = sf_triple
    positions[sf] = (x_cols[3], (positions[sf_a][1] + positions[sf_b][1]) / 2)


def draw_team_inline(img, draw, x0, x1, row_y, row_h, name, code, win, align, fonts):
    f_team = fonts["team"]
    if win:
        if align == "left":
            draw.rectangle([x0 + 2, row_y + 2, x1 - SCORE_COL, row_y + row_h - 2], fill=ROW_WIN_BG)
        else:
            draw.rectangle([x0 + SCORE_COL, row_y + 2, x1 - 2, row_y + row_h - 2], fill=ROW_WIN_BG)

    flag = fetch_flag(code, FLAG_SZ)
    fh = flag.height
    cy = row_y + row_h // 2
    color = TEXT_WIN if win else TEXT_DIM

    if align == "left":
        fx = x0 + PAD
        img.paste(flag, (int(fx), int(cy - fh // 2)), flag)
        tx = fx + FLAG_SZ + FLAG_GAP
        draw.text((tx, cy), name, fill=color, font=f_team, anchor="lm")
        if win:
            draw.text((tx + 1, cy), name, fill=color, font=f_team, anchor="lm")
    else:
        tx = x1 - PAD
        draw.text((tx, cy), name, fill=color, font=f_team, anchor="rm")
        if win:
            draw.text((tx - 1, cy), name, fill=color, font=f_team, anchor="rm")
        name_w = draw.textlength(name, font=f_team)
        fx = tx - name_w - FLAG_GAP - FLAG_SZ
        img.paste(flag, (int(fx), int(cy - fh // 2)), flag)


def draw_node(img, draw, cx, cy, match_id, fonts, align="left"):
    home, away, winner, score, pens = match_info(match_id)
    hw, aw = home == winner, away == winner
    x0, x1 = (cx, cx + NODE_W) if align == "left" else (cx - NODE_W, cx)
    y0 = int(cy - NODE_H // 2)
    draw.rounded_rectangle([x0, y0, x0 + NODE_W, y0 + NODE_H], radius=16, fill=NODE_BG, outline=NODE_BORDER, width=2)

    row_h = NODE_H // 2
    draw_team_inline(img, draw, x0, x1, y0, row_h, home, TEAMS[home], hw, align, fonts)
    draw_team_inline(img, draw, x0, x1, y0 + row_h, row_h, away, TEAMS[away], aw, align, fonts)

    div_y = y0 + row_h
    if align == "left":
        draw.line([(x0 + 8, div_y), (x1 - SCORE_COL - 4, div_y)], fill=NODE_BORDER, width=1)
    else:
        draw.line([(x0 + SCORE_COL + 4, div_y), (x1 - 8, div_y)], fill=NODE_BORDER, width=1)

    scx = x1 - PAD if align == "left" else x0 + PAD
    anchor = "rm" if align == "left" else "lm"
    draw_score_block(draw, scx, cy, score, pens, fonts, anchor=anchor)


def connect(draw, p1, p2, side="left"):
    x1, y1, x2, y2 = p1
    cx1, cy1 = p2
    mid_y = (y1 + y2) / 2
    start = (x2, mid_y) if side == "left" else (x1, mid_y)
    mid_x = (start[0] + cx1) / 2
    draw.line([start, (mid_x, start[1]), (mid_x, cy1), (cx1, cy1)], fill=LINE, width=LINE_W)


def get_box(cx, cy):
    return (cx, cy - NODE_H // 2, cx + NODE_W, cy + NODE_H // 2)


def wire_side(draw, pairs, qf_pairs, sf_triple, positions, side):
    sf_id = sf_triple[2]

    def box(mid):
        cx, cy = positions[mid]
        return get_box(cx, cy)

    def target(mid):
        tx, ty = positions[mid]
        return (tx + NODE_W, ty) if side == "right" else (tx, ty)

    for a, b, r16 in pairs:
        connect(draw, box(a), target(r16), side)
        connect(draw, box(b), target(r16), side)
    for ra, rb, qf in qf_pairs:
        connect(draw, box(ra), target(qf), side)
        connect(draw, box(rb), target(qf), side)
    for _, _, qf in qf_pairs:
        connect(draw, box(qf), target(sf_id), side)


def draw_final(img, draw, cx, cy, fonts):
    home, away, winner, score, pens = match_info(104)
    hw, aw = home == winner, away == winner
    h = 195 if pens else 175
    w = 580
    x0, y0 = cx - w // 2, cy - h // 2
    draw.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=18, fill=FINAL_BG, outline=FINAL_BORDER, width=4)
    draw.text((cx, y0 + 30), "决赛", fill=TITLE, font=fonts["final_label"], anchor="mm")
    row_y = int(y0 + 78)
    fs = FLAG_SZ_FINAL
    hf = fetch_flag(TEAMS[home], fs)
    af = fetch_flag(TEAMS[away], fs)
    img.paste(hf, (int(cx - 220), row_y), hf)
    draw_bold_text(draw, (cx - 140, row_y + 16), home, TEXT_WIN if hw else TEXT_DIM, fonts["team"], anchor="lm")
    score_y = row_y + (24 if pens else 20)
    draw_score_block(
        draw, cx, score_y, score, pens,
        {**fonts, "score": fonts["final_score"]},
        anchor="mm",
    )
    img.paste(af, (int(cx + 60), row_y), af)
    draw_bold_text(draw, (cx + 140, row_y + 16), away, TEXT_WIN if aw else TEXT_DIM, fonts["team"], anchor="lm")


def main():
    merge_live_results()

    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    fonts = {
        "title": load_font(60, True),
        "subtitle": load_font(28, True),
        "section": load_font(32, True),
        "round": load_font(26, True),
        "team": load_font(36, True),
        "score": load_font(34, True),
        "score_pens": load_font(26, True),
        "final_label": load_font(38, True),
        "final_score": load_font(46, True),
        "champ": load_font(42, True),
        "footer": load_font(24, True),
    }

    draw.rounded_rectangle([70, 28, W - 70, 130], radius=16, fill=HEADER_BG, outline=HEADER_BORDER, width=2)
    draw.text((W // 2, 68), "2026 FIFA 世界杯 · 淘汰赛预测对阵图", fill=TITLE, font=fonts["title"], anchor="mm")
    draw.text(
        (W // 2, 108),
        "已赛：加拿大1-0南非 · 巴拉圭点球胜德国 · 摩洛哥点球胜荷兰 · 巴西2-1日本",
        fill=SUBTITLE,
        font=fonts["subtitle"],
        anchor="mm",
    )

    y_top, y_bottom = 155, H - 85
    positions = {}

    margin = 75
    sf_final_gap = 165        # 半决赛 ↔ 决赛（略宽，留呼吸感）
    final_half = 290

    fc_x = W // 2
    fc_y = (y_top + y_bottom) / 2

    # 外侧三列与半决赛列按可用宽度均匀分布，整体更协调
    left_sf = fc_x - final_half - sf_final_gap - NODE_W
    right_sf = fc_x + final_half + sf_final_gap
    left_outer = margin
    right_outer = W - margin - NODE_W
    step_l = (left_sf - left_outer) / 3
    step_r = (right_outer - right_sf) / 3

    lx = [int(left_outer + i * step_l) for i in range(4)]
    rx = [int(right_outer - i * step_r) for i in range(4)]

    layout_side(LEFT_PAIRS, LEFT_QF, LEFT_SF, lx, y_top, y_bottom, positions)
    layout_side(RIGHT_PAIRS, RIGHT_QF, RIGHT_SF, rx, y_top, y_bottom, positions)

    wire_side(draw, LEFT_PAIRS, LEFT_QF, LEFT_SF, positions, "left")
    wire_side(draw, RIGHT_PAIRS, RIGHT_QF, RIGHT_SF, positions, "right")

    sf_lx, sf_ly = positions[101][0], positions[101][1]
    sf_rx, sf_ry = positions[102][0], positions[102][1]
    connect(draw, get_box(sf_lx, sf_ly), (fc_x - final_half, fc_y), "left")
    connect(draw, get_box(sf_rx, sf_ry), (fc_x + final_half, fc_y), "right")

    draw.text((lx[0] + NODE_W // 2, y_top - 30), "上半区（左）", fill=LABEL, font=fonts["section"], anchor="mm")
    draw.text((rx[0] + NODE_W // 2, y_top - 30), "下半区（右）", fill=LABEL, font=fonts["section"], anchor="mm")
    for i, label in enumerate(["32强", "16强", "8强", "半决赛"]):
        draw.text((lx[i] + NODE_W // 2, y_top + 12), label, fill=LABEL, font=fonts["round"], anchor="mm")
        draw.text((rx[i] + NODE_W // 2, y_top + 12), label, fill=LABEL, font=fonts["round"], anchor="mm")

    left_ids = [x for p in LEFT_PAIRS for x in p] + [x for q in LEFT_QF for x in q] + list(LEFT_SF)
    right_ids = [x for p in RIGHT_PAIRS for x in p] + [x for q in RIGHT_QF for x in q] + list(RIGHT_SF)
    for mid in left_ids:
        cx, cy = positions[mid]
        draw_node(img, draw, cx, cy, mid, fonts, "left")
    for mid in right_ids:
        cx, cy = positions[mid]
        draw_node(img, draw, cx + NODE_W, cy, mid, fonts, "right")

    draw_final(img, draw, fc_x, fc_y, fonts)

    champ = P[104][2]
    bw, bh = 480, 78
    bx, by = W // 2 - bw // 2, H - 95
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=16, fill=CHAMP_BG, outline=CHAMP_BORDER, width=3)
    flag = fetch_flag(TEAMS[champ], 52)
    cy = by + bh // 2
    img.paste(flag, (bx + 22, int(cy - 26)), flag)
    draw.text((bx + 84, cy), f"预测冠军：{champ}", fill=TITLE, font=fonts["champ"], anchor="lm")
    draw.text((W // 2, H - 22), "深绿为预测获胜方 · 仅供娱乐 · YXWorldCup2026", fill=SUBTITLE, font=fonts["footer"], anchor="mm")

    img.save(OUT, "PNG", optimize=True)
    print(f"Saved {OUT} ({W}x{H})")


if __name__ == "__main__":
    main()
