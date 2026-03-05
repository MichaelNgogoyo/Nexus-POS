package com.pos.repository;

import com.pos.model.Product;
import com.pos.model.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Product getProductById(long id);

    List<Product> findByCategory(Category category);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category")
    List<Product> findAllWithCategory();

    /** Paginated product search — matches name, SKU or barcode (case-insensitive). In-stock only. */
    @Query("SELECT p FROM Product p " +
           "WHERE p.quantity > 0 AND (" +
           "  LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "  LOWER(COALESCE(p.sku, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "  LOWER(COALESCE(p.barcode, '')) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Product> searchActive(@Param("q") String query, Pageable pageable);

    /** Products where quantity <= lowStockThreshold (low-stock alert) */
    @Query("SELECT p FROM Product p WHERE p.active = true AND p.quantity <= p.lowStockThreshold ORDER BY p.quantity ASC")
    List<Product> findLowStockProducts();

    long countByActiveTrue();
}
