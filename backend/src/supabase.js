const DEFAULT_SELECT = [
  'id',
  'slug',
  'name',
  'cuisines',
  'address',
  'neighborhood',
  'city',
  'phone',
  'whatsapp',
  'description',
  'image',
  'latitude',
  'longitude',
  'temporarily_closed',
  'is_published',
  'hours',
  'menu_categories(id,name,position,menu_items(id,name,description,price,image_url,available,position))',
].join(',');

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

function requireSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new ApiError(503, 'Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no backend.');
  }
}

export async function supabaseRequest(path, { method = 'GET', accessToken, body, prefer } = {}) {
  requireSupabaseConfig();
  const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${accessToken || apiKey}`,
    Accept: 'application/json',
  };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(502, 'Não foi possível conectar ao Supabase.');
  }

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || 'Falha ao acessar o Supabase.';
    throw new ApiError(response.status, message, payload?.code || payload?.error);
  }

  return payload;
}

export async function signUp(email, password) {
  const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/gestao/entrar?confirmacao=1`;
  const query = new URLSearchParams({ redirect_to: redirectTo });
  return supabaseRequest(`/auth/v1/signup?${query}`, { method: 'POST', body: { email, password } });
}

export function signIn(email, password) {
  return supabaseRequest('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
}

export function refreshSession(refreshToken) {
  return supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
}

export function signOut(accessToken) {
  return supabaseRequest('/auth/v1/logout?scope=global', { method: 'POST', accessToken });
}

export function getUser(accessToken) {
  return supabaseRequest('/auth/v1/user', { accessToken });
}

export function selectEstablishmentQuery(extra = {}) {
  return new URLSearchParams({ select: DEFAULT_SELECT, ...extra });
}

export function toEstablishment(row) {
  const categories = [...(row.menu_categories || [])]
    .sort((a, b) => a.position - b.position)
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: [...(category.menu_items || [])]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || undefined,
          price: Number(item.price),
          image: item.image_url || undefined,
          available: item.available,
        })),
    }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    cuisines: row.cuisines || [],
    address: row.address,
    neighborhood: row.neighborhood,
    city: row.city,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    description: row.description || undefined,
    image: row.image || undefined,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    published: row.is_published,
    temporarilyClosed: row.temporarily_closed,
    hours: row.hours || {},
    categories,
  };
}

export function slugify(value) {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'estabelecimento'}-${crypto.randomUUID().slice(0, 8)}`;
}

export function haversineKm(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
