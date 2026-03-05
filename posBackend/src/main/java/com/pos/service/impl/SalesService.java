package com.pos.service.impl;

import com.pos.dto.SaleRequest;
import com.pos.dto.SaleItemRequest;
import com.pos.dto.SaleReturnRequest;
import com.pos.model.Product;
import com.pos.model.SaleItem;
import com.pos.model.SaleStatus;
import com.pos.model.Sales;
import com.pos.model.StockMovement;
import com.pos.repository.ProductRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalesService {

    private final SalesRepository repository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;

    @Transactional
    public Sales createSales(SaleRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale must contain at least one item");
        }

        Sales sales = Sales.builder()
                .cashierId(request.cashierId())
                .paymentMethod(request.paymentMethod())
                .status(SaleStatus.COMPLETED)
                .build();

        List<SaleItem> saleItems = new ArrayList<>();
        double total = 0.0;

        for (var itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Product not found: " + itemReq.productId()));

            if (product.getQuantity() < itemReq.quantity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Insufficient stock for product: " + product.getName());
            }

            product.setQuantity(product.getQuantity() - itemReq.quantity());
            productRepository.save(product);
            logStockMovement(product, -itemReq.quantity(), "Direct sale");

            SaleItem saleItem = new SaleItem();
            saleItem.setProduct(product);
            saleItem.setQuantity(itemReq.quantity());
            saleItem.setPrice(product.getPrice());
            saleItem.setSales(sales);
            saleItems.add(saleItem);

            total += product.getPrice() * itemReq.quantity();
        }

        sales.setTotalAmount(total);
        sales.setSaleItems(saleItems);
        return repository.save(sales);
    }

    @Transactional(readOnly = true)
    public Sales viewSale(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
    }

    @Transactional(readOnly = true)
    public Page<Sales> listSales(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Transactional
    public void deleteSale(Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found");
        }
        repository.deleteById(id);
    }

    @Transactional
    public Sales processReturn(Long saleId, SaleReturnRequest request) {
        Sales sale = repository.findById(saleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));

        if (SaleStatus.RETURNED.equals(sale.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale already returned");
        }

        List<SaleItem> items = sale.getSaleItems();
        if (items == null) {
            items = new ArrayList<>();
        }

        for (SaleItem item : items) {
            Product product = productRepository.findById(item.getProduct().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found for sale item"));

            product.setQuantity(product.getQuantity() + item.getQuantity());
            productRepository.save(product);

            logStockMovement(product, item.getQuantity(),
                    (request != null && request.reason() != null && !request.reason().isBlank())
                            ? request.reason()
                            : "Return for sale #" + saleId);
        }

        sale.setStatus(SaleStatus.RETURNED);
        return repository.save(sale);
    }

    private void logStockMovement(Product product, int delta, String reason) {
        StockMovement movement = StockMovement.builder()
                .product(product)
                .delta(delta)
                .balanceAfter(product.getQuantity())
                .reason(reason)
                .build();
        stockMovementRepository.save(movement);
    }
}
