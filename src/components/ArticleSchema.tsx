// src/components/ArticleSchema.tsx
import React from 'react';

type Props = {
  title: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  url?: string;
};

export default function ArticleSchema({
  title,
  description,
  image,
  datePublished,
  dateModified,
  author = 'Fundacja Zapłon',
  url
}: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image,
    author: {
      '@type': 'Organization',
      name: author
    },
    publisher: {
      '@type': 'Organization',
      name: 'Fundacja Zapłon',
      logo: {
        '@type': 'ImageObject',
        url: 'https://zaplon.org.pl/images/logo.svg'
      }
    },
    datePublished,
    dateModified: dateModified ?? datePublished,
    mainEntityOfPage: url
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}
