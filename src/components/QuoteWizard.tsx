'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { submitQuoteRequest } from '@/actions/contact';
import CategoryIcon from '@/components/CategoryIcon';
import {
  ZONES,
  accumulationLevels,
  calculateTotals,
  isAnswered,
  questionsFor,
  timingOptions,
  toggleOption,
  type AccumulationId,
  type QuoteEntry,
  type QuoteQuestion,
  type TimingId,
  type Zone,
  type ZoneAnswers,
} from '@/lib/quote/config';

// A quote holds one or more zones. Each zone is configured in a loop —
// pick it, answer its questions, rate its clutter — and lands in the cart.
// The tail (timing, dates, contact) is answered once for the whole job.
type Phase =
  | 'zone'
  | 'questions'
  | 'accumulation'
  | 'cart'
  | 'timing'
  | 'availability'
  | 'result';

const TAIL_PHASES: Phase[] = ['cart', 'timing', 'availability', 'result'];

export default function QuoteWizard() {
  const t = useTranslations('quote');

  const [entries, setEntries] = useState<QuoteEntry[]>([]);
  const [nextId, setNextId] = useState(1);

  // The zone currently being configured, before it joins the cart.
  const [draftZone, setDraftZone] = useState<Zone | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<ZoneAnswers>({});
  const [draftAccumulation, setDraftAccumulation] = useState<AccumulationId | null>(null);

  const [phase, setPhase] = useState<Phase>('zone');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showAddedModal, setShowAddedModal] = useState(false);

  const [timing, setTiming] = useState<TimingId | null>(null);
  const [availability, setAvailability] = useState({ slot1: '', slot2: '', slot3: '' });
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const draftQuestions = draftZone ? questionsFor(draftZone) : [];
  const totals = calculateTotals(entries, timing);

  // Escape closes the "zone added" prompt without choosing, leaving the cart.
  useEffect(() => {
    if (!showAddedModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddedModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAddedModal]);

  // --- i18n helpers -------------------------------------------------------

  function zoneLabel(zone: Zone): string {
    return t(`zones.${zone}.label`);
  }

  function questionText(zone: Zone, question: QuoteQuestion): string {
    return t(`zones.${zone}.questions.${question.id}.question`);
  }

  function optionText(zone: Zone, question: QuoteQuestion, optionId: string): string {
    return t(`zones.${zone}.questions.${question.id}.options.${optionId}`);
  }

  // --- navigation ---------------------------------------------------------

  function canProceed(): boolean {
    switch (phase) {
      case 'zone':
        return draftZone !== null;
      case 'questions':
        return isAnswered(draftAnswers, draftQuestions[questionIndex]?.id ?? '');
      case 'accumulation':
        return draftAccumulation !== null;
      case 'cart':
        return entries.length > 0;
      case 'timing':
        return timing !== null;
      case 'availability':
        return true; // dates are optional
      default:
        return false;
    }
  }

  /** Moves the finished draft zone into the cart and clears it. */
  function commitDraft() {
    if (!draftZone || !draftAccumulation) return;
    setEntries((prev) => [
      ...prev,
      { id: nextId, zone: draftZone, answers: draftAnswers, accumulation: draftAccumulation },
    ]);
    setNextId((id) => id + 1);
    setDraftZone(null);
    setDraftAnswers({});
    setDraftAccumulation(null);
  }

  function goNext() {
    switch (phase) {
      case 'zone':
        setQuestionIndex(0);
        setPhase('questions');
        return;
      case 'questions':
        if (questionIndex + 1 < draftQuestions.length) {
          setQuestionIndex(questionIndex + 1);
        } else {
          setPhase('accumulation');
        }
        return;
      case 'accumulation':
        commitDraft();
        setPhase('cart');
        setShowAddedModal(true);
        return;
      case 'cart':
        setPhase('timing');
        return;
      case 'timing':
        setPhase('availability');
        return;
      case 'availability':
        setPhase('result');
        return;
    }
  }

  function goBack() {
    switch (phase) {
      case 'zone':
        // Only reachable when a zone is already in the cart: abandon this one.
        setDraftZone(null);
        setDraftAnswers({});
        setDraftAccumulation(null);
        setPhase('cart');
        return;
      case 'questions':
        if (questionIndex > 0) setQuestionIndex(questionIndex - 1);
        else setPhase('zone');
        return;
      case 'accumulation':
        setQuestionIndex(Math.max(draftQuestions.length - 1, 0));
        setPhase('questions');
        return;
      case 'timing':
        setPhase('cart');
        return;
      case 'availability':
        setPhase('timing');
        return;
    }
  }

  // Back is hidden at the very start, and on the cart, where the zone is
  // already committed and the way to undo it is the remove button.
  const canGoBack =
    phase === 'questions' ||
    phase === 'accumulation' ||
    phase === 'timing' ||
    phase === 'availability' ||
    (phase === 'zone' && entries.length > 0);

  function startAnotherZone() {
    setShowAddedModal(false);
    setDraftZone(null);
    setDraftAnswers({});
    setDraftAccumulation(null);
    setQuestionIndex(0);
    setPhase('zone');
  }

  function continueToQuote() {
    setShowAddedModal(false);
    setPhase('timing');
  }

  function removeEntry(id: number) {
    const remaining = entries.filter((e) => e.id !== id);
    setEntries(remaining);
    // Removing the last zone leaves nothing to quote — back to the picker.
    if (remaining.length === 0) setPhase('zone');
  }

  // Progress runs across the current zone plus the shared tail. Adding a
  // second zone restarts the zone part, which is what is actually happening.
  const zoneStepCount = 1 + Math.max(draftQuestions.length, 1) + 1;
  const sequenceLength = zoneStepCount + TAIL_PHASES.length;
  const position = (() => {
    if (phase === 'zone') return 0;
    if (phase === 'questions') return 1 + questionIndex;
    if (phase === 'accumulation') return zoneStepCount - 1;
    return zoneStepCount + TAIL_PHASES.indexOf(phase);
  })();
  const progress = ((position + 1) / sequenceLength) * 100;

  // --- state --------------------------------------------------------------

  function selectZone(next: Zone) {
    if (next === draftZone) return;
    setDraftZone(next);
    setDraftAnswers({});
    setDraftAccumulation(null);
  }

  function pickOption(question: QuoteQuestion, optionId: string) {
    setDraftAnswers((prev) => ({
      ...prev,
      [question.id]: toggleOption(question, prev[question.id] ?? [], optionId),
    }));
  }

  async function handleSubmit() {
    if (entries.length === 0 || !timing) return;
    setSubmitStatus('sending');
    try {
      const result = await submitQuoteRequest({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || undefined,
        zones: entries.map((entry) => ({
          zone: zoneLabel(entry.zone),
          accumulation: t(`closing.accumulo.options.${entry.accumulation}`),
          subtotal: totals.zones.find((z) => z.id === entry.id)?.subtotal ?? 0,
          // Question text travels with the answer: it differs per zone.
          answers: questionsFor(entry.zone).map((question) => ({
            question: questionText(entry.zone, question),
            answer: (entry.answers[question.id] ?? [])
              .map((optionId) => optionText(entry.zone, question, optionId))
              .join(' · '),
          })),
        })),
        subtotal: totals.subtotal,
        urgency: totals.urgency,
        total: totals.total,
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
    const taken = new Set(entries.map((e) => e.zone));
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {entries.length > 0 ? t('zoneTitleAnother') : t('zoneTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('zoneSubtitle')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ZONES.map((z) => {
            const isTaken = taken.has(z);
            return (
              <button
                key={z}
                onClick={() => !isTaken && selectZone(z)}
                disabled={isTaken}
                className={`p-5 rounded-2xl border-2 text-center transition-all ${
                  isTaken
                    ? 'border-secondary-dark bg-secondary/60 opacity-60 cursor-not-allowed'
                    : draftZone === z
                      ? 'border-primary bg-primary/10'
                      : 'border-secondary-dark bg-white hover:border-primary/50 hover:-translate-y-1'
                }`}
              >
                <CategoryIcon category={z} className="w-8 h-8 mx-auto mb-3" />
                <span className="block font-semibold text-sm leading-snug">{zoneLabel(z)}</span>
                <span className="block text-xs text-foreground/50 mt-1">
                  {isTaken ? t('zoneAlreadyAdded') : t(`zones.${z}.tagline`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderQuestionStep() {
    const question = draftQuestions[questionIndex];
    if (!draftZone || !question) return null;
    const selected = draftAnswers[question.id] ?? [];

    return (
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider rounded-full mb-4">
          {zoneLabel(draftZone)}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          <span className="text-foreground/40 mr-2">{questionIndex + 1}.</span>
          {questionText(draftZone, question)}
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
                <span>{optionText(draftZone, question, option.id)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderAccumulationStep() {
    if (!draftZone) return null;
    return (
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider rounded-full mb-4">
          {zoneLabel(draftZone)}
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('closing.accumulo.question')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('accumuloSubtitle')}</p>
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {accumulationLevels.map((level) => (
            <button
              key={level.id}
              onClick={() => setDraftAccumulation(level.id)}
              className={`p-6 rounded-2xl border-2 text-center transition-all ${
                draftAccumulation === level.id
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

  /** The cart: every zone added so far, with the option to add more. */
  function renderCartStep() {
    return (
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          {t('cartTitle')}
        </h3>
        <p className="text-foreground/60 mb-8">{t('cartSubtitle')}</p>

        <ul className="max-w-lg mx-auto space-y-3 mb-8 text-left">
          {entries.map((entry) => {
            const subtotal = totals.zones.find((z) => z.id === entry.id)?.subtotal ?? 0;
            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 bg-secondary rounded-xl p-4 border border-secondary-dark"
              >
                <CategoryIcon category={entry.zone} className="w-7 h-7 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{zoneLabel(entry.zone)}</p>
                  <p className="text-xs text-foreground/50">
                    {t(`accumuloShort.${entry.accumulation}`)}
                  </p>
                </div>
                <span className="font-bold text-primary">€{subtotal}</span>
                <button
                  onClick={() => removeEntry(entry.id)}
                  aria-label={t('removeZone', { zone: zoneLabel(entry.zone) })}
                  title={t('removeZone', { zone: zoneLabel(entry.zone) })}
                  className="flex-shrink-0 w-8 h-8 rounded-full border border-secondary-dark flex items-center justify-center text-foreground/40 hover:border-red-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="max-w-lg mx-auto flex items-center justify-between text-sm font-bold border-t border-secondary-dark pt-4">
          <span>{t('breakdownSubtotal')}</span>
          <span>€{totals.subtotal}</span>
        </div>

        <button
          onClick={startAnotherZone}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-dashed border-primary/50 text-primary font-semibold hover:bg-primary/5 hover:border-primary transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('addAnotherZone')}
        </button>
      </div>
    );
  }

  /** Shown the moment a zone lands in the cart. */
  function renderAddedModal() {
    const justAdded = entries[entries.length - 1];
    if (!justAdded) return null;

    return (
      <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          onClick={() => setShowAddedModal(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qw-added-title"
          className="relative bg-white rounded-3xl shadow-xl border border-secondary-dark max-w-md w-full p-6 md:p-8 text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 id="qw-added-title" className="text-lg font-bold text-foreground mb-1">
            {t('zoneAddedTitle', { zone: zoneLabel(justAdded.zone) })}
          </h4>
          <p className="text-sm text-foreground/60 mb-6">{t('zoneAddedQuestion')}</p>

          <div className="space-y-3">
            <button
              onClick={startAnotherZone}
              className="w-full px-6 py-3 rounded-full border-2 border-primary text-primary font-semibold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('addAnotherZone')}
            </button>
            <button
              onClick={continueToQuote}
              className="w-full px-6 py-3 rounded-full bg-primary text-white font-semibold shadow-md hover:bg-primary-dark transition-all"
            >
              {t('continueToQuote')}
            </button>
          </div>
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
    return (
      <div className="text-center">
        {/* Summary pills + print button */}
        <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
          {entries.map((entry) => (
            <span
              key={entry.id}
              className="inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-primary"
            >
              {zoneLabel(entry.zone)}
            </span>
          ))}
          {/* Without this the only way to add a zone after seeing the price
              would be to restart and lose every answer. */}
          <button
            onClick={() => setPhase('cart')}
            className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-primary/50 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('editZones')}
          </button>
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
          <span className="text-xl align-middle mr-1">€</span>{totals.total}
        </div>

        <div className="max-w-lg mx-auto space-y-4 text-left">

          {/* Breakdown — one line per zone */}
          <div className="bg-secondary rounded-xl p-4">
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex justify-between text-sm">
                  <span className="text-foreground/70">{zoneLabel(entry.zone)}</span>
                  <span className="font-semibold">
                    €{totals.zones.find((z) => z.id === entry.id)?.subtotal ?? 0}
                  </span>
                </div>
              ))}
              {totals.urgency > 0 && (
                <>
                  <div className="flex justify-between text-sm pt-2 border-t border-secondary-dark">
                    <span className="text-foreground/70">{t('breakdownSubtotal')}</span>
                    <span className="font-semibold">€{totals.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">{t('breakdownUrgency')}</span>
                    <span className="font-semibold">€{totals.urgency}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-secondary-dark">
                <span>{t('breakdownTotal')}</span>
                <span>€{totals.total}</span>
              </div>
            </div>
          </div>

          {/* Answers, grouped by zone */}
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-foreground/50 mb-3">
              {t('summaryTitle')}
            </p>
            {entries.map((entry) => (
              <div key={entry.id} className="mb-4 last:mb-0">
                <p className="font-semibold text-sm text-primary mb-1">
                  {zoneLabel(entry.zone)}
                  <span className="font-normal text-foreground/50">
                    {' · '}
                    {t(`accumuloShort.${entry.accumulation}`)}
                  </span>
                </p>
                <ul className="space-y-2">
                  {questionsFor(entry.zone).map((question) => {
                    const selected = entry.answers[question.id] ?? [];
                    if (selected.length === 0) return null;
                    return (
                      <li key={question.id} className="text-sm">
                        <span className="block text-foreground/50 text-xs">
                          {questionText(entry.zone, question)}
                        </span>
                        <span className="flex items-start gap-2 text-foreground/80">
                          <span className="text-primary">✓</span>
                          <span>
                            {selected
                              .map((id) => optionText(entry.zone, question, id))
                              .join(' · ')}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {timing && (
              <p className="text-sm border-t border-secondary-dark pt-3">
                <span className="block text-foreground/50 text-xs">
                  {t('closing.timing.question')}
                </span>
                <span className="flex items-start gap-2 text-foreground/80">
                  <span className="text-primary">✓</span>
                  <span>{t(`closing.timing.options.${timing}`)}</span>
                </span>
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="bg-secondary rounded-xl p-4">
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

  function renderPhase() {
    if (submitStatus === 'success') return renderSuccess();
    switch (phase) {
      case 'zone': return renderZoneStep();
      case 'questions': return renderQuestionStep();
      case 'accumulation': return renderAccumulationStep();
      case 'cart': return renderCartStep();
      case 'timing': return renderTimingStep();
      case 'availability': return renderAvailabilityStep();
      case 'result': return renderResultStep();
    }
  }

  function handleReset() {
    setEntries([]);
    setNextId(1);
    setDraftZone(null);
    setDraftAnswers({});
    setDraftAccumulation(null);
    setPhase('zone');
    setQuestionIndex(0);
    setShowAddedModal(false);
    setTiming(null);
    setAvailability({ slot1: '', slot2: '', slot3: '' });
    setNotes('');
    setPhotos([]);
    setContact({ name: '', email: '', phone: '' });
    setSubmitStatus('idle');
  }

  const isDone = submitStatus === 'success';

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

      {/* Zone counter — the quote can hold several */}
      {!isDone && entries.length > 0 && phase !== 'result' && (
        <p className="print:hidden text-center text-xs font-semibold text-primary mt-4">
          {t('zoneCount', { count: entries.length })}
        </p>
      )}

      {/* Progress bar */}
      <div className="print:hidden h-2 bg-secondary mt-4">
        <div
          className="h-full bg-primary rounded-r-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6 md:p-10">
        {renderPhase()}

        {/* Navigation — hidden on the result step and after success */}
        {!isDone && phase !== 'result' && (
          <div className="print:hidden flex justify-between mt-10 pt-6 border-t border-secondary">
            <button
              onClick={goBack}
              className={`px-6 py-3 rounded-full border-2 border-secondary-dark font-semibold text-foreground/60 transition-all hover:border-primary ${
                canGoBack ? '' : 'invisible'
              }`}
            >
              {t('back')}
            </button>
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="px-8 py-3 rounded-full bg-primary text-white font-semibold shadow-md transition-all hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {phase === 'cart' ? t('continueToQuote') : t('next')}
            </button>
          </div>
        )}

        {/* Restart — visible on final step and after success */}
        {(phase === 'result' || isDone) && (
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

      {showAddedModal && !isDone && renderAddedModal()}
    </div>
  );
}
