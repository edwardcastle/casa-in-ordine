'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Category = 'armadio' | 'cucina' | 'ufficio' | 'bagno' | 'garage' | 'trasloco';
type Complexity = { value: number; label: string };

interface CategoryConfig {
  base: number;
  fields: { id: string; multiplier: number }[];
}

const categoryConfigs: Record<Category, CategoryConfig> = {
  armadio: {
    base: 150,
    fields: [
      { id: 'doors', multiplier: 30 },
      { id: 'drawers', multiplier: 15 },
      { id: 'height', multiplier: 40 },
    ],
  },
  cucina: {
    base: 200,
    fields: [
      { id: 'modules', multiplier: 25 },
      { id: 'pantry', multiplier: 80 },
      { id: 'counters', multiplier: 40 },
    ],
  },
  ufficio: {
    base: 120,
    fields: [
      { id: 'desks', multiplier: 50 },
      { id: 'documents', multiplier: 30 },
    ],
  },
  bagno: {
    base: 80,
    fields: [
      { id: 'cabinets', multiplier: 40 },
      { id: 'shelves', multiplier: 20 },
    ],
  },
  garage: {
    base: 250,
    fields: [
      { id: 'racks', multiplier: 45 },
      { id: 'tools', multiplier: 60 },
    ],
  },
  trasloco: {
    base: 500,
    fields: [
      { id: 'boxes', multiplier: 10 },
      { id: 'rooms', multiplier: 100 },
    ],
  },
};

const categoryIcons: Record<Category, string> = {
  armadio: 'M6 2a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H6zm6 0v20M8 12h2m4 0h2',
  cucina: 'M3 6h18M3 6v14a2 2 0 002 2h14a2 2 0 002-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-6 5h4',
  ufficio: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  bagno: 'M4 6h16M4 6v10a2 2 0 002 2h12a2 2 0 002-2V6M9 6V4m6 2V4m-3 6v4',
  garage: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  trasloco: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
};

