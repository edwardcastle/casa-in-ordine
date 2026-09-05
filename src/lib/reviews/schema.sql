-- Client reviews.
--
-- Reviews live here rather than in messages/*.json for three reasons:
-- the chat assistant flattens every message namespace except a short
-- top-level list into its knowledge base, so anything there is asserted to
-- visitors as fact; check-messages.mjs compares arrays by length, so one real
-- Italian quote would force inventing en/es versions under a real person's
-- name; and the locale layout hands the whole message object to
-- NextIntlClientProvider, shipping every quote into every route's payload.
--
-- They are not in the repo either: a withdrawal (GDPR art. 17) has to actually
-- delete the words, and a file deletion leaves them in git history forever.

CREATE TABLE IF NOT EXISTS reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What the client wrote.
  author_name     text        NOT NULL,
  author_email    text,
  city            text,
  rating          smallint    CHECK (rating BETWEEN 1 AND 5),
  body            text,
  lang            text        NOT NULL CHECK (lang IN ('it', 'en', 'es')),
  -- A job usually covers more than one room, so this is a set — the quote
  -- wizard already lets one request span several zones.
  --
  -- Constrained to the six categories that have message keys. CategoryIcon's
  -- union also carries 'living', but home.services.categories does not, and
  -- next-intl renders the missing key path into the page rather than throwing.
  services        text[]      NOT NULL DEFAULT '{}'
                  CHECK (services <@ ARRAY['armadio','cucina','ufficio','bagno','garage','trasloco']::text[]),

  -- Where it came from. 'google' is mirrored with the reviewer's permission and
  -- must deep-link to the review so a reader can verify it; 'direct' is a client
  -- who will not post publicly (bereavement, divorce, hoarding are common here).
  source          text        NOT NULL DEFAULT 'direct' CHECK (source IN ('direct', 'google')),
  google_url      text,

  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'removed')),

  -- GDPR art. 7(1) evidence. consent_text stores the exact sentence shown at
  -- the time, because the wording will change and the record must reflect what
  -- she actually agreed to. invoice_ref is the "reasonable and proportionate
  -- measure" the site's published verification sentence describes.
  consent_given   boolean     NOT NULL DEFAULT false,
  consent_text    text,
  consent_at      timestamptz,
  consent_ip      text,
  invoice_ref     text,

  submitted_at    timestamptz NOT NULL DEFAULT now(),
  decided_at      timestamptz,
  decided_by      text,
  removed_at      timestamptz,

  -- Nothing reaches the public site without a consent record. Enforced here so
  -- it survives a careless query as well as a careless reviewer.
  CONSTRAINT approved_needs_consent
    CHECK (status <> 'approved' OR (consent_given AND consent_at IS NOT NULL)),

  -- A mirrored Google review is only verifiable if it links back to the source.
  CONSTRAINT google_needs_url
    CHECK (source <> 'google' OR google_url IS NOT NULL),

  -- A published review has words. A withdrawn one must not.
  CONSTRAINT approved_needs_body
    CHECK (status <> 'approved' OR (body IS NOT NULL AND length(btrim(body)) > 0)),
  CONSTRAINT removed_is_blank
    CHECK (status <> 'removed' OR (body IS NULL AND author_email IS NULL))
);

-- The public read path: approved rows, newest first.
CREATE INDEX IF NOT EXISTS reviews_public_idx
  ON reviews (status, submitted_at DESC)
  WHERE status = 'approved';

-- Single-use sign-in and decision tokens. A token is spent by deleting its row,
-- so a forwarded approval email cannot be replayed and a leaked magic link
-- stops working the moment it is used once.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- sha256 of the token, so a database leak does not hand over live links.
  token_hash text        NOT NULL UNIQUE,
  purpose    text        NOT NULL CHECK (purpose IN ('signin', 'decision')),
  subject    text        NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_tokens_expiry_idx ON auth_tokens (expires_at);
