package com.pos.controller;

import com.pos.model.Customer;
import com.pos.repository.CustomerRepository;
import com.pos.service.impl.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final AuditService auditService;

    @GetMapping
    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    @GetMapping("/search")
    public List<Customer> searchCustomers(@RequestParam String q) {
        if (q == null || q.isBlank() || q.length() > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search must be 1–100 characters");
        return customerRepository.findByNameContainingIgnoreCaseOrPhoneContaining(q, q);
    }

    @PostMapping
    public ResponseEntity<Customer> createCustomer(@RequestBody Customer customer, Authentication authentication) {
        String name = customer.getName() == null ? "" : customer.getName().trim();
        if (name.isBlank() || name.length() > 120) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest name is required and must be 120 characters or fewer");
        Customer clean = Customer.builder().name(name).phone(limit(customer.getPhone(), 32, "Phone"))
                .email(limit(customer.getEmail(), 180, "Email")).notes(limit(customer.getNotes(), 500, "Guest notes"))
                .loyaltyPoints(0).totalSpent(java.math.BigDecimal.ZERO).build();
        Customer saved = customerRepository.save(clean);
        auditService.log(authentication.getName(), "CUSTOMER_CREATED", "Customer", saved.getId().toString(), null, "created");
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Customer> updateCustomer(@PathVariable Long id,
                                                   @RequestBody Customer updated,
                                                   Authentication authentication) {
        return customerRepository.findById(id).map(existing -> {
            if (updated.getName() != null) {
                String name = limit(updated.getName(), 120, "Guest name");
                if (name == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest name cannot be blank");
                existing.setName(name);
            }
            existing.setPhone(limit(updated.getPhone(), 32, "Phone"));
            existing.setEmail(limit(updated.getEmail(), 180, "Email"));
            existing.setNotes(limit(updated.getNotes(), 500, "Guest notes"));
            Customer saved = customerRepository.save(existing);
            auditService.log(authentication.getName(), "CUSTOMER_UPDATED", "Customer", id.toString(), "updated", "updated");
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    private String limit(String value, int max, String label) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is too long");
        return trimmed.isEmpty() ? null : trimmed;
    }
}
