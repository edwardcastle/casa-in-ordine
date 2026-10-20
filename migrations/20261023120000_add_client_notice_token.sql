-- Up Migration

-- Sign-in tokens carried by the "new material" email. Separate from
-- client_signin because they live longer: the client may open the email days
-- after it was sent, and a link that has already expired would send them back
-- to request another email, which is the step this token exists to remove.

ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_purpose_check
  CHECK (purpose IN ('signin', 'decision', 'client_signin', 'client_notice'));

-- Down Migration

DELETE FROM auth_tokens WHERE purpose = 'client_notice';
ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_purpose_check
  CHECK (purpose IN ('signin', 'decision', 'client_signin'));
