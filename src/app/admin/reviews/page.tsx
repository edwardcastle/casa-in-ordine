import { approveReview, rejectReview, signOut, withdrawReview } from '@/actions/admin';
import { currentAdmin } from '@/lib/reviews/admin-session';
import { isReviewsConfigured } from '@/lib/reviews/db';
import { listAllReviews, MIN_PUBLISHED } from '@/lib/reviews/queries';
import type { AdminReview } from '@/lib/reviews/types';
import SignInForm from './SignInForm';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-400">—</span>;
  return (
    <span className="text-accent" aria-label={`${rating} su 5`}>
      {'★'.repeat(rating)}
      <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function Row({ review }: { review: AdminReview }) {
  const tone =
    review.status === 'approved'
      ? 'border-primary/40 bg-primary/5'
      : review.status === 'pending'
        ? 'border-accent/50 bg-accent/5'
        : 'border-secondary/40 bg-white opacity-70';

  return (
    <article className={`rounded-lg border p-5 ${tone}`}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">
            {review.authorName}
            {review.city ? <span className="font-normal text-gray-500">, {review.city}</span> : null}
          </h3>
          <p className="text-sm text-gray-500">
            <Stars rating={review.rating} />
            <span className="mx-2">·</span>
            {dateFmt.format(review.submittedAt)}
            <span className="mx-2">·</span>
            {review.lang.toUpperCase()}
            {review.services.length > 0 ? <> · {review.services.join(', ')}</> : null}
            {review.source === 'google' ? <> · da Google</> : null}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {review.status === 'pending'
            ? 'Da decidere'
            : review.status === 'approved'
              ? 'Pubblicata'
              : 'Rimossa'}
        </span>
      </header>

      {review.body ? (
        <blockquote className="mb-3 border-l-2 border-secondary pl-4 text-gray-700 italic">
          {review.body}
        </blockquote>
      ) : (
        <p className="mb-3 text-sm text-gray-500 italic">
          Testo cancellato. La riga resta come prova che la recensione è esistita ed
          è stata ritirata.
        </p>
      )}

      <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-gray-600">
        {review.authorEmail && (
          <>
            <dt className="font-semibold">Email</dt>
            <dd>{review.authorEmail}</dd>
          </>
        )}
        <dt className="font-semibold">Consenso</dt>
        <dd>
          {review.consentGiven && review.consentAt
            ? `Sì, ${dateFmt.format(review.consentAt)}`
            : 'Nessuno'}
        </dd>
        {review.consentText && (
          <>
            <dt className="font-semibold">Testo</dt>
            <dd className="italic">&ldquo;{review.consentText}&rdquo;</dd>
          </>
        )}
        {review.invoiceRef && (
          <>
            <dt className="font-semibold">Fattura</dt>
            <dd>{review.invoiceRef}</dd>
          </>
        )}
        {review.decidedBy && (
          <>
            <dt className="font-semibold">Decisa da</dt>
            <dd>{review.decidedBy}</dd>
          </>
        )}
      </dl>

      {review.status === 'pending' && (
        <div className="flex flex-wrap items-end gap-3 border-t border-secondary/40 pt-4">
          <form action={approveReview} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={review.id} />
            <label className="flex flex-col text-xs font-semibold text-gray-600">
              Numero fattura
              <input
                name="invoiceRef"
                placeholder="es. 2026-014"
                className="mt-1 rounded-md border border-secondary/60 bg-white px-2 py-1.5 text-sm font-normal"
              />
            </label>
            <button className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light">
              Approva e pubblica
            </button>
          </form>
          <form action={rejectReview}>
            <input type="hidden" name="id" value={review.id} />
            <button className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-800 hover:bg-red-50">
              Rifiuta
            </button>
          </form>
        </div>
      )}

      {review.status === 'approved' && (
        <form action={withdrawReview} className="border-t border-secondary/40 pt-4">
          <input type="hidden" name="id" value={review.id} />
          <button className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-800 hover:bg-red-50">
            Ritira dal sito
          </button>
          <span className="ml-3 text-xs text-gray-500">
            Cancella il testo e l&apos;email. Usalo quando una cliente lo chiede.
          </span>
        </form>
      )}
    </article>
  );
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const admin = await currentAdmin();

  if (!admin) return <SignInForm linkError={error === 'link'} />;

  if (!isReviewsConfigured()) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="mb-3 text-2xl font-semibold">Recensioni</h1>
        <p className="text-gray-600">
          DATABASE_URL non è configurato, quindi non c&apos;è nulla da mostrare.
        </p>
      </main>
    );
  }

  const reviews = await listAllReviews();
  const pending = reviews.filter((r) => r.status === 'pending').length;
  const published = reviews.filter((r) => r.status === 'approved').length;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-3 border-b border-secondary pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Recensioni</h1>
          <p className="text-sm text-gray-500">{admin}</p>
        </div>
        <form action={signOut}>
          <button className="text-sm text-gray-600 underline hover:text-foreground">Esci</button>
        </form>
      </header>

      <p className="mb-8 rounded-lg border border-secondary/50 bg-white px-4 py-3 text-sm">
        <strong>{published}</strong> pubblicate · <strong>{pending}</strong> da decidere.
        {published < MIN_PUBLISHED && (
          <>
            {' '}
            La sezione sul sito resta nascosta finché non ce ne sono {MIN_PUBLISHED}:
            due recensioni fanno peggio di nessuna.
          </>
        )}
      </p>

      {reviews.length === 0 ? (
        <p className="text-gray-600">Ancora nessuna recensione.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {reviews.map((review) => (
            <Row key={review.id} review={review} />
          ))}
        </div>
      )}
    </main>
  );
}
