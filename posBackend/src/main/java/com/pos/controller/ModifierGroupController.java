package com.pos.controller;

import com.pos.model.ModifierGroup;
import com.pos.repository.ModifierGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/modifier-groups")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
public class ModifierGroupController {

    private final ModifierGroupRepository modifierGroupRepository;

    @GetMapping
    public List<ModifierGroup> getAll(@RequestParam(required = false) Long productId) {
        if (productId != null) {
            return modifierGroupRepository.findByProductId(productId);
        }
        return modifierGroupRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ModifierGroup> getById(@PathVariable Long id) {
        return modifierGroupRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ModifierGroup> create(@RequestBody ModifierGroup group) {
        return ResponseEntity.ok(modifierGroupRepository.save(group));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ModifierGroup> update(@PathVariable Long id, @RequestBody ModifierGroup updated) {
        return modifierGroupRepository.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setRequired(updated.getRequired());
            existing.setMultiSelect(updated.getMultiSelect());
            existing.setMinSelect(updated.getMinSelect());
            existing.setMaxSelect(updated.getMaxSelect());
            existing.setProduct(updated.getProduct());
            return ResponseEntity.ok(modifierGroupRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!modifierGroupRepository.existsById(id)) return ResponseEntity.notFound().build();
        modifierGroupRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
