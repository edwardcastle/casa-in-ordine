'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { submitQuoteRequest } from '@/actions/contact';
import CategoryIcon from '@/components/CategoryIcon';
import {
  CATEGORIES,
  MAX_QUIZ_SCORE,
  MAX_URGENCY_PERCENT,
  QUIZ_LENGTH,
  QUIZ_OPTIONS,
  categoryConfigs,
  complexityLevels,
  complexityMultipliers,
  extrasForCategory,
  quizScore,
  sensitizationBand,
  universalExtras,
  type Category,
  type ExtraConfig,
} from '@/lib/quote/config';

type Complexity = { value: number; label: string };

// Step indices. The category comes first so every later step can be written
// for the area the visitor actually picked.
const STEP_CATEGORY = 0;
const STEP_QUIZ_FIRST = 1;
const STEP_DETAILS = 4;
const STEP_COMPLEXITY = 5;
const STEP_EXTRAS = 6;
const STEP_AVAILABILITY = 7;
const STEP_RESULT = 8;
const TOTAL_STEPS = 9;

export default function QuoteWizard() {
  const t = useTranslations('quote');
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(Array(QUIZ_LENGTH).fill(null));
  const [details, setDetails] = useState<Record<string, number>>({});
  const [complexity, setComplexity] = useState<Complexity | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [availability, setAvailability] = useState({ slot1: '', slot2: '', slot3: '' });
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  // --- i18n helpers -------------------------------------------------------
  // Everything that varies by area lives under `quote.areas.<category>`.

  function area(key: string): string {
    return t(`areas.${category}.${key}`);
  }

  function quizOptions(qIndex: number): string[] {
    return t.raw(`areas.${category}.quiz.q${qIndex + 1}.options`) as string[];
  }

  function isUniversalExtra(id: string): boolean {
    return universalExtras.some((e) => e.id === id);
  }

  function extraCopy(extra: ExtraConfig): { label: string; desc: string } {
    const base = isUniversalExtra(extra.id) ? `extras.${extra.id}` : `areas.${category}.extra`;
    return { label: t(`${base}.label`), desc: t(`${base}.desc`) };
  }

  // --- pricing ------------------------------------------------------------

  function calculatePrice(): { total: number; breakdown: { project: number; extras: number; urgency: number } } {
    if (!category || !complexity) return { total: 0, breakdown: { project: 0, extras: 0, urgency: 0 } };

    const config = categoryConfigs[category];

    // 1. Base project cost = flat base + size increments (diminishing returns)
    //    First unit at full price, additional units at 15% price
    //    to prevent totals from inflating too much with many doors/cabinets/etc.
    let projectBase = config.basePrice;
    config.fields.forEach((field) => {
      const qty = details[field.id] || 0;
      const fullPriceQty = Math.min(qty, 1);
      const discountedQty = Math.max(qty - 1, 0);
      projectBase += fullPriceQty * field.costPerUnit + discountedQty * field.costPerUnit * 0.15;
    });

    // 2. Apply complexity multiplier (1.0× / 1.15× / 1.3×)
    const compMultiplier = complexityMultipliers[complexity.value] ?? 1;
    const projectCost = projectBase * compMultiplier;

    // 3. Extras (flat base + % of project cost — scales naturally with size).
    //    Filtered against the current area so a stale id can never be charged.
    const extrasCost = extrasForCategory(category)
      .filter((extra) => selectedExtras.includes(extra.id))
      .reduce((sum, extra) => sum + extra.baseCost + projectCost * extra.percent, 0);

    // 4. Quiz urgency factor (0–5%)
    //    Higher reported chaos = more sorting/decision effort required.
    //    Options are ordered calmest-first, so the index is the severity.
    const urgencyPercent = (quizScore(quizAnswers) / MAX_QUIZ_SCORE) * MAX_URGENCY_PERCENT;
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
    if (step === STEP_CATEGORY) return category !== null;
    if (step >= STEP_QUIZ_FIRST && step < STEP_QUIZ_FIRST + QUIZ_LENGTH) {
      return quizAnswers[step - STEP_QUIZ_FIRST] !== null;
    }
    if (step === STEP_COMPLEXITY) return complexity !== null;
    // details, extras and availability are all optional
    return step === STEP_DETAILS || step === STEP_EXTRAS || step === STEP_AVAILABILITY;
  }

  function selectCategory(cat: Category) {
    if (cat === category) return;
    setCategory(cat);
    // Answers, sizes and the area add-on all belong to the previous area.
    setQuizAnswers(Array(QUIZ_LENGTH).fill(null));
    const newDetails: Record<string, number> = {};
    categoryConfigs[cat].fields.forEach((f) => (newDetails[f.id] = 0));
    setDetails(newDetails);
    setSelectedExtras((prev) => prev.filter(isUniversalExtra));
  }

  function toggleExtra(id: string) {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
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
        // Labels rather than raw keys — the recipient reads this in an inbox.
        details: categoryConfigs[category].fields
          .filter((f) => (details[f.id] || 0) > 0)
          .map((f) => ({ label: t(`fields.${category}.${f.id}`), value: details[f.id] })),
        extras: extrasForCategory(category)
          .filter((extra) => selectedExtras.includes(extra.id))
          .map((extra) => extraCopy(extra).label),
        // Questions differ per area, so the answers alone would be meaningless.
        quiz: quizAnswers.flatMap((answer, i) =>
          answer === null
            ? []
            : [{ question: area(`quiz.q${i + 1}.question`), answer: quizOptions(i)[answer] }],
        ),
        availability,
        notes: notes.trim() || undefined,
      });
      setSubmitStatus(result.success ? 'success' : 'error');
    } catch {
      setSubmitStatus('error');
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotos((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function formatDateTime(str: string): string {
    if (!str) return t('dateNotSpecified');
    return new Date(str).toLocaleString(undefined, {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSubmitContact = contact.name.trim() !== '' && isValidEmail(contact.email);

  function renderCategoryStep() {
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('categoryTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('categorySubtitle')}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => selectCategory(cat)}
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

  function renderQuizStep(qIndex: number) {
    if (!category) return null;
    const options = quizOptions(qIndex);
    return (
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider rounded-full mb-4">
          {t('quizBadge')}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-8">
          <span className="text-foreground/40 mr-2">{qIndex + 1}.</span>
          {area(`quiz.q${qIndex + 1}.question`)}
        </h3>
        <div className="max-w-lg mx-auto space-y-3">
          {Array.from({ length: QUIZ_OPTIONS }, (_, optIdx) => (
            <button
              key={optIdx}
              onClick={() => {
                const next = [...quizAnswers];
                next[qIndex] = optIdx;
                setQuizAnswers(next);
              }}
              className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                quizAnswers[qIndex] === optIdx
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-secondary-dark bg-white hover:border-primary/50'
              }`}
            >
              {options[optIdx]}
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
          {area('detailsTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{area('detailsSubtitle')}</p>
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
    if (!category) return null;
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('complexityTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{area('complexitySubtitle')}</p>
        <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {complexityLevels.map((level) => (
            <button
              key={level.key}
              onClick={() =>
                setComplexity({ value: level.value, label: area(`complexity.${level.key}.title`) })
              }
              className={`p-6 rounded-2xl border-2 text-center transition-all ${
                complexity?.value === level.value
                  ? 'border-primary bg-primary/10'
                  : 'border-secondary-dark bg-white hover:border-primary/50'
              }`}
            >
              <div className="text-3xl mb-3">{level.icon}</div>
              <h4 className="font-bold mb-1">{area(`complexity.${level.key}.title`)}</h4>
              <p className="text-xs text-foreground/60">{area(`complexity.${level.key}.description`)}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderExtrasStep() {
    if (!category) return null;
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('extrasTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('extrasSubtitle')}</p>
        <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {extrasForCategory(category).map((extra) => {
            const { label, desc } = extraCopy(extra);
            return (
              <button
                key={extra.id}
                onClick={() => toggleExtra(extra.id)}
                className={`p-5 rounded-2xl border-2 text-center transition-all ${
                  selectedExtras.includes(extra.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-secondary-dark bg-white hover:border-primary/50'
                }`}
              >
                <div className="text-2xl mb-2">{extra.icon}</div>
                <h4 className="font-semibold text-sm">{label}</h4>
                <p className="text-xs text-foreground/60 mt-1">{desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderAvailabilityStep() {
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('availabilityTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('availabilitySubtitle')}</p>
        <div className="max-w-md mx-auto space-y-4">
          {(['slot1', 'slot2', 'slot3'] as const).map((slot, idx) => (
            <div key={slot} className="bg-secondary rounded-xl p-4 border border-secondary-dark text-left">
              <label className="block text-xs font-bold uppercase tracking-wide text-foreground/50 mb-2">
                {t(`availabilitySlot${idx + 1}` as 'availabilitySlot1' | 'availabilitySlot2' | 'availabilitySlot3')}
              </label>
              <input
                type="datetime-local"
                value={availability[slot]}
                onChange={(e) => setAvailability({ ...availability, [slot]: e.target.value })}
                className="w-full border-b-2 border-secondary-dark bg-transparent py-2 text-sm font-semibold text-primary focus:border-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderResultStep() {
    if (!category) return null;
    const { total, breakdown } = calculatePrice();

    // The "why act now" paragraph is written per area and picked by how much
    // chaos the answers reported.
    const allAnswered = quizAnswers.every((a) => a !== null);
    const band = sensitizationBand(quizScore(quizAnswers));

    const fieldSummary = categoryConfigs[category].fields.filter((f) => (details[f.id] || 0) > 0);
    const chosenExtras = extrasForCategory(category).filter((e) => selectedExtras.includes(e.id));

    return (
      <div className="text-center">
        {/* Summary pills + print button */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-primary">
            {t(`categories.${category}`)}
          </span>
          {complexity && (
            <span className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-primary">
              {complexity.label}
            </span>
          )}
          <button
            onClick={() => window.print()}
            title={t('printTitle')}
            className="print:hidden w-9 h-9 rounded-full border border-secondary-dark bg-secondary flex items-center justify-center hover:border-primary hover:text-primary transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>

        {/* Sensitization box */}
        {allAnswered && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 text-left max-w-lg mx-auto">
            <p className="text-xs font-bold uppercase tracking-wide text-foreground/50 mb-1">
              {t('whyActNow')}
            </p>
            <p className="text-sm text-foreground/80">{area(`sensitization.${band}`)}</p>
          </div>
        )}

        {/* Price */}
        <p className="text-sm text-foreground/60 mb-2">{t('estimateLabel')}</p>
        <div className="text-5xl font-bold text-foreground mb-6">
          <span className="text-xl align-middle mr-1">€</span>{total}
        </div>

        <div className="max-w-lg mx-auto space-y-4 text-left">

          {/* Breakdown */}
          <div className="bg-secondary rounded-xl p-4">
            <div className="space-y-2">
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
          </div>

          {/* Survey summary + dates */}
          <div className="bg-secondary rounded-xl p-4">
            {fieldSummary.length > 0 && (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-foreground/50 mb-2">
                  {t('summaryTitle')}
                </p>
                <ul className="space-y-1 mb-4">
                  {fieldSummary.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">✓</span>
                      <span className="text-foreground/70">{t(`fields.${category}.${f.id}`)}</span>
                      <span className="font-semibold ml-auto">{details[f.id]}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {chosenExtras.length > 0 && (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-foreground/50 mb-2">
                  {t('extrasTitle')}
                </p>
                <ul className="space-y-1 mb-4">
                  {chosenExtras.map((extra) => (
                    <li key={extra.id} className="flex items-center gap-2 text-sm">
                      <span className="text-primary">✓</span>
                      <span className="text-foreground/70">{extraCopy(extra).label}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="text-xs font-bold uppercase tracking-wide text-foreground/50 mb-2">
              {t('datesTitle')}
            </p>
            <ol className="space-y-1 text-sm text-foreground/70 list-decimal list-inside">
              <li>{formatDateTime(availability.slot1)}</li>
              <li>{formatDateTime(availability.slot2)}</li>
              <li>{formatDateTime(availability.slot3)}</li>
            </ol>
          </div>

          {/* Notes + Photos */}
          <div className="grid md:grid-cols-2 print:block gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t('notesLabel')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                rows={4}
                className="w-full bg-secondary border-2 border-transparent rounded-xl p-4 text-sm resize-none focus:bg-white focus:border-primary focus:outline-none transition-all"
              />
            </div>
            <div className="print:hidden">
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t('photosLabel')}
              </label>
              <div
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-secondary-dark rounded-xl p-4 min-h-[100px] flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-secondary/50 transition-all text-center"
              >
                <span className="text-2xl mb-1">📷</span>
                <span className="text-xs font-semibold text-foreground/60">{t('photosUpload')}</span>
                <span className="text-xs text-foreground/40 mt-1">
                  {photos.length === 0 ? t('photosNone') : `${photos.length} / 5`}
                </span>
                <input
                  ref={photoInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </div>
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="w-12 h-12 object-cover rounded-lg border border-secondary-dark"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-accent/10 border-l-4 border-accent rounded-lg p-4">
            <p className="text-xs text-foreground/70">
              <span className="font-bold">{t('disclaimerTitle')}:</span> {t('disclaimerText')}
            </p>
          </div>

          {/* Contact form */}
          <div className="print:hidden border-t border-secondary-dark pt-4">
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
            <p className="print:hidden text-red-600 text-sm text-center">{t('submitError')}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmitContact || submitStatus === 'sending'}
            className="print:hidden w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
      case STEP_CATEGORY: return renderCategoryStep();
      case STEP_QUIZ_FIRST: return renderQuizStep(0);
      case STEP_QUIZ_FIRST + 1: return renderQuizStep(1);
      case STEP_QUIZ_FIRST + 2: return renderQuizStep(2);
      case STEP_DETAILS: return renderDetailsStep();
      case STEP_COMPLEXITY: return renderComplexityStep();
      case STEP_EXTRAS: return renderExtrasStep();
      case STEP_AVAILABILITY: return renderAvailabilityStep();
      case STEP_RESULT: return renderResultStep();
      default: return null;
    }
  }

  function handleReset() {
    setStep(0);
    setCategory(null);
    setQuizAnswers(Array(QUIZ_LENGTH).fill(null));
    setDetails({});
    setComplexity(null);
    setSelectedExtras([]);
    setAvailability({ slot1: '', slot2: '', slot3: '' });
    setNotes('');
    setPhotos([]);
    setContact({ name: '', email: '', phone: '' });
    setSubmitStatus('idle');
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
          className="h-20 md:h-32 w-auto"
        />
      </div>
      {/* Progress bar */}
      <div className="print:hidden h-2 bg-secondary mt-4">
        <div
          className="h-full bg-primary rounded-r-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6 md:p-10">
        {renderStep()}

        {/* Navigation — visible on every step before the result */}
        {submitStatus !== 'success' && step < STEP_RESULT && (
          <div className="print:hidden flex justify-between mt-10 pt-6 border-t border-secondary">
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

        {/* Restart — visible on final step and after success */}
        {(step === STEP_RESULT || submitStatus === 'success') && (
          <div className="print:hidden text-center mt-6">
            <button
              onClick={handleReset}
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
