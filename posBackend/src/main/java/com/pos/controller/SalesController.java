package com.pos.controller;

import com.pos.dto.SaleRequest;
import com.pos.dto.SaleReturnRequest;
import com.pos.model.Sales;
import com.pos.service.impl.SalesService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/sale", "/sale"})
@RequiredArgsConstructor
public class SalesController {

    private final SalesService service;

    @PostMapping
    public ResponseEntity<Sales> createSale(@RequestBody SaleRequest request) {
        return new ResponseEntity<>(service.createSales(request), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<Page<Sales>> listSales(Pageable pageable) {
        return ResponseEntity.ok(service.listSales(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sales> viewSale(@PathVariable Long id) {
        return ResponseEntity.ok(service.viewSale(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSale(@PathVariable Long id) {
        service.deleteSale(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/return")
    public ResponseEntity<Sales> processReturn(@PathVariable Long id, @RequestBody(required = false) SaleReturnRequest request) {
        return ResponseEntity.ok(service.processReturn(id, request));
    }
}
