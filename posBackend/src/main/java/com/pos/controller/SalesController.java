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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/sale", "/sale"})
@RequiredArgsConstructor
public class SalesController {

    private final SalesService service;

    @PostMapping
    public ResponseEntity<Sales> createSale(@Valid @RequestBody SaleRequest request) {
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

    @GetMapping("/{id}/receipt")
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
        double subtotal = sale.getTotalAmount() - sale.getTaxAmount();
        sb.append(String.format("%-29s %8.2f%n", "Subtotal:", subtotal));
        sb.append(String.format("%-29s %8.2f%n", "Tax:", sale.getTaxAmount()));
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

    public ResponseEntity<Sales> processReturn(@PathVariable Long id, @RequestBody(required = false) SaleReturnRequest request) {
        return ResponseEntity.ok(service.processReturn(id, request));
    }
}
