#!/usr/bin/env node
/**
 * Builds the services catalogue PDFs from messages/<locale>.json.
 *
 * Generated rather than hand-designed so the catalogue cannot drift from the
 * site: edit a service in the message files, re-run this, and the PDF matches.
 * Regenerate whenever `services.*` or the contact details change.
 *
 *   pnpm build:catalog
 *
 * Rendering goes through headless Chrome, which is the only dependency and is
 * already on any machine with Chrome installed. Output lands in
 * public/catalogo/, where src/lib/catalog reads it.
 */

import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'catalogo');
const LOCALES = ['it', 'en', 'es'];

// The same photographs /services pairs with each item, so the catalogue and
// the page show the same work in the same order.
const SERVICE_IMAGES = [
  'gallery/closet-1.jpg',
  'gallery/kitchen-1.jpg',
  'gallery/office-1.jpg',
  'gallery/living-3.jpg',
];
const COVER_IMAGE = 'backgrounds/casa-in-ordine-sec2-after.webp';

/**
 * Chrome embeds images at their source resolution, so the full-size gallery
 * JPEGs produced a 7 MB brochure. Downscaled to roughly twice the printed
 * width at 300dpi, which is past what any press needs and a twentieth of the
 * bytes.
 */
async function prepareImage(rel, outDir, width) {
  const out = join(outDir, rel.replace(/[\/]/g, '-').replace(/\.[^.]+$/, '.jpg'));
  await sharp(join(ROOT, 'public', 'images', rel))
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(out);
  return `file://${out}`;
}

