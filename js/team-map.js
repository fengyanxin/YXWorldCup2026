/* 英文队名 → 中文队名 / 国旗映射 */

const TEAM_EN_TO_ZH = {
  Mexico: '墨西哥',
  'South Korea': '韩国',
  'Korea Republic': '韩国',
  'Czech Republic': '捷克',
  Czechia: '捷克',
  'South Africa': '南非',
  Switzerland: '瑞士',
  Canada: '加拿大',
  Qatar: '卡塔尔',
  'Bosnia and Herzegovina': '波黑',
  Scotland: '苏格兰',
  Morocco: '摩洛哥',
  Brazil: '巴西',
  Haiti: '海地',
  'United States': '美国',
  USA: '美国',
  Australia: '澳大利亚',
  Türkiye: '土耳其',
  Turkey: '土耳其',
  Paraguay: '巴拉圭',
  Germany: '德国',
  'Ivory Coast': '科特迪瓦',
  "Côte d'Ivoire": '科特迪瓦',
  Ecuador: '厄瓜多尔',
  Curaçao: '库拉索',
  Curacao: '库拉索',
  Netherlands: '荷兰',
  Japan: '日本',
  Sweden: '瑞典',
  Tunisia: '突尼斯',
  Uruguay: '乌拉圭',
  'Saudi Arabia': '沙特',
  Spain: '西班牙',
  'Cape Verde': '佛得角',
  'Cabo Verde': '佛得角',
  Iran: '伊朗',
  'IR Iran': '伊朗',
  'New Zealand': '新西兰',
  Belgium: '比利时',
  Egypt: '埃及',
  France: '法国',
  Senegal: '塞内加尔',
  Norway: '挪威',
  Iraq: '伊拉克',
  Argentina: '阿根廷',
  Algeria: '阿尔及利亚',
  Austria: '奥地利',
  Jordan: '约旦',
  England: '英格兰',
  Ghana: '加纳',
  Panama: '巴拿马',
  Croatia: '克罗地亚',
  Portugal: '葡萄牙',
  Uzbekistan: '乌兹别克斯坦',
  Colombia: '哥伦比亚',
  'Democratic Republic of the Congo': '刚果(金)',
  'DR Congo': '刚果(金)',
  'Congo DR': '刚果(金)',
};

const TEAM_EN_ALIASES = {
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'United States of America': 'United States',
  'Cabo Verde': 'Cape Verde',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cote d Ivoire': 'Ivory Coast',
  'IR Iran': 'Iran',
  Türkiye: 'Turkey',
};

const SPECIAL_ISO_FLAGS = {
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
};

let TEAM_ZH_TO_FLAG = null;
let TEAM_EN_TO_FLAG = null;

function normalizeTeamEn(name) {
  if (!name) return '';
  const trimmed = String(name).trim();
  return TEAM_EN_ALIASES[trimmed] || trimmed;
}

function findTeamRecord(englishName, teamsById) {
  const target = normalizeTeamEn(englishName).toLowerCase();
  for (const t of Object.values(teamsById || {})) {
    if (normalizeTeamEn(t.name_en).toLowerCase() === target) return t;
  }
  return null;
}

function iso2ToFlagEmoji(iso2) {
  if (!iso2) return null;
  const upper = String(iso2).toUpperCase();
  if (SPECIAL_ISO_FLAGS[upper]) return SPECIAL_ISO_FLAGS[upper];
  if (upper.length !== 2 || !/^[A-Z]{2}$/.test(upper)) return null;
  return String.fromCodePoint(...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function buildTeamZhFlagMap() {
  const map = {};
  Object.values(WC2026.standings).forEach((rows) => {
    rows.forEach((r) => {
      map[r.team] = r.flag;
    });
  });
  return map;
}

function getTeamEnToFlag() {
  if (TEAM_EN_TO_FLAG) return TEAM_EN_TO_FLAG;
  const zhFlags = buildTeamZhFlagMap();
  TEAM_EN_TO_FLAG = {};
  Object.entries(TEAM_EN_TO_ZH).forEach(([en, zh]) => {
    if (zhFlags[zh]) TEAM_EN_TO_FLAG[en] = zhFlags[zh];
  });
  Object.entries(TEAM_EN_ALIASES).forEach(([alias, canonical]) => {
    if (TEAM_EN_TO_FLAG[canonical]) TEAM_EN_TO_FLAG[alias] = TEAM_EN_TO_FLAG[canonical];
  });
  return TEAM_EN_TO_FLAG;
}

function buildZhFlagMap() {
  if (!TEAM_ZH_TO_FLAG) TEAM_ZH_TO_FLAG = buildTeamZhFlagMap();
  return { ...TEAM_ZH_TO_FLAG };
}

function teamNameZh(englishName, teamsById, teamId) {
  if (teamId && teamsById?.[teamId]) {
    const en = teamsById[teamId].name_en;
    const zh = TEAM_EN_TO_ZH[normalizeTeamEn(en)] || TEAM_EN_TO_ZH[en];
    if (zh) return zh;
  }

  const normalized = normalizeTeamEn(englishName);
  if (TEAM_EN_TO_ZH[normalized]) return TEAM_EN_TO_ZH[normalized];
  if (englishName && TEAM_EN_TO_ZH[englishName]) return TEAM_EN_TO_ZH[englishName];

  const rec = findTeamRecord(englishName, teamsById);
  if (rec) {
    const zh = TEAM_EN_TO_ZH[normalizeTeamEn(rec.name_en)] || TEAM_EN_TO_ZH[rec.name_en];
    if (zh) return zh;
  }

  return englishName || '待定';
}

function teamFlagZh(chineseName, zhFlagMap, englishName, teamsById) {
  const zhFlags = zhFlagMap || TEAM_ZH_TO_FLAG || buildTeamZhFlagMap();
  if (chineseName && zhFlags[chineseName] && zhFlags[chineseName] !== '🏳️') {
    return zhFlags[chineseName];
  }

  const enFlags = getTeamEnToFlag();
  const normalized = normalizeTeamEn(englishName);
  if (enFlags[normalized]) return enFlags[normalized];
  if (englishName && enFlags[englishName]) return enFlags[englishName];

  const rec = findTeamRecord(englishName, teamsById);
  if (rec) {
    const zh = teamNameZh(rec.name_en, teamsById);
    if (zhFlags[zh]) return zhFlags[zh];
    const fromIso = iso2ToFlagEmoji(rec.iso2);
    if (fromIso) return fromIso;
  }

  return '⚽';
}

function resolveScorerTeam(teamEn, teamsById, zhFlagMap) {
  const team = teamNameZh(teamEn, teamsById);
  const teamFlag = teamFlagZh(team, zhFlagMap, teamEn, teamsById);
  return { team, teamFlag, flag: teamFlag };
}
