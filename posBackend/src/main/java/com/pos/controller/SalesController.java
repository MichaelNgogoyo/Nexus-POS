package com.pos.controller;

import com.pos.dto.SaleRequest;
import com.pos.dto.SaleReturnRequest;
import com.pos.dto.SaleReceiptResponse;
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
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import java.math.BigDecimal;
import java.util.List;

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
    public ResponseEntity<String> getSaleReceipt(@PathVariable Long id, Authentication authentication) {
        Sales sale = service.viewSale(id);
        boolean manager = authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_MANAGER"));
        boolean owner = authentication.getName().equals(sale.getCashierId())
                || (authentication.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt
                && jwt.getSubject().equals(sale.getCashierId()));
        if (!manager && !owner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cashiers may only access their own receipts");
        }
        StringBuilder sb = new StringBuilder();
        sb.append("========================================\n");
        sb.append("           POINT OF SALE RECEIPT        \n");
        sb.append("========================================\n");
        sb.append(String.format("Receipt #:   %d%n", sale.getId()));
        if (sale.getOrderNumber() != null) sb.append(String.format("Order #:     %s%n", sale.getOrderNumber()));
        sb.append(String.format("Date:        %s%n", sale.getCreatedAt()));
        sb.append(String.format("Cashier:     %s%n", sale.getCashierId()));
        sb.append(String.format("Payment:     %s%n", sale.getPaymentMethod()));
        sb.append("----------------------------------------\n");
        sb.append(String.format("%-24s %5s %8s%n", "Item", "Qty", "Amount"));
        sb.append("----------------------------------------\n");
        for (var item : sale.getSaleItems()) {
            String name = item.getProduct() != null ? item.getProduct().getName() : "Unknown";
            BigDecimal lineTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            if (name.length() > 22) name = name.substring(0, 22) + "..";
            sb.append(String.format("%-24s %5d %8s%n", name, item.getQuantity(), money(lineTotal)));
        }
        sb.append("----------------------------------------\n");
        sb.append(String.format("%-29s %8s%n", "Subtotal:", money(sale.getSubtotalAmount())));
        sb.append(String.format("%-29s %8s%n", "Tax:", money(sale.getTaxAmount())));
        sb.append(String.format("%-29s %8s%n", "Service charge:", money(sale.getServiceChargeAmount())));
        sb.append(String.format("%-29s %8s%n", "TOTAL:", money(sale.getTotalAmount())));
        sb.append(String.format("%-29s %8s%n", "Tendered:", money(sale.getAmountTendered())));
        sb.append(String.format("%-29s %8s%n", "Change:", money(sale.getChangeGiven())));
        sb.append("========================================\n");
        sb.append("        Thank you for your purchase!    \n");
        sb.append("========================================\n");
        return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.TEXT_PLAIN)
                .body(sb.toString());
    }

    @GetMapping("/{id}/receipt/details")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','CASHIER')")
    public ResponseEntity<SaleReceiptResponse> getSaleReceiptDetails(@PathVariable Long id, Authentication authentication) {
        Sales sale = service.viewSale(id);
        requireReceiptAccess(sale, authentication);
        List<SaleReceiptResponse.Item> items = sale.getSaleItems().stream().map(item -> {
            BigDecimal lineTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            String name = item.getProduct() == null ? "Unknown item" : item.getProduct().getName();
            List<String> modifiers = item.getModifiers() == null ? List.of()
                    : item.getModifiers().stream().map(com.pos.model.Modifier::getName).toList();
            return new SaleReceiptResponse.Item(name, item.getPrice(), item.getQuantity(), lineTotal,
                    item.getNotes(), modifiers);
        }).toList();
        return ResponseEntity.ok(new SaleReceiptResponse(
                sale.getId(), sale.getOrderNumber(), sale.getCreatedAt(), sale.getCashierId(), sale.getPaymentMethod(),
                sale.getOrderType() == null ? null : sale.getOrderType().name(), sale.getTableId(), sale.getGuestName(),
                sale.getSubtotalAmount(), null, sale.getTaxAmount(), sale.getServiceChargeAmount(), sale.getTotalAmount(),
                sale.getAmountTendered(), sale.getChangeGiven(), items));
    }

    private void requireReceiptAccess(Sales sale, Authentication authentication) {
        boolean manager = authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_MANAGER"));
        boolean owner = authentication.getName().equals(sale.getCashierId())
                || (authentication.getPrincipal() instanceof Jwt jwt && jwt.getSubject().equals(sale.getCashierId()));
        if (!manager && !owner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cashiers may only access their own receipts");
        }
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<Sales> processReturn(@PathVariable Long id, @Valid @RequestBody(required = false) SaleReturnRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.processReturn(id, request, authentication.getName()));
    }

    private String money(BigDecimal amount) {
        return (amount == null ? BigDecimal.ZERO : amount).setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }
}
