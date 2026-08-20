const EVENTS_API =
  'https://painel.topfotos.com.br/api/pages/events/list';
const PHOTOGRAPHER_ID = 'aa12f6ec-5d65-4fa7-a435-5da6155be6a0';
const DEFAULT_IMAGE =
  'https://ik.imagekit.io/yg7h35ptj/public/assets/company/banner-default.jpg?tr=w-1200,h-630,c-at_max';

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const fetchEventsPage = async (page) => {
  const url = new URL(EVENTS_API);
  url.searchParams.set('photographer', PHOTOGRAPHER_ID);
  url.searchParams.set('page', String(page));

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Events API returned ${response.status}`);
  return response.json();
};

const findEvent = async (eventId) => {
  const firstPage = await fetchEventsPage(1);
  const firstMatch = (firstPage.results || []).find(
    (event) => event.id === eventId
  );
  if (firstMatch) return firstMatch;

  const pageSize = firstPage.results?.length || 20;
  const totalPages = Math.ceil((firstPage.count || 0) / pageSize);
  if (totalPages <= 1) return null;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchEventsPage(index + 2)
    )
  );
  for (const page of remainingPages) {
    const match = (page.results || []).find((event) => event.id === eventId);
    if (match) return match;
  }
  return null;
};

const buildMetadata = ({ event, canonicalUrl }) => {
  const eventName = event?.name || 'Galeria de evento';
  const title = `${eventName} | Rafael Publicado`;
  const description = event?.city
    ? `Veja e encontre suas fotos do evento ${eventName}, em ${event.city}.`
    : `Veja e encontre suas fotos do evento ${eventName}.`;
  const image = event?.image || DEFAULT_IMAGE;
  const imageAlt = `Capa do evento ${eventName}`;

  return `
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Rafael Publicado Audiovisual" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
};

export default {
  async fetch(request) {
    const requestUrl = new URL(request.url);
    const eventId = requestUrl.searchParams.get('id');
    if (!eventId) {
      return new Response('Evento não informado.', { status: 400 });
    }

    try {
      const [event, appResponse] = await Promise.all([
        findEvent(eventId),
        fetch(`${requestUrl.origin}/index.html`),
      ]);

      if (!appResponse.ok) {
        throw new Error(`App HTML returned ${appResponse.status}`);
      }

      const canonicalUrl = `${requestUrl.origin}/evento/${encodeURIComponent(
        eventId
      )}`;
      const metadata = buildMetadata({ event, canonicalUrl });
      const appHtml = await appResponse.text();
      const title = `${event?.name || 'Galeria de evento'} | Rafael Publicado`;
      const html = appHtml
        .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
        .replace('</head>', `${metadata}\n  </head>`);

      return new Response(html, {
        status: event ? 200 : 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
        },
      });
    } catch (error) {
      console.error('event preview error', error);
      return new Response('Não foi possível carregar o evento.', {
        status: 502,
      });
    }
  },
};
