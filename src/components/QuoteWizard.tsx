'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { submitQuoteRequest } from '@/actions/contact';
import CategoryIcon from '@/components/CategoryIcon';
import {
  ZONES,
  accumulationLevels,
  calculatePrice,
  isAnswered,
  questionsFor,
  timingOptions,
  toggleOption,
  type AccumulationId,
  type QuoteQuestion,
  type TimingId,
  type Zone,
  type ZoneAnswers,
} from '@/lib/quote/config';

// The flow is: zone → that zone's questions → accumulation → timing →
// availability → result. Zones ask between two and four questions, so every
// step after the questions is positioned relative to how many the zone has.
const STEP_ZONE = 0;
const STEP_QUESTIONS = 1;

export default function QuoteWizard() {
  const t = useTranslations('quote');
  const [step, setStep] = useState(0);
  const [zone, setZone] = useState<Zone | null>(null);
  const [answers, setAnswers] = useState<ZoneAnswers>({});
  const [accumulation, setAccumulation] = useState<AccumulationId | null>(null);
  const [timing, setTiming] = useState<TimingId | null>(null);
  const [availability, setAvailability] = useState({ slot1: '', slot2: '', slot3: '' });
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const questions = zone ? questionsFor(zone) : [];

  const stepAccumulation = STEP_QUESTIONS + questions.length;
  const stepTiming = stepAccumulation + 1;
  const stepAvailability = stepTiming + 1;
  const stepResult = stepAvailability + 1;
  const totalSteps = stepResult + 1;

  const progress = ((step + 1) / totalSteps) * 100;

  // --- i18n helpers -------------------------------------------------------
  // Zone copy lives at `quote.zones.<zone>`, closing copy at `quote.closing`.

  function zoneText(key: string): string {
    return t(`zones.${zone}.${key}`);
  }

  function questionText(question: QuoteQuestion): string {
    return zoneText(`questions.${question.id}.question`);
  }

  function optionText(question: QuoteQuestion, optionId: string): string {
    return zoneText(`questions.${question.id}.options.${optionId}`);
  }

  // --- state --------------------------------------------------------------

  function selectZone(next: Zone) {
    if (next === zone) return;
    setZone(next);
    setAnswers({}); // the previous zone's answers do not apply here
  }

  function pickOption(question: QuoteQuestion, optionId: string) {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: toggleOption(question, prev[question.id] ?? [], optionId),
    }));
  }

  const price =
    zone !== null
      ? calculatePrice(zone, answers, accumulation, timing)
      : { total: 0, project: 0, urgency: 0 };

  function canProceed(): boolean {
    if (step === STEP_ZONE) return zone !== null;

    const questionIndex = step - STEP_QUESTIONS;
    if (questionIndex >= 0 && questionIndex < questions.length) {
      return isAnswered(answers, questions[questionIndex].id);
    }

    if (step === stepAccumulation) return accumulation !== null;
    if (step === stepTiming) return timing !== null;
    return step === stepAvailability; // dates are optional
  }

  async function handleSubmit() {
    if (!zone || !accumulation || !timing) return;
    setSubmitStatus('sending');
    try {
      const result = await submitQuoteRequest({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || undefined,
        zone: zoneText('label'),
        total: price.total,
        breakdown: { project: price.project, urgency: price.urgency },
        // Question text travels with the answer: it differs per zone, so the
        // answer alone would not say what was asked.
        answers: questions.map((question) => ({
          question: questionText(question),
          answer: (answers[question.id] ?? [])
            .map((optionId) => optionText(question, optionId))
            .join(' · '),
        })),
        accumulation: t(`closing.accumulo.options.${accumulation}`),
        timing: t(`closing.timing.options.${timing}`),
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

  // --- steps --------------------------------------------------------------

  function renderZoneStep() {
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('zoneTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('zoneSubtitle')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ZONES.map((z) => (
            <button
              key={z}
              onClick={() => selectZone(z)}
              className={`p-5 rounded-2xl border-2 text-center transition-all ${
                zone === z
                  ? 'border-primary bg-primary/10'
                  : 'border-secondary-dark bg-white hover:border-primary/50 hover:-translate-y-1'
              }`}
            >
              <CategoryIcon category={z} className="w-8 h-8 mx-auto mb-3" />
              <span className="block font-semibold text-sm leading-snug">
                {t(`zones.${z}.label`)}
              </span>
              <span className="block text-xs text-foreground/50 mt-1">
                {t(`zones.${z}.tagline`)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderQuestionStep(questionIndex: number) {
    const question = questions[questionIndex];
    if (!question) return null;
    const selected = answers[question.id] ?? [];

    return (
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider rounded-full mb-4">
          {zoneText('label')}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          <span className="text-foreground/40 mr-2">{questionIndex + 1}.</span>
          {questionText(question)}
        </h3>
        <p className="text-xs text-foreground/50 mb-6">
          {question.type === 'multi' ? t('pickMany') : t('pickOne')}
        </p>
        <div className="max-w-lg mx-auto space-y-3">
          {question.options.map((option) => {
            const isSelected = selected.includes(option.id);
            return (
              <button
                key={option.id}
                onClick={() => pickOption(question, option.id)}
                aria-pressed={isSelected}
                className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-secondary-dark bg-white hover:border-primary/50'
                }`}
              >
                <span
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center border-2 transition-all ${
                    question.type === 'multi' ? 'rounded-md' : 'rounded-full'
                  } ${isSelected ? 'border-primary bg-primary text-white' : 'border-secondary-dark'}`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span>{optionText(question, option.id)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderAccumulationStep() {
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('closing.accumulo.question')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('accumuloSubtitle')}</p>
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {accumulationLevels.map((level) => (
            <button
              key={level.id}
              onClick={() => setAccumulation(level.id)}
              className={`p-6 rounded-2xl border-2 text-center transition-all ${
                accumulation === level.id
                  ? 'border-primary bg-primary/10'
                  : 'border-secondary-dark bg-white hover:border-primary/50'
              }`}
            >
              <div className="text-3xl mb-3">{level.icon}</div>
              <p className="text-sm text-foreground/70">
                {t(`closing.accumulo.options.${level.id}`)}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderTimingStep() {
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('closing.timing.question')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('timingSubtitle')}</p>
        <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          {timingOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setTiming(option.id)}
              className={`p-6 rounded-2xl border-2 text-center transition-all ${
                timing === option.id
                  ? 'border-primary bg-primary/10'
                  : 'border-secondary-dark bg-white hover:border-primary/50'
              }`}
            >
              <div className="text-3xl mb-3">{option.icon}</div>
              <p className="text-sm font-medium text-foreground/80">
                {t(`closing.timing.options.${option.id}`)}
              </p>
            </button>
          ))}
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
    if (!zone) return null;

    return (
      <div className="text-center">
        {/* Summary pills + print button */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-primary">
            {zoneText('label')}
          </span>
          {accumulation && (
            <span className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-primary">
              {t(`accumuloShort.${accumulation}`)}
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

        {/* Price */}
        <p className="text-sm text-foreground/60 mb-2">{t('estimateLabel')}</p>
        <div className="text-5xl font-bold text-foreground mb-6">
          <span className="text-xl align-middle mr-1">€</span>{price.total}
        </div>

        <div className="max-w-lg mx-auto space-y-4 text-left">

          {/* Breakdown */}
          <div className="bg-secondary rounded-xl p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">{t('breakdownProject')}</span>
                <span className="font-semibold">€{price.project}</span>
              </div>
              {price.urgency > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/70">{t('breakdownUrgency')}</span>
                  <span className="font-semibold">€{price.urgency}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-secondary-dark">
                <span>{t('breakdownTotal')}</span>
                <span>€{price.total}</span>
              </div>
            </div>
          </div>

          {/* Answers + dates */}
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-foreground/50 mb-2">
              {t('summaryTitle')}
            </p>
            <ul className="space-y-2 mb-4">
              {questions.map((question) => {
                const selected = answers[question.id] ?? [];
                if (selected.length === 0) return null;
                return (
                  <li key={question.id} className="text-sm">
                    <span className="block text-foreground/50 text-xs">
                      {questionText(question)}
                    </span>
                    <span className="flex items-start gap-2 text-foreground/80">
                      <span className="text-primary">✓</span>
                      <span>
                        {selected.map((id) => optionText(question, id)).join(' · ')}
                      </span>
                    </span>
                  </li>
                );
              })}
              {timing && (
                <li className="text-sm">
                  <span className="block text-foreground/50 text-xs">
                    {t('closing.timing.question')}
                  </span>
                  <span className="flex items-start gap-2 text-foreground/80">
                    <span className="text-primary">✓</span>
                    <span>{t(`closing.timing.options.${timing}`)}</span>
                  </span>
                </li>
              )}
            </ul>
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
              <p className="text-xs text-foreground/50 mb-2">{t('photosHint')}</p>
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
    if (step === STEP_ZONE) return renderZoneStep();

    const questionIndex = step - STEP_QUESTIONS;
    if (questionIndex >= 0 && questionIndex < questions.length) {
      return renderQuestionStep(questionIndex);
    }

    if (step === stepAccumulation) return renderAccumulationStep();
    if (step === stepTiming) return renderTimingStep();
    if (step === stepAvailability) return renderAvailabilityStep();
    if (step === stepResult) return renderResultStep();
    return null;
  }

  function handleReset() {
    setStep(0);
    setZone(null);
    setAnswers({});
    setAccumulation(null);
    setTiming(null);
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
        {submitStatus !== 'success' && step < stepResult && (
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
        {(step === stepResult || submitStatus === 'success') && (
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
