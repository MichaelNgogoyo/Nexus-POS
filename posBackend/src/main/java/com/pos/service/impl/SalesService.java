package com.pos.service.impl;

import com.pos.dto.SaleRequest;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalesService {

    private final SalesRepository repository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;

    /** Tax rate as a percentage, e.g. 16 for 16% VAT. Configurable via pos.tax-rate property. */
    @Value("${pos.tax-rate:0}")
    private double taxRatePercent;

    @Transactional
    public Sales createSales(SaleRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale must contain at least one item");
        }

        // Batch-load all products in a single query
        List<Long> productIds = request.items().stream()
                .map(i -> i.productId())
                .toList();
        Map<Long, Product> productMap = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        Sales sales = Sales.builder()
                .cashierId(request.cashierId())
                .paymentMethod(request.paymentMethod())
                .status(SaleStatus.COMPLETED)
                .build();

        List<SaleItem> saleItems = new ArrayList<>();
        List<StockMovement> movements = new ArrayList<>();
        double subtotal = 0.0;

        for (var itemReq : request.items()) {
            Product product = productMap.get(itemReq.productId());
            if (product == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Product not found: " + itemReq.productId());
            }

            if (product.getQuantity() < itemReq.quantity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Insufficient stock for product: " + product.getName());
            }

            product.setQuantity(product.getQuantity() - itemReq.quantity());
            movements.add(buildStockMovement(product, -itemReq.quantity(), "Direct sale"));

            SaleItem saleItem = new SaleItem();
            saleItem.setProduct(product);
            saleItem.setQuantity(itemReq.quantity());
            saleItem.setPrice(product.getPrice());
            saleItem.setSales(sales);
            saleItems.add(saleItem);

            subtotal += product.getPrice() * itemReq.quantity();
        }

        // Batch-save all stock changes in two queries instead of 2N
        productRepository.saveAll(productMap.values());
        stockMovementRepository.saveAll(movements);

        double taxAmount = subtotal * (taxRatePercent / 100.0);
        double total = subtotal + taxAmount;

        double amountTendered = request.amountTendered() != null ? request.amountTendered() : total;
        double changeGiven = Math.max(0, amountTendered - total);

        if (amountTendered < total) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Amount tendered (" + amountTendered + ") is less than total (" + total + ")");
        }

        sales.setTaxAmount(taxAmount);
        sales.setTotalAmount(total);
        sales.setAmountTendered(amountTendered);
        sales.setChangeGiven(changeGiven);
        sales.setSaleItems(saleItems);
        Sales saved = repository.save(sales);
        log.info("Sale #{} created — subtotal={} tax={} total={} change={}", saved.getId(), subtotal, taxAmount, total, changeGiven);
        return saved;
    }

    @Transactional(readOnly = true)
    public Sales viewSale(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));
    }

    @Transactional(readOnly = true)
    public Page<Sales> listSales(Pageable pageable) {
        return repository.findAllPaged(pageable);
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
        // findById uses @EntityGraph("Sales.withItems") which eagerly fetches saleItems + product
        Sales sale = repository.findById(saleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sale not found"));

        if (SaleStatus.RETURNED.equals(sale.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale already returned");
        }

        List<SaleItem> items = sale.getSaleItems();
        if (items == null) {
            items = new ArrayList<>();
        }

        String reason = (request != null && request.reason() != null && !request.reason().isBlank())
                ? request.reason()
                : "Return for sale #" + saleId;

        List<Product> productsToUpdate = new ArrayList<>();
        List<StockMovement> movements = new ArrayList<>();

        for (SaleItem item : items) {
            // product is already loaded via the Sales.withItems entity graph — no extra query
            Product product = item.getProduct();
            product.setQuantity(product.getQuantity() + item.getQuantity());
            productsToUpdate.add(product);
            movements.add(buildStockMovement(product, item.getQuantity(), reason));
        }

        // Batch-save: 1 query each instead of 2N
        productRepository.saveAll(productsToUpdate);
        stockMovementRepository.saveAll(movements);

        sale.setStatus(SaleStatus.RETURNED);
        return repository.save(sale);
    }

    private StockMovement buildStockMovement(Product product, int delta, String reason) {
        return StockMovement.builder()
                .product(product)
                .delta(delta)
                .balanceAfter(product.getQuantity())
                .reason(reason)
                .build();
    }
}
