Generated PDFs. Do not edit by hand.

    pnpm build:catalog

Reads `services.*` and the contact details out of `messages/<locale>.json` and
renders one PDF per language through headless Chrome. Re-run it whenever a
service, a feature list or a phone number changes, so the catalogue cannot
drift from the site.

The download section on /services renders per language, only where that
language's file exists — so the site is safe to deploy without them.
