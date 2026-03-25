export default function JsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Casa in Ordine',
    description: 'Servizio professionale di decluttering e home organizing a Roma',
    url: 'https://casainordine.it',
    telephone: '+39 06 1234567',
    email: 'info@casainordine.it',
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
    sameAs: ['https://instagram.com/casainordine'],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
