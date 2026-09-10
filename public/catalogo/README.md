Drop the services catalogue here as `casa-in-ordine-catalogo.pdf`.

The download section on /services renders only when that exact file exists, so
the site is safe to deploy without it — the section appears on the first deploy
after the PDF lands, and there is never a button that emails a link to a 404.

The filename is set in `src/lib/catalog/index.ts`. Keep the file reasonably
small: it is linked, not attached, but people open it on phones.
