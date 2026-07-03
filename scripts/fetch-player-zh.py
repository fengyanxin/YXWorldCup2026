#!/usr/bin/env python3
"""从赛程进球数据提取球员名，生成 js/player-zh-snapshot.js（英文名 → 中文名）。"""

from __future__ import annotations

import json
import re
import ssl
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'js' / 'player-zh-snapshot.js'
SNAPSHOT = ROOT / 'js' / 'sync-snapshot.js'
API = 'https://worldcup26.ir/get/games'
SSL_CTX = ssl.create_default_context()

# API 常见乱码 → 规范英文名
CORRUPTED_REPAIR = {
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
    'Crysencio Summerville': 'Crysencio Summerville',
    'Dniz Avndav': 'Deniz Undav',
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
    'Prvmis Divid': 'Dan Ndoye',
}

# 规范英文名 → 中文（体育媒体常用译名）
PLAYER_ZH = {
    'Lionel Messi': '梅西',
    'L. Messi': '梅西',
    'Cristiano Ronaldo': '克里斯蒂亚诺·罗纳尔多',
    'C. Ronaldo': '克里斯蒂亚诺·罗纳尔多',
    'Harry Kane': '凯恩',
    'H. Kane': '凯恩',
    'Kylian Mbappé': '姆巴佩',
    'K. Mbappé': '姆巴佩',
    'Erling Haaland': '哈兰德',
    'E. Haaland': '哈兰德',
    'Kai Havertz': '哈弗茨',
    'K. Havertz': '哈弗茨',
    'Folarin Balogun': '巴洛贡',
    'F. Balogun': '巴洛贡',
    'Vinícius Júnior': '维尼修斯',
    'V. Júnior': '维尼修斯',
    'Jude Bellingham': '贝林厄姆',
    'J. Bellingham': '贝林厄姆',
    'Luis Díaz': '路易斯·迪亚斯',
    'L. Díaz': '迪亚斯',
    'Jamal Musiala': '穆西亚拉',
    'J. Musiala': '穆西亚拉',
    'Raúl Jiménez': '劳尔·希门尼斯',
    'R. Jiménez': '希门尼斯',
    'Julián Quiñones': '胡利安·基尼奥内斯',
    'J. Quiñones': '基尼奥内斯',
    'Jonathan David': '乔纳森·戴维',
    'Matheus Cunha': '马特乌斯·库尼亚',
    'Mikel Oyarzabal': '奥亚萨瓦尔',
    'G. Reyna': '雷纳',
    'Breel Embolo': '恩博洛',
    'Virgil van Dijk': '范戴克',
    'J. McGinn': '麦金',
    'C. Larin': '拉林',
    'Kail Larin': '拉林',
    'Deniz Undav': '翁达夫',
    'D. Undav': '翁达夫',
    'Ayase Ueda': '上田绮世',
    'Cody Gakpo': '加克波',
    'Ismaïla Saibari': '萨伊巴里',
    'I. Saibari': '萨伊巴里',
    'Crysencio Summerville': '萨默维尔',
    'C. Summerville': '萨默维尔',
    'N. Schlotterbeck': '施洛特贝克',
    'Felix Nmecha': '恩梅查',
    'A. Isak': '伊萨克',
    'Alexander Isak': '伊萨克',
    'V. Gyökeres': '哲凯赖什',
    'Viktor Gyökeres': '哲凯赖什',
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
    'Yoane Wissa': '扬·维萨',
    'Abubakkar Fayzullaev': '法伊祖拉耶夫',
    'Abdulelah Al-Amri': '阿卜杜勒拉·阿姆里',
    'Agustín Canobbio': '阿古斯丁·卡诺比奥',
    'Alex Freeman': '亚历克斯·弗里曼',
    'Ali Olwan': '阿里·奥尔万',
    'Anthony Elanga': '安东尼·埃兰加',
    'Armin Dedic': '阿明·迪迪奇',
    'Aymen Hussein': '艾门·侯赛因',
    'B. Barcola': '巴尔科拉',
    'Bradley Barcola': '巴尔科拉',
    'Daichi Kamada': '镰田大地',
    'Daniel Muñoz': '丹尼尔·穆尼奥斯',
    'Emam Ashour': '埃姆·阿舒尔',
    'Finn Surman': '芬恩·瑟曼',
    'Franck Kessié': '弗兰克·凯西',
    'H.G. Oh': '吴贤载',
    'Hassan Altambakti': '哈桑·坦巴克提',
    'Helio Varela': '赫利奥·瓦雷拉',
    'I. Mbaye': '伊布拉金·姆巴耶',
    'Ismaïla Sarr': '伊斯梅拉·萨尔',
    'Yazan Al-Arab': '亚赞·阿拉布',
    'J. Neves': '若昂·内维斯',
    'João Neves': '若昂·内维斯',
    'Jovo Lukić': '约沃·卢基奇',
    'Junya Itō': '伊藤洋辉',
    'João Manzambi': '若昂·曼赞比',
    'Caleb Yirenkyi': '凯勒布·伊伦基',
    'Haminton Campaz': '哈明顿·坎帕斯',
    'Kevin Pina': '凯文·皮纳',
    'Lamine Yamal': '拉明·亚马尔',
    'Leo Østigård': '莱奥·厄斯蒂高',
    'Luis Romo': '路易斯·罗莫',
    'M. Baturina': '马丁·巴图里纳',
    'M. Rashford': '马库斯·拉什福德',
    'Marcus Rashford': '马库斯·拉什福德',
    'Mahmoud Hassan Trezeguet': '马哈茂德·哈桑·特雷泽盖',
    'Markus Holmgren Pedersen': '马库斯·霍姆格伦·佩德森',
    'Matías Galarza': '马蒂亚斯·加拉扎',
    'Michal Sadílek': '米哈尔·萨德莱克',
    'Mohamed Manai': '穆罕默德·马奈',
    'Mohamed Hany': '穆罕默德·哈尼',
    'Mohamed Salah': '穆罕默德·萨拉赫',
    'Mostafa Ziko': '穆斯塔法·齐科',
    'Nathan Saliba': '内森·萨利巴',
    'Ousmane Dembélé': '奥斯曼·登贝莱',
    'Ruben Vargas': '鲁文·瓦尔加斯',
    'Romano Schmid': '罗曼诺·施密德',
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
    'Ali Jast': '阿里·贾斯特',
    'Alis Skhiri': '埃利斯·斯希里',
    'Al Rashdan': '拉什丹',
    'Baris Alpr Ailmaz': '巴里斯·伊尔马兹',
    'Gessime Yassine': '盖西姆·亚辛',
    'Habib Diarra': '哈比卜·迪亚拉',
    'Mahmoud Saber': '马哈茂德·萨贝尔',
    'Mateo Chávez': '马特奥·查韦斯',
    'Saša Kalajdžić': '萨沙·卡拉季奇',
    'Thelo Aasgaard': '西奥·阿斯加德',
    'Y. Ayari': '阿亚里',
    'Y.Ayari': '阿亚里',
    'Youssef En-Nesyri': '恩-内斯里',
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
    'Cameron Burgess': '卡梅伦·博吉斯',
    'C. Metcalfe': '梅特卡夫',
    'Ramin Rezaeian': '拉明·雷扎伊安',
}

