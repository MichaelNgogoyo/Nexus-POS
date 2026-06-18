package com.pos.controller;

import com.pos.dto.TableStatusRequest;
import com.pos.model.RestaurantTable;
import com.pos.model.TableStatus;
import com.pos.repository.RestaurantTableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
public class TableController {

    private final RestaurantTableRepository tableRepository;

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
    public ResponseEntity<RestaurantTable> createTable(@RequestBody RestaurantTable table) {
        return ResponseEntity.ok(tableRepository.save(table));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RestaurantTable> updateTable(@PathVariable Long id,
                                                       @RequestBody RestaurantTable updated) {
        return tableRepository.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setFloor(updated.getFloor());
            existing.setCapacity(updated.getCapacity());
            existing.setStatus(updated.getStatus());
            existing.setOccupiedAt(updated.getOccupiedAt());
            return ResponseEntity.ok(tableRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
        if (!tableRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        tableRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<RestaurantTable> updateStatus(@PathVariable Long id,
                                                        @RequestBody TableStatusRequest request) {
        return tableRepository.findById(id).map(table -> {
            table.setStatus(TableStatus.valueOf(request.getStatus()));
            return ResponseEntity.ok(tableRepository.save(table));
        }).orElse(ResponseEntity.notFound().build());
    }
}
