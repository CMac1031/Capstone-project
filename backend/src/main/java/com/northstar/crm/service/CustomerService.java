package com.northstar.crm.service;

import com.northstar.crm.domain.Customer;
import com.northstar.crm.repo.CustomerRepository;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class CustomerService {

    private static final Pattern ID_SUFFIX = Pattern.compile("CUS-(\\d{4})");

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public List<String> listCustomerIds() {
        return customerRepository.findAll()
                .stream()
                .map(Customer::getCustomerId)
                .toList();
    }

    public Customer getCustomer(String customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));
    }

    public Customer updateCustomer(String customerId, String name, String email, String phone, String accountStatus) {
        Customer customer = getCustomer(customerId);

        if (customerRepository.existsByEmailAndCustomerIdNot(email, customerId)) {
            throw new DuplicateEmailException(email);
        }
        if (customerRepository.existsByPhoneAndCustomerIdNot(phone, customerId)) {
            throw new DuplicatePhoneException(phone);
        }

        customer.setName(name);
        customer.setEmail(email);
        customer.setPhone(phone);
        customer.setAccountStatus(accountStatus);
        return customerRepository.save(customer);
    }

    public Customer createCustomer(String name, String email, String phone, String accountStatus) {
        if (customerRepository.existsByEmail(email)) {
            throw new DuplicateEmailException(email);
        }
        if (customerRepository.existsByPhone(phone)) {
            throw new DuplicatePhoneException(phone);
        }

        String newId = nextCustomerId();
        if (customerRepository.existsById(newId)) {
            throw new CustomerAlreadyExistsException(newId);
        }
        Customer customer = new Customer(newId, name, email, phone, accountStatus);
        return customerRepository.save(customer);
    }

    private String nextCustomerId() {
        int max = customerRepository.findAll().stream()
                .map(Customer::getCustomerId)
                .map(ID_SUFFIX::matcher)
                .filter(Matcher::matches)
                .mapToInt(m -> Integer.parseInt(m.group(1)))
                .max()
                .orElse(1000);
        return String.format("CUS-%04d", max + 1);
    }
}