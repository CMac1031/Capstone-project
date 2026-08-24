package com.northstar.crm.consumer;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Remembers which events have already been handled, so a redelivery is ignored.
 *
 * <p>Kafka guarantees at-least-once delivery: a consumer group rebalance, a producer retry, or
 * a consumer restart before the offset commits will all replay a message. Deduplicating on
 * {@code eventId} is what turns at-least-once <em>delivery</em> into once-only
 * <em>business effect</em>.
 *
 * <p>LIMITATION: this store is in-memory. It empties on restart and is not shared between
 * application instances, so a second replica would process the same event again. Production
 * needs a durable table with a unique constraint on {@code event_id}. Tracked as an explicit
 * residual risk rather than pretended away.
 */
@Component
public class ProcessedEventStore {

  private final Set<UUID> seen = ConcurrentHashMap.newKeySet();

  /**
   * Records the event as handled.
   *
   * @return true the first time this eventId is seen, false on every redelivery
   */
  public boolean markIfNew(UUID eventId) {
    return seen.add(eventId);
  }

  public boolean hasSeen(UUID eventId) {
    return seen.contains(eventId);
  }

  public int size() {
    return seen.size();
  }
}
