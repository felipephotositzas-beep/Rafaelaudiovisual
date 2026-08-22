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
    <priority>0.5</priority>
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

// Keep verification file as well
let html = fs.readFileSync('dist/index.html', 'utf8');
if (!html.includes('google-site-verification')) {
  html = html.replace('<title>Rafael Publicado | Cobertura Audiovisual de Eventos & Fotos</title>', '<title>Rafael Publicado | Cobertura Audiovisual de Eventos & Fotos</title><meta name="google-site-verification" content="GS_8RDPnRNJIh-i-8NHgpB188b78OA3tFt2j3eR7j5k" />');
  fs.writeFileSync('dist/index.html', html);
}
