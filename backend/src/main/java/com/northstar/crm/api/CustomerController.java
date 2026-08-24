package com.northstar.crm.api;

import com.northstar.crm.domain.Customer;
import com.northstar.crm.service.CustomerService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    // GET /api/customers
    // This @GetMapping means that this method will deal the GET request
    // This is just return the list of customerIDs
    @GetMapping
    public List<String> listCustomerIds() {
        return customerService.listCustomerIds();
    }

    // GET /api/customers/{id}
    // This gets the customer's information based on requested id. If it does not exists then will thow exception
    @GetMapping("/{id}")
    public Customer getCustomer(@PathVariable("id") String id) {
        return customerService.getCustomer(id);
    }

    // PATCH /api/customers/{id}
    // Just updating the customer information based on the requested customer id
    @PatchMapping("/{id}")
    public Customer updateCustomer(@PathVariable("id") String id, @RequestBody UpdateCustomerRequest request) {
        return customerService.updateCustomer(
                id, request.name(), request.email(), request.phone(), request.accountStatus());
    }

    // Small inline DTO for the PATCH request body shape.
    public record UpdateCustomerRequest(String name, String email, String phone, String accountStatus) {}
}