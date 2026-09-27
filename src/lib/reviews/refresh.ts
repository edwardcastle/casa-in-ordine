import { revalidatePath } from 'next/cache';

/**
 * Throws away the cached homepage, in every language.
 *
 * The homepage is built once and served from the cache, so the reviews on it
 * are whatever they were when it was last built. Every write that changes
 * which reviews are public calls this, and the next visitor gets a page built
 * from the table as it stands.
 *
 * It is called from the queries themselves rather than from the actions around
 * them: a new way of approving or withdrawing a review then cannot forget to.
 *
 * It never throws. A review that has been withdrawn in the database must not
 * be reported as a failure because a cache could not be cleared — the page
 * rebuilds itself on a timer as well (see `revalidate` in [locale]/page.tsx),
 * so the worst case is a delay of minutes, not a review that stays up.
 */
export function refreshPublishedReviews(): void {
  try {
    revalidatePath('/[locale]', 'page');
  } catch (error) {
    console.error(
      'A review changed but the cached homepage could not be cleared; it will ' +
        'catch up at its next timed rebuild.',
      error,
    );
  }
}
