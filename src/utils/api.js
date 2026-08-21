// Configuração centralizada da API
// Integração Multi-Fotógrafo e White-Label com o backend Top Fotos

export const API_BASE = 'https://painel.topfotos.com.br';
export const DEFAULT_PHOTOGRAPHER_ID = 'aa12f6ec-5d65-4fa7-a435-5da6155be6a0';
export const DEFAULT_PHOTOGRAPHER_SLUG = 'rafael-costa';

// Cache em memória de eventos para resposta instantânea (0ms)
const eventsCache = new Map();

// Substitui '/api/...' por 'https://painel.topfotos.com.br/api/...'
const buildUrl = (path) => `${API_BASE}${path}`;

const buildHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...extra,
});

// ─── RESOLUÇÃO DINÂMICA DE PERFIL DE FOTÓGRAFO ──────────────────────────────

/**
 * Resolve o perfil público de um fotógrafo a partir de uma URL ou slug (ex: https://topfotos.com.br/perfil/rafael-costa)
 * Retorna { id, name, slug, avatar, bio, profileUrl }
 */
export const resolvePhotographerProfile = async (urlOrSlug) => {
  if (!urlOrSlug) throw new Error('Informe o link ou slug do fotógrafo.');

  let slug = urlOrSlug.trim();
  if (slug.includes('topfotos.com.br/perfil/')) {
    slug = slug.split('topfotos.com.br/perfil/')[1].split('/')[0].split('?')[0];
  } else if (slug.startsWith('http')) {
    slug = slug.split('/').filter(Boolean).pop().split('?')[0];
  }

  // Se já for um UUID direto
  const isUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(slug);

  try {
    const profilePageUrl = isUuid
      ? `https://topfotos.com.br/perfil/${slug}`
      : `https://topfotos.com.br/perfil/${encodeURIComponent(slug)}`;

    const res = await fetch(profilePageUrl);
    if (!res.ok) {
      throw new Error('Não foi possível acessar a página do fotógrafo.');
    }

    const html = await res.text();

    // Extrai o UUID do fotógrafo
    const uuidMatches = html.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi);
    const photographerId = isUuid ? slug : (uuidMatches && uuidMatches[0] ? uuidMatches[0] : null);

    if (!photographerId) {
      throw new Error('Não foi possível identificar o ID deste fotógrafo na Top Fotos.');
    }

    // Extrai o Nome do fotógrafo
    let name = 'Fotógrafo Top Fotos';
    const titleMatch = html.match(/<title>([^<|]+)[^<]*<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      name = titleMatch[1].trim();
    } else {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match && h1Match[1]) name = h1Match[1].trim();
    }

    // Extrai o Avatar do fotógrafo
    let avatar = 'https://ik.imagekit.io/yg7h35ptj/public/assets/temp_nt2ARuj.jpeg';
    const imgMatches = html.match(/https:\/\/ik\.imagekit\.io\/[^"'\s\)]+/gi);
    if (imgMatches && imgMatches.length > 0) {
      const bestAvatar = imgMatches.find((u) => u.includes('profile') || u.includes('avatar') || u.includes('temp_'));
      if (bestAvatar) avatar = bestAvatar;
    }

    return {
      id: photographerId,
      name,
      slug: slug || photographerId,
      avatar,
      profileUrl: profilePageUrl,
      active: true,
    };
  } catch (error) {
    console.warn('Erro em resolvePhotographerProfile:', error);
    throw error;
  }
};

// ─── EVENTOS (Suporte Multi-Fotógrafo e Deduplicação Instantânea) ─────────────

export const fetchEventsForPhotographer = (photographerId, params = {}, options = {}) => {
  const query = new URLSearchParams({
    photographer: photographerId || DEFAULT_PHOTOGRAPHER_ID,
    ...params,
  });
  return fetch(buildUrl(`/api/pages/events/list?${query}`), options);
};

export const fetchEvents = (params = {}, options = {}) => {
  return fetchEventsForPhotographer(DEFAULT_PHOTOGRAPHER_ID, params, options);
};

// Busca inicial ultra-rápida (Apenas Página 1 de cada fotógrafo ativo)
export const fetchQuickInitialEvents = async (photographers = [], params = {}, options = {}) => {
  const activePhotographers = photographers.filter((p) => p && p.active !== false);
  const targetIds = activePhotographers.length > 0
    ? activePhotographers.map((p) => p.id)
    : [DEFAULT_PHOTOGRAPHER_ID];

  const eventsMap = new Map();

  // Requisições paralelas para a página 1 (leva menos de 1 segundo)
  const resultsArr = await Promise.all(
    targetIds.map(async (photogId) => {
      try {
        const res = await fetchEventsForPhotographer(photogId, { ...params, page: 1 }, options);
        if (res.ok) {
          const data = await res.json();
          return { photogId, events: data.results || [] };
        }
      } catch {}
      return { photogId, events: [] };
    })
  );

  for (const { photogId, events } of resultsArr) {
    for (const ev of events) {
      if (!ev || !ev.id) continue;
      const existing = eventsMap.get(ev.id);
      if (!existing) {
        eventsMap.set(ev.id, {
          ...ev,
          photographersContributing: [photogId],
        });
      } else {
        if (!existing.photographersContributing.includes(photogId)) {
          existing.photographersContributing.push(photogId);
        }
      }
    }
  }

  const results = Array.from(eventsMap.values());
  results.sort((a, b) => {
    const dateA = new Date(a.event_date || a.date || a.created_at || 0).getTime();
    const dateB = new Date(b.event_date || b.date || b.created_at || 0).getTime();
    return dateB - dateA;
  });

  return results;
};

