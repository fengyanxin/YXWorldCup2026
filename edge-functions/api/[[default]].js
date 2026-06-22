const API_BASE = 'https://worldcup26.ir';
const ALLOWED_PREFIXES = ['/get/games', '/get/groups', '/get/teams', '/get/stadiums', '/get/game/'];
const SYNC_ENDPOINTS = ['/get/games', '/get/groups', '/get/teams'];
const SYNC_CACHE_TTL_MS = 20_000;

let syncCache = { payload: null, ts: 0 };

function normalizePayload(endpoint, raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (endpoint.endsWith('/get/games')) return Array.isArray(data) ? data : data.games || data;
  if (endpoint.endsWith('/get/groups')) return Array.isArray(data) ? data : data.groups || data;
  if (endpoint.endsWith('/get/teams')) return Array.isArray(data) ? data : data.teams || data;
  return data;
}

async function fetchUpstream(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'User-Agent': 'worldcup-2026/1.0', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${endpoint} → ${res.status}`);
  return normalizePayload(endpoint, await res.text());
}

async function buildSyncPayload(force = false) {
  const now = Date.now();
  if (!force && syncCache.payload && now - syncCache.ts < SYNC_CACHE_TTL_MS) {
    return { ...syncCache.payload, fromCache: true };
  }

  const [games, groups, teams] = await Promise.all(SYNC_ENDPOINTS.map((ep) => fetchUpstream(ep)));
  const payload = {
    games,
    groups,
    teams,
    syncedAt: now,
    fromCache: false,
  };
  syncCache = { payload, ts: now };
  return payload;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const endpoint = url.pathname.replace(/^\/api/, '') + url.search;

  if (endpoint.startsWith('/sync')) {
    const force = ['1', 'true', 'yes'].includes(url.searchParams.get('force'));
    try {
      const payload = await buildSyncPayload(force);
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  if (!ALLOWED_PREFIXES.some((p) => endpoint.startsWith(p))) {
    return new Response(JSON.stringify({ error: 'API route not allowed' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const upstream = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'User-Agent': 'worldcup-2026/1.0',
        Accept: 'application/json',
      },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
