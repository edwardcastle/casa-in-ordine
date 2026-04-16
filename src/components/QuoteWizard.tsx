'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { submitQuoteRequest } from '@/actions/contact';

type Category = 'armadio' | 'cucina' | 'ufficio' | 'bagno' | 'garage' | 'trasloco';
type Complexity = { value: number; label: string };

// --- Effort-based pricing model ---
// Grounded in Rome professional organizing market research (APOI, Cronoshare,
// Italian P.O. published packages — Silva Bucci, Margherita Pecoraro, etc.)
//
// Rome market rate: €55-65/h effective, but clients see flat per-project prices.
// This model uses flat base prices per room type (bakes in minimum effort),
// plus incremental cost per size unit, scaled by complexity tier.
//
// Formula:
//   projectCost = (basePrice + Σ(fieldValue × costPerUnit)) × complexityMultiplier
//   extrasCost  = flat fee + % of projectCost (scales with project size)
//   urgency     = quiz severity adds 0–10% (more chaos = more sorting decisions)
//   total       = projectCost + extrasCost + urgency

interface CategoryConfig {
  basePrice: number; // flat minimum for the category (consultation + basic scope)
  fields: { id: string; costPerUnit: number }[]; // each unit adds flat €
}

const categoryConfigs: Record<Category, CategoryConfig> = {
  armadio: {
    // Standard wardrobe: €150 base (2-door, light). Market range: €120-450
    basePrice: 150,
    fields: [
      { id: 'doors', costPerUnit: 40 },     // each additional door section: ~€40 effort
      { id: 'drawers', costPerUnit: 18 },    // each internal drawer: ~€18
      { id: 'height', costPerUnit: 55 },     // mezzanine/high shelves require ladder work
    ],
  },
  cucina: {
    // Standard kitchen: €250 base (6-8 modules, light). Market range: €180-750
    basePrice: 250,
    fields: [
      { id: 'modules', costPerUnit: 28 },    // each cabinet/wall unit: ~€28
      { id: 'pantry', costPerUnit: 120 },     // separate pantry is a sub-project: ~€120
      { id: 'counters', costPerUnit: 45 },    // each counter/island surface: ~€45
    ],
  },
  ufficio: {
    // Standard office: €150 base (1 desk, light). Market range: €120-600
    basePrice: 150,
    fields: [
      { id: 'desks', costPerUnit: 60 },      // each workstation: ~€60
      { id: 'documents', costPerUnit: 45 },   // per linear meter of documents: ~€45
    ],
  },
  bagno: {
    // Standard bathroom: €100 base. Market range: €90-350
    basePrice: 100,
    fields: [
      { id: 'cabinets', costPerUnit: 45 },    // each cabinet/under-sink: ~€45
      { id: 'shelves', costPerUnit: 22 },      // each open shelf: ~€22
    ],
  },
  garage: {
    // Standard garage/storage: €300 base. Market range: €250-1000
    basePrice: 300,
    fields: [
      { id: 'racks', costPerUnit: 55 },       // each shelf bay: ~€55
      { id: 'tools', costPerUnit: 85 },        // workshop area intensity (1-5): ~€85/level
    ],
  },
  trasloco: {
    // Small move/unpack: €400 base. Market range: €350-1500+
    basePrice: 400,
    fields: [
      { id: 'boxes', costPerUnit: 12 },       // each box to unpack & organize: ~€12
      { id: 'rooms', costPerUnit: 150 },       // each room to set up from scratch: ~€150
    ],
  },
};

// Complexity tiers — based on Italian market data
// Light = standard effort, Moderate = +50%, Critical = double
const complexityMultipliers: Record<number, number> = {
  1: 1.0,    // light: space mostly organized, needs optimization
  1.5: 1.5,  // moderate: cluttered, significant sorting needed (+50%)
  2: 2.0,    // critical: heavily cluttered, deep intervention (2×)
};

