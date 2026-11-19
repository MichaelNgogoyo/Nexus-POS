package com.pos.repository;

import com.pos.model.OrderItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /** Load modifiers in a separate collection query to avoid fetching multiple bag collections together. */
    @EntityGraph(attributePaths = "modifiers")
    List<OrderItem> findByOrder_IdIn(Collection<Long> orderIds);
}
