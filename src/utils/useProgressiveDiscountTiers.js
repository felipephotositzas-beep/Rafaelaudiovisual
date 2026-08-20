import { useEffect, useMemo, useState } from 'react';
import { getProgressiveDiscountTiers } from './progressiveDiscountUtils';

const normalizeText = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toUpperCase();

const parseNumber = (value = '') => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTiersFromEventPage = (html) => {
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  const discountTitle = [...documentNode.querySelectorAll('h1, h2, h3')]
    .find((heading) => normalizeText(heading.textContent).includes('DESCONTO PROGRESSIVO'));

  if (!discountTitle) return [];

  const banner = discountTitle.parentElement?.parentElement;
  if (!banner) return [];

  return [...banner.querySelectorAll('h1')]
    .map((percentageHeading) => {
      const cardText = percentageHeading.parentElement?.textContent || '';
      const percentageMatch = percentageHeading.textContent?.match(/([\d.,]+)\s*%/);
      const quantityMatch = cardText.match(/ao\s+comprar\s+(\d+)\s+ou\s+mais/i);

      return {
        quantity: quantityMatch ? parseNumber(quantityMatch[1]) : null,
        percentage: percentageMatch ? parseNumber(percentageMatch[1]) : null
      };
    })
    .filter(({ quantity, percentage }) => (
      quantity !== null && quantity > 0 && percentage !== null && percentage > 0
    ))
    .sort((a, b) => a.quantity - b.quantity);
};

const buildPublicEventUrl = (eventData) => {
  const eventSlug = eventData?.slug;
  const photographerSlug = eventData?.owner?.slug;
  if (!eventSlug || !photographerSlug) return null;

  return `https://topfotos.com.br/${encodeURIComponent(eventSlug)}/${encodeURIComponent(photographerSlug)}`;
};

export const useProgressiveDiscountTiers = (eventData) => {
  const embeddedTiers = useMemo(
    () => getProgressiveDiscountTiers(eventData),
    [eventData]
  );
  const [publishedTiers, setPublishedTiers] = useState([]);

  useEffect(() => {
    const publicEventUrl = buildPublicEventUrl(eventData);
    const controller = new AbortController();

    setPublishedTiers([]);
    if (embeddedTiers.length || !publicEventUrl) return () => controller.abort();

    const loadPublishedTiers = async () => {
      try {
        const response = await fetch(publicEventUrl, {
          headers: { Accept: 'text/html' },
          credentials: 'omit',
          mode: 'cors',
          signal: controller.signal
        });

        if (!response.ok) return;
        const html = await response.text();
        setPublishedTiers(parseTiersFromEventPage(html));
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.warn('Não foi possível carregar o desconto progressivo publicado:', error);
        }
      }
    };

    loadPublishedTiers();
    return () => controller.abort();
  }, [embeddedTiers, eventData]);

  return embeddedTiers.length ? embeddedTiers : publishedTiers;
};
