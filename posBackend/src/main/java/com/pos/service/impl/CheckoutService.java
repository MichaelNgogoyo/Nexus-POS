package com.pos.service.impl;

import com.pos.model.Cart;
import com.pos.model.CartItem;
import com.pos.model.Product;
import com.pos.model.SaleItem;
import com.pos.model.SaleStatus;
import com.pos.model.Sales;
import com.pos.model.StockMovement;
import com.pos.repository.CartRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.StockMovementRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final SalesRepository salesRepository;
    private final StockMovementRepository stockMovementRepository;

    @Transactional
    public Sales processCheckout(Long cartId, String cashierId, String paymentMethod) {
        Cart cart = cartRepository.findByUserId(cartId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart not found for user: " + cartId));

        if (cart.getCartItemList() == null || cart.getCartItemList().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }

        Sales sales = Sales.builder()
                .cashierId(cashierId)
                .paymentMethod(paymentMethod)
            .status(SaleStatus.COMPLETED)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        List<SaleItem> saleItems = new ArrayList<>();
        List<Product> productsToUpdate = new ArrayList<>();
        List<StockMovement> movements = new ArrayList<>();

        for (CartItem item : cart.getCartItemList()) {
            Product product = item.getProduct();

            if (product.getQuantity() < item.getQuantity()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock for product: " + product.getName());
            }

            // Deduct stock
            product.setQuantity(product.getQuantity() - item.getQuantity());
            productsToUpdate.add(product);
            movements.add(buildStockMovement(product, -item.getQuantity(), "Checkout cart " + cartId));

            SaleItem saleItem = new SaleItem();
            saleItem.setProduct(product);
            saleItem.setQuantity(item.getQuantity());
            saleItem.setPrice(product.getPrice());
            saleItem.setSales(sales);
            saleItems.add(saleItem);

            total = total.add(
                    BigDecimal.valueOf(product.getPrice())
                            .multiply(BigDecimal.valueOf(item.getQuantity()))
            );
        }

        // Batch-save all stock changes in two queries instead of 2N
        productRepository.saveAll(productsToUpdate);
        stockMovementRepository.saveAll(movements);

        sales.setTotalAmount(total.doubleValue());
        sales.setSaleItems(saleItems);
        Sales savedSales = salesRepository.save(sales);

        // Clear the cart after successful checkout
        cart.getCartItemList().clear();
        cartRepository.save(cart);

        return savedSales;
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
