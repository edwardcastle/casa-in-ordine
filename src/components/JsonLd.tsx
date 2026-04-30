export default function JsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Casa in Ordine',
    description: 'Servizio professionale di decluttering e home organizing a Roma',
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
