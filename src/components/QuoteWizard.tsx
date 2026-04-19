'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { submitQuoteRequest } from '@/actions/contact';
import CategoryIcon from '@/components/CategoryIcon';

type Category = 'armadio' | 'cucina' | 'ufficio' | 'bagno' | 'garage' | 'trasloco';
type Complexity = { value: number; label: string };

// --- Work-package pricing model ---
// Flat package prices per room type, sized by scope.
// Small increments per extra unit keep totals accessible.
// Typical range: €50 (small bathroom) – €350 (large move).
//
// Formula:
//   projectCost = basePrice + Σ(fieldValue × costPerUnit)
//   complexityCost = projectCost × (complexityMultiplier - 1)  [surcharge only]
//   extrasCost  = flat add-on fees
//   urgency     = quiz adds 0–5% on top
//   total       = projectCost + complexityCost + extrasCost + urgency

interface CategoryConfig {
  basePrice: number; // package starting price
  fields: { id: string; costPerUnit: number }[];
}

const categoryConfigs: Record<Category, CategoryConfig> = {
  armadio: {
    basePrice: 60,      // basic 2-door wardrobe package
    fields: [
      { id: 'doors', costPerUnit: 10 },
      { id: 'drawers', costPerUnit: 5 },
      { id: 'height', costPerUnit: 12 },
    ],
  },
  cucina: {
    basePrice: 80,      // standard kitchen package
    fields: [
      { id: 'modules', costPerUnit: 6 },
      { id: 'pantry', costPerUnit: 25 },
      { id: 'counters', costPerUnit: 10 },
    ],
  },
  ufficio: {
    basePrice: 60,      // single-desk office package
    fields: [
      { id: 'desks', costPerUnit: 15 },
      { id: 'documents', costPerUnit: 10 },
    ],
  },
  bagno: {
    basePrice: 45,      // small bathroom package
    fields: [
      { id: 'cabinets', costPerUnit: 10 },
      { id: 'shelves', costPerUnit: 5 },
    ],
  },
  garage: {
    basePrice: 90,      // standard garage package
    fields: [
      { id: 'racks', costPerUnit: 12 },
      { id: 'tools', costPerUnit: 18 },
    ],
  },
  trasloco: {
    basePrice: 120,     // small move/unpack package
    fields: [
      { id: 'boxes', costPerUnit: 3 },
      { id: 'rooms', costPerUnit: 30 },
    ],
  },
};

// Complexity tiers — surcharges on the package price
const complexityMultipliers: Record<number, number> = {
  1: 1.0,    // light: standard package
  1.5: 1.15, // moderate: +15%
  2: 1.3,    // critical: +30%
};

// Extras — flat add-on fees
const extrasConfig = {
  materials: { baseCost: 10, percent: 0.03 },
  dump: { baseCost: 15, percent: 0.03 },
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
    // Max quiz score = 6 (3 questions × option index 2), maps to 0–5%
    const urgencyPercent = (quizScore / 6) * 0.05;
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
              <CategoryIcon category={cat} className="w-8 h-8 mx-auto mb-3" />
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
      {/* Logo */}
      <div className="flex justify-center pt-6">
        <Image
          src="/images/logo/logo_800x300.png"
          alt="Casa in Ordine"
          width={160}
          height={60}
          className="h-10 w-auto"
        />
      </div>
      {/* Progress bar */}
      <div className="h-2 bg-secondary mt-4">
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
