package com.pos.repository;

import com.pos.model.Sales;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SalesRepository extends JpaRepository<Sales, Long> {

    /** Lightweight paginated list — no collection fetch, safe pagination */
    @Query("SELECT s FROM Sales s ORDER BY s.createdAt DESC")
    Page<Sales> findAllPaged(Pageable pageable);

    @EntityGraph("Sales.withItems")
    Optional<Sales> findById(Long id);

    /** Total revenue for completed sales since a given date */
    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sales s WHERE s.status = 'COMPLETED' AND s.createdAt >= :since")
    double sumRevenueSince(@Param("since") LocalDateTime since);

    /** Count of completed sales since a given date */
    @Query("SELECT COUNT(s) FROM Sales s WHERE s.status = 'COMPLETED' AND s.createdAt >= :since")
    long countSalesSince(@Param("since") LocalDateTime since);

    /** Daily revenue grouped by day for chart data (last N days) */
    @Query("SELECT CAST(s.createdAt AS date) AS day, COALESCE(SUM(s.totalAmount), 0) AS revenue, COUNT(s) AS txCount " +
           "FROM Sales s WHERE s.status = 'COMPLETED' AND s.createdAt >= :since " +
           "GROUP BY CAST(s.createdAt AS date) ORDER BY CAST(s.createdAt AS date) ASC")
    List<Object[]> dailyRevenue(@Param("since") LocalDateTime since);

    /** Most recent N sales with items (for recent transactions table) */
    @EntityGraph("Sales.withItems")
    List<Sales> findTop5ByOrderByCreatedAtDesc();

    /** Top selling products by quantity sold */
    @Query("SELECT si.product.id, si.product.name, SUM(si.quantity) AS totalQty, SUM(si.quantity * si.price) AS totalRevenue " +
           "FROM SaleItem si WHERE si.sales.status = 'COMPLETED' " +
           "GROUP BY si.product.id, si.product.name ORDER BY SUM(si.quantity) DESC")
    List<Object[]> topSellingProducts(Pageable pageable);
}
