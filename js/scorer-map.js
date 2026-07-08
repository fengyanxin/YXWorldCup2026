/* 从比赛进球数据聚合射手榜，并提供球员中文名映射 */

function getPlayerZhSnapshot() {
  return window.__PLAYER_ZH_MAP__?.players || null;
}

const CORRUPTED_NAME_REPAIR = {
  'Nikvlas Ph Ph': 'Nicolas Pépé',
  'Paph Gviih': 'Pape Gueye',
  'Jvd Blingham': 'Jude Bellingham',
  'Jvlian Kviinvnz': 'Julián Quiñones',
  'Hri Kin': 'Harry Kane',
  'Kan Aihan': 'Kaan Ayhan',
  'Fistvn Mail': 'Fiston Mayele',
  'Gvnzalv Plata': 'Gonzalo Plata',
  'Nilsvn Angvlv': 'Nilson Angulo',
  'Nvnv Mndz': 'Nuno Mendes',
  'Prvmis Divid': 'Dan Ndoye',
  'Hazm Mstvri': 'Hannibal Mejbri',
  'Drik Lvkasn': 'Mohammed Kudus',
  'Ian Fn Hkh': 'Donyell Malen',
  'Khvliv Ansisv': 'Julio Enciso',
  'Abdalvhid Namtvf': 'Abdulvohid Nematov',
  'Aldvr Shvmvrvdvf': 'Alisher Shomuradov',
  'Abvnad': 'Edin Dzeko',
  'Karim Alaibgvvich': 'Ermedin Demirovic',
  'Armin Mhmich': 'Armin Dedic',
  'Astfan Avstakviv': 'Stephen Eustáquio',
  'Taplv Maskv': 'Thapelo Maseko',
  'Ailman Andiaih': 'Iliman Ndiaye',
  'Mvsi Altmari': 'Musa Al-Taamari',
  'Jivani Lv Slsv': 'Jovan Ilic',
  'Svfian Rhimi': 'Sofiane Rahimi',
  'Dniz Avndav': 'Deniz Undav',
  'Aiash Ivida': 'Ayase Ueda',
  'Kvdi Khakpv': 'Cody Gakpo',
  'Asmaail Saibari': 'Ismaïla Saibari',
  'Dnil Mvnvz': 'Daniel Muñoz',
  'Fin Svrman': 'Finn Surman',
  'Hliv Varla': 'Helio Varela',
  'Izn Alarb': 'Yazan Al-Arab',
  'Jvhan Mnzambi': 'João Manzambi',
  'Kalb Iirnki': 'Caleb Yirenkyi',
  'Khamintvn Kampaz': 'Haminton Campaz',
  'Markvs Hlmgrn Pdrsn': 'Markus Holmgren Pedersen',
  'Mohamed Almnai': 'Mohamed Manai',
  'Rvbn Vargas': 'Ruben Vargas',
  'Rvmanv Ashmid': 'Romano Schmid',
  'Abas Bk Fiz Allh Af': 'Abubakkar Fayzullaev',
  'Ali Avlvan': 'Ali Olwan',
  'Hassan Mohamed Altmbkti': 'Hassan Altambakti',
  'Lviiz Diaz': 'Luis Díaz',
  'Kamrvn Bargs': 'Cameron Burgess',
};

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
    'Cristiano Ronaldo': '克里斯蒂亚诺·罗纳尔多',
    'C. Ronaldo': '克里斯蒂亚诺·罗纳尔多',
  'Leandro Trossard': '特罗萨德',
  'Riyad Mahrez': '马赫雷斯',
  'Nicolas Pépé': '尼古拉·佩佩',
  'Pape Gueye': '帕普·盖伊',
  'Wilson Isidor': '威尔逊·伊西多尔',
  'Petar Sučić': '佩塔尔·苏契奇',
  'Nikola Vlašić': '尼古拉·弗拉希奇',
  'Désiré Doué': '德西雷·杜埃',
  'Achraf Hakimi': '阿什拉夫·哈基米',
  'Alexis Saelemaekers': '亚历克西斯·萨勒梅克斯',
  'Amine Gouiri': '阿明·古伊里',
  'Ante Budimir': '安特·布迪米尔',
  'Arda Güler': '阿尔达·居勒尔',
  'Casemiro': '卡塞米罗',
  'Daizen Maeda': '前田大然',
  'Gabriel Martinelli': '加布里埃尔·马丁内利',
  'Kevin De Bruyne': '凯文·德布劳内',
  'Lautaro Martínez': '劳塔罗·马丁内斯',
  'Leroy Sané': '勒罗伊·萨内',
  'Marcel Sabitzer': '马塞尔·萨比策',
  'Marko Arnautović': '马克·阿瑙托维奇',
  'Rafael Leão': '拉斐尔·莱奥',
  'Romelu Lukaku': '罗梅卢·卢卡库',
  'Yassine Bounou': '亚辛·布努',
  'Kaishū Sano': '佐野海舟',
  'Habib Diarra': '哈比卜·迪亚拉',
  'Hassan Al-Haydos': '哈桑·海多斯',
  'Issa Diop': '伊萨·迪奥',
  'Sebastian Berhalter': '塞巴斯蒂安·柏哈尔特',
  'Auston Trusty': '奥斯汀·特拉斯蒂',
  'Álex Baena': '阿莱士·巴埃纳',
  'Álvaro Fidalgo': '阿尔瓦罗·费达尔戈',
  'Alis Skhiri': '埃利斯·斯希里',
  'Al Rashdan': '拉什丹',
  'Baris Alpr Ailmaz': '巴里斯·伊尔马兹',
  'Gessime Yassine': '盖西姆·亚辛',
  'Mahmoud Saber': '马哈茂德·萨贝尔',
  'Mateo Chávez': '马特奥·查韦斯',
  'Saša Kalajdžić': '萨沙·卡拉季奇',
  'Thelo Aasgaard': '西奥·阿斯加德',
  'Dan Ndoye': '丹·恩多耶',
  'Hannibal Mejbri': '汉尼拔·梅布里',
  'Mohammed Kudus': '穆罕默德·库杜斯',
  'Donyell Malen': '多尼尔·马伦',
  'Julio Enciso': '胡利奥·恩西索',
  'Abdulvohid Nematov': '阿卜杜勒沃希德·内马托夫',
  'Alisher Shomuradov': '阿利舍尔·绍穆拉多夫',
  'Edin Dzeko': '埃丁·哲科',
  'Ermedin Demirovic': '埃尔梅丁·德米罗维奇',
  'Stephen Eustáquio': '斯蒂芬·欧斯塔基奥',
  'Thapelo Maseko': '塔佩洛·马塞科',
  'Iliman Ndiaye': '伊利曼·恩迪亚耶',
  'Musa Al-Taamari': '穆萨·塔阿马里',
  'Jovan Ilic': '约万·伊利奇',
  'Sofiane Rahimi': '索菲扬·拉希米',
  'Fiston Mayele': '菲斯顿·马耶勒',
  'Kaan Ayhan': '卡安·艾汗',
  'Nuno Mendes': '努诺·门德斯',
  'Gonzalo Plata': '贡萨洛·普拉塔',
  'Nilson Angulo': '尼尔森·安古洛',
  'Abubakkar Fayzullaev': '法伊祖拉耶夫',
  'Daniel Muñoz': '丹尼尔·穆尼奥斯',
  'Finn Surman': '芬恩·瑟曼',
  'Helio Varela': '赫利奥·瓦雷拉',
  'Yazan Al-Arab': '亚赞·阿拉布',
  'João Manzambi': '若昂·曼赞比',
  'Caleb Yirenkyi': '凯勒布·伊伦基',
  'Haminton Campaz': '哈明顿·坎帕斯',
  'Markus Holmgren Pedersen': '马库斯·霍姆格伦·佩德森',
  'Mohamed Manai': '穆罕默德·马奈',
  'Ruben Vargas': '鲁文·瓦尔加斯',
  'Romano Schmid': '罗曼诺·施密德',
  'Ali Olwan': '阿里·奥尔万',
  'Hassan Altambakti': '哈桑·坦巴克提',
  'Armin Dedic': '阿明·迪迪奇',
  'Bradley Barcola': '巴尔科拉',
  'João Neves': '若昂·内维斯',
  'Alexander Isak': '伊萨克',
  'Viktor Gyökeres': '哲凯赖什',
  'Marcus Rashford': '马库斯·拉什福德',
  'Yoane Wissa': '扬·维萨',
  'Cameron Burgess': '卡梅伦·博吉斯',
  'Ayase Ueda': '上田绮世',
  'Cody Gakpo': '加克波',
  'Deniz Undav': '翁达夫',
};

