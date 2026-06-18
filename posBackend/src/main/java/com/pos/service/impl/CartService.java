package com.pos.service.impl;


import com.pos.model.Cart;
import com.pos.model.CartItem;
import com.pos.model.Product;
import com.pos.model.Sales;
import com.pos.repository.CartItemRepository;
import com.pos.repository.CartRepository;
import com.pos.service.ICartService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CartService implements ICartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final CheckoutService checkoutService;

    @Override
    public Cart cart(long id) {
        return cartRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart not found with id: " + id));
    }

    private Cart getCartByUserId(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart not found for user: " + userId));
    }

    @Transactional
    public void clearCart(Long userId) {
        Cart cart = getCartByUserId(userId);
        cart.getCartItemList().clear();
        cartRepository.save(cart);
    }

    @Transactional
    public Cart addItemToCart(Long userId, Product product, int quantity) {
        if (quantity <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than zero");
        }

        Cart cart = getCartByUserId(userId);

        CartItem existingItem = cart.getCartItemList().stream()
                .filter(item -> item.getProduct().getId() == product.getId())
                .findFirst()
                .orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(existingItem.getQuantity() + quantity);
        } else {
            CartItem newItem = CartItem.builder()
                    .product(product)
                    .quantity(quantity)
                    .cart(cart)
                    .build();
            cart.getCartItemList().add(newItem);
        }

        return cartRepository.save(cart);
    }

    @Transactional
    public Sales checkout(Long userId, String cashierId, String paymentMethod) {
        return checkoutService.processCheckout(userId, cashierId, paymentMethod);
    }

    @Transactional
    public void removeItemFromCart(Long userId, Long cartItemId) {
        Cart cart = getCartByUserId(userId);

        CartItem itemToRemove = cart.getCartItemList().stream()
                .filter(item -> item.getId() == cartItemId)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart item not found"));

        cart.getCartItemList().remove(itemToRemove);
        cartRepository.save(cart);
    }
}

