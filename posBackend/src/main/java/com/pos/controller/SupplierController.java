package com.pos.controller;

import com.pos.model.Supplier;
import com.pos.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    public List<Supplier> getAll(@RequestParam(required = false) String name) {
        if (name != null && !name.isBlank()) {
            return supplierRepository.findByNameContainingIgnoreCase(name);
        }
        return supplierRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Supplier> getById(@PathVariable Long id) {
        return supplierRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Supplier> create(@RequestBody Supplier supplier) {
        return ResponseEntity.ok(supplierRepository.save(supplier));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Supplier> update(@PathVariable Long id, @RequestBody Supplier updated) {
        return supplierRepository.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setContactName(updated.getContactName());
            existing.setPhone(updated.getPhone());
            existing.setEmail(updated.getEmail());
            existing.setAddress(updated.getAddress());
            existing.setActive(updated.getActive());
            return ResponseEntity.ok(supplierRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!supplierRepository.existsById(id)) return ResponseEntity.notFound().build();
        supplierRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
