/**
 * A band of brand colour behind the site header.
 *
 * The header is transparent and fixed, with white text, because every public
 * page opens on a photograph. The area has none, so without this the white
 * links would sit on a cream page.
 */
export default function AreaTopBand() {
  return <div aria-hidden="true" className="h-20 bg-primary md:h-28" />;
}
