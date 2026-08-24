-- For this file it actually crreates the customer interaction table
-- Interaction.java which the Entity file promised this is the shape it should be.
-- This file is what makes that shape real in the database.

CREATE TABLE customer_interaction (
    id                UUID PRIMARY KEY,
    customer_id       VARCHAR(20)   NOT NULL,
    interaction_type  VARCHAR(20)   NOT NULL,
    summary           VARCHAR(2000) NOT NULL,
    correlation_id    VARCHAR(100)  NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- An index makes searches faster like the index at the back of a book
-- This one speeds up "show me all interactions for this customer" queries.
CREATE INDEX idx_customer_interaction_customer_id
    ON customer_interaction (customer_id, created_at DESC);

-- This is just for fixture data for testing before we connect with the frontend.
INSERT INTO customer_interaction (id, customer_id, interaction_type, summary, correlation_id, created_at)
VALUES
    (gen_random_uuid(), 'CUS-1001', 'NOTE', 'Requested address update', 'lab-request-001', now()),
    (gen_random_uuid(), 'CUS-1002', 'CALL', 'Followed up on onboarding status', 'lab-request-001', now());

-- 참고: CUS-9999는 일부러 여기에 넣지 않음.
-- 이건 "없는 고객" 실패 케이스를 테스트하기 위한 픽스처라서, 절대 존재하면 안 됨.