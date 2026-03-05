package com.pos.repository;

import com.pos.model.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {

    @EntityGraph(attributePaths = {"cartItemList", "cartItemList.product"})
    Cart getCartsById(long id);

    @EntityGraph(attributePaths = {"cartItemList", "cartItemList.product"})
    Optional<Cart> findByUserId(Long userId);
}
