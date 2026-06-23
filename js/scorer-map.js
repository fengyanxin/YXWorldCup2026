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
  'Kamrvn Bargs': '卡梅伦·博吉斯',
  'Y.Ayari': '阿亚里',
  'Y. Ayari': '阿亚里',
  'V. Júnior': '维尼修斯',
  'Vinícius Júnior': '维尼修斯',
  'J. Bellingham': '贝林厄姆',
  'Jude Bellingham': '贝林厄姆',
  'L. Díaz': '迪亚斯',
  'Luis Díaz': '迪亚斯',
  'Lviiz Diaz': '迪亚斯',
  'J. Musiala': '穆西亚拉',
  'Jamal Musiala': '穆西亚拉',
  'R. Jiménez': '希门尼斯',
  'Raúl Jiménez': '希门尼斯',
  'J. Quiñones': '胡利安·基尼奥内斯',
  'Jonathan David': '乔纳森·戴维',
  'Matheus Cunha': '马特乌斯·库尼亚',
  'Mikel Oyarzabal': '奥亚萨瓦尔',
  'G. Reyna': '雷纳',
  'Breel Embolo': '恩博洛',
  'Virgil van Dijk': '范戴克',
  'J. McGinn': '麦金',
  'C. Larin': '拉林',
  'Kail Larin': '拉林',
  'D. Undav': '翁达夫',
  'Dniz Avndav': '翁达夫',
  'Aiash Ivida': '上田绮世',
  'Kvdi Khakpv': '加克波',
  'Asmaail Saibari': '萨伊巴里',
  'I. Saibari': '萨伊巴里',
  'Crysencio Summerville': '萨默维尔',
  'C. Summerville': '萨默维尔',
  'N. Schlotterbeck': '施洛特贝克',
  'Felix Nmecha': '恩梅查',
  'A. Isak': '伊萨克',
  'V. Gyökeres': '哲凯赖什',
  'C. Metcalfe': '梅特卡夫',
  'Nestory Irankunda': '伊兰昆达',
  'Maximiliano Araújo': '马克西米利亚诺·阿劳霍',
  'Brian Brobbey': '布罗贝',
  'Elijah Just': '贾斯特',
  'L. Comenencia': '科梅嫩西亚',
  'L. Krejčí': '克雷伊奇',
  'I.B. Hwang': '黄仁范',
  'O. Rekik': '雷基克',
  'Ramin Rezaiian': '雷扎伊安',
  'Mohammad Mohebi': '莫赫比',
  'B. Khoukhi': '胡基',
  'N. Brown': '布朗',
  'A. Diallo': '迪亚洛',
  'K. Nakamura': '中村敬斗',
  'K. Ogawa': '小川航基',
  'M. Svanberg': '斯万贝里',
  'Maurício': '毛里西奥',
  'P. Musa': '佩塔尔·穆萨',
  'Y. Wissa': '扬·维萨',
  'Abas Bk Fiz Allh Af': '阿博斯别克·法伊祖拉耶夫',
  'Abdulelah Al-Amri': '阿卜杜勒拉·阿姆里',
  'Agustín Canobbio': '阿古斯丁·卡诺比奥',
  'Alex Freeman': '亚历克斯·弗里曼',
  'Ali Avlvan': '阿里·奥尔万',
  'Anthony Elanga': '安东尼·埃兰加',
  'Armin Mhmich': '埃尔明·马米奇',
  'Aymen Hussein': '艾门·侯赛因',
  'B. Barcola': '巴尔科拉',
  'Daichi Kamada': '镰田大地',
  'Dnil Mvnvz': '丹尼尔·穆尼奥斯',
  'Emam Ashour': '埃姆·阿舒尔',
  'Fin Svrman': '芬恩·瑟曼',
  'Franck Kessié': '弗兰克·凯西',
  'H.G. Oh': '吴贤载',
  'Hassan Mohamed Altmbkti': '哈桑·坦巴克提',
  'Hliv Varla': '赫利奥·瓦雷拉',
  'I. Mbaye': '伊布拉金·姆巴耶',
  'Ismaïla Sarr': '伊斯梅拉·萨尔',
  'Izn Alarb': '亚赞·阿拉布',
  'J. Neves': '若昂·内维斯',
  'Jovo Lukić': '约沃·卢基奇',
  'Junya Itō': '伊藤洋辉',
  'Jvhan Mnzambi': '若昂·曼赞比',
  'Kalb Iirnki': '凯勒布·伊伦基',
  'Khamintvn Kampaz': '哈明顿·坎帕斯',
  'Kevin Pina': '凯文·皮纳',
  'Lamine Yamal': '拉明·亚马尔',
  'Leo Østigård': '莱奥·厄斯蒂高',
  'Luis Romo': '路易斯·罗莫',
  'M. Baturina': '马丁·巴图里纳',
  'M. Rashford': '马库斯·拉什福德',
  'Mahmoud Hassan Trezeguet': '马哈茂德·哈桑·特雷泽盖',
  'Markvs Hlmgrn Pdrsn': '马库斯·霍姆格伦·佩德森',
  'Matías Galarza': '马蒂亚斯·加拉扎',
  'mikhal Sadilk': '米哈尔·萨德莱克',
  'Mohamed Almnai': '穆罕默德·马奈',
  'Mohamed Hany': '穆罕默德·哈尼',
  'Mohamed Salah': '穆罕默德·萨拉赫',
  'Mostafa Ziko': '穆斯塔法·齐科',
  'Nathan Saliba': '内森·萨利巴',
  'Ousmane Dembélé': '奥斯曼·登贝莱',
  'Rvbn Vargas': '鲁文·瓦尔加斯',
  'Rvmanv Ashmid': '罗曼诺·施密德',
};

