package com.pos.service.impl;

import com.pos.model.Cart;
import com.pos.model.CartItem;
import com.pos.model.Product;
import com.pos.model.Sales;
import com.pos.repository.CartRepository;
import com.pos.repository.ProductRepository;
import com.pos.repository.SalesRepository;
import com.pos.repository.StockMovementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private SalesRepository salesRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    private CheckoutService service;

    @BeforeEach
    void setUp() {
        service = new CheckoutService(cartRepository, productRepository, salesRepository, stockMovementRepository);
        ReflectionTestUtils.setField(service, "taxRatePercent", new BigDecimal("16"));
        lenient().when(salesRepository.save(any(Sales.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void checkoutLocksProductsCalculatesTenderAndClearsCart() {
        Product product = Product.builder()
                .id(1L)
                .name("Coffee")
                .price(new BigDecimal("12.00"))
                .quantity(5)
                .active(true)
                .build();
        CartItem item = CartItem.builder().id(3L).product(product).quantity(2).build();
        Cart cart = Cart.builder()
                .id(9L)
                .userId(42L)
                .cartItemList(new ArrayList<>(List.of(item)))
                .build();

        when(cartRepository.findByUserId(42L)).thenReturn(Optional.of(cart));
        when(productRepository.findAllByIdForUpdate(List.of(1L))).thenReturn(List.of(product));

        Sales sale = service.processCheckout(42L, "cashier-1", "CASH", new BigDecimal("30.00"));

        assertThat(product.getQuantity()).isEqualTo(3);
        assertThat(sale.getTotalAmount()).isEqualByComparingTo("27.84");
        assertThat(sale.getTaxAmount()).isEqualByComparingTo("3.84");
        assertThat(sale.getAmountTendered()).isEqualByComparingTo("30.00");
        assertThat(sale.getChangeGiven()).isEqualByComparingTo("2.16");
        assertThat(cart.getCartItemList()).isEmpty();

        verify(productRepository).findAllByIdForUpdate(List.of(1L));
        verify(cartRepository).save(cart);
    }

    @Test
    void checkoutRejectsEmptyCart() {
        Cart cart = Cart.builder()
                .id(9L)
                .userId(42L)
                .cartItemList(new ArrayList<>())
                .build();

        when(cartRepository.findByUserId(42L)).thenReturn(Optional.of(cart));

        assertThatThrownBy(() -> service.processCheckout(42L, "cashier-1", "CASH", new BigDecimal("10.00")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cart is empty");
    }

    @Test
    void checkoutRejectsInsufficientAmountTendered() {
        Product product = Product.builder()
                .id(1L)
                .name("Coffee")
                .price(new BigDecimal("12.00"))
                .quantity(5)
                .active(true)
                .build();
        CartItem item = CartItem.builder().id(3L).product(product).quantity(2).build();
        Cart cart = Cart.builder()
                .id(9L)
                .userId(42L)
                .cartItemList(new ArrayList<>(List.of(item)))
                .build();

        when(cartRepository.findByUserId(42L)).thenReturn(Optional.of(cart));
        when(productRepository.findAllByIdForUpdate(List.of(1L))).thenReturn(List.of(product));

        assertThatThrownBy(() -> service.processCheckout(42L, "cashier-1", "CASH", new BigDecimal("20.00")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Amount tendered")
                .hasMessageContaining("less than total");
    }
}
