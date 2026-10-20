-- Up Migration

-- Requests sent through the digital survey (/preventivo).
--
-- Until now a request only existed as an email to info@. Keeping it here
-- lets the organizers see every request in one list, follow it up, and turn
-- it into a client area without retyping the details. The email still goes
-- out: it is how they hear about a request, and the row is how they work it.

CREATE TABLE IF NOT EXISTS quote_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name          text        NOT NULL,
  email         text        NOT NULL,
  phone         text,
  lang          text        NOT NULL DEFAULT 'it' CHECK (lang IN ('it', 'en', 'es')),

  -- Each zone as the visitor saw it, in their language: id, label,
  -- accumulation, subtotal and the questions with their answers.
  zones         jsonb       NOT NULL,
  subtotal      integer     NOT NULL,
  urgency       integer     NOT NULL DEFAULT 0,
  total         integer     NOT NULL,
  timing        text,
  -- Up to three preferred visit slots, as ISO strings.
  availability  jsonb,
  notes         text,

  status        text        NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'won', 'lost')),
  -- Set when the request becomes a client area. A deleted client leaves the
  -- request in place, unlinked.
  client_id     uuid        REFERENCES clients (id) ON DELETE SET NULL,

  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Null means the notification email never went out, so the row is the
  -- only trace of the request and must not be missed.
  emailed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS quote_requests_created_idx ON quote_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS quote_requests_status_idx ON quote_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS quote_requests_email_idx ON quote_requests (lower(email));

-- Down Migration

DROP TABLE IF EXISTS quote_requests;
