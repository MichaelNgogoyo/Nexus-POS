package com.pos.controller;

import com.pos.model.Combo;
import com.pos.repository.ComboRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/combos")
@RequiredArgsConstructor
public class ComboController {

    private final ComboRepository comboRepository;

    @GetMapping
    public List<Combo> getAll(@RequestParam(required = false) Boolean activeOnly) {
        if (Boolean.TRUE.equals(activeOnly)) {
            return comboRepository.findByActiveTrue();
        }
        return comboRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Combo> getById(@PathVariable Long id) {
        return comboRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Combo> create(@RequestBody Combo combo) {
        return ResponseEntity.ok(comboRepository.save(combo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Combo> update(@PathVariable Long id, @RequestBody Combo updated) {
        return comboRepository.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setDescription(updated.getDescription());
            existing.setPrice(updated.getPrice());
            existing.setActive(updated.getActive());
            return ResponseEntity.ok(comboRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!comboRepository.existsById(id)) return ResponseEntity.notFound().build();
        comboRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