// Extras — flat base + percentage of project cost (scales naturally)
const extrasConfig = {
  materials: { baseCost: 40, percent: 0.08 },  // organizer kit: €40 + 8% of project
  dump: { baseCost: 60, percent: 0.10 },         // disposal/donation: €60 + 10% of project
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
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const totalSteps = 7;
  const progress = ((step + 1) / totalSteps) * 100;

  function calculatePrice(): { total: number; breakdown: { project: number; extras: number; urgency: number } } {
    if (!category || !complexity) return { total: 0, breakdown: { project: 0, extras: 0, urgency: 0 } };

    const config = categoryConfigs[category];

    // 1. Base project cost = flat base + size increments
    let projectBase = config.basePrice;
    config.fields.forEach((field) => {
      projectBase += (details[field.id] || 0) * field.costPerUnit;
    });

    // 2. Apply complexity multiplier (1.0× / 1.5× / 2.0×)
    const compMultiplier = complexityMultipliers[complexity.value] ?? 1;
    const projectCost = projectBase * compMultiplier;

    // 3. Extras (flat base + % of project cost — scales naturally with size)
    let extrasCost = 0;
    if (extras.materials) {
      extrasCost += extrasConfig.materials.baseCost + projectCost * extrasConfig.materials.percent;
    }
    if (extras.dump) {
      extrasCost += extrasConfig.dump.baseCost + projectCost * extrasConfig.dump.percent;
    }

    // 4. Quiz urgency factor (0–10%)
    //    Higher reported chaos = more sorting/decision effort required
    const quizScore = quiz.reduce((score, answer, qIdx) => {
      if (!answer) return score;
      const optIdx = [0, 1, 2].find((i) => {
        try { return answer === t(`quiz.q${qIdx + 1}.options.${i}`); } catch { return false; }
      }) ?? 0;
      return score + optIdx;
    }, 0);
    // Max quiz score = 6 (3 questions × option index 2), maps to 0–10%
    const urgencyPercent = (quizScore / 6) * 0.10;
    const urgencyAmount = (projectCost + extrasCost) * urgencyPercent;

    const total = Math.round(projectCost + extrasCost + urgencyAmount);

    return {
      total,
      breakdown: {
        project: Math.round(projectCost),
        extras: Math.round(extrasCost),
        urgency: Math.round(urgencyAmount),
      },
    };
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

  async function handleSubmit() {
    if (!category || !complexity) return;
    setSubmitStatus('sending');
    const { total, breakdown } = calculatePrice();
    try {
      const result = await submitQuoteRequest({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || undefined,
        category: t(`categories.${category}`),
        complexity: complexity.label,
        total,
        breakdown,
        details,
        extras,
        quizAnswers: quiz,
      });
      setSubmitStatus(result.success ? 'success' : 'error');
    } catch {
      setSubmitStatus('error');
    }
  }

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSubmitContact = contact.name.trim() !== '' && isValidEmail(contact.email);

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
      { value: 2, key: 'critical' },
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
    const { total, breakdown } = calculatePrice();
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
            <span className="text-xl align-middle mr-1">€</span>{total}
          </div>

          {/* Breakdown */}
          <div className="bg-secondary rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">{t('breakdownProject')}</span>
              <span className="font-semibold">€{breakdown.project}</span>
            </div>
            {breakdown.extras > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">{t('breakdownExtras')}</span>
                <span className="font-semibold">€{breakdown.extras}</span>
              </div>
            )}
            {breakdown.urgency > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">{t('breakdownUrgency')}</span>
                <span className="font-semibold">€{breakdown.urgency}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-secondary-dark">
              <span>{t('breakdownTotal')}</span>
              <span>€{total}</span>
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-foreground/70">
              <span className="font-bold">{t('disclaimerTitle')}:</span> {t('disclaimerText')}
            </p>
          </div>

          {/* Contact info form */}
          <div className="border-t border-secondary-dark pt-6 mb-6 text-left">
            <h4 className="font-bold text-foreground mb-1 text-center">{t('contactStepTitle')}</h4>
            <p className="text-sm text-foreground/60 mb-4 text-center">{t('contactStepSubtitle')}</p>
            <div className="space-y-3">
              <div>
                <label htmlFor="qw-name" className="block text-xs font-semibold text-foreground/70 mb-1">
                  {t('fullName')} *
                </label>
                <input
                  id="qw-name"
                  type="text"
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-secondary-dark rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label htmlFor="qw-email" className="block text-xs font-semibold text-foreground/70 mb-1">
                  {t('emailField')} *
                </label>
                <input
                  id="qw-email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-secondary-dark rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label htmlFor="qw-phone" className="block text-xs font-semibold text-foreground/70 mb-1">
                  {t('phoneField')}
                </label>
                <input
                  id="qw-phone"
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-secondary-dark rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {submitStatus === 'error' && (
            <p className="text-red-600 text-sm mb-4 text-center">{t('submitError')}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmitContact || submitStatus === 'sending'}
            className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitStatus === 'sending' ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('submitting')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t('submitButton')}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  function renderSuccess() {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{t('successTitle')}</h3>
        <p className="text-foreground/70 max-w-md mx-auto">
          {t('successMessage', { name: contact.name })}
        </p>
      </div>
    );
  }

  function renderStep() {
    if (submitStatus === 'success') return renderSuccess();
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
        {submitStatus !== 'success' && step < 6 && (
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

        {(step === 6 || submitStatus === 'success') && (
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setStep(0);
                setQuiz(['', '', '']);
                setCategory(null);
                setDetails({});
                setComplexity(null);
                setExtras({ materials: false, dump: false });
                setContact({ name: '', email: '', phone: '' });
                setSubmitStatus('idle');
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
