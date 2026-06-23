/* 从比赛进球数据聚合射手榜，并提供球员中文名映射 */

const PLAYER_EN_TO_ZH = {
  'Lionel Messi': '梅西',
  'L. Messi': '梅西',
  'H. Kane': '凯恩',
  'Harry Kane': '凯恩',
  'K. Mbappé': '姆巴佩',
  'Kylian Mbappé': '姆巴佩',
  'Erling Haaland': '哈兰德',
  'E. Haaland': '哈兰德',
  'K. Havertz': '哈弗茨',
  'Kai Havertz': '哈弗茨',
  'F. Balogun': '巴洛贡',
  'Folarin Balogun': '巴洛贡',
  'Y.Ayari': '阿亚里',
  'Y. Ayari': '阿亚里',
  'V. Júnior': '维尼修斯',
  'Vinícius Júnior': '维尼修斯',
  'J. Bellingham': '贝林厄姆',
  'Jude Bellingham': '贝林厄姆',
  'L. Díaz': '迪亚斯',
  'Luis Díaz': '迪亚斯',
  'J. Musiala': '穆西亚拉',
  'Jamal Musiala': '穆西亚拉',
  'R. Jiménez': '希门尼斯',
  'Raúl Jiménez': '希门尼斯',
  'Jonathan David': '乔纳森·戴维',
  'Matheus Cunha': '马特乌斯·库尼亚',
  'Mikel Oyarzabal': '奥亚萨瓦尔',
  'G. Reyna': '雷纳',
  'Breel Embolo': '恩博洛',
  'Virgil van Dijk': '范戴克',
  'J. McGinn': '麦金',
  'C. Larin': '拉林',
  'D. Undav': '翁达夫',
  'Dniz Avndav': '翁达夫',
  'Aiash Ivida': '上田绮世',
  'Kvdi Khakpv': '加克波',
  'Asmaail Saibari': '萨伊巴里',
  'Crysencio Summerville': '萨默维尔',
  'Kail Larin': '拉林',
  'J. Musiala': '穆西亚拉',
  'N. Schlotterbeck': '施洛特贝克',
  'I. Saibari': '萨伊巴里',
  'Felix Nmecha': '恩梅查',
  'A. Isak': '伊萨克',
  'V. Gyökeres': '哲凯赖什',
  'C. Metcalfe': '梅特卡夫',
  'Nestory Irankunda': '伊兰昆达',
  'Maximiliano Araújo': '马克西米利亚诺·阿劳霍',
  'Brian Brobbey': '布罗贝',
  'Elijah Just': '贾斯特',
};

const LASTNAME_TO_ZH = {
  Messi: '梅西',
  Kane: '凯恩',
  Mbappé: '姆巴佩',
  Haaland: '哈兰德',
  Havertz: '哈弗茨',
  Balogun: '巴洛贡',
  Ayari: '阿亚里',
  Júnior: '维尼修斯',
  Bellingham: '贝林厄姆',
  Díaz: '迪亚斯',
  Musiala: '穆西亚拉',
  Jiménez: '希门尼斯',
  David: '乔纳森·戴维',
  Cunha: '马特乌斯·库尼亚',
  Oyarzabal: '奥亚萨瓦尔',
  Reyna: '雷纳',
  Embolo: '恩博洛',
  Dijk: '范戴克',
  McGinn: '麦金',
  Larin: '拉林',
  Undav: '翁达夫',
  Schlotterbeck: '施洛特贝克',
  Nmecha: '恩梅查',
  Isak: '伊萨克',
  Gyökeres: '哲凯赖什',
  Metcalfe: '梅特卡夫',
  Irankunda: '伊兰昆达',
  Araújo: '马克西米利亚诺·阿劳霍',
  Brobbey: '布罗贝',
  Just: '贾斯特',
  Quiñones: '基尼奥内斯',
  Hwang: '黄仁范',
  Krejčí: '克雷伊奇',
  Maurício: '毛里西奥',
  Comenencia: '科梅嫩西亚',
  Summerville: '萨默维尔',
  Nakamura: '中村敬斗',
  Ogawa: '小川航基',
  Svanberg: '斯万贝里',
  Rekik: '雷基克',
  Rezaiian: '雷扎伊安',
  Mohebi: '莫赫比',
  Saibari: '萨伊巴里',
  Khoukhi: '胡基',
  Diallo: '迪亚洛',
  Brown: '布朗',
  van: '范戴克',
};

function normalizeQuotes(raw) {
  return String(raw)
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function parseScorersField(raw) {
  if (!raw || raw === 'null') return [];

  const s = normalizeQuotes(raw);
  const results = [];
  const re = /([^",{]+?)\s+(\d+(?:\+\d+)?)'(?:\(OG\))?/gu;

  let m;
  while ((m = re.exec(s)) !== null) {
    const fullMatch = m[0];
    if (fullMatch.includes('(OG)')) continue;
    const name = m[1].trim().replace(/\.$/, '');
    if (!name) continue;
    results.push({ name, minute: m[2] });
  }

  return results;
}

function stripAccents(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function playerKey(name) {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] || name;
  return stripAccents(last).toLowerCase();
}

function pickDisplayName(current, next) {
  if (!current) return next;
  if (next.length > current.length) return next;
  if (next.length === current.length && !/^[A-Z]\./.test(next) && /^[A-Z]\./.test(current)) return next;
  return current;
}

function playerNameZh(name) {
  if (PLAYER_EN_TO_ZH[name]) return PLAYER_EN_TO_ZH[name];
  const last = name.split(/\s+/).pop();
  if (LASTNAME_TO_ZH[last]) return LASTNAME_TO_ZH[last];
  const stripped = stripAccents(last);
  for (const [key, zh] of Object.entries(LASTNAME_TO_ZH)) {
    if (stripAccents(key).toLowerCase() === stripped.toLowerCase()) return zh;
  }
  return name;
}

function buildScorersFromGames(games, teamsById, zhFlagMap) {
  const agg = new Map();

  games.forEach((g) => {
    if (g.finished !== 'TRUE' && String(g.time_elapsed || '').toLowerCase() !== 'finished') return;

    ['home', 'away'].forEach((side) => {
      const teamEn = g[`${side}_team_name_en`] || g[`${side}_team_label`];
      const teamId = g[`${side}_team_id`];
      const teamZh = teamNameZh(teamEn, teamsById, teamId);
      const flag = teamFlagZh(teamZh, zhFlagMap);

      parseScorersField(g[`${side}_scorers`]).forEach(({ name }) => {
        const key = `${teamEn || teamZh}::${playerKey(name)}`;
        const existing = agg.get(key) || {
          playerEn: name,
          player: playerNameZh(name),
          team: teamZh,
          flag,
          goals: 0,
          assists: 0,
          minutes: '-',
        };
        existing.playerEn = pickDisplayName(existing.playerEn, name);
        existing.player = playerNameZh(existing.playerEn);
        existing.goals += 1;
        agg.set(key, existing);
      });
    });
  });

  const sorted = [...agg.values()].sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player, 'zh-CN'));

  let rank = 1;
  return sorted.map((s, i) => {
    if (i > 0 && s.goals < sorted[i - 1].goals) rank = i + 1;
    return { rank, ...s };
  });
}