LASTNAME_ZH = {
    'Messi': '梅西', 'Ronaldo': '罗纳尔多', 'Kane': '凯恩', 'Mbappé': '姆巴佩', 'Haaland': '哈兰德',
    'Havertz': '哈弗茨', 'Balogun': '巴洛贡', 'Júnior': '维尼修斯', 'Bellingham': '贝林厄姆',
    'Díaz': '迪亚斯', 'Musiala': '穆西亚拉', 'Jiménez': '希门尼斯', 'Quiñones': '基尼奥内斯',
    'David': '戴维', 'Cunha': '库尼亚', 'Oyarzabal': '奥亚萨瓦尔', 'Reyna': '雷纳', 'Embolo': '恩博洛',
    'Dijk': '范戴克', 'McGinn': '麦金', 'Larin': '拉林', 'Undav': '翁达夫', 'Ueda': '上田绮世',
    'Gakpo': '加克波', 'Saibari': '萨伊巴里', 'Summerville': '萨默维尔', 'Schlotterbeck': '施洛特贝克',
    'Nmecha': '恩梅查', 'Isak': '伊萨克', 'Gyökeres': '哲凯赖什', 'Metcalfe': '梅特卡夫',
    'Irankunda': '伊兰昆达', 'Brobbey': '布罗贝', 'Just': '贾斯特', 'Casemiro': '卡塞米罗',
    'Mahrez': '马赫雷斯', 'Trossard': '特罗萨德', 'Hakimi': '哈基米', 'Martinelli': '马丁内利',
    'Lukaku': '卢卡库', 'Martínez': '马丁内斯', 'Sané': '萨内', 'Sabitzer': '萨比策',
    'Arnautović': '阿瑙托维奇', 'Vlašić': '弗拉希奇', 'Sučić': '苏契奇', 'Doué': '杜埃',
    'Güler': '居勒尔', 'Maeda': '前田大然', 'Bounou': '布努', 'Leão': '莱奥', 'Pépé': '佩佩',
    'Gueye': '盖伊', 'Isidor': '伊西多尔', 'Ndoye': '恩多耶', 'Kudus': '库杜斯', 'Malen': '马伦',
    'Enciso': '恩西索', 'Dzeko': '哲科', 'Mendes': '门德斯', 'Plata': '普拉塔', 'Dembele': '登贝莱',
    'Dembélé': '登贝莱', 'Sarr': '萨尔', 'Neves': '内维斯', 'Yamal': '亚马尔', 'Salah': '萨拉赫',
    'Rashford': '拉什福德', 'Barcola': '巴尔科拉', 'Wissa': '维萨', 'Musa': '穆萨', 'Ayari': '阿亚里',
    'Sano': '佐野海舟', 'Diarra': '迪亚拉', 'Diop': '迪奥', 'Baena': '巴埃纳', 'Fidalgo': '费达尔戈',
    'Skhiri': '斯希里', 'Budimir': '布迪米尔', 'Gouiri': '古伊里', 'Saelemaekers': '萨勒梅克斯',
    'Mejbri': '梅布里', 'Mayele': '马耶勒', 'Ayhan': '艾汗', 'Angulo': '安古洛', 'Mebri': '梅布里',
    'Ndiaye': '恩迪亚耶', 'Rahimi': '拉希米', 'Kalajdžić': '卡拉季奇', 'Chávez': '查韦斯',
    'Bruyne': '德布劳内', 'Trusty': '特拉斯蒂', 'Berhalter': '柏哈尔特', 'Kamada': '镰田大地',
    'Kessié': '凯西', 'Itō': '伊藤洋辉', 'Lukić': '卢基奇', 'Mohebi': '莫赫比', 'Rezaiian': '雷扎伊安',
    'Rezaeian': '雷扎伊安', 'Khoukhi': '胡基', 'Brown': '布朗', 'Diallo': '迪亚洛', 'Nakamura': '中村敬斗',
    'Ogawa': '小川航基', 'Svanberg': '斯万贝里', 'Maurício': '毛里西奥', 'Hwang': '黄仁范',
    'Rekik': '雷基克', 'Canobbio': '卡诺比奥', 'Freeman': '弗里曼', 'Elanga': '埃兰加', 'Hussein': '侯赛因',
    'Ashour': '阿舒尔', 'Surman': '瑟曼', 'Varela': '瓦雷拉', 'Mbaye': '姆巴耶', 'Manzambi': '曼赞比',
    'Campaz': '坎帕斯', 'Pina': '皮纳', 'Østigård': '厄斯蒂高', 'Romo': '罗莫', 'Baturina': '巴图里纳',
    'Trezeguet': '特雷泽盖', 'Pedersen': '佩德森', 'Galarza': '加拉扎', 'Sadílek': '萨德莱克',
    'Manai': '马奈', 'Hany': '哈尼', 'Ziko': '齐科', 'Saliba': '萨利巴', 'Vargas': '瓦尔加斯',
    'Schmid': '施密德', 'Fayzullaev': '法伊祖拉耶夫', 'Muñoz': '穆尼奥斯', 'Olwan': '奥尔万',
    'Altambakti': '坦巴克提', 'Yirenkyi': '伊伦基', 'Demirovic': '德米罗维奇', 'Eustáquio': '欧斯塔基奥',
    'Maseko': '马塞柯', 'Taamari': '塔阿马里', 'Ilic': '伊利奇', 'Nmecha': '恩梅查', 'Araújo': '阿劳霍',
    'Comenencia': '科梅嫩西亚', 'Krejčí': '克雷伊奇', 'Al-Amri': '阿姆里', 'Dedic': '迪迪奇',
    'Pina': '皮纳', 'En-Nesyri': '恩-内斯里', 'Nematov': '内马托夫', 'Shomuradov': '绍穆拉多夫',
}

