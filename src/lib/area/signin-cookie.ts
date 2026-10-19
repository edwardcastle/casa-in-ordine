/**
 * The cookies that carry a sign-in token (and the page the client was headed
 * for) from the emailed link to the confirm button, so neither sits in a page
 * URL. They live as long as the token.
 */
export const SIGNIN_TOKEN_COOKIE = 'cio_signin_token';
export const SIGNIN_NEXT_COOKIE = 'cio_signin_next';
export const SIGNIN_TOKEN_MAX_AGE_S = 30 * 60;
