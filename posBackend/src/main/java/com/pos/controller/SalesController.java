package com.pos.controller;

import com.pos.dto.SaleRequest;
import com.pos.dto.SaleReturnRequest;
import com.pos.model.Sales;
import com.pos.service.impl.SalesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping({"/api/sale", "/sale"})
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
public class SalesController {

    private final SalesService service;

    @PostMapping
    public ResponseEntity<Sales> createSale(@Valid @RequestBody SaleRequest request, Authentication authentication) {
        String actor = authentication.getPrincipal() instanceof Jwt jwt ? jwt.getSubject() : authentication.getName();
        return new ResponseEntity<>(service.createSales(request, actor), HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Page<Sales>> listSales(Pageable pageable) {
        if (pageable.getPageSize() < 1 || pageable.getPageSize() > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page size must be 1–100");
        return ResponseEntity.ok(service.listSales(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Sales> viewSale(@PathVariable Long id) {
        return ResponseEntity.ok(service.viewSale(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Void> deleteSale(@PathVariable Long id, Authentication authentication) {
        service.deleteSale(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/receipt")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
    public ResponseEntity<String> getSaleReceipt(@PathVariable Long id) {
        Sales sale = service.viewSale(id);
        StringBuilder sb = new StringBuilder();
        sb.append("========================================\n");
        sb.append("           POINT OF SALE RECEIPT        \n");
        sb.append("========================================\n");
        sb.append(String.format("Receipt #:   %d%n", sale.getId()));
        sb.append(String.format("Date:        %s%n", sale.getCreatedAt()));
        sb.append(String.format("Cashier:     %s%n", sale.getCashierId()));
        sb.append(String.format("Payment:     %s%n", sale.getPaymentMethod()));
        sb.append("----------------------------------------\n");
        sb.append(String.format("%-24s %5s %8s%n", "Item", "Qty", "Amount"));
        sb.append("----------------------------------------\n");
        for (var item : sale.getSaleItems()) {
            String name = item.getProduct() != null ? item.getProduct().getName() : "Unknown";
            double lineTotal = item.getPrice() * item.getQuantity();
            if (name.length() > 22) name = name.substring(0, 22) + "..";
            sb.append(String.format("%-24s %5d %8.2f%n", name, item.getQuantity(), lineTotal));
        }
        sb.append("----------------------------------------\n");
        double subtotal = sale.getSaleItems().stream().mapToDouble(item -> item.getPrice() * item.getQuantity()).sum();
        sb.append(String.format("%-29s %8.2f%n", "Subtotal:", subtotal));
        sb.append(String.format("%-29s %8.2f%n", "Tax:", sale.getTaxAmount()));
        sb.append(String.format("%-29s %8.2f%n", "Service charge:", sale.getServiceChargeAmount()));
        sb.append(String.format("%-29s %8.2f%n", "TOTAL:", sale.getTotalAmount()));
        sb.append(String.format("%-29s %8.2f%n", "Tendered:", sale.getAmountTendered()));
        sb.append(String.format("%-29s %8.2f%n", "Change:", sale.getChangeGiven()));
        sb.append("========================================\n");
        sb.append("        Thank you for your purchase!    \n");
        sb.append("========================================\n");
        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                .body(sb.toString());
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Sales> processReturn(@PathVariable Long id, @Valid @RequestBody(required = false) SaleReturnRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.processReturn(id, request, authentication.getName()));
    }
}