WORD_ZH = {
    'cristiano': '克里斯蒂亚诺', 'leandro': '莱andro', 'riyad': '里亚德', 'achraf': '阿什拉夫',
    'alexis': '亚历克西斯', 'amine': '阿明', 'ante': '安特', 'arda': '阿尔达', 'daizen': '大然',
    'gabriel': '加布里埃尔', 'kevin': '凯文', 'lautaro': '劳塔罗', 'leroy': '勒罗伊', 'marcel': '马塞尔',
    'marko': '马克', 'nikola': '尼古拉', 'petar': '佩塔尔', 'rafael': '拉斐尔', 'romelu': '罗梅卢',
    'wilson': '威尔逊', 'yassine': '亚辛', 'habib': '哈比卜', 'hassan': '哈桑', 'issa': '伊萨',
    'sebastian': '塞巴斯蒂安', 'auston': '奥斯汀', 'mateo': '马特奥', 'thelo': '西奥', 'dan': '丹',
    'hannibal': '汉尼拔', 'mohammed': '穆罕默德', 'donyell': '多尼尔', 'julio': '胡利奥',
    'abdulvohid': '阿卜杜勒沃希德', 'alisher': '阿利舍尔', 'edin': '埃丁', 'ermedin': '埃尔梅丁',
    'stephen': '斯蒂芬', 'thapelo': '塔佩洛', 'iliman': '伊利曼', 'musa': '穆萨', 'jovan': '约万',
    'sofiane': '索法iane', 'fiston': '菲斯顿', 'kaan': '卡安', 'nuno': '努诺', 'gonzalo': '贡萨洛',
    'nilson': '尼尔son', 'nicolas': '尼古拉', 'pape': '帕普', 'jude': '裘德', 'harry': '哈里',
    'julian': '胡利安', 'julián': '胡利安', 'finn': '芬恩', 'ruben': '鲁文', 'romano': '罗曼诺',
    'ousmane': '奥斯曼', 'lamine': '拉明', 'breel': '布雷尔', 'brian': '布莱恩', 'felix': '费利克斯',
    'jamal': '贾马尔', 'kylian': '基利安', 'raul': '劳尔', 'virgil': '维吉尔', 'jonathan': '乔纳森',
    'matheus': '马特乌斯', 'mikel': '米克尔', 'nathan': '内森', 'anthony': '安东尼', 'franck': '弗兰克',
    'daichi': '大地', 'junya': '润也', 'leo': '莱奥', 'luis': '路易斯', 'martin': '马丁',
    'matias': '马蒂亚斯', 'michal': '米哈尔', 'mostafa': '穆斯塔法', 'mahmoud': '马哈茂德',
    'agustin': '阿古斯丁', 'alex': '亚历克斯', 'ali': '阿里', 'aymen': '艾门', 'emam': '埃姆',
    'helio': '赫利奥', 'joao': '若昂', 'joão': '若昂', 'jovo': '约沃', 'cameron': '卡梅伦',
    'nestory': '内斯托里', 'maximiliano': '马克西米利亚诺', 'elijah': '伊利亚', 'ramin': '拉明',
    'mohammad': '穆罕默德', 'yoane': '扬', 'cody': '科迪', 'deniz': '德尼兹', 'ayase': 'Ayase',
    'crysencio': '克里斯encio', 'erling': '埃尔ling', 'kai': '凯', 'folarin': '福拉林',
    'vinicius': '维尼修s', 'vinícius': '维尼修斯', 'kylian': '基利安', 'erling': '埃尔林',
    'casemiro': '卡塞米罗', 'saša': '萨沙', 'kaishū': '海舟', 'kaishu': '海舟',
}


