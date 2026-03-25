import Image from 'next/image';

interface HeroProps {
  title: string;
  subtitle?: string;
  cta?: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  large?: boolean;
  backgroundImage?: string;
}

export default function Hero({ title, subtitle, cta, secondaryCta, large = false, backgroundImage }: HeroProps) {
  return (
    <section
      className={`relative overflow-hidden ${large ? 'py-24 md:py-32 lg:py-40' : 'py-16 md:py-24'}`}
    >
      {/* Background image or solid color */}
      {backgroundImage ? (
        <>
          <Image
            src={backgroundImage}
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-primary/70" />
        </>
      ) : (
        <div className="absolute inset-0 bg-primary" />
      )}

      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className={`font-bold text-white ${large ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-3xl md:text-4xl lg:text-5xl'} leading-tight`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-4 md:mt-6 text-white/90 ${large ? 'text-lg md:text-xl lg:text-2xl' : 'text-base md:text-lg'} max-w-3xl mx-auto`}>
            {subtitle}
          </p>
        )}
        {(cta || secondaryCta) && (
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            {cta && (
              <a
                href={cta.href}
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-secondary-light transition-colors duration-200 shadow-lg"
              >
                {cta.text}
              </a>
            )}
            {secondaryCta && (
              <a
                href={secondaryCta.href}
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                {secondaryCta.text}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
