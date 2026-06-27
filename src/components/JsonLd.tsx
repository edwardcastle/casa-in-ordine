interface JsonLdProps {
  locale?: string;
}

const BASE_URL = 'https://casainordine.com';
const LOGO_URL = `${BASE_URL}/images/logo/logo_400x150.png`;
const IMAGE_URL = `${BASE_URL}/images/logo/logo_1200x630.png`;
const SAME_AS = ['https://www.instagram.com/casainordine_it/'];

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

  // Central brand node every other schema links back to via @id.
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Casa in Ordine',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
      width: 400,
      height: 150,
    },
    sameAs: SAME_AS,
    // Contact on the brand entity (not LocalBusiness) so en/es — which omit the
    // Roma-scoped LocalBusiness — still carry a contact signal, without
    // duplicating a physical-business address across locales.
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+393445856895',
      email: 'info@casainordine.com',
      availableLanguage: ['it', 'en', 'es'],
    },
  };

  const webSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: 'Casa in Ordine',
    url: `${BASE_URL}/${locale}`,
    inLanguage,
    description: descriptions[locale] ?? descriptions.it,
    publisher: { '@id': `${BASE_URL}/#organization` },
  };

  const schemas: object[] = [organization, webSite];

  // LocalBusiness is emitted only on the Italian site: the physical service is
  // scoped to Roma, so it must not be duplicated across the en/es locales.
  if (locale === 'it') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${BASE_URL}/it#business`,
      name: 'Casa in Ordine',
      description: descriptions.it,
      url: `${BASE_URL}/it`,
      image: IMAGE_URL,
      logo: LOGO_URL,
      telephone: '+393445856895',
      email: 'info@casainordine.com',
      priceRange: '€€',
      inLanguage: 'it-IT',
      parentOrganization: { '@id': `${BASE_URL}/#organization` },
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Via dei Monti Tiburtini, 510',
        postalCode: '00157',
        addressLocality: 'Roma',
        addressRegion: 'RM',
        addressCountry: 'IT',
      },
      areaServed: {
        '@type': 'City',
        name: 'Roma',
      },
      serviceType: ['Decluttering', 'Home Organizing', 'Professional Organizing'],
      openingHours: 'Mo-Fr 09:00-18:00',
      sameAs: SAME_AS,
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
