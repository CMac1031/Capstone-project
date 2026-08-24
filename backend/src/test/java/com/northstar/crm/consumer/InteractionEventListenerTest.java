package com.northstar.crm.consumer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.northstar.crm.messaging.CustomerInteractionRecordedV1;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the consumer's decision logic.
 *
 * <p>No Spring context and no Kafka broker — the listener is constructed directly and its
 * method called by hand. That keeps these fast and makes a failure point at the logic rather
 * than at infrastructure. The broker path is covered separately by the pipeline test.
 */
class InteractionEventListenerTest {

  private static final String AMINA = "CUS-1001";
  private static final String RAVI = "CUS-1002";
  private static final String CORRELATION_ID = "lab-request-001";
  private static final Instant OCCURRED_AT = Instant.parse("2026-08-23T15:00:00Z");

  private ProcessedEventStore store;
  private InteractionEventListener listener;

  @BeforeEach
  void setUp() {
    // Fresh store per test — otherwise one test's events would look like duplicates
    // to the next one.
    store = new ProcessedEventStore();
    listener = new InteractionEventListener(store);
  }

  // ---------------------------------------------------------------- happy path

  @Test
  void validEventIsRecordedAsProcessed() {
    CustomerInteractionRecordedV1 event =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "CALL", CORRELATION_ID);

    listener.onInteractionRecorded(event, AMINA);

