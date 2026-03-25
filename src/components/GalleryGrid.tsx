'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface GalleryImage {
  src: string;
  alt: string;
  category: string;
}

const galleryImages: GalleryImage[] = [
  { src: '/images/gallery/kitchen-1.jpg', alt: 'Cucina organizzata', category: 'kitchen' },
  { src: '/images/gallery/closet-1.jpg', alt: 'Armadio organizzato', category: 'closet' },
  { src: '/images/gallery/living-1.jpg', alt: 'Soggiorno organizzato', category: 'living' },
  { src: '/images/gallery/bathroom-1.jpg', alt: 'Bagno organizzato', category: 'bathroom' },
  { src: '/images/gallery/office-1.jpg', alt: 'Ufficio organizzato', category: 'office' },
  { src: '/images/gallery/living-2.jpg', alt: 'Ingresso organizzato', category: 'living' },
  { src: '/images/gallery/kitchen-2.jpg', alt: 'Dispensa organizzata', category: 'kitchen' },
  { src: '/images/gallery/living-3.jpg', alt: 'Libreria organizzata', category: 'living' },
  { src: '/images/gallery/living-4.jpg', alt: 'Angolo lettura', category: 'living' },
];

const categories = ['all', 'kitchen', 'closet', 'living', 'bathroom', 'office'] as const;

export default function GalleryGrid() {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const t = useTranslations('gallery.filters');

  const filteredImages = activeFilter === 'all'
    ? galleryImages
    : galleryImages.filter((img) => img.category === activeFilter);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === cat
                ? 'bg-primary text-white'
                : 'bg-secondary-light text-gray-700 hover:bg-secondary'
            }`}
          >
            {t(cat)}
          </button>
        ))}
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredImages.map((image, index) => (
          <div
            key={`${image.src}-${index}`}
            className="aspect-square rounded-lg overflow-hidden group relative"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <p className="text-white text-sm font-medium">{image.alt}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredImages.length === 0 && (
        <p className="text-center text-gray-500 py-12">{t('noImages' as never)}</p>
      )}
    </div>
  );
}
