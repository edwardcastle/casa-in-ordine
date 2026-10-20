/**
 * What an admin form action reports back to `ActionForm`. Errors are short
 * codes, not sentences: the component owns the Italian wording.
 */
export type ActionState =
  | { ok: true; message?: string; /** Where to go after success. */ redirectTo?: string }
  | { error: string }
  | null;
