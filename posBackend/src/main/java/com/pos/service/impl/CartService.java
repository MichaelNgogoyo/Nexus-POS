package com.pos.service.impl;


import com.pos.model.Cart;
import com.pos.model.CartItem;
import com.pos.model.Product;
import com.pos.model.Sales;
import com.pos.model.SaleItem;
import com.pos.repository.CartRepository;
import com.pos.repository.SalesRepository;
import com.pos.service.ICartService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService implements ICartService {
    private final CartRepository cartRepository;
    private final SalesRepository salesRepository;

    @Override
    public Cart cart(long id) {
        return cartRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cart not found with id: " + id));
    }

    /**
     * Checkout process: converts cart to sales and clears the cart
     */
    @Transactional
    public Sales checkout(Long userId, String cashierId, String paymentMethod) {
        // 1. Get user's cart
        Cart cart = cartRepository.getCartsById(userId);

        if (cart == null) {
            throw new RuntimeException("Cart not found for user: " + userId);
        }

        // 2. Validate cart is not empty
        if (cart.getCartItemList() == null || cart.getCartItemList().isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        // 3. Calculate total amount from cart items
        double totalAmount = cart.getCartItemList().stream()
                .mapToDouble(item -> item.getProduct().getPrice() * item.getQuantity())
                .sum();

        // 4. Create Sales from cart
        Sales sales = Sales.builder()
                .cashierId(cashierId)
                .paymentMethod(paymentMethod)
                .totalAmount(totalAmount)
                .build();

        // 5. Convert CartItems to SaleItems
        List<SaleItem> saleItems = new ArrayList<>();
        for (CartItem cartItem : cart.getCartItemList()) {
            SaleItem saleItem = new SaleItem();
            saleItem.setProductId((int) cartItem.getProduct().getId());
            saleItem.setQuantity(cartItem.getQuantity());
            saleItem.setPrice(cartItem.getProduct().getPrice());
            saleItem.setSales(sales);
            saleItems.add(saleItem);
        }
        sales.setSaleItems(saleItems);

        // 6. Save the sale
        Sales savedSales = salesRepository.save(sales);

        // 7. Clear the cart
        clearCart(userId);

        return savedSales;
    }

    /**
     * Clear all items from user's cart
     */
    @Transactional
    public void clearCart(Long userId) {
        Cart cart = cartRepository.getCartsById(userId);

        if (cart != null && cart.getCartItemList() != null) {
            // Clear the list (will cascade delete if configured)
            cart.getCartItemList().clear();

            // Save the cart
            cartRepository.save(cart);
        }
    }

    /**
     * Add item to cart
     */
    public Cart addItemToCart(Long userId, Product product, int quantity) {
        Cart cart = cartRepository.getCartsById(userId);

        if (cart == null) {
            throw new RuntimeException("Cart not found for user: " + userId);
        }

        // Check if item already exists in cart
        CartItem existingItem = cart.getCartItemList().stream()
                .filter(item -> item.getProduct().getId() == product.getId())
                .findFirst()
                .orElse(null);

        if (existingItem != null) {
            // Update quantity if item exists
            existingItem.setQuantity(existingItem.getQuantity() + quantity);
        } else {
            // Create new cart item
            CartItem newItem = CartItem.builder()
                    .product(product)
                    .quantity(quantity)
                    .cart(cart)
                    .build();
            cart.getCartItemList().add(newItem);
        }

        return cartRepository.save(cart);
    }

    /**
     * Remove item from cart
     */
    @Transactional
    public void removeItemFromCart(Long userId, Long cartItemId) {
        Cart cart = cartRepository.getCartsById(userId);

        if (cart == null) {
            throw new RuntimeException("Cart not found for user: " + userId);
        }

        CartItem itemToRemove = cart.getCartItemList().stream()
                .filter(item -> item.getId() == cartItemId)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        // Remove from list (will cascade delete if configured)
        cart.getCartItemList().remove(itemToRemove);
        cartRepository.save(cart);
    }
}

