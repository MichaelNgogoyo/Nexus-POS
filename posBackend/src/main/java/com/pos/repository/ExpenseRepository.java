package com.pos.repository;

import com.pos.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.math.BigDecimal;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByExpenseDateBetweenOrderByExpenseDateDesc(LocalDate from, LocalDate to);
    List<Expense> findAllByOrderByExpenseDateDesc();

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate >= :from AND e.expenseDate <= :to")
    BigDecimal sumExpensesBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
