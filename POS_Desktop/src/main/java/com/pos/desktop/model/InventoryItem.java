package com.pos.desktop.model;

import java.time.LocalDateTime;

public record InventoryItem(String id, String productId, int quantityOnHand, int reorderLevel, LocalDateTime updatedAt) {
}
