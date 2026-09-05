'use client';

import { useActionState } from 'react';
import { requestSignInLink } from '@/actions/admin';

type State = { sent: boolean; reason?: string } | null;

export default function SignInForm({ linkError }: { linkError: boolean }) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => requestSignInLink(formData),
    null,
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <h1 className="mb-2 text-2xl font-semibold">Recensioni</h1>
      <p className="mb-6 text-sm text-gray-600">
        Ti mandiamo un link per accedere. Non serve una password.
      </p>

      {linkError && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Quel link non è più valido. Vale una volta sola e scade dopo 30 minuti —
          chiedine un altro qui sotto.
        </p>
      )}

      {state?.sent ? (
        <p className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          Se quell&apos;indirizzo può gestire le recensioni, il link è appena partito.
          Controlla la posta.
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <label htmlFor="admin-email" className="text-sm font-medium">
            La tua email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-secondary/60 bg-white px-3 py-2 text-base focus:border-primary focus:outline-none"
          />

          {state?.reason === 'rate-limited' && (
            <p className="text-sm text-red-700">
              Troppi tentativi. Riprova fra un quarto d&apos;ora.
            </p>
          )}
          {state?.reason === 'unavailable' && (
            <p className="text-sm text-red-700">
              L&apos;accesso non è configurato su questo sito.
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-full bg-primary px-6 py-2.5 font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-60"
          >
            {pending ? 'Invio…' : 'Mandami il link'}
          </button>
        </form>
      )}
    </div>
  );
}
