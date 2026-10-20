import type { QuoteStatus } from '@/lib/quotes/queries';

/** How each status reads and looks in the admin. */
export const QUOTE_STATUS: Record<QuoteStatus, { label: string; filter: string; badge: string; dot: string }> = {
  new: { label: 'Nuovo', filter: 'Nuovi', badge: 'bg-[#FBEFD9] text-[#7A5414]', dot: 'bg-[#D99A2B]' },
  contacted: { label: 'Contattato', filter: 'Contattati', badge: 'bg-[#E4ECF4] text-[#2E4A66]', dot: 'bg-[#4F7AA3]' },
  won: { label: 'Confermato', filter: 'Confermati', badge: 'bg-primary/15 text-[#3F4D3E]', dot: 'bg-primary' },
  lost: { label: 'Non procede', filter: 'Non procedono', badge: 'bg-[#EEEEEC] text-[#5F625C]', dot: 'bg-[#9A9D96]' },
};

export const LANG_IT = { it: 'Italiano', en: 'Inglese', es: 'Spagnolo' } as const;

export const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
