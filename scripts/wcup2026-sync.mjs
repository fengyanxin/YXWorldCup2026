const SCORERS_URL = 'https://wcup2026.org/api/data.php?action=scorers';

export function isApifootballPlanError(message) {
  const lower = String(message || '').toLowerCase();
  return lower.includes('free plans do not have access') || lower.includes('try from 2022 to 2024');
}

export function countFinishedGames(games) {
  return (games || []).filter((game) => {
    if (game.finished === 'TRUE') return true;
    return String(game.time_elapsed || '').toLowerCase() === 'finished';
  }).length;
}

export async function fetchWcup2026Scorers() {
  const res = await fetch(SCORERS_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'worldcup-2026/1.0' },
  });
  if (!res.ok) throw new Error(`wcup2026 scorers → ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'wcup2026 scorers failed');
  return (data.scorers || [])
    .filter((row) => row.goals != null)
    .map((row) => ({
      playerEn: String(row.name || '').trim(),
      teamEn: String(row.team || '').trim(),
      goals: Number(row.goals),
      assists: Number(row.assists || 0),
    }))
    .sort((a, b) => b.goals - a.goals || a.playerEn.localeCompare(b.playerEn));
}

export async function attachWcup2026Scorers(payload) {
  try {
    payload.scorers = await fetchWcup2026Scorers();
    payload.scorersSource = 'wcup2026.org';
  } catch (err) {
    payload.scorersWarning = String(err);
  }
  return payload;
}
