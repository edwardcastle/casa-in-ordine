/**
 * Field names shared by the forms and the server actions that read them.
 *
 * The honeypot name is deliberately not one of the HTML autocomplete tokens:
 * a browser or password manager that recognised it might fill it in for a real
 * visitor and get them rejected.
 */
export const HONEYPOT_FIELD = 'company_website';
export const RENDERED_AT_FIELD = 'form_rendered_at';