const CHROME = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(
  (bin) => {
    try {
      execFileSync('which', [bin], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
);

if (!CHROME) {
  console.error('No Chrome or Chromium on PATH. Install one, or export the PDF by hand.');
  process.exit(1);
}

const COPY = {
  it: {
    kicker: 'Catalogo dei servizi',
    intro:
      'Ogni casa parte da un punto diverso. Questo catalogo raccoglie i nostri servizi, cosa comprende ciascuno e come lavoriamo — così puoi capire da dove conviene cominciare.',
    included: 'Cosa comprende',
    howTitle: 'Come lavoriamo',
    how: [
      ['Ascoltiamo', 'Capiamo le tue abitudini e guardiamo insieme gli spazi da riorganizzare.'],
      ['Progettiamo', 'Prepariamo un piano su misura, con tempi e priorità concordati con te.'],
      ['Riordiniamo', 'Lavoriamo stanza per stanza, con soluzioni pratiche e belle da vedere.'],
      ['Ti insegniamo', 'Ti lasciamo un metodo semplice per mantenere l’ordine da sola.'],
    ],
    ctaTitle: 'Parliamone',
    ctaBody:
      'La prima consulenza conoscitiva di 15 minuti è gratuita. Scrivici e ti diciamo con franchezza da dove partiremmo.',
    quote: 'Richiedi un preventivo gratuito',
    page: 'Pagina',
  },
  en: {
    kicker: 'Services catalogue',
    intro:
      'Every home starts somewhere different. This catalogue sets out our services, what each one covers and how we work — so you can see where it makes sense to begin.',
    included: 'What it covers',
    howTitle: 'How we work',
    how: [
      ['We listen', 'We learn your habits and look at the spaces to reorganise together.'],
      ['We plan', 'We prepare a tailored plan, with timings and priorities agreed with you.'],
      ['We organise', 'We work room by room, with solutions that are practical and good to look at.'],
      ['We teach', 'We leave you a simple method for keeping order on your own.'],
    ],
    ctaTitle: "Let's talk",
    ctaBody:
      'The first 15-minute consultation is free. Write to us and we will tell you frankly where we would start.',
    quote: 'Request a free quote',
    page: 'Page',
  },
  es: {
    kicker: 'Catálogo de servicios',
    intro:
      'Cada casa parte de un punto distinto. Este catálogo reúne nuestros servicios, qué incluye cada uno y cómo trabajamos, para que veas por dónde conviene empezar.',
    included: 'Qué incluye',
    howTitle: 'Cómo trabajamos',
    how: [
      ['Escuchamos', 'Entendemos tus hábitos y miramos juntas los espacios a reorganizar.'],
      ['Planificamos', 'Preparamos un plan a medida, con tiempos y prioridades acordados contigo.'],
      ['Ordenamos', 'Trabajamos habitación por habitación, con soluciones prácticas y bonitas.'],
      ['Te enseñamos', 'Te dejamos un método sencillo para mantener el orden por tu cuenta.'],
    ],
    ctaTitle: 'Hablemos',
    ctaBody:
      'La primera consulta de 15 minutos es gratuita. Escríbenos y te diremos con franqueza por dónde empezaríamos.',
    quote: 'Solicita un presupuesto gratuito',
    page: 'Página',
  },
};

const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function page(locale, images) {
  const m = JSON.parse(readFileSync(join(ROOT, 'messages', `${locale}.json`), 'utf8'));
  const c = COPY[locale];
  const s = m.services;
  const contact = m.contact.info;
  const logo = `file://${join(ROOT, 'public', 'images', 'logo', 'logo_400x150.png')}`;

  const services = s.items
    .map(
      (item, i) => `
      <section class="service">
        <div class="shot" style="background-image:url('${images[SERVICE_IMAGES[i % SERVICE_IMAGES.length]]}')">
          <span class="num">${String(i + 1).padStart(2, '0')}</span>
        </div>
        <h2>${esc(item.title)}</h2>
        <p class="desc">${esc(item.description)}</p>
        <p class="included">${esc(c.included)}</p>
        <ul>${item.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </section>`,
    )
    .join('');

  const how = c.how
    .map(
      ([title, body], i) => `
      <div class="step">
        <span class="step-num">${i + 1}</span>
        <div><strong>${esc(title)}</strong><p>${esc(body)}</p></div>
      </div>`,
    )
    .join('');

  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<style>
  @page { size: A4; margin: 16mm 15mm 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: "Montserrat", "Helvetica Neue", Arial, sans-serif;
    color: #2C332F; font-size: 10.5pt; line-height: 1.55; -webkit-print-color-adjust: exact;
  }

  /* --- cover --- */
  .cover { height: 252mm; display: flex; flex-direction: column; }
  .cover img.logo { width: 74mm; margin-bottom: 22mm; }
  .kicker {
    font-size: 8pt; letter-spacing: .24em; text-transform: uppercase;
    color: #7B8F7A; margin: 0 0 6mm; font-weight: 600;
  }
  .cover h1 {
    font-size: 33pt; line-height: 1.08; font-weight: 700; margin: 0 0 6mm;
    letter-spacing: -.01em; max-width: 160mm;
  }
  .cover .sub { font-size: 13pt; color: #6B756F; margin: 0 0 9mm; font-weight: 500; }
  .rule { width: 26mm; height: 2.5pt; background: #7B8F7A; margin-bottom: 8mm; }
  .cover .intro { font-size: 10.5pt; color: #4A544E; max-width: 152mm; margin: 0 0 9mm; }
  .meta { font-size: 9pt; color: #6B756F; margin: 0 0 auto; line-height: 1.7; }
  .meta strong { color: #2C332F; font-weight: 600; }
  .cover-band {
    height: 66mm; margin-top: 10mm; border-radius: 2mm;
    background-size: cover; background-position: center 58%;
  }

  /* --- one service per page, with its photograph --- */
  .service { page-break-before: always; }
  /* No negative margins. A negative top margin here pulled the band back
     across its own page break and printed a sliver on the previous page. */
  .shot {
    height: 66mm; margin: 0 0 11mm; border-radius: 2mm;
    background-size: cover; background-position: center; position: relative;
  }
  .num {
    position: absolute; left: 6mm; bottom: 0; transform: translateY(50%);
    width: 15mm; height: 15mm; border-radius: 50%; background: #7B8F7A; color: #fff;
    font-size: 11pt; font-weight: 700; letter-spacing: .04em;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2pt 8pt rgba(0,0,0,.18);
  }
  .service h2 { font-size: 22pt; font-weight: 700; margin: 6mm 0 4mm; letter-spacing: -.01em; }
  .desc { font-size: 10.5pt; color: #4A544E; margin: 0 0 9mm; max-width: 158mm; }
  .included {
    font-size: 8pt; letter-spacing: .18em; text-transform: uppercase;
    color: #7B8F7A; font-weight: 600; margin: 0 0 4mm;
  }
  .service ul { margin: 0; padding: 0; list-style: none; }
  .service li {
    padding: 4mm 0 4mm 9mm; border-top: .5pt solid #E2E7DF; position: relative;
    font-size: 10.5pt;
  }
  .service li:last-child { border-bottom: .5pt solid #E2E7DF; }
  .service li::before {
    content: ""; position: absolute; left: 2mm; top: 6.6mm;
    width: 2.6mm; height: 2.6mm; border-radius: 50%; background: #7B8F7A;
  }

  /* --- closing --- */
  .closing { page-break-before: always; padding-top: 2mm; }
  .closing h2 { font-size: 20pt; font-weight: 700; margin: 0 0 8mm; letter-spacing: -.01em; }
  .step { display: flex; gap: 5mm; margin-bottom: 7mm; align-items: flex-start; }
  .step-num {
    flex: none; width: 9mm; height: 9mm; border-radius: 50%; background: #7B8F7A;
    color: #fff; font-weight: 700; font-size: 10pt; display: flex;
    align-items: center; justify-content: center;
  }
  .step strong { display: block; font-size: 11.5pt; margin-bottom: 1mm; }
  .step p { margin: 0; color: #5A645E; font-size: 10pt; }
  .cta {
    margin-top: 14mm; padding: 10mm; border-radius: 4mm; background: #F1F3EF;
    border-left: 3pt solid #7B8F7A;
  }
  .cta h3 { margin: 0 0 3mm; font-size: 15pt; font-weight: 700; }
  .cta p { margin: 0 0 5mm; color: #4A544E; }
  .cta .link { font-weight: 600; color: #5F7860; margin: 0; }
  .footer {
    margin-top: 12mm; font-size: 8.5pt; color: #6B756F;
    border-top: .5pt solid #E2E7DF; padding-top: 4mm;
  }
</style></head><body>

  <div class="cover">
    <img class="logo" src="${logo}" alt="Casa in Ordine">
    <p class="kicker">${esc(c.kicker)}</p>
    <h1>${esc(s.heroTitle)}</h1>
    <p class="sub">${esc(s.heroSubtitle)}</p>
    <div class="rule"></div>
    <p class="intro">${esc(c.intro)}</p>
    <p class="meta">
      <strong>casainordine.com</strong><br>
      ${esc(contact.email)} · ${esc(contact.phone)}<br>
      ${esc(contact.location)}
    </p>
    <div class="cover-band" style="background-image:url('${images[COVER_IMAGE]}')"></div>
  </div>

  ${services}

  <div class="closing">
    <h2>${esc(c.howTitle)}</h2>
    ${how}
    <div class="cta">
      <h3>${esc(c.ctaTitle)}</h3>
      <p>${esc(c.ctaBody)}</p>
      <p class="link">${esc(c.quote)} → casainordine.com/${locale}/preventivo</p>
    </div>
    <p class="footer">
      Casa in Ordine · ${esc(contact.email)} · ${esc(contact.phone)} · casainordine.com
    </p>
  </div>

</body></html>`;
}

const tmp = mkdtempSync(join(tmpdir(), 'cio-catalog-'));

try {
  const images = {};
  for (const rel of [...SERVICE_IMAGES, COVER_IMAGE]) {
    images[rel] = await prepareImage(rel, tmp, 1400);
  }

  for (const locale of LOCALES) {
    const html = join(tmp, `${locale}.html`);
    const pdf = join(OUT_DIR, `casa-in-ordine-catalogo-${locale}.pdf`);
    writeFileSync(html, page(locale, images));

    execFileSync(
      CHROME,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--no-pdf-header-footer',
        // Without this Chrome prints before the webfont arrives and the PDF
        // silently falls back to Arial.
        '--virtual-time-budget=15000',
        `--print-to-pdf=${pdf}`,
        `file://${html}`,
      ],
      { stdio: 'ignore' },
    );

    if (!existsSync(pdf)) throw new Error(`Chrome produced no file for ${locale}`);
    const kb = Math.round(readFileSync(pdf).length / 1024);
    console.log(`  ${locale}: public/catalogo/casa-in-ordine-catalogo-${locale}.pdf (${kb} KB)`);
  }
  console.log('Catalogue rebuilt.');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
