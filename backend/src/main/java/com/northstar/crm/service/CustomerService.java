package com.northstar.crm.service;

import com.northstar.crm.domain.Customer;
import com.northstar.crm.repo.CustomerRepository;
import java.util.List;
import org.springframework.stereotype.Service;

//just telling spring that this following class is a businness logic layer
@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    // This method will be used for GET /api/customers. It will get all the list of customer ID
    // By using steam API first I get all the list of customer entitiy
    // Then I will change it to steam. then take out all the customerId from it
    // Then combine these as list form
    public List<String> listCustomerIds() {
        return customerRepository.findAll()
                .stream()
                .map(Customer::getCustomerId)
                .toList();
    }

    // The following method is for GET /api/customers/{id}
    // What this function does is that we check if the given id really exists in current db or not.
    // If it exists then it will give the name, email,phone, status( parts that I have defined in the customer.java file)
    // If it does not exist then it will trigger .orElseThrow which will throw CustomerNotFoundException.
    public Customer getCustomer(String customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));
    }

    // This method is for PATCH /api/customers/{id}
    // Purpose of this method is to update the customer.
    // First It will get the information of the customer that we want to update by given customerID then
    // It will update Name, Email, Phone, and accounte status based on what we got.
    // Then it will save to db by calling customerRepository.save
    public Customer updateCustomer(String customerId, String name, String email, String phone, String accountStatus) {
        Customer customer = getCustomer(customerId);
        customer.setName(name);
        customer.setEmail(email);
        customer.setPhone(phone);
        customer.setAccountStatus(accountStatus);
        return customerRepository.save(customer);
    }
}