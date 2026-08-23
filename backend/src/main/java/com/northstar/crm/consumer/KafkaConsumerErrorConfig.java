package com.northstar.crm.consumer;

import com.northstar.crm.messaging.InteractionTopics;
import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/**
 * What happens when {@link InteractionEventListener} throws.
 *
 * <p>Declaring a {@link CommonErrorHandler} bean is the whole wiring step — Spring Boot picks
 * it up and applies it to the auto-configured listener container. No container factory needs
 * to be built by hand.
 */
@Configuration
public class KafkaConsumerErrorConfig {

  private static final Logger log = LoggerFactory.getLogger(KafkaConsumerErrorConfig.class);

  /** Transient failures get this many retries before the message is dead-lettered. */
  private static final long RETRY_INTERVAL_MS = 500L;

  private static final long MAX_RETRIES = 2L;

  @Bean
  public CommonErrorHandler kafkaErrorHandler(KafkaTemplate<Object, Object> template) {

    // Spring's default dead-letter destination appends ".DLT" to the source topic. The team
    // froze the name as ".dlq" in InteractionTopics, so the destination is resolved explicitly
    // — otherwise messages would land somewhere nobody is watching.
    //
    // Partition 0 is hard-coded because the DLQ may have fewer partitions than the source
    // topic. Echoing the source partition would target a partition that does not exist and the
    // publish itself would fail, losing the message entirely.
    DeadLetterPublishingRecoverer recoverer =
        new DeadLetterPublishingRecoverer(
            template,
            (record, exception) -> {
              log.error(
                  "routing_to_dlq topic={} partition={} offset={} key={} reason={}",
                  record.topic(),
                  record.partition(),
                  record.offset(),
                  record.key(),
                  exception.getMessage());
              return new TopicPartition(InteractionTopics.CUSTOMER_INTERACTIONS_V1_DLQ, 0);
            });

    // Bounded, never infinite: three total attempts 500ms apart, then recover.
    DefaultErrorHandler handler =
        new DefaultErrorHandler(recoverer, new FixedBackOff(RETRY_INTERVAL_MS, MAX_RETRIES));

    // Contract violations are permanent. Without this line a single poison message retries
    // forever and blocks every event behind it on the same partition.
    handler.addNotRetryableExceptions(ContractViolationException.class);

    return handler;
  }
}
