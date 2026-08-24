package com.northstar.crm.api.dto;

import java.time.Instant;
import java.util.UUID;

// This DTO defines the shape the backend sends BACK to the frontend
// after an interaction has been successfully created and saved.
public record InteractionResponse(
        UUID id,
        String customerId,
        String interactionType,
        String summary,
        String correlationId,
        Instant createdAt
) {}