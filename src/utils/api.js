// Configuração centralizada da API
// Integração exclusiva com o perfil do fotógrafo Rafael Publicado (Rafael Costa)
// https://topfotos.com.br/perfil/rafael-costa

export const API_BASE = 'https://painel.topfotos.com.br';
export const DEFAULT_PHOTOGRAPHER_ID = 'aa12f6ec-5d65-4fa7-a435-5da6155be6a0';
export const DEFAULT_PHOTOGRAPHER_SLUG = 'rafael-costa';

// Substitui '/api/...' por 'https://painel.topfotos.com.br/api/...'
const buildUrl = (path) => `${API_BASE}${path}`;

const buildHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...extra,
});

// ─── EVENTOS (Exclusivo Rafael Publicado) ────────────────────────────────────

export const fetchEvents = (params = {}, options = {}) => {
  const query = new URLSearchParams({
    photographer: DEFAULT_PHOTOGRAPHER_ID,
    ...params,
  });
  return fetch(buildUrl(`/api/pages/events/list?${query}`), options);
};

// Busca todas as páginas de eventos da API simultaneamente
export const fetchAllEvents = async (params = {}, options = {}) => {
  try {
    const firstRes = await fetchEvents({ page: 1, ...params }, options);
    if (!firstRes.ok) return firstRes;
    const firstData = await firstRes.json();
    const count = firstData.count || 0;
    const pageSize = (firstData.results && firstData.results.length) || 20;
    const totalPages = Math.ceil(count / pageSize);

    let allResults = [...(firstData.results || [])];
    if (totalPages > 1) {
      const pagePromises = [];
      for (let p = 2; p <= totalPages; p++) {
        pagePromises.push(
          fetchEvents({ page: p, ...params }, options)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => (d && d.results ? d.results : []))
            .catch(() => [])
        );
      }
      const restResults = await Promise.all(pagePromises);
      for (const pageItems of restResults) {
        allResults = allResults.concat(pageItems);
      }
    }

    return {
      ok: true,
      json: async () => ({
        ...firstData,
        count: allResults.length,
        results: allResults,
      }),
    };
  } catch (error) {
    return fetchEvents(params, options);
  }
};

export const fetchEventById = async (eventId, options = {}) => {
  if (!eventId || eventId === 'undefined') {
    return {
      ok: false,
      status: 400,
      json: async () => ({}),
    };
  }

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

export const fetchPhotos = (eventId, page = 1, mediaType = 'photo', photographerId = DEFAULT_PHOTOGRAPHER_ID) => {
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

export const searchByFace = async (eventId, imageDataUrl, photographerId = DEFAULT_PHOTOGRAPHER_ID) => {
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
