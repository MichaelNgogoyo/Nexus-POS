package com.pos.controller;

import com.pos.model.Customer;
import com.pos.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerRepository customerRepository;

    @GetMapping
    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    @GetMapping("/search")
    public List<Customer> searchCustomers(@RequestParam String q) {
        return customerRepository.findByNameContainingIgnoreCaseOrPhoneContaining(q, q);
    }

    @PostMapping
    public ResponseEntity<Customer> createCustomer(@RequestBody Customer customer) {
        return ResponseEntity.ok(customerRepository.save(customer));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> updateCustomer(@PathVariable Long id,
                                                   @RequestBody Customer updated) {
        return customerRepository.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setPhone(updated.getPhone());
            existing.setEmail(updated.getEmail());
            existing.setNotes(updated.getNotes());
            existing.setLoyaltyPoints(updated.getLoyaltyPoints());
            existing.setTotalSpent(updated.getTotalSpent());
            existing.setLastVisitAt(updated.getLastVisitAt());
            return ResponseEntity.ok(customerRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }
}