const LASTNAME_TO_ZH = {
  Messi: '梅西',
  Kane: '凯恩',
  Mbappé: '姆巴佩',
  Haaland: '哈兰德',
  Havertz: '哈弗茨',
  Balogun: '巴洛贡',
  Burgess: '博吉斯',
  Ayari: '阿亚里',
  Júnior: '维尼修斯',
  Bellingham: '贝林厄姆',
  Díaz: '迪亚斯',
  Diaz: '迪亚斯',
  Musiala: '穆西亚拉',
  Jiménez: '希门尼斯',
  Quiñones: '基尼奥内斯',
  David: '戴维',
  Cunha: '库尼亚',
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
  Araújo: '阿劳霍',
  Brobbey: '布罗贝',
  Just: '贾斯特',
  Comenencia: '科梅嫩西亚',
  Krejčí: '克雷伊奇',
  Maurício: '毛里西奥',
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
  Musa: '穆萨',
  Wissa: '维萨',
  Hwang: '黄仁范',
  'Al-Amri': '阿姆里',
  Canobbio: '卡诺比奥',
  Freeman: '弗里曼',
  Olwan: '奥尔万',
  Elanga: '埃兰加',
  Mahmic: '马米奇',
  Hussein: '侯赛因',
  Barcola: '巴尔科拉',
  Kamada: '镰田大地',
  Muñoz: '穆尼奥斯',
  Ashour: '阿舒尔',
  Surman: '瑟曼',
  Kessié: '凯西',
  Oh: '吴贤载',
  Altambakti: '坦巴克提',
  Varela: '瓦雷拉',
  Mbaye: '姆巴耶',
  Sarr: '萨尔',
  Neves: '内维斯',
  Lukić: '卢基奇',
  Itō: '伊藤洋辉',
  Manzambi: '曼赞比',
  Yirenkyi: '伊伦基',
  Campaz: '坎帕斯',
  Pina: '皮纳',
  Yamal: '亚马尔',
  Østigård: '厄斯蒂高',
  Romo: '罗莫',
  Baturina: '巴图里纳',
  Rashford: '拉什福德',
  Trezeguet: '特雷泽盖',
  Pedersen: '佩德森',
  Galarza: '加拉扎',
  Sadílek: '萨德莱克',
  Sadilk: '萨德莱克',
  Manai: '马奈',
  Hany: '哈尼',
  Salah: '萨拉赫',
  Ziko: '齐科',
  Saliba: '萨利巴',
  Dembélé: '登贝莱',
  Vargas: '瓦尔加斯',
  Schmid: '施密德',
  Fayzullaev: '法伊祖拉耶夫',
  Ivida: '上田绮世',
  Khakpv: '加克波',
};