// Busca completa de todos os eventos em segundo plano
export const fetchMultiPhotographerEvents = async (
  photographers = [],
  params = {},
  options = {},
  onProgress = null
) => {
  const activePhotographers = photographers.filter((p) => p && p.active !== false);
  const targetIds = activePhotographers.length > 0
    ? activePhotographers.map((p) => p.id)
    : [DEFAULT_PHOTOGRAPHER_ID];

  const cacheKey = targetIds.sort().join(',');
  const cached = eventsCache.get(cacheKey);

  // Se já tiver em cache na memória, retorna imediatamente (0 ms)
  if (cached && cached.length > 0) {
    if (onProgress) onProgress(cached);
  }

  const eventsMap = new Map();
  if (cached) {
    for (const ev of cached) eventsMap.set(ev.id, ev);
  }

  // 1. Busca rápida da Página 1
  const initial = await fetchQuickInitialEvents(photographers, params, options);
  for (const ev of initial) {
    eventsMap.set(ev.id, ev);
  }

  if (onProgress) {
    const intermediate = Array.from(eventsMap.values()).sort((a, b) => {
      const dateA = new Date(a.event_date || a.date || a.created_at || 0).getTime();
      const dateB = new Date(b.event_date || b.date || b.created_at || 0).getTime();
      return dateB - dateA;
    });
    onProgress(intermediate);
  }

  // 2. Busca paralela controlada das páginas 2 a 10
  await Promise.all(
    targetIds.map(async (photogId) => {
      // Faz fetch paralelo das páginas 2, 3, 4, 5, 6, 7, 8
      const pagesToFetch = [2, 3, 4, 5, 6, 7, 8];
      const pagePromises = pagesToFetch.map((p) =>
        fetchEventsForPhotographer(photogId, { ...params, page: p }, options)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      );

      const responses = await Promise.all(pagePromises);
      for (const data of responses) {
        if (!data || !data.results) continue;
        for (const ev of data.results) {
          if (!ev || !ev.id) continue;
          const existing = eventsMap.get(ev.id);
          if (!existing) {
            eventsMap.set(ev.id, {
              ...ev,
              photographersContributing: [photogId],
            });
          } else {
            if (!existing.photographersContributing.includes(photogId)) {
              existing.photographersContributing.push(photogId);
            }
          }
        }
      }
    })
  );

  const results = Array.from(eventsMap.values());
  results.sort((a, b) => {
    const dateA = new Date(a.event_date || a.date || a.created_at || 0).getTime();
    const dateB = new Date(b.event_date || b.date || b.created_at || 0).getTime();
    return dateB - dateA;
  });

  // Salva no cache
  eventsCache.set(cacheKey, results);

  return {
    ok: true,
    status: 200,
    json: async () => ({
      count: results.length,
      next: null,
      previous: null,
      results,
    }),
  };
};

export const fetchAllEvents = async (params = {}, options = {}) => {
  return fetchMultiPhotographerEvents([{ id: DEFAULT_PHOTOGRAPHER_ID, active: true }], params, options);
};

export const fetchEventById = async (eventId, options = {}) => {
  if (!eventId || eventId === 'undefined') {
    return {
      ok: false,
      status: 400,
      json: async () => ({}),
    };
  }

  // Tenta detalhe direto da API primeiro
  try {
    const directRes = await fetchEventDetail(eventId);
    if (directRes.ok) {
      return directRes;
    }
  } catch {}

  const response = await fetchAllEvents({}, options);
  if (!response.ok) return response;

  const data = await response.json();
  const event = (data.results || []).find((item) => item.id === eventId);

  return {
    ok: Boolean(event),
    status: event ? 200 : 404,
    json: async () => event || {},
  };
};

export const fetchEventDetail = async (eventId) => {
  return fetch(buildUrl(`/api/panel/events/detail/${encodeURIComponent(eventId)}`));
};

export const fetchModalities = () =>
  fetch(buildUrl('/api/panel/modality'));

export const fetchStates = () =>
  fetch(buildUrl('/api/panel/events/states'));

