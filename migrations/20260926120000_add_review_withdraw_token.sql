-- Up Migration

-- Lets the person who wrote a review remove it themselves.
--
-- GDPR art. 7(3): withdrawing consent must be as easy as giving it. Giving it
-- is a checkbox on the form; withdrawing it was writing to info@ and hoping
-- somebody acted. This is the other half.
--
-- The token lives on the review rather than in auth_tokens because its
-- lifetime is the review's: no expiry, since a client may change her mind a
-- year later, and it must survive being clicked more than once — the link
-- opens a confirmation page, and only confirming removes anything.
--
-- Stored as sha256, so a database leak does not hand over working links.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS withdraw_token_hash text;

CREATE INDEX IF NOT EXISTS reviews_withdraw_token_idx
  ON reviews (withdraw_token_hash)
  WHERE withdraw_token_hash IS NOT NULL;

-- Down Migration

DROP INDEX IF EXISTS reviews_withdraw_token_idx;
ALTER TABLE reviews DROP COLUMN IF EXISTS withdraw_token_hash;