const LASTNAME_TO_ZH = {
  Messi: '梅西',
  Ronaldo: '罗纳尔多',
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
  Trossard: '特罗萨德',
  Mahrez: '马赫雷斯',
  Pépé: '佩佩',
  Gueye: '盖伊',
  Isidor: '伊西多尔',
  Sučić: '苏契奇',
  Vlašić: '弗拉希奇',
  Doué: '杜埃',
  Hakimi: '哈基米',
  Saelemaekers: '萨勒梅克斯',
  Gouiri: '古伊里',
  Budimir: '布迪米尔',
  Güler: '居勒尔',
  Casemiro: '卡塞米罗',
  Maeda: '前田大然',
  Martinelli: '马丁内利',
  Bruyne: '德布劳内',
  Sané: '萨内',
  Sabitzer: '萨比策',
  Arnautović: '阿瑙托维奇',
  Lukaku: '卢卡库',
  Bounou: '布努',
  Sano: '佐野海舟',
  Diarra: '迪亚拉',
  'Al-Haydos': '海多斯',
  Diop: '迪奥',
  Berhalter: '柏哈尔特',
  Trusty: '特拉斯蒂',
  Baena: '巴埃纳',
  Fidalgo: '费达尔戈',
  Skhiri: '斯希里',
  Rashdan: '拉什丹',
  Ailmaz: '伊尔马兹',
  Saber: '萨贝尔',
  Chávez: '查韦斯',
  Kalajdžić: '卡拉季奇',
  Aasgaard: '阿斯加德',
  Ndoye: '恩多耶',
  Mejbri: '梅布里',
  Kudus: '库杜斯',
  Malen: '马伦',
  Enciso: '恩西索',
  Nematov: '内马托夫',
  Shomuradov: '绍穆拉多夫',
  Dzeko: '哲科',
  Demirovic: '德米罗维奇',
  Eustáquio: '欧斯塔基奥',
  Maseko: '马塞科',
  Ndiaye: '恩迪亚耶',
  'Al-Taamari': '塔阿马里',
  Ilic: '伊利奇',
  Rahimi: '拉希米',
  Mayele: '马耶勒',
  Ayhan: '艾汗',
  Mendes: '门德斯',
  Plata: '普拉塔',
  Angulo: '安古洛',
  Manai: '马奈',
  Vargas: '瓦尔加斯',
  Olwan: '奥尔万',
  Altambakti: '坦巴克提',
  Dedic: '迪迪奇',
  Barcola: '巴尔科拉',
  Neves: '内维斯',
  Wissa: '维萨',
  Burgess: '博吉斯',
  Ueda: '上田绮世',
  Surman: '瑟曼',
  Varela: '瓦雷拉',
  Manzambi: '曼赞比',
  Yirenkyi: '伊伦基',
  Campaz: '坎帕斯',
  Pedersen: '佩德森',
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

  const s = normalizeQuotes(raw).replace(/(\d+)'+(\d+'?)/g, '$1+$2');
  const results = [];
  const re = /([^",{]+?)\s+(\d+(?:\+\d+)?)\s*'(?:\(OG\))?/gu;

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

function gameCountsForScorers(game) {
  if (game.finished === 'TRUE') return true;
  const elapsed = String(game.time_elapsed || '').toLowerCase();
  if (elapsed === 'finished') return true;

  const hasParsedScorers = (side) => parseScorersField(game[`${side}_scorers`]).length > 0;
  return hasParsedScorers('home') || hasParsedScorers('away');
}

function countScorerGames(games) {
  return (games || []).filter((g) => gameCountsForScorers(g)).length;
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
  casemiro: '卡塞米罗',
  cristiano: '克里斯蒂亚诺',
  leandro: '莱andro',
  riyad: '里亚德',
  achraf: '阿什拉夫',
  alexis: '亚历克西斯',
  amine: '阿明',
  ante: '安特',
  arda: '阿尔达',
  daizen: '大然',
  gabriel: '加布里埃尔',
  lautaro: '劳塔罗',
  leroy: '勒罗伊',
  marcel: '马塞尔',
  marko: '马克',
  nikola: '尼古拉',
  petar: '佩塔尔',
  rafael: '拉斐尔',
  romelu: '罗梅卢',
  wilson: '威尔逊',
  yassine: '亚辛',
  habib: '哈比卜',
  issa: '伊萨',
  sebastian: '塞巴斯蒂安',
  auston: '奥斯汀',
  mateo: '马特奥',
  thelo: '西奥',
  dan: '丹',
  hannibal: '汉尼拔',
  donyell: '多尼尔',
  julio: '胡利奥',
  edin: '埃丁',
  ermedin: '埃尔梅丁',
  stephen: '斯蒂芬',
  thapelo: '塔佩洛',
  iliman: '伊利曼',
  jovan: '约万',
  sofiane: '索法iane',
  fiston: '菲斯顿',
  kaan: '卡安',
  nuno: '努诺',
  gonzalo: '贡萨洛',
  nilson: '尼尔森',
  nicolas: '尼古拉',
  pape: '帕普',
  finn: '芬恩',
  ruben: '鲁文',
  romano: '罗曼诺',
  ousmane: '奥斯曼',
  breel: '布雷尔',
  brian: '布莱恩',
  felix: '费利克斯',
  nathan: '内森',
  anthony: '安东尼',
  franck: '弗兰克',
  helio: '赫利奥',
  jovo: '约沃',
  ramin: '拉明',
  yoane: '扬',
  cody: '科迪',
  deniz: '德尼兹',
  ayase: 'Ayase',
  abubakkar: '阿布巴卡尔',
  alisher: '阿利舍尔',
  abdulvohid: '阿卜杜勒沃希德',
  musa: '穆萨',
  baris: '巴里斯',
  gessime: '盖西姆',
  saša: '萨沙',
  kaishu: '海舟',
  kaishū: '海舟',
};

const LATIN_CHAR_ZH = {
  a: '阿', b: '布', c: '克', d: '德', e: '埃', f: '夫', g: '格', h: '赫', i: '伊',
  j: '杰', k: '克', l: '尔', m: '姆', n: '恩', o: '奥', p: '普', q: '克', r: '尔',
  s: '斯', t: '特', u: '乌', v: '维', w: '韦', x: '克斯', y: '伊', z: '兹',
};

const LATIN_SYLLABLE_ZH = {
  sch: '施', str: '斯特', chr: '克尔', sh: '什', ch: '奇', th: '思', ph: '夫', ck: '克',
  ng: '恩', ou: '乌', ai: '艾', ei: '埃', ia: '亚', io: '奥', ea: '亚', ee: '伊', oo: '乌',
  an: '安', en: '恩', in: '因', on: '昂', er: '尔', ar: '阿尔', or: '奥尔', el: '埃尔',
  al: '阿尔', ez: '斯', es: '斯', son: '森', ton: '顿', man: '曼', lan: '兰', mar: '马尔',
  car: '卡尔', bar: '巴尔', sar: '萨尔', van: '范', del: '德尔', ron: '龙',
};

function repairPlayerName(name) {
  const normalized = normalizePlayerName(name);
  return CORRUPTED_NAME_REPAIR[normalized] || CORRUPTED_NAME_REPAIR[name] || normalized;
}

function hasLatinText(value) {
  if (!value) return false;
  if (/[\u4e00-\u9fff]/.test(value)) {
    return /[A-Za-zÀ-ÿ]{2,}/.test(value);
  }
  return /[A-Za-zÀ-ÿ]/.test(value);
}

function phoneticLatinToZh(name) {
  const parts = normalizePlayerName(name).split(/\s+/).filter(Boolean);
  return parts
    .map((part) => {
      const lower = stripAccents(part).toLowerCase();
      let i = 0;
      const buf = [];
      while (i < lower.length) {
        let matched = false;
        for (const size of [4, 3, 2, 1]) {
          const chunk = lower.slice(i, i + size);
          const zh = LATIN_SYLLABLE_ZH[chunk] || LATIN_WORD_TO_ZH[chunk];
          if (zh) {
            buf.push(zh);
            i += size;
            matched = true;
            break;
          }
        }
        if (!matched) {
          buf.push(LATIN_CHAR_ZH[lower[i]] || '');
          i += 1;
        }
      }
      return buf.join('') || part;
    })
    .join('·');
}

function isGarbledZhName(zh) {
  if (!zh) return true;
  return hasLatinText(zh);
}

function resolvePlayerZh(name) {
  const raw = normalizePlayerName(name);
  const canonical = repairPlayerName(raw);
  const candidates = [canonical, raw, name];

  for (const key of candidates) {
    if (PLAYER_EN_TO_ZH[key]) return PLAYER_EN_TO_ZH[key];
  }

  const snapshot = getPlayerZhSnapshot();
  for (const key of candidates) {
    const zh = snapshot?.[key];
    if (zh && !isGarbledZhName(zh)) return zh;
  }

  const lastnameZh = lookupLastnameZh(canonical);
  if (lastnameZh) {
    const parts = canonical.split(/\s+/);
    if (parts.length === 1 || /^[A-Z]\.?/.test(parts[0])) return lastnameZh;
  }

  const zh = transliterateLatinName(canonical);
  if (!hasLatinText(zh)) return zh;
  if (lastnameZh) return lastnameZh;

  const phonetic = phoneticLatinToZh(canonical);
  return hasLatinText(phonetic) ? phoneticLatinToZh(repairPlayerName(raw)) : phonetic;
}

function playerNameZh(name) {
  return resolvePlayerZh(name);
}

function buildScorersFromGames(games, teamsById, zhFlagMap) {
  const agg = new Map();

  games.forEach((g) => {
    if (!gameCountsForScorers(g)) return;

    ['home', 'away'].forEach((side) => {
      const teamEn = g[`${side}_team_name_en`] || g[`${side}_team_label`];
      const teamId = g[`${side}_team_id`];
      const { team: teamZh, teamFlag: flag } = resolveScorerTeam(teamEn, teamsById, zhFlagMap);

      parseScorersField(g[`${side}_scorers`]).forEach(({ name }) => {
        const key = `${teamEn || teamZh}::${playerKey(name)}`;
        const existing = agg.get(key) || {
          playerEn: name,
          player: playerNameZh(name),
          team: teamZh,
          teamFlag: flag,
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

function buildScorersFromApi(apiScorers, teamsById, zhFlagMap) {
  const rows = (apiScorers || []).map((row, i) => {
    const playerEn = row.playerEn || row.player || '';
    const teamEn = row.teamEn || row.team || '';
    const { team: teamZh, teamFlag } = resolveScorerTeam(teamEn, teamsById, zhFlagMap);
    return {
      rank: i + 1,
      playerEn,
      player: playerNameZh(playerEn),
      team: teamZh,
      teamFlag,
      flag: teamFlag,
      goals: Number(row.goals) || 0,
      assists: Number(row.assists) || 0,
      minutes: row.minutes || '-',
    };
  });

  let rank = 1;
  return rows.map((s, i) => {
    if (i > 0 && s.goals < rows[i - 1].goals) rank = i + 1;
    return { ...s, rank };
  });
}
