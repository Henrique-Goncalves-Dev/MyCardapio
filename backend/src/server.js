import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  ApiError,
  getUser,
  haversineKm,
  isSupabaseConfigured,
  refreshSession,
  selectEstablishmentQuery,
  signIn,
  signOut,
  signUp,
  slugify,
  supabaseRequest,
  toEstablishment,
} from './supabase.js';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv(resolve(here, '../.env'));

const PORT = Number(process.env.PORT || 3333);
const ALLOWED_ORIGINS = new Set(
  (process.env.FRONTEND_ORIGINS || 'http://localhost:4200,http://localhost:8100')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const MAX_BODY_BYTES = 1024 * 1024;

function loadEnv(path) {
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch {
    return;
  }

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  }
}

function sendJson(response, status, payload, origin) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new ApiError(413, 'O corpo da requisição excede 1 MB.');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('invalid object');
    return value;
  } catch {
    throw new ApiError(400, 'Envie um objeto JSON válido.');
  }
}

function getBearerToken(request) {
  const match = request.headers.authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function requireUser(request) {
  const token = getBearerToken(request);
  if (!token) throw new ApiError(401, 'Entre na sua conta para continuar.');
  try {
    const user = await getUser(token);
    if (!user?.id) throw new ApiError(401, 'Sessão inválida.');
    return { id: user.id, email: user.email, token };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw new ApiError(401, 'Sessão inválida ou expirada.');
    throw error;
  }
}

function validateHours(hours) {
  if (hours === undefined) return undefined;
  if (!hours || typeof hours !== 'object' || Array.isArray(hours)) throw new ApiError(400, 'Horários inválidos.');
  for (const [day, periods] of Object.entries(hours)) {
    if (!['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].includes(day) || !Array.isArray(periods)) {
      throw new ApiError(400, 'Horários inválidos.');
    }
    for (const period of periods) {
      if (!/^\d{2}:\d{2}$/.test(period?.opens || '') || !/^\d{2}:\d{2}$/.test(period?.closes || '')) {
        throw new ApiError(400, 'Informe horários válidos no formato HH:MM.');
      }
      const [openHour, openMinute] = period.opens.split(':').map(Number);
      const [closeHour, closeMinute] = period.closes.split(':').map(Number);
      if (openHour > 23 || closeHour > 23 || openMinute > 59 || closeMinute > 59 || period.opens === period.closes) {
        throw new ApiError(400, 'Informe horários válidos e diferentes para abertura e fechamento.');
      }
    }
  }
  return hours;
}

function validateProfile(body, creating) {
  const fields = ['name', 'address', 'neighborhood', 'city', 'phone', 'whatsapp', 'description', 'image', 'latitude', 'longitude', 'temporarily_closed'];
  const result = {};
  for (const field of fields) {
    if (body[field] === undefined) continue;
    if (['name', 'address', 'neighborhood', 'city', 'phone', 'whatsapp', 'description', 'image'].includes(field)) {
      if (body[field] !== null && typeof body[field] !== 'string') throw new ApiError(400, `O campo ${field} deve ser texto.`);
      result[field] = typeof body[field] === 'string' ? body[field].trim() : null;
    } else if (field === 'temporarily_closed') {
      if (typeof body[field] !== 'boolean') throw new ApiError(400, 'O status de fechamento deve ser verdadeiro ou falso.');
      result[field] = body[field];
    } else {
      if (body[field] !== null && (typeof body[field] !== 'number' || !Number.isFinite(body[field]))) {
        throw new ApiError(400, 'Coordenadas inválidas.');
      }
      result[field] = body[field];
    }
  }

  if (body.cuisines !== undefined) {
    if (!Array.isArray(body.cuisines) || body.cuisines.some((value) => typeof value !== 'string')) {
      throw new ApiError(400, 'Tipos de comida inválidos.');
    }
    result.cuisines = [...new Set(body.cuisines.map((value) => value.trim()).filter(Boolean))];
  }

  if (body.hours !== undefined) result.hours = validateHours(body.hours);

  if ((result.latitude === null) !== (result.longitude === null)) throw new ApiError(400, 'Informe latitude e longitude juntas.');
  if (result.latitude !== undefined && result.latitude !== null && (result.latitude < -90 || result.latitude > 90)) {
    throw new ApiError(400, 'Latitude fora do intervalo válido.');
  }
  if (result.longitude !== undefined && result.longitude !== null && (result.longitude < -180 || result.longitude > 180)) {
    throw new ApiError(400, 'Longitude fora do intervalo válido.');
  }

  if (creating && (!String(body.name || '').trim() || !String(body.address || '').trim() || !String(body.city || '').trim())) {
    throw new ApiError(400, 'Nome, endereço e cidade são obrigatórios.');
  }
  if (creating && result.cuisines === undefined) result.cuisines = [];
  if (creating && result.hours === undefined) result.hours = {};

  for (const field of ['name', 'address', 'city']) {
    if (result[field] !== undefined && !String(result[field]).trim()) throw new ApiError(400, `${field} é obrigatório.`);
  }

  return result;
}

function searchScore(entry, term) {
  const value = (text) => (text || '').toLocaleLowerCase('pt-BR');
  const name = value(entry.name);
  const cuisines = value(entry.cuisines.join(' '));
  const location = value(`${entry.neighborhood} ${entry.city}`);
  const dishes = value(entry.categories.flatMap((category) => [category.name, ...category.items.map((item) => item.name)]).join(' '));
  return (name.startsWith(term) ? 8 : name.includes(term) ? 6 : 0) +
    (cuisines.includes(term) ? 4 : 0) +
    (location.includes(term) ? 3 : 0) +
    (dishes.includes(term) ? 2 : 0);
}

async function getOwnEstablishment(user, { published = false } = {}) {
  const query = selectEstablishmentQuery({ owner_id: `eq.${user.id}`, limit: '1' });
  const rows = await supabaseRequest(`/rest/v1/establishments?${query}`, { accessToken: user.token });
  if (!rows.length) throw new ApiError(404, 'Sua conta ainda não tem um estabelecimento cadastrado.');
  if (published && !rows[0].is_published) throw new ApiError(409, 'Publique o estabelecimento para continuar.');
  return rows[0];
}

async function handle(request, response) {
  const origin = request.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) throw new ApiError(403, 'Origem não autorizada.');

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Access-Control-Max-Age': '600',
    });
    response.end();
    return;
  }

  const url = new URL(request.url || '/', 'http://localhost');
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (request.method === 'GET' && path === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'mycardapio-api', supabaseConfigured: isSupabaseConfigured() }, origin);
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/signup') {
    const body = await readJson(request);
    if (!/^\S+@\S+\.\S+$/.test(body.email || '') || typeof body.password !== 'string' || body.password.length < 8) {
      throw new ApiError(400, 'Informe um e-mail válido e uma senha com pelo menos 8 caracteres.');
    }
    const result = await signUp(body.email.trim().toLowerCase(), body.password);
    sendJson(response, 201, {
      user: result.user ? { id: result.user.id, email: result.user.email } : null,
      session: result.session || null,
      emailConfirmationRequired: !result.session,
    }, origin);
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/login') {
    const body = await readJson(request);
    if (!/^\S+@\S+\.\S+$/.test(body.email || '') || typeof body.password !== 'string') {
      throw new ApiError(400, 'Informe e-mail e senha válidos.');
    }
    const session = await signIn(body.email.trim().toLowerCase(), body.password);
    sendJson(response, 200, session, origin);
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/refresh') {
    const body = await readJson(request);
    if (typeof body.refresh_token !== 'string' || !body.refresh_token) throw new ApiError(400, 'Token de renovação ausente.');
    sendJson(response, 200, await refreshSession(body.refresh_token), origin);
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/logout') {
    const user = await requireUser(request);
    await signOut(user.token);
    response.writeHead(204, origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {});
    response.end();
    return;
  }

  if (request.method === 'GET' && path === '/api/auth/me') {
    const user = await requireUser(request);
    sendJson(response, 200, { id: user.id, email: user.email }, origin);
    return;
  }

  if (request.method === 'GET' && path === '/api/establishments') {
    const query = selectEstablishmentQuery({ is_published: 'eq.true', order: 'name.asc', limit: '500' });
    const rows = await supabaseRequest(`/rest/v1/establishments?${query}`);
    let entries = rows.map(toEstablishment);
    const term = (url.searchParams.get('q') || '').trim().toLocaleLowerCase('pt-BR');
    const cuisine = (url.searchParams.get('cuisine') || '').trim();
    if (cuisine) entries = entries.filter((entry) => entry.cuisines.includes(cuisine));
    if (term) entries = entries.filter((entry) => {
      const fields = [entry.name, entry.city, entry.neighborhood, ...entry.cuisines,
        ...entry.categories.flatMap((category) => [category.name, ...category.items.map((item) => item.name)])];
      return fields.some((field) => field.toLocaleLowerCase('pt-BR').includes(term));
    });

    const latitude = Number(url.searchParams.get('latitude'));
    const longitude = Number(url.searchParams.get('longitude'));
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const viewer = { latitude, longitude };
      entries = entries
        .filter((entry) => Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude))
        .sort((a, b) => haversineKm(viewer, a) - haversineKm(viewer, b));
    }
    sendJson(response, 200, entries, origin);
    return;
  }

  const publicEntry = path.match(/^\/api\/establishments\/([^/]+)$/);
  if (request.method === 'GET' && publicEntry) {
    const slug = decodeURIComponent(publicEntry[1]);
    const query = selectEstablishmentQuery({ slug: `eq.${slug}`, is_published: 'eq.true', limit: '1' });
    const rows = await supabaseRequest(`/rest/v1/establishments?${query}`);
    if (!rows.length) throw new ApiError(404, 'Estabelecimento não encontrado.');
    sendJson(response, 200, toEstablishment(rows[0]), origin);
    return;
  }

  if (request.method === 'GET' && path === '/api/me/establishment') {
    const user = await requireUser(request);
    sendJson(response, 200, toEstablishment(await getOwnEstablishment(user)), origin);
    return;
  }

  if ((request.method === 'POST' || request.method === 'PATCH') && path === '/api/me/establishment') {
    const user = await requireUser(request);
    const body = await readJson(request);
    const profile = validateProfile(body, request.method === 'POST');
    if (request.method === 'POST') {
      const rows = await supabaseRequest('/rest/v1/establishments?select=id', {
        method: 'POST',
        accessToken: user.token,
        prefer: 'return=representation',
        body: { ...profile, slug: slugify(profile.name) },
      });
      const query = selectEstablishmentQuery({ id: `eq.${rows[0].id}`, limit: '1' });
      const full = await supabaseRequest(`/rest/v1/establishments?${query}`, { accessToken: user.token });
      sendJson(response, 201, toEstablishment(full[0]), origin);
      return;
    }

    const current = await getOwnEstablishment(user);
    const rows = await supabaseRequest(`/rest/v1/establishments?id=eq.${current.id}&owner_id=eq.${user.id}`, {
      method: 'PATCH',
      accessToken: user.token,
      prefer: 'return=representation',
      body: profile,
    });
    sendJson(response, 200, toEstablishment(rows[0]), origin);
    return;
  }

  if (request.method === 'PUT' && path === '/api/me/menu') {
    const user = await requireUser(request);
    const body = await readJson(request);
    if (!Array.isArray(body.categories)) throw new ApiError(400, 'Envie categorias em formato de lista.');
    if (body.categories.some((category) => typeof category?.name !== 'string' || !category.name.trim() || !Array.isArray(category.items))) {
      throw new ApiError(400, 'Cada categoria precisa de nome e lista de itens.');
    }
    await getOwnEstablishment(user);
    await supabaseRequest('/rest/v1/rpc/save_my_menu', {
      method: 'POST',
      accessToken: user.token,
      body: { p_categories: body.categories },
    });
    sendJson(response, 200, toEstablishment(await getOwnEstablishment(user)), origin);
    return;
  }

  if (request.method === 'POST' && (path === '/api/me/establishment/publish' || path === '/api/me/establishment/unpublish')) {
    const user = await requireUser(request);
    const entry = await getOwnEstablishment(user);
    const published = path.endsWith('/publish');
    if (published) {
      const mapped = toEstablishment(entry);
      if (!mapped.name.trim() || !mapped.address.trim() || !mapped.city.trim() || mapped.cuisines.length === 0 || !mapped.categories.some((category) => category.items.length > 0)) {
        throw new ApiError(409, 'Preencha perfil e cardápio antes de publicar.');
      }
    }
    const rows = await supabaseRequest(`/rest/v1/establishments?id=eq.${entry.id}&owner_id=eq.${user.id}`, {
      method: 'PATCH',
      accessToken: user.token,
      prefer: 'return=representation',
      body: { is_published: published },
    });
    sendJson(response, 200, { published: rows[0]?.is_published ?? published }, origin);
    return;
  }

  throw new ApiError(404, 'Rota não encontrada.');
}

const server = createServer(async (request, response) => {
  try {
    await handle(request, response);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : 'Erro interno do servidor.';
    if (status >= 500) console.error(`API error ${error?.code || error?.name || 'unknown'}`);
    if (response.headersSent) {
      response.destroy();
      return;
    }
    const origin = request.headers.origin && ALLOWED_ORIGINS.has(request.headers.origin) ? request.headers.origin : undefined;
    sendJson(response, status, { error: message, ...(error instanceof ApiError && error.code ? { code: error.code } : {}) }, origin);
  }
});

server.listen(PORT, () => {
  console.log(`MyCardapio API listening on http://localhost:${PORT}`);
});
