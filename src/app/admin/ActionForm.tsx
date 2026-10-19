'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import type { ActionState } from './clients/state';

const ERRORS: Record<string, string> = {
  duplicate: 'Esiste già: un cliente con questa email, o questo file è già allegato.',
  name: 'Inserisci il nome.',
  email: 'Email non valida.',
  lang: 'Scegli la lingua.',
  title: 'Il titolo è obbligatorio e al massimo di 200 caratteri.',
  zone: 'Zona non valida.',
  date: 'Data non valida.',
  body: 'Testo mancante o troppo lungo.',
  url: 'Il link deve iniziare con http:// o https://.',
  kind: 'Tipo di materiale non valido.',
  status: 'Stato non valido.',
  notfound: 'Elemento non trovato: ricarica la pagina.',
  confirm: "Spunta «Confermo l'eliminazione» per procedere.",
  notify: "Email non inviata: il cliente non è attivo, il progetto non è suo, oppure l'invio è fallito.",
  required: 'Titolo e testo in italiano sono obbligatori.',
  slug: 'Articolo del blog non valido.',
  upload: 'Il file non risulta caricato o non è valido. Riprova.',
  type: 'Formato non ammesso: usa PDF, JPG, PNG o WebP.',
  size: 'Il file è vuoto o supera 15 MB.',
};

export function errorText(code: string): string {
  return ERRORS[code] ?? 'Qualcosa non ha funzionato.';
}

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submit: string;
  children?: React.ReactNode;
  className?: string;
  /** Clear the fields after a successful submit. */
  resetOnSuccess?: boolean;
  /** Visual weight of the button. */
  tone?: 'primary' | 'quiet' | 'danger';
};

const TONES = {
  primary: 'rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light',
  quiet: 'rounded-full border border-secondary px-4 py-1.5 text-sm font-semibold hover:bg-white',
  danger: 'rounded-full border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50',
} as const;

/**
 * A form that runs a server action and reports its result in place.
 *
 * It submits through `onSubmit` rather than the form's `action` prop on
 * purpose: React resets an `action` form after every submit, errors included,
 * and an organizer who mistypes one field should not lose a long tip body.
 * The fields are cleared by hand, and only on success.
 */
export default function ActionForm({
  action,
  submit,
  children,
  className,
  resetOnSuccess = true,
  tone = 'primary',
}: Props) {
  const [state, dispatch, pending] = useActionState(action, null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state && 'ok' in state) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => dispatch(data));
      }}
    >
      {children}
      <button type="submit" disabled={pending} className={`${TONES[tone]} disabled:opacity-60`}>
        {pending ? 'Un attimo…' : submit}
      </button>
      <span role="status" aria-live="polite" className="text-sm">
        {state && 'error' in state ? (
          <span className="text-red-800">{errorText(state.error)}</span>
        ) : state?.message ? (
          <span className="text-primary">{state.message}</span>
        ) : null}
      </span>
    </form>
  );
}
