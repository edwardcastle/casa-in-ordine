import Image from 'next/image';

interface OverlayImageProps {
  src: string;
  alt: string;
  aspect?: string;
  objectPosition?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

export default function OverlayImage({
  src,
  alt,
  aspect = 'aspect-[4/3]',
  objectPosition = 'object-center',
  sizes = '(max-width: 768px) 100vw, 50vw',
  className = '',
  priority = false,
}: OverlayImageProps) {
  return (
    <div className={`rounded-2xl overflow-hidden ${aspect} relative shadow-lg ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover ${objectPosition}`}
        priority={priority}
      />
      <div className="absolute inset-0 bg-primary/20" />
    </div>
  );
}
