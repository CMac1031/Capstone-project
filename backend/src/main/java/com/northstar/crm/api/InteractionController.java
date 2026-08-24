package com.northstar.crm.api;

import com.northstar.crm.api.dto.CreateInteractionRequest;
import com.northstar.crm.api.dto.InteractionResponse;
import com.northstar.crm.service.InteractionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// This is controller which mean is that it ios a gate. If the front end request to this address
//Then the class takes these and send it back to IneractionService which is service layer
@RestController // <- This line is telling spring to manage this file
@RequestMapping("/api/v1/interactions")
public class InteractionController {

    // This is just defining the following variable exists
    private final InteractionService interactionService;

    public InteractionController(InteractionService interactionService) { //This is where the injection happens
        this.interactionService = interactionService;
    }

    // if the frontend sends POST method to  /api/v1/interactions then the following method will activate
    @PostMapping
    public ResponseEntity<InteractionResponse> create(
            @Valid @RequestBody CreateInteractionRequest request,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationHeader) {

        //The actual Logic will be done in service layer.
        InteractionResponse body = interactionService.create(request, correlationHeader);

        // It returns with responds with status code which is 201(Created)
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }
}