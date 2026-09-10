-- Up Migration

-- People who asked for the services catalogue.
--
-- Stored rather than only emailed for one reason: the form offers an optional
-- marketing opt-in, and GDPR art. 7(1) requires being able to demonstrate that
-- consent was given. A row with the exact wording shown and a timestamp is that
-- evidence. Sending the catalogue itself needs no consent — it is the thing
-- they asked for — so a lead with marketing_consent false is still a lawful
-- send, and simply must not be marketed to.

CREATE TABLE IF NOT EXISTS catalog_leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  email             text        NOT NULL,
  name              text,
  lang              text        NOT NULL CHECK (lang IN ('it', 'en', 'es')),

  marketing_consent boolean     NOT NULL DEFAULT false,
  -- The exact sentence shown at the time. The wording will change; the record
  -- has to reflect what this person actually agreed to.
  consent_text      text,
  consent_at        timestamptz,
  consent_ip        text,

  requested_at      timestamptz NOT NULL DEFAULT now(),
  -- Null means the catalogue email never went out — a Brevo outage, say. The
  -- lead is still captured, so it can be sent by hand.
  sent_at           timestamptz,

  CONSTRAINT consent_needs_record
    CHECK (NOT marketing_consent OR (consent_at IS NOT NULL AND consent_text IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS catalog_leads_email_idx ON catalog_leads (email);
CREATE INDEX IF NOT EXISTS catalog_leads_requested_idx ON catalog_leads (requested_at DESC);

-- Down Migration

DROP TABLE IF EXISTS catalog_leads;