function normalizeQuotes(raw) {
  return String(raw)
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function normalizePlayerName(name) {
  return String(name)
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/^[\s"“]+|[\s"”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
    const name = normalizePlayerName(m[1].replace(/\.$/, ''));
    if (!name) continue;
    results.push({ name, minute: m[2] });
  }

  return results;
}

function stripAccents(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function playerKey(name) {
  const parts = normalizePlayerName(name).split(/\s+/);
  const last = parts[parts.length - 1] || name;
  return stripAccents(last).toLowerCase();
}

function pickDisplayName(current, next) {
  if (!current) return next;
  if (next.length > current.length) return next;
  if (next.length === current.length && !/^[A-Z]\./.test(next) && /^[A-Z]\./.test(current)) return next;
  return current;
}

function lookupLastnameZh(name) {
  const parts = normalizePlayerName(name).split(/\s+/);
  const candidates = [
    parts.slice(-2).join(' '),
    parts[parts.length - 1],
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (LASTNAME_TO_ZH[candidate]) return LASTNAME_TO_ZH[candidate];
    const stripped = stripAccents(candidate);
    for (const [key, zh] of Object.entries(LASTNAME_TO_ZH)) {
      if (stripAccents(key).toLowerCase() === stripped.toLowerCase()) return zh;
    }
  }
  return null;
}

function transliterateLatinName(name) {
  const parts = normalizePlayerName(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return name;

  const last = parts[parts.length - 1];
  const lastZh = lookupLastnameZh(last) || lookupLastnameZh(name);
  if (lastZh) {
    if (parts.length === 1 || /^[A-Z]\.?$/.test(parts[0])) return lastZh;
    const first = parts.slice(0, -1).join(' ');
    if (/^[A-Z]\./.test(first)) return lastZh;
    return `${transliterateWord(first)}·${lastZh}`;
  }

  if (parts.length === 1) return transliterateWord(parts[0]);
  return `${transliterateWord(parts.slice(0, -1).join(' '))}·${transliterateWord(last)}`;
}

function transliterateWord(word) {
  const key = stripAccents(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!key) return word;
  return LATIN_WORD_TO_ZH[key] || word;
}

const LATIN_WORD_TO_ZH = {
  jonathan: '乔纳森',
  alex: '亚历克斯',
  anthony: '安东尼',
  mohamed: '穆罕默德',
  mohammad: '穆罕默德',
  daichi: '大地',
  franck: '弗兰克',
  junya: '润也',
  kevin: '凯文',
  lamine: '拉明',
  leo: '莱奥',
  luis: '路易斯',
  martin: '马丁',
  matias: '马蒂亚斯',
  matheus: '马特乌斯',
  mikel: '米克尔',
  nathan: '内森',
  virgil: '维吉尔',
  breel: '布雷尔',
  brian: '布莱恩',
  felix: '费利克斯',
  harry: '哈里',
  kylian: '基利安',
  jamal: '贾马尔',
  jude: '裘德',
  raul: '劳尔',
  vinicius: '维尼修斯',
};

function playerNameZh(name) {
  const normalized = normalizePlayerName(name);
  if (PLAYER_EN_TO_ZH[normalized]) return PLAYER_EN_TO_ZH[normalized];
  if (PLAYER_EN_TO_ZH[name]) return PLAYER_EN_TO_ZH[name];

  const lastnameZh = lookupLastnameZh(normalized);
  if (lastnameZh) {
    const parts = normalized.split(/\s+/);
    if (parts.length === 1 || /^[A-Z]\.?/.test(parts[0])) return lastnameZh;
  }

  const zh = transliterateLatinName(normalized);
  if (!/[A-Za-z]/.test(zh)) return zh;
  return lastnameZh || zh;
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
