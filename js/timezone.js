/* 球场当地时间 → 北京时间 / 美东时间 */

const STADIUM_TIMEZONE = {
  1: 'America/Mexico_City',
  2: 'America/Mexico_City',
  3: 'America/Monterrey',
  4: 'America/Chicago',
  5: 'America/Chicago',
  6: 'America/Chicago',
  7: 'America/New_York',
  8: 'America/New_York',
  9: 'America/New_York',
  10: 'America/New_York',
  11: 'America/New_York',
  12: 'America/Toronto',
  13: 'America/Vancouver',
  14: 'America/Los_Angeles',
  15: 'America/Los_Angeles',
  16: 'America/Los_Angeles',
};

const STADIUM_VENUE_ZH = {
  1: '墨西哥城',
  2: '瓜达拉哈拉',
  3: '蒙特雷',
  4: '达拉斯',
  5: '休斯顿',
  6: '堪萨斯城',
  7: '亚特兰大',
  8: '迈阿密',
  9: '波士顿',
  10: '费城',
  11: '纽约/新泽西',
  12: '多伦多',
  13: '温哥华',
  14: '西雅图',
  15: '旧金山湾区',
  16: '洛杉矶',
};

function parseLocalDateParts(localDateStr) {
  const [datePart, timePart] = String(localDateStr || '').trim().split(/\s+/);
  if (!datePart || !timePart) return null;
  const [mm, dd, yyyy] = datePart.split('/').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if (!mm || !dd || !yyyy || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { yyyy, mm, dd, hour, minute };
}

function localInTzToUtcMs(parts, timeZone) {
  let utc = Date.UTC(parts.yyyy, parts.mm - 1, parts.dd, parts.hour, parts.minute);

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  for (let i = 0; i < 6; i += 1) {
    const got = Object.fromEntries(
      fmt.formatToParts(new Date(utc))
        .filter((p) => p.type !== 'literal')
        .map((p) => [p.type, Number(p.value)])
    );
    const diffMin =
      (parts.hour - got.hour) * 60 +
      (parts.minute - got.minute) +
      (parts.dd - got.day) * 1440 +
      (parts.mm - got.month) * 43200 +
      (parts.yyyy - got.year) * 525600;
    if (diffMin === 0) break;
    utc += diffMin * 60 * 1000;
  }

  return utc;
}

function formatInTimeZone(utcMs, timeZone, withDate) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(utcMs))
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );
  const time = `${parts.hour}:${parts.minute}`;
  if (!withDate) return { time };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time,
  };
}

function scheduleFromStadiumLocal(localDateStr, stadiumId) {
  const sid = Number(stadiumId);
  const parts = parseLocalDateParts(localDateStr);
  const timeZone = STADIUM_TIMEZONE[sid];
  if (!parts || !timeZone) return null;

  const utcMs = localInTzToUtcMs(parts, timeZone);
  const beijing = formatInTimeZone(utcMs, 'Asia/Shanghai', true);
  const eastern = formatInTimeZone(utcMs, 'America/New_York', false);

  return {
    date: beijing.date,
    time: beijing.time,
    timeET: `${eastern.time} ET`,
    venue: STADIUM_VENUE_ZH[sid] || null,
  };
}

function beijingToday() {
  return formatInTimeZone(Date.now(), 'Asia/Shanghai', true).date;
}
