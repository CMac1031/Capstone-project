/*UPDATE customer
SET name = 'Ravi Singh',
    email = 'ravi.singh@example.com'
WHERE customer_id = 'CUS-1002';
--fix data point in schema 
*/
-- Every interaction must belong to an existing customer.
ALTER TABLE customer_interaction
    ADD CONSTRAINT fk_customer_interaction_customer
    FOREIGN KEY (customer_id)
    REFERENCES customer (customer_id)
    ON DELETE RESTRICT;

-- Customer emails must be unique.
ALTER TABLE customer
    ADD CONSTRAINT uk_customer_email
    UNIQUE (email);

-- Only frontend-supported account statuses are permitted.
ALTER TABLE customer
    ADD CONSTRAINT ck_customer_account_status
    CHECK (
        account_status IN (
            'ACTIVE',
            'INACTIVE',
            'SUSPENDED',
            'PENDING'
        )
    );

-- Only backend-supported interaction types are permitted.
ALTER TABLE customer_interaction
    ADD CONSTRAINT ck_customer_interaction_type
    CHECK (
        interaction_type IN (
            'CALL',
            'EMAIL',
            'NOTE',
            'MEETING'
        )
    );

-- Only supported application roles are permitted.
ALTER TABLE app_user
    ADD CONSTRAINT ck_app_user_role
    CHECK (role IN ('AGENT', 'ADMIN'));
    