    assertTrue(store.hasSeen(event.eventId()));
    assertEquals(1, store.size());
  }

  @Test
  void allFourInteractionTypesAreAccepted() {
    for (String type : new String[] {"CALL", "EMAIL", "NOTE", "MEETING"}) {
      CustomerInteractionRecordedV1 event =
          CustomerInteractionRecordedV1.from(UUID.randomUUID(), RAVI, type, CORRELATION_ID);

      listener.onInteractionRecorded(event, RAVI);

      assertTrue(store.hasSeen(event.eventId()), type + " should be accepted");
    }
    assertEquals(4, store.size());
  }

  // -------------------------------------------------------------- idempotency

  @Test
  void redeliveredEventIsHandledOnlyOnce() {
    CustomerInteractionRecordedV1 event =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "NOTE", CORRELATION_ID);

    listener.onInteractionRecorded(event, AMINA);
    // Exactly what an at-least-once broker does on redelivery: the same message again.
    listener.onInteractionRecorded(event, AMINA);

    assertEquals(1, store.size(), "a redelivered event must not be recorded twice");
  }

  @Test
  void duplicateIsIgnoredQuietlyRatherThanThrowing() {
    CustomerInteractionRecordedV1 event =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "NOTE", CORRELATION_ID);

    listener.onInteractionRecorded(event, AMINA);

    // A duplicate is normal operation, not a failure. If this threw, ordinary redeliveries
    // would be retried and then dead-lettered, filling the DLQ with healthy messages.
    listener.onInteractionRecorded(event, AMINA);
  }

  @Test
  void twoDifferentEventsForTheSameCustomerAreBothHandled() {
    listener.onInteractionRecorded(
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "CALL", CORRELATION_ID),
        AMINA);
    listener.onInteractionRecorded(
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "EMAIL", CORRELATION_ID),
        AMINA);

    assertEquals(2, store.size(), "different eventIds are different events");
  }

  // --------------------------------------------------------- contract failures

  @Test
  void missingKeyIsRejected() {
    CustomerInteractionRecordedV1 event =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "CALL", CORRELATION_ID);

    ContractViolationException ex =
        assertThrows(
            ContractViolationException.class,
            () -> listener.onInteractionRecorded(event, null));

    assertTrue(ex.getMessage().contains("key"));
  }

  @Test
  void blankKeyIsRejected() {
    CustomerInteractionRecordedV1 event =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "CALL", CORRELATION_ID);

    assertThrows(
        ContractViolationException.class, () -> listener.onInteractionRecorded(event, "   "));
  }

  @Test
  void keyThatDisagreesWithPayloadIsRejected() {
    // Payload says Ravi, envelope says Amina. The event is on the wrong partition and the
    // producer has a bug.
    CustomerInteractionRecordedV1 event =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), RAVI, "CALL", CORRELATION_ID);

    ContractViolationException ex =
        assertThrows(
            ContractViolationException.class,
            () -> listener.onInteractionRecorded(event, AMINA));

    assertTrue(ex.getMessage().contains(AMINA));
    assertTrue(ex.getMessage().contains(RAVI));
  }

  @Test
  void unsupportedVersionIsRejected() {
    CustomerInteractionRecordedV1 v2 =
        new CustomerInteractionRecordedV1(
            UUID.randomUUID(),
            CustomerInteractionRecordedV1.TYPE,
            2, // a shape this consumer has never been taught to read
            UUID.randomUUID(),
            AMINA,
            "CALL",
            CORRELATION_ID,
            OCCURRED_AT);

    ContractViolationException ex =
        assertThrows(
            ContractViolationException.class, () -> listener.onInteractionRecorded(v2, AMINA));

    assertTrue(ex.getMessage().contains("eventVersion"));
  }

  @Test
  void unexpectedEventTypeIsRejected() {
    CustomerInteractionRecordedV1 wrongType =
        new CustomerInteractionRecordedV1(
            UUID.randomUUID(),
            "CustomerDeleted",
            CustomerInteractionRecordedV1.VERSION,
            UUID.randomUUID(),
            AMINA,
            "CALL",
            CORRELATION_ID,
            OCCURRED_AT);

    assertThrows(
        ContractViolationException.class,
        () -> listener.onInteractionRecorded(wrongType, AMINA));
  }

  @Test
  void nullEventTypeIsRejectedWithoutBlowingUp() {
    // Guards the constant-first equals(). Written the other way round this would be a
    // NullPointerException, which the error handler would treat as retryable.
    CustomerInteractionRecordedV1 nullType =
        new CustomerInteractionRecordedV1(
            UUID.randomUUID(),
            null,
            CustomerInteractionRecordedV1.VERSION,
            UUID.randomUUID(),
            AMINA,
            "CALL",
            CORRELATION_ID,
            OCCURRED_AT);

    assertThrows(
        ContractViolationException.class,
        () -> listener.onInteractionRecorded(nullType, AMINA));
  }

  @Test
  void missingEventIdIsRejected() {
    CustomerInteractionRecordedV1 noId =
        new CustomerInteractionRecordedV1(
            null,
            CustomerInteractionRecordedV1.TYPE,
            CustomerInteractionRecordedV1.VERSION,
            UUID.randomUUID(),
            AMINA,
            "CALL",
            CORRELATION_ID,
            OCCURRED_AT);

    ContractViolationException ex =
        assertThrows(
            ContractViolationException.class,
            () -> listener.onInteractionRecorded(noId, AMINA));

    assertTrue(ex.getMessage().contains("eventId"));
  }

  @Test
  void missingInteractionIdIsRejected() {
    CustomerInteractionRecordedV1 noInteraction =
        new CustomerInteractionRecordedV1(
            UUID.randomUUID(),
            CustomerInteractionRecordedV1.TYPE,
            CustomerInteractionRecordedV1.VERSION,
            null,
            AMINA,
            "CALL",
            CORRELATION_ID,
            OCCURRED_AT);

    assertThrows(
        ContractViolationException.class,
        () -> listener.onInteractionRecorded(noInteraction, AMINA));
  }

  @Test
  void unknownInteractionTypeIsRejected() {
    CustomerInteractionRecordedV1 sms =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), AMINA, "SMS", CORRELATION_ID);

    ContractViolationException ex =
        assertThrows(
            ContractViolationException.class, () -> listener.onInteractionRecorded(sms, AMINA));

    assertTrue(ex.getMessage().contains("SMS"));
  }

  // ------------------------------------------------- validation precedes marking

  @Test
  void rejectedEventIsNeverRecordedAsProcessed() {
    CustomerInteractionRecordedV1 mismatched =
        CustomerInteractionRecordedV1.from(UUID.randomUUID(), RAVI, "CALL", CORRELATION_ID);

    assertThrows(
        ContractViolationException.class,
        () -> listener.onInteractionRecorded(mismatched, AMINA));

    // If validation ran after the dedupe mark, a redelivery of this broken event would be
    // silently skipped instead of dead-lettered.
    assertFalse(store.hasSeen(mismatched.eventId()));
    assertEquals(0, store.size());
  }
}