export const fetchEventPrivacy = async (eventSlug) => {
  if (!eventSlug) return false;
  try {
    const res = await fetch(`https://topfotos.com.br/${eventSlug}`);
    if (!res.ok) return false;
    const html = await res.text();
    const match = html.match(/var\s+eventPrivacy\s*=\s*(true|false)/);
    return match ? match[1] === 'true' : false;
  } catch {
    return false;
  }
};

// ─── FOTOS & MÍDIAS (Suporte a Fotógrafo Específico ou Geral) ────────────────

export const fetchPhotos = (
  eventId,
  page = 1,
  mediaType = 'photo',
  photographerId = null
) => {
  if (!eventId || eventId === 'undefined' || typeof eventId !== 'string') {
    return Promise.resolve({
      ok: false,
      status: 400,
      json: async () => ({ count: 0, num_pages: 0, results: [] }),
    });
  }
  const query = new URLSearchParams({
    page: String(page),
    media_type: mediaType,
  });
  if (photographerId) {
    query.append('photographer_id', photographerId);
    query.append('photographer', photographerId);
  }
  return fetch(buildUrl(`/api/photo/list/${encodeURIComponent(eventId)}?${query}`));
};

export const searchByFace = async (
  eventId,
  imageDataUrl,
  photographerId = null
) => {
  if (!eventId || eventId === 'undefined') {
    return Promise.resolve({
      ok: false,
      status: 400,
      json: async () => ({ count: 0, results: [] }),
    });
  }
  const formData = new FormData();
  formData.append('photo', imageDataUrl);

  const photographerPath = photographerId ? `/${encodeURIComponent(photographerId)}` : '';
  return fetch(buildUrl(`/api/photo/search-by-photo/${encodeURIComponent(eventId)}${photographerPath}`), {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
    body: formData,
  });
};

// ─── CARRINHO ─────────────────────────────────────────────────────────────────

export const fetchCart = (cartId) =>
  fetch(buildUrl(`/api/cart/${cartId}`));

export const addPhotoToCart = (cartId, photoId) =>
  fetch(buildUrl(`/api/cart/${cartId}/add/photo`), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ reference: photoId, item_type: 'photo' }),
  });

export const removePhotoFromCart = (cartId, cartItemId) =>
  fetch(buildUrl(`/api/cart/${cartId}/remove/${cartItemId}`), {
    method: 'DELETE',
    headers: buildHeaders(),
  });

export const applyCouponApi = (cartId, couponCode) =>
  fetch(buildUrl(`/api/cart/${cartId}/apply/coupon`), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ coupon: couponCode }),
  });

export const removeCouponApi = (cartId) =>
  fetch(buildUrl(`/api/cart/${cartId}/remove/coupon`), {
    method: 'DELETE',
    headers: buildHeaders(),
  });

// ─── CHECKOUT ─────────────────────────────────────────────────────────────────

export const fetchCustomerInfo = (cpf) =>
  fetch(buildUrl('/api/customer/info'), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ cpf }),
  });

export const fetchCustomerOrders = (cpf) =>
  fetch(buildUrl('/api/customer/orders'), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ cpf }),
  });

export const fetchOrder = (orderId) =>
  fetch(buildUrl(`/api/order/${orderId}`));

export const fetchOrderPix = (orderId) =>
  fetch(buildUrl(`/api/order/checkout-pix/${orderId}`));

export const submitCheckout = (payload) =>
  fetch(buildUrl('/api/order/checkout'), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

// ─── CARTÃO DE CRÉDITO (PAGAR.ME V5) ──────────────────────────────────────────

export const PAGARME_APP_ID = 'pk_xDwnxNBiVetZ01Xy';

export const tokenizeCardPagarme = async (cardData, appId = PAGARME_APP_ID) => {
  const expParts = (cardData.expiration || '').split('/');
  const expMonth = parseInt(expParts[0] || '1', 10);
  const rawYear = expParts[1] ? expParts[1].trim() : '28';
  const expYear = parseInt(rawYear.length === 2 ? `20${rawYear}` : rawYear, 10);

  const body = {
    type: 'card',
    card: {
      number: (cardData.number || '').replace(/\s/g, ''),
      holder_name: (cardData.name || '').trim().toUpperCase(),
      holder_document: (cardData.document || '').replace(/\D/g, ''),
      exp_month: expMonth,
      exp_year: expYear,
      cvv: (cardData.cvv || '').trim(),
    },
  };

  const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${appId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.errors?.[0]?.message ||
      err?.message ||
      'Falha na validação dos dados do cartão.';
    throw new Error(message);
  }

  const data = await res.json();
  return data.id; // card token (e.g. token_...)
};

export const submitCheckoutCreditCard = (
  orderId,
  cardToken,
  cardDocument,
  installments = 1
) => {
  return fetch(buildUrl(`/api/order/checkout-credit/${orderId}`), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      card_token: cardToken,
      card_document: (cardDocument || '').replace(/\D/g, ''),
      installments: Number(installments) || 1,
    }),
  });
};
