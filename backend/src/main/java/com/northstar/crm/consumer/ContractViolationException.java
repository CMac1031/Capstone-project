package com.northstar.crm.consumer;

/**
 * The message is malformed and no amount of retrying will fix it.
 *
 * <p>This type exists purely so {@link KafkaConsumerErrorConfig} can tell "broken forever"
 * apart from "try again in a moment". Retrying a message that violates the contract replays
 * the identical failure and blocks every message behind it on that partition, so these are
 * classified non-retryable and routed straight to the dead-letter topic.
 */
public class ContractViolationException extends RuntimeException {

  public ContractViolationException(String message) {
    super(message);
  }
}
