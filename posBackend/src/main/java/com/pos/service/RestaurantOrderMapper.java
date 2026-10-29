package com.pos.service;

import com.pos.dto.RestaurantOrderResponse;
import com.pos.model.RestaurantOrder;
import org.springframework.stereotype.Component;

@Component
public class RestaurantOrderMapper {

    public RestaurantOrderResponse toResponse(RestaurantOrder order) {
        var table = order.getTable() == null ? null : new RestaurantOrderResponse.TableResponse(
                order.getTable().getId(), order.getTable().getName(), order.getTable().getFloor(),
                order.getTable().getCapacity(), order.getTable().getStatus(), order.getTable().getOccupiedAt());
        var items = order.getItems() == null ? java.util.List.<RestaurantOrderResponse.ItemResponse>of() : order.getItems().stream()
                .map(item -> new RestaurantOrderResponse.ItemResponse(
                        item.getId(), item.getProductId(), item.getProductName(), item.getUnitPrice(), item.getQuantity(),
                        item.getLineTotal(), item.getNotes(), item.getModifiers() == null ? java.util.List.of() : item.getModifiers().stream()
                                .map(modifier -> new RestaurantOrderResponse.ModifierResponse(
                                        modifier.getId(), modifier.getName(), modifier.getAdditionalPrice(), modifier.getAvailable()))
                                .toList(), item.getKitchenStatus()))
                .toList();
        return new RestaurantOrderResponse(order.getId(), order.getOrderNumber(), order.getIdempotencyKey(), order.getSaleId(),
                order.getOrderType(), order.getStatus(), table, order.getCashierId(), order.getCustomerName(), order.getRoomNumber(),
                order.getNotes(), items, order.getSubtotal(), order.getTaxAmount(), order.getServiceChargeAmount(),
                order.getDiscountAmount(), order.getTotal(), order.getCreatedAt(), order.getUpdatedAt());
    }
}
