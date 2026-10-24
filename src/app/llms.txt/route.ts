import { AREAS } from '@/lib/areas';
import { getAllPosts } from '@/lib/blog';
import it from '../../../messages/it.json';

/**
 * /llms.txt: a plain-text map of the site for language models and AI
 * assistants (llmstxt.org). It says who Casa in Ordine is and links the pages
 * worth reading, each with the description the page already carries.
 *
 * Built from the same sources as the pages themselves (the message files,
 * the room-page list, the blog), so it cannot drift from the site. Italian
 * pages are listed because Italian is the primary language; every page also
 * exists under /en and /es. The summary states only facts the site states.
 */

export const dynamic = 'force-static';

const BASE = 'https://casainordine.com';

const line = (title: string, path: string, description?: string) =>
  `- [${title}](${BASE}${path})${description ? `: ${description}` : ''}`;

function body(): string {
  const posts = getAllPosts('it');

  return [
    '# Casa in Ordine',
    '',
    '> Casa in Ordine is a professional organizing studio in Rome, Italy, founded by Dalia and Surinay. They work in clients\' homes in Rome: decluttering, home organizing ("riordino casa"), organizing wardrobes, kitchens, bathrooms, living areas and storage rooms, and help before and after a move. Clients can request a free estimate online.',
    '',
    'Key facts:',
    '- Service area: Rome (Roma), Italy.',
    '- Languages of the site: Italian (primary), English and Spanish. Every page below also exists under /en/ and /es/ with the same path.',
    '- Contact: info@casainordine.com, +39 344 5856 895.',
    `- Free estimate: ${BASE}/it/preventivo (an online survey of the rooms to organize).`,
    '- Instagram: https://www.instagram.com/casainordine_it/',
    '',
    '## Services',
    '',
    line(it.services.title, '/it/services', it.services.metaDescription),
    ...AREAS.map((area) => {
      const copy = it.areas[area.zone as keyof typeof it.areas] as { metaTitle: string; metaDescription: string };
      return line(copy.metaTitle, `/it/services/${area.slug}`, copy.metaDescription);
    }),
    '',
    '## About and contact',
    '',
    line(it.about.title, '/it/about', it.about.metaDescription),
    line(it.contact.title, '/it/contact', it.contact.metaDescription),
    line(it.preventivo.title, '/it/preventivo', it.preventivo.metaDescription),
    '',
    '## Guides',
    '',
    `${it.blog.metaDescription}`,
    '',
    ...posts.map((post) => line(post.title, `/it/blog/${post.slug}`, post.description)),
    '',
    '## Optional',
    '',
    line('English home page', '/en', 'The site in English.'),
    line('Spanish home page', '/es', 'The site in Spanish.'),
    line('Sitemap', '/sitemap.xml', 'Every public page in all three languages.'),
    line('Privacy policy', '/it/privacy-policy'),
    '',
  ].join('\n');
}

export function GET() {
  return new Response(body(), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
