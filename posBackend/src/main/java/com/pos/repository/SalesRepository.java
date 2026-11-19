package com.pos.repository;

import com.pos.model.Sales;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SalesRepository extends JpaRepository<Sales, Long> {

    @EntityGraph("Sales.withItems")
    Optional<Sales> findByIdempotencyKey(String idempotencyKey);

    Optional<Sales> findByRestaurantOrderId(Long restaurantOrderId);

    /** Lightweight paginated list — no collection fetch, safe pagination */
    @Query("SELECT s FROM Sales s ORDER BY s.createdAt DESC")
    Page<Sales> findAllPaged(Pageable pageable);

    @EntityGraph("Sales.withItems")
    Optional<Sales> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Sales s WHERE s.id = :id")
    @EntityGraph("Sales.withItems")
    Optional<Sales> findByIdForUpdate(@Param("id") Long id);

    /** Total revenue for completed sales since a given date */
    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sales s WHERE s.status = 'COMPLETED' AND s.createdAt >= :since")
    BigDecimal sumRevenueSince(@Param("since") LocalDateTime since);

    /** Count of completed sales since a given date */
    @Query("SELECT COUNT(s) FROM Sales s WHERE s.status = 'COMPLETED' AND s.createdAt >= :since")
    long countSalesSince(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(s.totalAmount), 0) FROM Sales s WHERE s.paymentMethod = 'CASH' "
            + "AND s.status = 'COMPLETED' AND (s.shiftId = :shiftId OR "
            + "(s.shiftId IS NULL AND s.cashierId = :cashierId AND s.createdAt >= :since))")
    BigDecimal sumCashSalesForShift(@Param("shiftId") Long shiftId, @Param("cashierId") String cashierId,
                                    @Param("since") LocalDateTime since);

    /** Daily revenue grouped by day for chart data (last N days) */
    @Query("SELECT CAST(s.createdAt AS date) AS day, COALESCE(SUM(s.totalAmount), 0) AS revenue, COUNT(s) AS txCount " +
           "FROM Sales s WHERE s.status = 'COMPLETED' AND s.createdAt >= :since " +
           "GROUP BY CAST(s.createdAt AS date) ORDER BY CAST(s.createdAt AS date) ASC")
    List<Object[]> dailyRevenue(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(s.totalAmount), 0), COUNT(s), COALESCE(SUM(s.taxAmount), 0), " +
            "COALESCE(SUM(s.serviceChargeAmount), 0) FROM Sales s WHERE s.status = 'COMPLETED' " +
            "AND s.createdAt >= :from AND s.createdAt < :to")
    Object[] analyticsTotals(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT s.status, COUNT(s), COALESCE(SUM(s.totalAmount), 0) FROM Sales s " +
            "WHERE s.createdAt >= :from AND s.createdAt < :to GROUP BY s.status")
    List<Object[]> analyticsStatuses(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT CAST(s.createdAt AS date), COALESCE(SUM(s.totalAmount), 0), COUNT(s) FROM Sales s " +
            "WHERE s.status = 'COMPLETED' AND s.createdAt >= :from AND s.createdAt < :to " +
            "GROUP BY CAST(s.createdAt AS date) ORDER BY CAST(s.createdAt AS date)")
    List<Object[]> analyticsDaily(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query(value = "SELECT EXTRACT(HOUR FROM created_at)::int, COALESCE(SUM(total_amount), 0), COUNT(*) FROM sales " +
            "WHERE status = 'COMPLETED' AND created_at >= :from AND created_at < :to " +
            "GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY EXTRACT(HOUR FROM created_at)", nativeQuery = true)
    List<Object[]> analyticsHourly(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(s.paymentMethod, 'UNKNOWN'), COALESCE(SUM(s.totalAmount), 0), COUNT(s) FROM Sales s " +
            "WHERE s.status = 'COMPLETED' AND s.createdAt >= :from AND s.createdAt < :to " +
            "GROUP BY s.paymentMethod ORDER BY SUM(s.totalAmount) DESC")
    List<Object[]> analyticsPayments(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(c.name, 'Uncategorized'), COALESCE(SUM(si.quantity * si.price), 0), " +
            "COALESCE(SUM(si.quantity), 0) FROM SaleItem si LEFT JOIN si.product.category c WHERE si.sales.status = 'COMPLETED' " +
            "AND si.sales.createdAt >= :from AND si.sales.createdAt < :to " +
            "GROUP BY c.name ORDER BY SUM(si.quantity * si.price) DESC")
    List<Object[]> analyticsCategories(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT p.id, p.name, COALESCE(c.name, 'Uncategorized'), " +
            "COALESCE(SUM(CASE WHEN s.id IS NOT NULL THEN si.quantity ELSE 0 END), 0), " +
            "COALESCE(SUM(CASE WHEN s.id IS NOT NULL THEN si.quantity * si.price ELSE 0 END), 0), " +
            "COALESCE(SUM(CASE WHEN s.id IS NOT NULL THEN si.quantity * COALESCE(p.costPrice, 0) ELSE 0 END), 0), " +
            "COALESCE(SUM(CASE WHEN s.id IS NOT NULL AND p.costPrice IS NULL THEN si.quantity ELSE 0 END), 0) " +
            "FROM Product p LEFT JOIN p.saleItems si LEFT JOIN si.sales s ON s.status = 'COMPLETED' " +
            "AND s.createdAt >= :from AND s.createdAt < :to LEFT JOIN p.category c " +
            "WHERE p.active = true OR s.id IS NOT NULL " +
            "GROUP BY p.id, p.name, c.name ORDER BY SUM(si.quantity) DESC")
    List<Object[]> analyticsProducts(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(s.cashierId, 'Unassigned'), COALESCE(SUM(s.totalAmount), 0), COUNT(s) FROM Sales s " +
            "WHERE s.status = 'COMPLETED' AND s.createdAt >= :from AND s.createdAt < :to " +
            "GROUP BY s.cashierId ORDER BY SUM(s.totalAmount) DESC")
    List<Object[]> analyticsCashiers(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Most recent N sales with items (for recent transactions table) */
    @EntityGraph("Sales.withItems")
    List<Sales> findTop5ByOrderByCreatedAtDesc();

    /** Top selling products by quantity sold */
    @Query("SELECT si.product.id, si.product.name, SUM(si.quantity) AS totalQty, SUM(si.quantity * si.price) AS totalRevenue " +
           "FROM SaleItem si WHERE si.sales.status = 'COMPLETED' " +
           "GROUP BY si.product.id, si.product.name ORDER BY SUM(si.quantity) DESC")
    List<Object[]> topSellingProducts(Pageable pageable);
}
