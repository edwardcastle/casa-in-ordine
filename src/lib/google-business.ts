/**
 * The Google Business Profile.
 *
 * Hardcoded rather than an environment variable: a place identifier is public
 * information, exactly like the Instagram URL beside it in JsonLd.tsx.
 *
 * The CID form is used because it survives the profile being renamed — the
 * listing was called "Casainordine" until it was corrected to "Casa in Ordine",
 * and a name-based Maps URL would have broken.
 */
export const GOOGLE_PROFILE_URL = 'https://maps.google.com/?cid=9355657405869329031';
