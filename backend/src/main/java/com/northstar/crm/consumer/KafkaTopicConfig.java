package com.northstar.crm.consumer;

import com.northstar.crm.messaging.InteractionTopics;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * Declares the dead-letter topic so it exists before anything needs it.
 *
 * <p>Spring Boot auto-configures a {@code KafkaAdmin}, which looks for {@link NewTopic} beans
 * at startup and creates any that are missing. It only ever creates topics or adds partitions
 * — it never deletes or shrinks — so this is safe to run against an existing cluster.
 *
 * <p>Without this, the dead-letter topic only appears if the broker has auto-create enabled.
 * That is usually on locally and usually off in a real cluster, which is exactly the kind of
 * difference that works on a laptop and fails during a demo.
 *
 * <p>The main interactions topic is intentionally not declared here — the producer side owns
 * it, and declaring it in two places invites the two declarations to drift apart.
 */
@Configuration
public class KafkaTopicConfig {

  /**
   * One partition, matching the partition 0 hard-coded in
   * {@link KafkaConsumerErrorConfig}'s destination resolver. Keeping them equal means they
   * cannot drift.
   *
   * <p>DEV-ONLY: {@code replicas(1)} is correct for a single-broker local cluster. A real
   * deployment wants 3 — a topic with one replica loses its contents if that broker dies.
   * Recorded as a known limitation rather than left implicit.
   */
  @Bean
  public NewTopic customerInteractionsDlq() {
    return TopicBuilder.name(InteractionTopics.CUSTOMER_INTERACTIONS_V1_DLQ)
        .partitions(1)
        .replicas(1)
        .build();
  }
}
