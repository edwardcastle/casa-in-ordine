/**
 * The cookie that carries a sign-in token from the emailed link to the confirm
 * button, so the token never sits in a page URL. Lives as long as the token.
 */
export const SIGNIN_TOKEN_COOKIE = 'cio_signin_token';
export const SIGNIN_TOKEN_MAX_AGE_S = 30 * 60;
