'use client';

import { useActionState, useTransition } from 'react';
import { errorText } from '../../ActionForm';
import { setQuoteStatusAction } from '../actions';
import { QUOTE_STATUS } from '../meta';
import type { QuoteStatus } from '@/lib/quotes/queries';

const ORDER: QuoteStatus[] = ['new', 'contacted', 'won', 'lost'];

/** Where the request stands. Picking a step saves it straight away. */
export default function QuoteStatusPicker({ quoteId, status }: { quoteId: string; status: QuoteStatus }) {
  const [state, dispatch, pending] = useActionState(setQuoteStatusAction, null);
  const [, startTransition] = useTransition();

  function choose(value: QuoteStatus) {
    if (value === status || pending) return;
    const data = new FormData();
    data.set('quoteId', quoteId);
    data.set('status', value);
    startTransition(() => dispatch(data));
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Stato della richiesta"
        className={`grid grid-cols-2 gap-1.5 sm:grid-cols-4 ${pending ? 'opacity-60' : ''}`}
      >
        {ORDER.map((value) => {
          const active = value === status;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => choose(value)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active
                  ? 'border-[#3F4D3E] bg-white text-[#2F3A2E] shadow-[0_1px_3px_rgba(47,58,46,0.12)]'
                  : 'border-[#E2E5DE] bg-[#FAFBF8] text-[#5C6A5B] hover:border-[#CDD2C8] hover:text-[#2F3A2E]'
              }`}
            >
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${QUOTE_STATUS[value].dot}`} />
              {QUOTE_STATUS[value].label}
            </button>
          );
        })}
      </div>
      <p role="status" aria-live="polite" className="mt-1 text-xs">
        {state && 'error' in state ? <span className="text-red-800">{errorText(state.error)}</span> : null}
      </p>
    </div>
  );
}
