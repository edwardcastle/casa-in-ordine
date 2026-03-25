import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="it">
      <body className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center px-4">
          <h1 className="text-6xl font-bold text-[#006633] mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-8">Pagina non trovata</p>
          <Link
            href="/it"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#006633] text-white font-semibold rounded-lg hover:bg-[#004d26] transition-colors"
          >
            Torna alla home
          </Link>
        </div>
      </body>
    </html>
  );
}
