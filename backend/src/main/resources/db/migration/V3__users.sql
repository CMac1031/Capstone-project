CREATE TABLE app_user (
                          username        VARCHAR(50)  PRIMARY KEY,
                          password_hash   VARCHAR(200) NOT NULL,
                          role            VARCHAR(20)  NOT NULL
);

-- Seed accounts for login testing.
-- Both accounts use the password "password123" (hashed with BCrypt below).
INSERT INTO app_user (username, password_hash, role)
VALUES
    ('agent1', '$2a$10$QB1uaQI2DNc21AUdv5L/8usiUh4wvgUG6uy9q.S403Z/fhmMQguAy', 'AGENT'),
    ('admin1', '$2a$10$QB1uaQI2DNc21AUdv5L/8usiUh4wvgUG6uy9q.S403Z/fhmMQguAy', 'ADMIN');