export const featuredLocations = [
  { slug: 'aeroporto', name: 'Aeroporto', city: 'Imperatriz / MA', search: 'aeroporto', image: 'https://ik.imagekit.io/yg7h35ptj/public/assets/Screenshot_2026-07-02_at_23.05.40.png?tr=w-640,h-430,c-at_max' },
  { slug: 'santa-ines', name: 'Santa Inês', city: 'Imperatriz / MA', search: 'santa ines', image: 'https://ik.imagekit.io/yg7h35ptj/public/assets/Screenshot_2026-07-02_at_23.11.27.png?tr=w-640,h-430,c-at_max' },
  { slug: 'beira-rio', name: 'Beira Rio', city: 'Imperatriz / MA', search: 'beira rio', image: 'https://ik.imagekit.io/yg7h35ptj/public/assets/Screenshot_2026-07-02_at_23.04.17.png?tr=w-640,h-430,c-at_max' },
  { slug: 'bernardo-sayao', name: 'Bernardo Sayão', city: 'Imperatriz / MA', search: 'bernardo', image: 'https://ik.imagekit.io/yg7h35ptj/public/assets/Screenshot_2026-07-03_at_08.20.34.png?tr=w-640,h-430,c-at_max' },
  { slug: 'pedro-neiva', name: 'Pedro Neiva', city: 'Imperatriz / MA', search: 'pedro neiva', image: 'https://ik.imagekit.io/yg7h35ptj/public/assets/Screenshot_2026-07-02_at_23.11.45.png?tr=w-640,h-430,c-at_max' },
];

export const findFeaturedLocation = (slug) => featuredLocations.find((location) => location.slug === slug);
