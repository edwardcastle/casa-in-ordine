/** The six service categories that have message keys under home.services.categories. */
export const REVIEW_SERVICES = [
  'armadio',
  'cucina',
  'ufficio',
  'bagno',
  'garage',
  'trasloco',
] as const;

export type ReviewService = (typeof REVIEW_SERVICES)[number];

export type ReviewLang = 'it' | 'en' | 'es';
export type ReviewSource = 'direct' | 'google';
export type ReviewStatus = 'pending' | 'approved' | 'removed';

/** A review as the public site sees it. Never carries the client's email. */
export interface PublicReview {
  id: string;
  authorName: string;
  city: string | null;
  rating: number | null;
  body: string;
  lang: ReviewLang;
  service: ReviewService | null;
  source: ReviewSource;
  googleUrl: string | null;
  submittedAt: Date;
}

/** A review as the admin page sees it, including the consent record. */
export interface AdminReview extends Omit<PublicReview, 'body'> {
  authorEmail: string | null;
  body: string | null;
  status: ReviewStatus;
  consentGiven: boolean;
  consentText: string | null;
  consentAt: Date | null;
  invoiceRef: string | null;
  decidedAt: Date | null;
  decidedBy: string | null;
  removedAt: Date | null;
}

export function isReviewService(value: unknown): value is ReviewService {
  return typeof value === 'string' && (REVIEW_SERVICES as readonly string[]).includes(value);
}

export function isReviewLang(value: unknown): value is ReviewLang {
  return value === 'it' || value === 'en' || value === 'es';
}