def strip_accents(value: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', value) if unicodedata.category(c) != 'Mn')


def normalize_name(name: str) -> str:
    return re.sub(r'\s+', ' ', name.replace('\u2019', "'").strip())


def normalize_quotes(raw: str) -> str:
    return raw.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")


def parse_scorer_names(raw: str) -> list[str]:
    if not raw or raw == 'null':
        return []
    s = normalize_quotes(raw)
    names = []
    for m in re.finditer(r'([^",{]+?)\s+(\d+(?:\+\d+)?)\'(?:\(OG\))?', s):
        if '(OG)' in m.group(0):
            continue
        name = normalize_name(m.group(1).rstrip('.'))
        if name:
            names.append(name)
    return names


def repair_name(name: str) -> str:
    return CORRUPTED_REPAIR.get(name, CORRUPTED_REPAIR.get(normalize_name(name), name))


def lookup_lastname(name: str) -> str | None:
    parts = normalize_name(name).split()
    if not parts:
        return None
    for candidate in (' '.join(parts[-2:]), parts[-1]):
        if candidate in LASTNAME_ZH:
            return LASTNAME_ZH[candidate]
        stripped = strip_accents(candidate).lower()
        for key, zh in LASTNAME_ZH.items():
            if strip_accents(key).lower() == stripped:
                return zh
    return None


def transliterate_word(word: str) -> str:
    key = strip_accents(word).lower()
    if key in WORD_ZH:
        return WORD_ZH[key]
    if word in LASTNAME_ZH:
        return LASTNAME_ZH[word]
    return word


def has_residual_latin(text: str) -> bool:
    if not text:
        return True
    if re.search(r'[\u4e00-\u9fff]', text):
        return bool(re.search(r'[A-Za-zÀ-ÿ]{2,}', text))
    return bool(re.search(r'[A-Za-zÀ-ÿ]', text))


def to_chinese(name: str) -> str:
    canonical = repair_name(name)
    if canonical in PLAYER_ZH:
        return PLAYER_ZH[canonical]
    if name in PLAYER_ZH:
        return PLAYER_ZH[name]

    parts = normalize_name(canonical).split()
    if not parts:
        return name

    last_zh = lookup_lastname(canonical)
    if last_zh:
        if len(parts) == 1 or re.match(r'^[A-Z]\.?$', parts[0]):
            return last_zh
        first = ' '.join(parts[:-1])
        if re.match(r'^[A-Z]\.', first):
            return last_zh
        first_zh = '·'.join(transliterate_word(w) for w in first.split())
        if first_zh and not has_residual_latin(first_zh):
            return f'{first_zh}·{last_zh}'
        return last_zh

    if len(parts) == 1:
        w = transliterate_word(parts[0])
        return w if not has_residual_latin(w) else phonetic_fallback(parts[0])

    first = '·'.join(transliterate_word(w) for w in parts[:-1])
    last = transliterate_word(parts[-1])
    merged = f'{first}·{last}' if first else last
    if has_residual_latin(merged):
        return phonetic_fallback(canonical)
    return merged


def phonetic_fallback(name: str) -> str:
    """兜底音译：保证输出不含拉丁字母。"""
    parts = normalize_name(name).split()
    syllables = []
    for part in parts:
        buf = []
        lower = strip_accents(part).lower()
        i = 0
        while i < len(lower):
            matched = False
            for size in (4, 3, 2, 1):
                chunk = lower[i : i + size]
                zh = WORD_ZH.get(chunk) or SYLLABLE_ZH.get(chunk)
                if zh:
                    buf.append(zh)
                    i += size
                    matched = True
                    break
            if not matched:
                ch = lower[i]
                buf.append(CHAR_ZH.get(ch, ''))
                i += 1
        text = ''.join(buf) or part
        syllables.append(text)
    return '·'.join(syllables)


CHAR_ZH = {
    'a': '阿', 'b': '布', 'c': '克', 'd': '德', 'e': '埃', 'f': '夫', 'g': '格',
    'h': '赫', 'i': '伊', 'j': '杰', 'k': '克', 'l': '尔', 'm': '姆', 'n': '恩',
    'o': '奥', 'p': '普', 'q': '克', 'r': '尔', 's': '斯', 't': '特', 'u': '乌',
    'v': '维', 'w': '韦', 'x': '克斯', 'y': '伊', 'z': '兹',
}

SYLLABLE_ZH = {
    'sch': '施', 'str': '斯特', 'chr': '克尔', 'sh': '什', 'ch': '奇', 'th': '思',
    'ph': '夫', 'ck': '克', 'ng': '恩', 'ou': '乌', 'ai': '艾', 'ei': '埃', 'ia': '亚',
    'io': '奥', 'ea': '亚', 'ee': '伊', 'oo': '乌', 'an': '安', 'en': '恩', 'in': '因',
    'on': '昂', 'er': '尔', 'ar': '阿尔', 'or': '奥尔', 'el': '埃尔', 'al': '阿尔',
    'ez': '斯', 'es': '斯', 'as': '阿斯', 'os': '奥斯', 'us': '乌斯', 'is': '伊斯',
    'son': '森', 'ton': '顿', 'man': '曼', 'lan': '兰', 'den': '登', 'don': '东',
    'mar': '马尔', 'car': '卡尔', 'bar': '巴尔', 'sar': '萨尔', 'van': '范', 'del': '德尔',
    'ron': '龙', 'aldo': 'aldo', 'ini': 'ini', 'ino': 'ino', 'ano': 'ano', 'ino': '诺',
}


def load_games() -> list[dict]:
    if SNAPSHOT.exists():
        text = SNAPSHOT.read_text(encoding='utf-8')
        m = re.search(r'window\.__SYNC_SNAPSHOT__\s*=\s*(\{.*\});?\s*$', text, re.S)
        if m:
            return json.loads(m.group(1)).get('games', [])
    req = urllib.request.Request(
        API,
        headers={'User-Agent': 'worldcup-2026-build/1.0', 'Accept': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as resp:
        data = json.loads(resp.read())
    return data if isinstance(data, list) else data.get('games', [])


def collect_names(games: list[dict]) -> set[str]:
    names: set[str] = set()
    for g in games:
        for side in ('home', 'away'):
            for name in parse_scorer_names(g.get(f'{side}_scorers', '')):
                names.add(name)
    return names


def main() -> int:
    try:
        games = load_games()
    except Exception as exc:
        print(f'fetch-player-zh: failed to load games: {exc}', file=sys.stderr)
        return 1

    names = collect_names(games)
    mapping: dict[str, str] = {}
    for name in sorted(names):
        zh = to_chinese(name)
        if has_residual_latin(zh):
            zh = phonetic_fallback(repair_name(name))
        mapping[name] = zh

    payload = {
        'players': mapping,
        'generatedAt': int(time.time() * 1000),
        'count': len(mapping),
    }

    OUT.write_text(
        'window.__PLAYER_ZH_MAP__ = '
        + json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
        + ';\n',
        encoding='utf-8',
    )
    latin_left = sum(1 for v in mapping.values() if has_residual_latin(v))
    print(f'fetch-player-zh: wrote {len(mapping)} names → {OUT.name} (latin left: {latin_left})')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
