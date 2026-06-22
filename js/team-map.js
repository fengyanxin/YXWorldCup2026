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

function buildZhFlagMap() {
  const map = {};
  Object.values(WC2026.standings).forEach((rows) => {
    rows.forEach((r) => {
      map[r.team] = r.flag;
    });
  });
  return map;
}

function teamNameZh(englishName, teamsById, teamId) {
  if (teamId && teamsById[teamId]) {
    const en = teamsById[teamId].name_en;
    if (TEAM_EN_TO_ZH[en]) return TEAM_EN_TO_ZH[en];
  }
  if (englishName && TEAM_EN_TO_ZH[englishName]) return TEAM_EN_TO_ZH[englishName];
  return englishName || '待定';
}

function teamFlagZh(chineseName, zhFlagMap) {
  return zhFlagMap[chineseName] || '🏳️';
}
