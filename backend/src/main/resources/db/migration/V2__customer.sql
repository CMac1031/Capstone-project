CREATE TABLE customer (
                          customer_id     VARCHAR(20)  PRIMARY KEY,
                          name            VARCHAR(200) NOT NULL,
                          email           VARCHAR(200) NOT NULL,
                          phone           VARCHAR(50)  NOT NULL,
                          account_status  VARCHAR(20)  NOT NULL
);

INSERT INTO customer (customer_id, name, email, phone, account_status)
VALUES
    ('CUS-1001', 'Amina Khan', 'amina.khan@example.com', '800-123-4567', 'ACTIVE'),
    ('CUS-1002', 'Daniel Cho', 'daniel.cho@example.com', '800-234-5678', 'ACTIVE');