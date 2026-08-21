package com.northstar.crm.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;


// This file defines the shape (DTO) the backend expects
// when the frontend sends a request in JSON format.
public record CreateInteractionRequest(
        @NotBlank
        String customerId, //

        @NotBlank
        @Pattern(regexp = "CALL|EMAIL|NOTE", message = "interactionType must be CALL, EMAIL, or NOTE")
        String interactionType,

        @NotBlank
        @Size(max = 2000)
        String summary,

        String correlationId
) {}