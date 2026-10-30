package com.pos.controller;

import com.pos.dto.TableStatusRequest;
import com.pos.model.RestaurantTable;
import com.pos.repository.RestaurantTableRepository;
import com.pos.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
public class TableController {

    private final RestaurantTableRepository tableRepository;
    private final TableService tableService;

    @GetMapping
    public List<RestaurantTable> getAllTables() {
        return tableRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RestaurantTable> getTable(@PathVariable Long id) {
        return tableRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<RestaurantTable> createTable(@RequestBody RestaurantTable table) {
        return ResponseEntity.ok(tableRepository.save(table));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<RestaurantTable> updateTable(@PathVariable Long id,
                                                       @RequestBody RestaurantTable updated) {
        return tableRepository.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setFloor(updated.getFloor());
            existing.setCapacity(updated.getCapacity());
            return ResponseEntity.ok(tableRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
        if (!tableRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        tableRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<RestaurantTable> updateStatus(@PathVariable Long id,
                                                        @Valid @RequestBody TableStatusRequest request,
                                                        Authentication authentication) {
        return ResponseEntity.ok(tableService.updateStatus(id, request.getStatus(), authentication.getName()));
    }
}
