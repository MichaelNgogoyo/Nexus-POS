package com.pos.controller;

import com.pos.model.Cart;
import com.pos.model.Product;
import com.pos.model.Sales;
import com.pos.repository.ProductRepository;
import com.pos.service.impl.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final ProductRepository productRepository;

    /**
     * Get user's cart
     */
    @GetMapping("/{userId}")
    public ResponseEntity<Cart> getCart(@PathVariable Long userId) {
        Cart cart = cartService.cart(userId);
        return ResponseEntity.ok(cart);
    }

    /**
     * Add item to cart
     */
    @PostMapping("/add")
    public ResponseEntity<Cart> addItemToCart(
            @RequestParam Long userId,
            @RequestParam Long productId,
            @RequestParam int quantity) {

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        Cart cart = cartService.addItemToCart(userId, product, quantity);
        return ResponseEntity.ok(cart);
    }

    /**
     * Remove item from cart
     */
    @DeleteMapping("/remove/{cartItemId}")
    public ResponseEntity<Void> removeItemFromCart(
            @RequestParam Long userId,
            @PathVariable Long cartItemId) {

        cartService.removeItemFromCart(userId, cartItemId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Checkout - converts cart to sale
     */
    @PostMapping("/checkout")
    public ResponseEntity<Sales> checkout(
            @RequestParam Long userId,
            @RequestParam String cashierId,
            @RequestParam String paymentMethod) {

        Sales sales = cartService.checkout(userId, cashierId, paymentMethod);
        return ResponseEntity.ok(sales);
    }

    /**
     * Clear cart
     */
    @DeleteMapping("/clear")
    public ResponseEntity<Void> clearCart(@RequestParam Long userId) {
        cartService.clearCart(userId);
        return ResponseEntity.noContent().build();
    }
}
