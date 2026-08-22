const fs = require('fs');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://rafaelpublicado.com.br/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://rafaelpublicado.com.br/admin</loc>
    <changefreq>monthly</changefreq>
    <priority>0.1</priority>
  </url>
</urlset>`;

const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /disparador

Sitemap: https://rafaelpublicado.com.br/sitemap.xml
`;

fs.writeFileSync('dist/sitemap.xml', sitemap);
fs.writeFileSync('dist/robots.txt', robots);

const seoTags = `
    <!-- INÍCIO SEO AVANÇADO RAFAEL PUBLICADO -->
    <meta name="description" content="Cobertura audiovisual profissional, fotografia de eventos, festas, casamentos, formaturas e ensaios fotográficos por Rafael Publicado. Acesse a loja de fotos!" />
    <meta name="keywords" content="fotógrafo, fotografia, cobertura audiovisual, fotos de eventos, loja de fotos, comprar fotos de evento, fotógrafo profissional, Rafael Publicado" />
    <meta name="author" content="Rafael Publicado" />
    <meta name="robots" content="index, follow" />
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://rafaelpublicado.com.br/" />
    <meta property="og:title" content="Rafael Publicado | Cobertura Audiovisual & Fotografia" />
    <meta property="og:description" content="Eternizando momentos. Acesse para comprar e baixar suas fotos do evento diretamente com o fotógrafo oficial." />
    <meta property="og:image" content="https://ik.imagekit.io/yg7h35ptj/public/assets/company/banner-default.jpg" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://rafaelpublicado.com.br/" />
    <meta property="twitter:title" content="Rafael Publicado | Cobertura Audiovisual & Fotografia" />
    <meta property="twitter:description" content="Eternizando momentos. Acesse para comprar e baixar suas fotos." />
    <meta property="twitter:image" content="https://ik.imagekit.io/yg7h35ptj/public/assets/company/banner-default.jpg" />

    <!-- Schema.org para Google (Structured Data) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "PhotographyBusiness",
      "name": "Rafael Publicado Audiovisual",
      "image": "https://ik.imagekit.io/yg7h35ptj/public/assets/company/banner-default.jpg",
      "url": "https://rafaelpublicado.com.br",
      "description": "Serviços profissionais de fotografia e cobertura de eventos. Loja online para acesso a fotos de clientes.",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "BR"
      },
      "priceRange": "$$"
    }
    </script>
    <!-- FIM SEO AVANÇADO -->
`;

let html = fs.readFileSync('dist/index.html', 'utf8');

// Always restore to base to prevent duplicate appends on repeated runs
html = html.replace(/<!-- INÍCIO SEO AVANÇADO RAFAEL PUBLICADO -->[\s\S]*<!-- FIM SEO AVANÇADO -->/g, '');
html = html.replace('<title>rafaelpublicado</title>', '<title>Rafael Publicado | Cobertura Audiovisual de Eventos & Fotos</title><meta name="google-site-verification" content="GS_8RDPnRNJIh-i-8NHgpB188b78OA3tFt2j3eR7j5k" />');

// Inject the big SEO block right after <meta charset="utf-8" />
if (!html.includes('INÍCIO SEO AVANÇADO')) {
    html = html.replace('<meta charset="utf-8" />', '<meta charset="utf-8" />' + seoTags);
}

fs.writeFileSync('dist/index.html', html);
