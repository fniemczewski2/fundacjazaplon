import { useEffect } from 'react';
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from '../lib/config';

export type Breadcrumb = { name: string; path: string };

type Props = {
  title?: string;
  description?: string;
  /** Ścieżka (`/images/x.jpg`) albo pełny adres. Wymiary w og:image ustawiamy tylko dla obrazu domyślnego. */
  image?: string;
  type?: 'website' | 'article';
  /** Wyklucza stronę z indeksu wyszukiwarek (strony prywatne, panel, formularze z tokenem). */
  noindex?: boolean;
  breadcrumbs?: Breadcrumb[];
};

const BREADCRUMB_SCRIPT_ID = 'seo-breadcrumbs';

function metaElement(attr: 'name' | 'property', key: string): HTMLMetaElement {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  return meta;
}

const setMeta = (attr: 'name' | 'property', key: string, content: string) => metaElement(attr, key).setAttribute('content', content);
const removeMeta = (attr: 'name' | 'property', key: string) => document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

const absolute = (value: string) => (/^https?:\/\//i.test(value) ? value : `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`);

/**
 * Meta tagi strony. Adres kanoniczny to adres serwisu + ścieżka, bez parametrów zapytania i fragmentu
 * (parametry i tokeny nie powinny trafiać do indeksu ani do podglądów w mediach społecznościowych).
 */
export default function Seo({ title, description, image, type = 'website', noindex = false, breadcrumbs }: Readonly<Props>) {
  const breadcrumbsKey = breadcrumbs ? JSON.stringify(breadcrumbs) : '';

  useEffect(() => {
    const url = `${SITE_URL}${globalThis.location.pathname}`;
    const isDefaultImage = !image;
    const imageUrl = absolute(image ?? DEFAULT_OG_IMAGE.path);

    if (title) {
      document.title = title;
      setMeta('property', 'og:title', title);
      setMeta('name', 'twitter:title', title);
    }
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
      setMeta('name', 'twitter:description', description);
    }

    setMeta('property', 'og:image', imageUrl);
    setMeta('name', 'twitter:image', imageUrl);
    if (isDefaultImage) {
      setMeta('property', 'og:image:width', String(DEFAULT_OG_IMAGE.width));
      setMeta('property', 'og:image:height', String(DEFAULT_OG_IMAGE.height));
    } else {
      removeMeta('property', 'og:image:width');
      removeMeta('property', 'og:image:height');
    }

    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:locale', 'pl_PL');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setCanonical(url);

    if (noindex) setMeta('name', 'robots', 'noindex, nofollow');
    else removeMeta('name', 'robots');

    return () => removeMeta('name', 'robots');
  }, [title, description, image, type, noindex]);

  useEffect(() => {
    document.getElementById(BREADCRUMB_SCRIPT_ID)?.remove();
    if (!breadcrumbsKey) return;

    const items = JSON.parse(breadcrumbsKey) as Breadcrumb[];
    const script = document.createElement('script');
    script.id = BREADCRUMB_SCRIPT_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${SITE_URL}${item.path}`,
      })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [breadcrumbsKey]);

  return null;
}
