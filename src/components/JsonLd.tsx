interface JsonLdProps {
  locale?: string;
}

const descriptions: Record<string, string> = {
  it: 'Servizio professionale di decluttering e home organizing a Roma',
  en: 'Professional decluttering and home organizing service in Rome',
  es: 'Servicio profesional de decluttering y home organizing en Roma',
};

const ogLocales: Record<string, string> = {
  it: 'it-IT',
  en: 'en-US',
  es: 'es-ES',
};

export default function JsonLd({ locale = 'it' }: JsonLdProps) {
  const inLanguage = ogLocales[locale] ?? ogLocales.it;

  const webSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Casa in Ordine',
    url: `https://casainordine.com/${locale}`,
    inLanguage,
    description: descriptions[locale] ?? descriptions.it,
  };

  const schemas: object[] = [webSite];

  if (locale === 'it') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': 'https://casainordine.com/it#business',
      name: 'Casa in Ordine',
      description: descriptions.it,
      url: 'https://casainordine.com/it',
      telephone: '+393445856895',
      email: 'info@casainordine.com',
      inLanguage: 'it-IT',
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
    });
  }

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
