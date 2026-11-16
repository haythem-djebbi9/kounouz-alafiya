import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Le site est une application d'une seule page : sans ceci, chaque adresse
// portait le titre de l'accueil, et les résultats de recherche ne
// distinguaient ni une fiche produit ni une page légale. Google exécute le
// JavaScript et lit ces valeurs ; les robots d'aperçu (WhatsApp, Facebook)
// ne l'exécutent pas et s'en tiennent aux balises de index.html.

/** Origine de production : l'adresse canonique ne dépend pas de l'hôte consulté. */
export const SITE_URL = 'https://kounouzalafia.io';

const DESCRIPTION_MAX = 160;

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function shorten(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= DESCRIPTION_MAX ? flat : `${flat.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

/**
 * Titre, description et adresse canonique de la page affichée.
 * Sans titre : l'accueil (« marque | accroche »).
 */
export function usePageMeta(title?: string | null, description?: string | null) {
  const { t, i18n } = useTranslation(['common']);
  const brand = t('common:seo.brand');
  const homeTitle = t('common:seo.homeTitle');
  const homeDescription = t('common:seo.homeDescription');

  useEffect(() => {
    const fullTitle = title ? `${title} | ${brand}` : `${brand} | ${homeTitle}`;
    const desc = shorten(description || homeDescription);
    document.title = fullTitle;
    upsertMeta('name', 'description', desc);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', desc);
    // Sans paramètres ni fragment : /verify/X?exemple=1 et /verify/X sont la
    // même page pour un moteur de recherche.
    const url = SITE_URL + window.location.pathname;
    upsertMeta('property', 'og:url', url);
    upsertCanonical(url);
  }, [title, description, brand, homeTitle, homeDescription, i18n.language]);
}

/**
 * Données structurées d'une page (schema.org), insérées dans <head> le temps
 * que la page est affichée : Google peut alors montrer prix et disponibilité
 * d'un produit dans ses résultats.
 */
export function useJsonLd(id: string, data: Record<string, unknown> | null) {
  const json = data ? JSON.stringify(data) : null;
  useEffect(() => {
    if (!json) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `jsonld-${id}`;
    script.text = json;
    document.head.appendChild(script);
    return () => script.remove();
  }, [id, json]);
}
