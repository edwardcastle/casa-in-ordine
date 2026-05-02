interface JsonLdProps {
  locale?: string;
}

const descriptions: Record<string, string> = {
  it: 'Servizio professionale di decluttering e home organizing a Roma',
  en: 'Professional decluttering and home organizing service in Rome',
  es: 'Servicio profesional de decluttering y home organizing en Roma',
};

export default function JsonLd({ locale = 'it' }: JsonLdProps) {
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Casa in Ordine',
    description: descriptions[locale] ?? descriptions.it,
    url: 'https://casainordine.com',
    telephone: '+393445856895',
    email: 'info@casainordine.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Roma',
      addressCountry: 'IT',
    },
    areaServed: {
      '@type': 'City',
      name: 'Roma',
    },
    serviceType: ['Decluttering', 'Home Organizing', 'Professional Organizing'],
    openingHours: 'Mo-Fr 09:00-18:00',
    sameAs: ['https://www.instagram.com/casainordine_it/'],
  };

  const webSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Casa in Ordine',
    url: 'https://casainordine.com',
    inLanguage: [
      { '@type': 'Language', name: 'Italian', alternateName: 'it' },
      { '@type': 'Language', name: 'English', alternateName: 'en' },
      { '@type': 'Language', name: 'Spanish', alternateName: 'es' },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
    </>
  );
}