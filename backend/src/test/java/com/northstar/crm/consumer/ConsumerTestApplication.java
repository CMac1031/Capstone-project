package com.northstar.crm.consumer;

import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * A minimal Spring Boot application used only by {@link InteractionPipelineTest}.
 *
 * <p>Because it lives in {@code com.northstar.crm.consumer}, component scanning starts here
 * and never reaches the controllers, services, repositories, or security configuration. The
 * pipeline test therefore needs no PostgreSQL, no Flyway migration, and no JWT secret — it
 * starts in about a second instead of failing on a database that isn't running.
 *
 * <p>Test sources only. It is never packaged into the application jar.
 */
@SpringBootApplication
public class ConsumerTestApplication {}
