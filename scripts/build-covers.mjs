#!/usr/bin/env node
/**
 * Cuts the blog cover images, one per post, into public/images/blog/.
 *
 *   pnpm build:covers
 *
 * Eighteen posts used to share seven covers, five of them portrait posters
 * with the brand name printed on them. A cover is shown as a wide band at the
 * top of the post and as the card image when the post is shared, so a portrait
 * poster lost its top and bottom — and most of its lettering — in both.
 *
 * Every cover comes out at the same size, 1600x840. That is the 1.91:1 shape
 * social cards are drawn in, and because the size is a fact about this folder
 * rather than about each file, the post page can state it in og:image:width
 * and og:image:height without measuring anything.
 *
 * To give a post a new cover: add or change its line in COVERS, run this, and
 * point `coverImage` in the post's three .mdx files at /images/blog/<slug>.jpg.
 */

import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCES = join(ROOT, 'public', 'images');
const OUT_DIR = join(SOURCES, 'blog');

const COVER_WIDTH = 1600;
const COVER_HEIGHT = 840;

/**
 * slug -> where its cover is cut from.
 *
 * `focus` is where the crop is anchored when the source is a different shape:
 * a sharp gravity ('north', 'centre', …) or 'attention' to let it find the
 * subject. `band` cuts a full-width strip starting that many pixels from the
 * top instead: for a portrait photo whose subject is neither at the top nor in
 * the middle, and for the one source with lettering to stay clear of.
 */
const COVERS = {
  'cambio-di-stagione-armadio': { from: 'backgrounds/hero3.webp', focus: 'north' },
  'come-iniziare-il-decluttering': { from: 'backgrounds/why-choose-us.JPG', focus: 'north' },
  'come-risparmiare-spazio-in-casa': { from: 'backgrounds/cosa-offriamo.JPG', band: 500 },
  'cucina-organizzata-guida-pratica': { from: 'gallery/kitchen-1.jpg', focus: 'centre' },
  'decluttering-digitale': { from: 'backgrounds/hero1.webp', focus: 'centre' },
  'decluttering-prima-di-un-trasloco': { from: 'backgrounds/come-nasce.JPG', focus: 'centre' },
  'decluttering-sentimentale': { from: 'backgrounds/hero2.webp', focus: 'centre' },
  'guida-completa-decluttering-e-home-organizing': { from: 'gallery/living-1.jpg', focus: 'centre' },
  'home-organizing-cosa-e-roma': { from: 'backgrounds/our-story.JPG', band: 350 },
  'organizzare-armadio-perfetto': { from: 'gallery/closet-1.jpg', focus: 'centre' },
  'organizzare-camera-da-letto': { from: 'gallery/living-4.jpg', focus: 'centre' },
  'organizzare-cameretta-bambini': { from: 'gallery/living-3.jpg', focus: 'centre' },
  'organizzare-cantina-e-ripostiglio': { from: 'backgrounds/bg-2.jpg', focus: 'centre' },
  'organizzare-documenti-di-casa': { from: 'backgrounds/bg-5.jpg', band: 1400 },
  'organizzare-home-office': { from: 'gallery/office-1.jpg', focus: 'centre' },
  'organizzare-il-bagno': { from: 'gallery/bathroom-1.jpg', focus: 'centre' },
  'organizzare-ingresso-di-casa': { from: 'gallery/living-2.jpg', focus: 'centre' },
  'organizzare-la-dispensa': { from: 'gallery/kitchen-2.jpg', focus: 'centre' },
};

mkdirSync(OUT_DIR, { recursive: true });

for (const [slug, { from, focus, band }] of Object.entries(COVERS)) {
  let image = sharp(join(SOURCES, from)).rotate();

  if (band !== undefined) {
    const { width } = await image.metadata();
    const height = Math.round((width * COVER_HEIGHT) / COVER_WIDTH);
    image = image.extract({ left: 0, top: band, width, height });
  }

  const out = join(OUT_DIR, `${slug}.jpg`);
  await image
    .resize(COVER_WIDTH, COVER_HEIGHT, {
      fit: 'cover',
      position: focus === 'attention' ? sharp.strategy.attention : (focus ?? 'centre'),
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out);

  console.log(`${Math.round(statSync(out).size / 1024)}KB`.padStart(6), `${slug}.jpg  <-  ${from}`);
}
