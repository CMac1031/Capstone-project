package com.northstar.crm.api;

import com.northstar.crm.domain.Customer;
import com.northstar.crm.service.CustomerService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public List<String> listCustomerIds() {
        return customerService.listCustomerIds();
    }

    @GetMapping("/{id}")
    public Customer getCustomer(@PathVariable("id") String id) {
        return customerService.getCustomer(id);
    }

    // POST /api/customers -- ADMIN only (see SecurityConfig). Creates a new
    // customer with an auto-generated id and returns 201 with the full record.
    @PostMapping
    public ResponseEntity<Customer> createCustomer(@Valid @RequestBody CreateCustomerRequest request) {
        Customer created = customerService.createCustomer(
                request.name(), request.email(), request.phone(), request.accountStatus());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    public Customer updateCustomer(@PathVariable("id") String id, @Valid @RequestBody UpdateCustomerRequest request) {
        return customerService.updateCustomer(
                id, request.name(), request.email(), request.phone(), request.accountStatus());
    }

    public record CreateCustomerRequest(
            @NotBlank String name,

            @NotBlank
            @Email(message = "email must be a valid email address")
            String email,

            @NotBlank String phone,

            @NotBlank
            @Pattern(regexp = "ACTIVE|INACTIVE|SUSPENDED|PENDING", message = "accountStatus must be ACTIVE, INACTIVE, SUSPENDED, or PENDING")
            String accountStatus
    ) {}

    public record UpdateCustomerRequest(
            @NotBlank String name,

            @NotBlank
            @Email(message = "email must be a valid email address")
            String email,

            @NotBlank String phone,

            @NotBlank
            @Pattern(regexp = "ACTIVE|INACTIVE|SUSPENDED|PENDING", message = "accountStatus must be ACTIVE, INACTIVE, SUSPENDED, or PENDING")
            String accountStatus
    ) {}
}