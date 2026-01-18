import React from 'react';

type Props = {
  title?: string;
  description?: string;
  image?: string;
};

function ensureMetaByName(name: string): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`
  );
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  return meta;
}

function ensureMetaByProperty(property: string): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`
  );
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  return meta;
}

function ensureCanonicalLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  return link;
}

export default function Seo({ title, description, image }: Props) {
  React.useEffect(() => {
    const url =
      typeof window !== 'undefined' ? window.location.href : undefined;

    // Title
    if (title) {
      document.title = title;

      const ogTitle = ensureMetaByProperty('og:title');
      ogTitle.setAttribute('content', title);

      const twitterTitle = ensureMetaByName('twitter:title');
      twitterTitle.setAttribute('content', title);
    }

    // Description
    if (description) {
      const metaDesc = ensureMetaByName('description');
      metaDesc.setAttribute('content', description);

      const ogDesc = ensureMetaByProperty('og:description');
      ogDesc.setAttribute('content', description);

      const twitterDesc = ensureMetaByName('twitter:description');
      twitterDesc.setAttribute('content', description);
    }

    // Image
    if (image) {
      const ogImage = ensureMetaByProperty('og:image');
      ogImage.setAttribute('content', image);

      const twitterImage = ensureMetaByName('twitter:image');
      twitterImage.setAttribute('content', image);
    }

    // Og:type
    const ogType = ensureMetaByProperty('og:type');
    ogType.setAttribute('content', 'website');

    // URL / canonical
    if (url) {
      const ogUrl = ensureMetaByProperty('og:url');
      ogUrl.setAttribute('content', url);

      const canonical = ensureCanonicalLink();
      canonical.setAttribute('href', url);
    }

    // Twitter card
    const twitterCard = ensureMetaByName('twitter:card');
    if (!twitterCard.getAttribute('content')) {
      twitterCard.setAttribute('content', 'summary_large_image');
    }
  }, [title, description, image]);

  return null;
}
