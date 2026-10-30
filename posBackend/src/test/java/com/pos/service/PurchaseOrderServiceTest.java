package com.pos.service;

import com.pos.dto.PurchaseOrderCreateRequest;
import com.pos.dto.PurchaseOrderLineRequest;
import com.pos.model.Product;
import com.pos.model.PurchaseOrder;
import com.pos.model.PurchaseOrderItem;
import com.pos.model.PurchaseOrderStatus;
import com.pos.repository.ProductRepository;
import com.pos.repository.PurchaseOrderRepository;
import com.pos.repository.StockMovementRepository;
import com.pos.repository.SupplierRepository;
import com.pos.service.impl.AuditService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PurchaseOrderServiceTest {

    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private SupplierRepository supplierRepository;
    @Mock private ProductRepository productRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private AuditService auditService;

    @Test
    void createPricesFromCatalogIdentityAndCalculatesTotalsOnServer() {
        Product product = Product.builder().id(4L).name("Coffee beans").build();
        when(productRepository.findAllById(any())).thenReturn(List.of(product));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(call -> {
            PurchaseOrder order = call.getArgument(0);
            order.setId(17L);
            return order;
        });
        PurchaseOrderService service = service();

        var created = service.create(new PurchaseOrderCreateRequest(null, " restock ", List.of(
                new PurchaseOrderLineRequest(4L, 3, new BigDecimal("2.50")))), "manager-1");

        assertThat(created.id()).isEqualTo(17L);
        assertThat(created.totalAmount()).isEqualByComparingTo("7.50");
        assertThat(created.items()).singleElement().satisfies(item -> {
            assertThat(item.productId()).isEqualTo(4L);
            assertThat(item.productName()).isEqualTo("Coffee beans");
            assertThat(item.orderedQuantity()).isEqualTo(3);
            assertThat(item.receivedQuantity()).isZero();
            assertThat(item.lineTotal()).isEqualByComparingTo("7.50");
        });
        verify(auditService).log("manager-1", "PURCHASE_ORDER_CREATED", "PurchaseOrder", "17", null,
                "status=DRAFT; total=7.50");
    }

    @Test
    void receiveAddsStockAndMovementOnceThenRejectsRepeat() {
        Product product = Product.builder().id(4L).name("Coffee beans").quantity(8).build();
        PurchaseOrderItem line = PurchaseOrderItem.builder().productId(4L).productName("Coffee beans")
                .orderedQuantity(5).receivedQuantity(0).build();
        PurchaseOrder order = PurchaseOrder.builder().id(21L).orderNumber("PO-0021").status(PurchaseOrderStatus.SENT)
                .items(new ArrayList<>(List.of(line))).build();
        line.setPurchaseOrder(order);
        when(purchaseOrderRepository.findByIdForUpdate(21L)).thenReturn(Optional.of(order));
        when(productRepository.findAllByIdForUpdate(List.of(4L))).thenReturn(List.of(product));
        when(purchaseOrderRepository.save(order)).thenReturn(order);
        PurchaseOrderService service = service();

        var received = service.receive(21L, "stock-1");

        assertThat(received.status()).isEqualTo(PurchaseOrderStatus.RECEIVED);
        assertThat(received.receivedAt()).isNotNull();
        assertThat(received.items()).singleElement().extracting(PurchaseOrderResponseItem -> PurchaseOrderResponseItem.receivedQuantity())
                .isEqualTo(5);
        assertThat(product.getQuantity()).isEqualTo(13);
        ArgumentCaptor<List<com.pos.model.StockMovement>> movementCaptor = ArgumentCaptor.forClass(List.class);
        verify(stockMovementRepository).saveAll(movementCaptor.capture());
        assertThat(movementCaptor.getValue()).singleElement().satisfies(movement -> {
            assertThat(movement.getDelta()).isEqualTo(5);
            assertThat(movement.getBalanceAfter()).isEqualTo(13);
            assertThat(movement.getReason()).isEqualTo("Purchase order PO-0021");
        });

        assertThatThrownBy(() -> service.receive(21L, "stock-1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Only a sent purchase order can be received");
        verify(productRepository, times(1)).findAllByIdForUpdate(List.of(4L));
        verify(stockMovementRepository, times(1)).saveAll(any());
        verify(auditService).log("stock-1", "PURCHASE_ORDER_RECEIVED", "PurchaseOrder", "21", "SENT",
                "RECEIVED; products=1");
    }

    @Test
    void receivedStatusCannotBeSetThroughGenericStatusEndpoint() {
        PurchaseOrder order = PurchaseOrder.builder().id(21L).status(PurchaseOrderStatus.SENT).build();
        when(purchaseOrderRepository.findByIdForUpdate(21L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service().updateStatus(21L, PurchaseOrderStatus.RECEIVED, "stock-1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("cannot transition from SENT to RECEIVED");
        verify(purchaseOrderRepository, never()).save(any());
        verifyNoInteractions(auditService);
    }

    @Test
    void receiveRejectsLegacyUnlinkedLineWithoutChangingStock() {
        PurchaseOrderItem line = PurchaseOrderItem.builder().productName("Unlinked item").orderedQuantity(3).build();
        PurchaseOrder order = PurchaseOrder.builder().id(22L).status(PurchaseOrderStatus.SENT)
                .items(new ArrayList<>(List.of(line))).build();
        when(purchaseOrderRepository.findByIdForUpdate(22L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service().receive(22L, "stock-1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not linked to a valid catalog product");
        verifyNoInteractions(productRepository, stockMovementRepository, auditService);
    }

    private PurchaseOrderService service() {
        return new PurchaseOrderService(purchaseOrderRepository, supplierRepository, productRepository,
                stockMovementRepository, auditService);
    }
}
