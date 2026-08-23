package com.northstar.crm.consumer;

import com.northstar.crm.messaging.CustomerInteractionRecordedV1;
import com.northstar.crm.messaging.InteractionTopics;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

/**
 * Consumes CustomerInteractionRecorded v1 events published by
 * {@code com.northstar.crm.messaging.InteractionEventPublisher}.
 *
 * <p>Order of operations is deliberate: validate the contract, ignore redeliveries, then
 * handle. Anything that violates the contract throws {@link ContractViolationException},
 * which {@link KafkaConsumerErrorConfig} routes straight to the dead-letter topic without
 * burning retry attempts.
 */
@Component
public class InteractionEventListener {

  private static final Logger log = LoggerFactory.getLogger(InteractionEventListener.class);

  /** Frozen with the producer contract, 8/17. */
  private static final Set<String> KNOWN_INTERACTION_TYPES =
      Set.of("CALL", "EMAIL", "NOTE", "MEETING");

  private final ProcessedEventStore processedEvents;

  public InteractionEventListener(ProcessedEventStore processedEvents) {
    this.processedEvents = processedEvents;
  }

  /**
   * The topic name comes from the producer's own constant rather than a property string, so a
   * rename moves both sides together instead of leaving this listener silently subscribed to a
   * topic nobody publishes to. It is legal in an annotation because a {@code static final
   * String} initialised with a literal is a compile-time constant.
   */
  @KafkaListener(
      topics = InteractionTopics.CUSTOMER_INTERACTIONS_V1,
      groupId = "crm-interactions")
  public void onInteractionRecorded(
      @Payload CustomerInteractionRecordedV1 event,
      @Header(KafkaHeaders.RECEIVED_KEY) String key) {

    validate(event, key);

    // Marked BEFORE the side effect, not after. Crashing after the mark loses one event;
    // crashing after the side effect but before the mark repeats it. For notifications and
    // audit records, the duplicate is the worse failure.
    if (!processedEvents.markIfNew(event.eventId())) {
      log.info(
          "duplicate_event_ignored eventId={} customerId={} correlationId={}",
          event.eventId(),
          event.customerId(),
          event.correlationId());
      return;
    }

    handle(event);
  }

  /**
   * Every assumption this consumer makes about the producer, in one place.
   *
   * <p>All of these are permanent defects — the same message will fail the same way on every
   * redelivery, so they are non-retryable by design.
   */
  private void validate(CustomerInteractionRecordedV1 event, String key) {
    if (key == null || key.isBlank()) {
      throw new ContractViolationException("record key is missing");
    }
    if (!key.equals(event.customerId())) {
      throw new ContractViolationException(
          "key '" + key + "' does not match payload customerId '" + event.customerId() + "'");
    }
    if (event.eventVersion() != CustomerInteractionRecordedV1.VERSION) {
      throw new ContractViolationException(
          "unsupported eventVersion "
              + event.eventVersion()
              + "; this consumer handles "
              + CustomerInteractionRecordedV1.VERSION);
    }
    if (!CustomerInteractionRecordedV1.TYPE.equals(event.eventType())) {
      throw new ContractViolationException("unexpected eventType '" + event.eventType() + "'");
    }
    if (event.eventId() == null) {
      throw new ContractViolationException("eventId is required for idempotency");
    }
    if (event.interactionId() == null) {
      throw new ContractViolationException("interactionId is required");
    }
    if (!KNOWN_INTERACTION_TYPES.contains(event.interactionType())) {
      throw new ContractViolationException(
          "unknown interactionType '" + event.interactionType() + "'");
    }
  }

  /**
   * The downstream effect of a valid, first-time event.
   *
   * <p>Today that is a structured audit line. Because everything above is independent of what
   * happens here, a later lab can fan out to notifications or build a read model by changing
   * only this method.
   *
   * <p>Note what is NOT logged: the interaction summary is deliberately absent from the event
   * contract because it is free text an agent typed and could contain PII.
   */
  private void handle(CustomerInteractionRecordedV1 event) {
    log.info(
        "interaction_event_processed eventId={} interactionId={} customerId={} "
            + "interactionType={} correlationId={} occurredAt={}",
        event.eventId(),
        event.interactionId(),
        event.customerId(),
        event.interactionType(),
        event.correlationId(),
        event.occurredAt());
  }
}
