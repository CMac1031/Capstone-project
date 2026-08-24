package com.northstar.crm.consumer;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.northstar.crm.messaging.CustomerInteractionRecordedV1;
import com.northstar.crm.messaging.InteractionTopics;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.header.Header;
import org.apache.kafka.common.serialization.ByteArrayDeserializer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;

/**
 * End-to-end test of the consumer against a real Kafka broker.
 *
 * <p>{@code @EmbeddedKafka} runs a broker inside the test JVM — no Docker, no external
 * service, works on a CI runner. Messages are published for real, partitioned for real, and
 * delivered to the listener by the real Spring Kafka machinery. The only simulated part is the
 * producer, which is deliberate: this proves the consumer half independently of whether the
 * API and database happen to be working.
 *
 * <p>Named {@code ...Test} rather than {@code ...IT} so Surefire picks it up during
 * {@code mvn test}. Surefire's default include patterns do not cover {@code *IT}.
 */
@SpringBootTest(
    classes = ConsumerTestApplication.class,
    // This slice has no controllers and serves no HTTP. Declaring it non-web skips Tomcat,
    // DispatcherServlet, and every security auto-configuration in one move — they are all
    // conditional on being a web application. Excluding them individually is whack-a-mole:
    // excluding SecurityAutoConfiguration alone removes the HttpSecurity bean that Actuator's
    // ManagementWebSecurityAutoConfiguration still expects, and the context fails to start.
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {
      // Not web-conditional, so these still need excluding: they would try to open a
      // PostgreSQL connection and run Flyway before a single message is sent.
      "spring.autoconfigure.exclude="
          + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
          + "org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration,"
          + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
          + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
      // Point the application at the in-process broker instead of localhost:9092.
      "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}",
      "spring.kafka.consumer.auto-offset-reset=earliest",
      // application.yml declares this; nothing in this slice reads it.
      "jwt.secret=test-secret-unused-by-the-consumer-slice"
    })
@EmbeddedKafka(
    partitions = 1,
    topics = {
      InteractionTopics.CUSTOMER_INTERACTIONS_V1,
      InteractionTopics.CUSTOMER_INTERACTIONS_V1_DLQ
    })
class InteractionPipelineTest {

  private static final String TOPIC = InteractionTopics.CUSTOMER_INTERACTIONS_V1;
  private static final String DLQ = InteractionTopics.CUSTOMER_INTERACTIONS_V1_DLQ;

  private static final String AMINA = "CUS-1001";
  private static final String RAVI = "CUS-1002";
  private static final String CORRELATION_ID = "lab-request-001";

  @Autowired KafkaTemplate<String, Object> template;

  @Autowired ProcessedEventStore store;

  @Autowired EmbeddedKafkaBroker embeddedKafka;

  // --------------------------------------------------------------- happy path

  @Test
  void validEventTravelsThroughKafkaAndIsRecorded() {
    CustomerInteractionRecordedV1 event =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "CALL", CORRELATION_ID);

    // Keyed by customerId, exactly as the producer does it.
    template.send(TOPIC, AMINA, event);

    // Consumption is asynchronous, so poll a condition rather than sleeping.
    await().atMost(20, TimeUnit.SECONDS).until(() -> store.hasSeen(event.eventId()));

    assertTrue(store.hasSeen(event.eventId()));
  }

  @Test
  void bothFixtureCustomersAreHandled() {
    CustomerInteractionRecordedV1 amina =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "NOTE", CORRELATION_ID);
    CustomerInteractionRecordedV1 ravi =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), RAVI, "MEETING", CORRELATION_ID);

    template.send(TOPIC, AMINA, amina);
    template.send(TOPIC, RAVI, ravi);

    await()
        .atMost(20, TimeUnit.SECONDS)
        .until(() -> store.hasSeen(amina.eventId()) && store.hasSeen(ravi.eventId()));
  }

  // -------------------------------------------------------------- idempotency

  @Test
  void redeliveredEventIsRecordedOnlyOnce() {
    CustomerInteractionRecordedV1 event =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "EMAIL", CORRELATION_ID);

    template.send(TOPIC, AMINA, event);
    await().atMost(20, TimeUnit.SECONDS).until(() -> store.hasSeen(event.eventId()));

    int sizeAfterFirst = store.size();

    // Publishing the identical event again is what an at-least-once broker does on redelivery.
    template.send(TOPIC, AMINA, event);

    // during(...) asserts the count STAYS put, rather than sampling once and getting lucky.
    await()
        .during(3, TimeUnit.SECONDS)
        .atMost(15, TimeUnit.SECONDS)
        .until(() -> store.size() == sizeAfterFirst);

    assertEquals(sizeAfterFirst, store.size(), "a redelivered event must not be recorded twice");
  }

  // ----------------------------------------------------------- poison message

  @Test
  void mismatchedKeyIsDeadLetteredWithOriginHeaders() {
    Map<String, Object> props = KafkaTestUtils.consumerProps("dlq-probe", "true", embeddedKafka);
    props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
    // Raw bytes — this test cares about the headers, not the body.
    props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ByteArrayDeserializer.class);
    props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

    try (Consumer<String, byte[]> dlqConsumer =
        new DefaultKafkaConsumerFactory<String, byte[]>(props).createConsumer()) {

      dlqConsumer.subscribe(List.of(DLQ));

      // Envelope says CUS-9999, payload says CUS-1002 — a producer bug the listener refuses.
      CustomerInteractionRecordedV1 mismatched =
          CustomerInteractionRecordedV1.from(UUID.randomUUID(), RAVI, "CALL", CORRELATION_ID);
      template.send(TOPIC, "CUS-9999", mismatched);

      ConsumerRecord<String, byte[]> dead =
          KafkaTestUtils.getSingleRecord(dlqConsumer, DLQ, Duration.ofSeconds(30));

      assertEquals("CUS-9999", dead.key(), "the original key is preserved on the DLQ");
      assertEquals(TOPIC, headerValue(dead, KafkaHeaders.DLT_ORIGINAL_TOPIC));
      assertNotNull(dead.headers().lastHeader(KafkaHeaders.DLT_ORIGINAL_PARTITION));
      assertNotNull(dead.headers().lastHeader(KafkaHeaders.DLT_ORIGINAL_OFFSET));

      // Spring wraps whatever a listener throws, so the top-level FQCN names the wrapper and
      // the real reason sits in the cause header.
      String fqcn = headerValue(dead, KafkaHeaders.DLT_EXCEPTION_FQCN);
      String causeFqcn = headerValue(dead, KafkaHeaders.DLT_EXCEPTION_CAUSE_FQCN);
      assertTrue(
          causeFqcn.contains("ContractViolationException"),
          "expected a contract violation; got " + fqcn + " caused by " + causeFqcn);

      // Non-retryable, so it must never have been marked as handled.
      assertFalse(store.hasSeen(mismatched.eventId()));
    }
  }

  private String headerValue(ConsumerRecord<String, byte[]> record, String name) {
    Header header = record.headers().lastHeader(name);
    assertNotNull(header, "missing header " + name);
    return new String(header.value(), StandardCharsets.UTF_8);
  }
}
