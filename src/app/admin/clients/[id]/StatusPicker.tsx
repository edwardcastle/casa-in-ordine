'use client';

import { useActionState, useTransition } from 'react';
import { errorText } from '../../ActionForm';
import { updateProjectStatusAction } from '../actions';

const OPTIONS = [
  { value: 'planned', label: 'Programmato' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'done', label: 'Concluso' },
] as const;

/**
 * The project status as three segments. Picking one saves it at once, so the
 * organizer never has to find a separate "save" button for a one-click change.
 */
export default function StatusPicker({
  projectId,
  status,
}: {
  projectId: string;
  status: (typeof OPTIONS)[number]['value'];
}) {
  const [state, dispatch, pending] = useActionState(updateProjectStatusAction, null);
  const [, startTransition] = useTransition();

  function choose(value: string) {
    if (value === status || pending) return;
    const data = new FormData();
    data.set('projectId', projectId);
    data.set('status', value);
    startTransition(() => dispatch(data));
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div
        role="radiogroup"
        aria-label="Stato del progetto"
        className={`inline-flex rounded-full bg-secondary p-1 text-xs font-semibold ${pending ? 'opacity-60' : ''}`}
      >
        {OPTIONS.map((option) => {
          const active = option.value === status;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => choose(option.value)}
              className={`rounded-full px-3 py-1.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active
                  ? 'bg-white text-foreground shadow-[0_1px_3px_rgba(45,45,45,0.12)]'
                  : 'text-gray-600 hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <span role="status" aria-live="polite" className="text-xs">
        {state && 'error' in state ? <span className="text-red-800">{errorText(state.error)}</span> : null}
      </span>
    </div>
  );
}