export default function QuoteWizard() {
  const t = useTranslations('quote');
  const [step, setStep] = useState(0);
  const [quiz, setQuiz] = useState<string[]>(['', '', '']);
  const [category, setCategory] = useState<Category | null>(null);
  const [details, setDetails] = useState<Record<string, number>>({});
  const [complexity, setComplexity] = useState<Complexity | null>(null);
  const [extras, setExtras] = useState({ materials: false, dump: false });

  const totalSteps = 7;
  const progress = ((step + 1) / totalSteps) * 100;

  function calculatePrice(): number {
    if (!category || !complexity) return 0;
    const config = categoryConfigs[category];
    let price = config.base;
    config.fields.forEach((field) => {
      price += (details[field.id] || 0) * field.multiplier;
    });
    price *= complexity.value;
    if (extras.materials) price += 50;
    if (extras.dump) price += 80;
    return Math.round(price);
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return quiz[0] !== '';
      case 1: return quiz[1] !== '';
      case 2: return quiz[2] !== '';
      case 3: return category !== null;
      case 4: return true;
      case 5: return complexity !== null;
      case 6: return true;
      default: return false;
    }
  }

  function handleWhatsApp() {
    const price = calculatePrice();
    const msg = encodeURIComponent(
      `${t('whatsappIntro')}\n\n` +
      `${t('categories.' + category)}: ${complexity?.label}\n` +
      `${t('estimate')}: €${price}\n\n` +
      (extras.materials ? `+ ${t('extras.materials')}\n` : '') +
      (extras.dump ? `+ ${t('extras.dump')}\n` : '')
    );
    window.open(`https://wa.me/393445856895?text=${msg}`, '_blank');
  }

  function renderQuizStep(qIndex: number) {
    return (
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider rounded-full mb-4">
          {t('quizBadge')}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-8">
          {t(`quiz.q${qIndex + 1}.question`)}
        </h3>
        <div className="max-w-lg mx-auto space-y-3">
          {[0, 1, 2].map((optIdx) => (
            <button
              key={optIdx}
              onClick={() => {
                const newQuiz = [...quiz];
                newQuiz[qIndex] = t(`quiz.q${qIndex + 1}.options.${optIdx}`);
                setQuiz(newQuiz);
              }}
              className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                quiz[qIndex] === t(`quiz.q${qIndex + 1}.options.${optIdx}`)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-secondary-dark bg-white hover:border-primary/50'
              }`}
            >
              {t(`quiz.q${qIndex + 1}.options.${optIdx}`)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderCategoryStep() {
    const categories: Category[] = ['armadio', 'cucina', 'ufficio', 'bagno', 'garage', 'trasloco'];
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('categoryTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('categorySubtitle')}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                const newDetails: Record<string, number> = {};
                categoryConfigs[cat].fields.forEach((f) => (newDetails[f.id] = 0));
                setDetails(newDetails);
              }}
              className={`p-5 rounded-2xl border-2 text-center transition-all ${
                category === cat
                  ? 'border-primary bg-primary/10'
                  : 'border-secondary-dark bg-white hover:border-primary/50 hover:-translate-y-1'
              }`}
            >
              <svg className="w-8 h-8 mx-auto mb-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={categoryIcons[cat]} />
              </svg>
              <span className="font-semibold text-sm">{t(`categories.${cat}`)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderDetailsStep() {
    if (!category) return null;
    const config = categoryConfigs[category];
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('detailsTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('detailsSubtitle')}</p>
        <div className="max-w-lg mx-auto space-y-4">
          {config.fields.map((field) => (
            <div key={field.id} className="bg-secondary p-4 rounded-xl text-left">
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t(`fields.${category}.${field.id}`)}
              </label>
              <input
                type="number"
                min="0"
                value={details[field.id] || ''}
                onChange={(e) =>
                  setDetails({ ...details, [field.id]: parseFloat(e.target.value) || 0 })
                }
                placeholder="0"
                className="w-full border-b-2 border-secondary-dark bg-transparent py-2 text-lg font-bold text-primary focus:border-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderComplexityStep() {
    const levels = [
      { value: 1, key: 'light' },
      { value: 1.5, key: 'moderate' },
      { value: 2.2, key: 'critical' },
    ];
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('complexityTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('complexitySubtitle')}</p>
        <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {levels.map((level) => (
            <button
              key={level.key}
              onClick={() => setComplexity({ value: level.value, label: t(`complexity.${level.key}.title`) })}
              className={`p-6 rounded-2xl border-2 text-center transition-all ${
                complexity?.value === level.value
                  ? 'border-primary bg-primary/10'
                  : 'border-secondary-dark bg-white hover:border-primary/50'
              }`}
            >
              <div className="text-3xl mb-3">
                {level.key === 'light' ? '🌿' : level.key === 'moderate' ? '🌤️' : '🌪️'}
              </div>
              <h4 className="font-bold mb-1">{t(`complexity.${level.key}.title`)}</h4>
              <p className="text-xs text-foreground/60">{t(`complexity.${level.key}.description`)}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderExtrasAndResult() {
    const price = calculatePrice();
    return (
      <div className="text-center">
        {/* Extras */}
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6">
          {t('extrasTitle')}
        </h3>
        <div className="grid md:grid-cols-2 gap-4 max-w-lg mx-auto mb-10">
          <button
            onClick={() => setExtras({ ...extras, materials: !extras.materials })}
            className={`p-5 rounded-2xl border-2 text-center transition-all ${
              extras.materials
                ? 'border-primary bg-primary/10'
                : 'border-secondary-dark bg-white hover:border-primary/50'
            }`}
          >
            <div className="text-2xl mb-2">📦</div>
            <h4 className="font-semibold text-sm">{t('extras.materials')}</h4>
            <p className="text-xs text-foreground/60 mt-1">{t('extras.materialsDesc')}</p>
          </button>
          <button
            onClick={() => setExtras({ ...extras, dump: !extras.dump })}
            className={`p-5 rounded-2xl border-2 text-center transition-all ${
              extras.dump
                ? 'border-primary bg-primary/10'
                : 'border-secondary-dark bg-white hover:border-primary/50'
            }`}
          >
            <div className="text-2xl mb-2">🚛</div>
            <h4 className="font-semibold text-sm">{t('extras.dump')}</h4>
            <p className="text-xs text-foreground/60 mt-1">{t('extras.dumpDesc')}</p>
          </button>
        </div>

        {/* Result */}
        <div className="bg-white rounded-3xl p-8 shadow-md border border-secondary-dark max-w-lg mx-auto">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {category && (
              <span className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-primary">
                {t(`categories.${category}`)}
              </span>
            )}
            {complexity && (
              <span className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-primary">
                {complexity.label}
              </span>
            )}
          </div>

          <p className="text-sm text-foreground/60 mb-2">{t('estimateLabel')}</p>
          <div className="text-5xl font-bold text-foreground mb-6">
            <span className="text-xl align-middle mr-1">€</span>{price}
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-foreground/70">
              <span className="font-bold">ℹ️ {t('disclaimerTitle')}:</span> {t('disclaimerText')}
            </p>
          </div>

          <button
            onClick={handleWhatsApp}
            className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t('whatsappButton')}
          </button>
        </div>
      </div>
    );
  }

  function renderStep() {
    switch (step) {
      case 0: return renderQuizStep(0);
      case 1: return renderQuizStep(1);
      case 2: return renderQuizStep(2);
      case 3: return renderCategoryStep();
      case 4: return renderDetailsStep();
      case 5: return renderComplexityStep();
      case 6: return renderExtrasAndResult();
      default: return null;
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-secondary-dark overflow-hidden">
      {/* Progress bar */}
      <div className="h-2 bg-secondary">
        <div
          className="h-full bg-primary rounded-r-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6 md:p-10">
        {renderStep()}

        {/* Navigation */}
        {step < 6 && (
          <div className="flex justify-between mt-10 pt-6 border-t border-secondary">
            <button
              onClick={() => setStep(step - 1)}
              className={`px-6 py-3 rounded-full border-2 border-secondary-dark font-semibold text-foreground/60 transition-all hover:border-primary ${
                step === 0 ? 'invisible' : ''
              }`}
            >
              {t('back')}
            </button>
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-8 py-3 rounded-full bg-primary text-white font-semibold shadow-md transition-all hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('next')}
            </button>
          </div>
        )}

        {step === 6 && (
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setStep(0);
                setQuiz(['', '', '']);
                setCategory(null);
                setDetails({});
                setComplexity(null);
                setExtras({ materials: false, dump: false });
              }}
              className="text-sm text-foreground/50 hover:text-primary transition-colors"
            >
              {t('restart')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
