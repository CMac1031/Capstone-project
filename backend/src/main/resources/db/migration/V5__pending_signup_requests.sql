-- Requests to create a login account. These are NOT real accounts and
-- cannot log in -- a row only becomes a usable app_user once an ADMIN
-- approves it. This keeps "someone asked for access" and "someone can
-- actually log in" as two separate, auditable facts.

CREATE TABLE pending_signup_request (
                                        id              UUID PRIMARY KEY,
                                        username        VARCHAR(50)  NOT NULL,
                                        password_hash   VARCHAR(200) NOT NULL,
                                        status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
                                        requested_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                                        reviewed_by     VARCHAR(50),
                                        reviewed_at     TIMESTAMP WITH TIME ZONE,

                                        CONSTRAINT ck_signup_request_status
                                            CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- Fast lookup of "does this username already have a live request",
-- which the signup endpoint checks before accepting a new one.
CREATE INDEX idx_signup_request_username_status
    ON pending_signup_request (username, status);