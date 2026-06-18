package com.pos.controller;

import com.pos.model.Expense;
import com.pos.model.ExpenseCategory;
import com.pos.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseRepository expenseRepository;

    @GetMapping
    public List<Expense> getAll() {
        return expenseRepository.findAllByOrderByExpenseDateDesc();
    }

    @PostMapping
    public ResponseEntity<Expense> create(@RequestBody Expense expense) {
        return ResponseEntity.ok(expenseRepository.save(expense));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Expense> update(@PathVariable Long id, @RequestBody Expense updated) {
        return expenseRepository.findById(id).map(existing -> {
            existing.setCategory(updated.getCategory());
            existing.setAmount(updated.getAmount());
            existing.setDescription(updated.getDescription());
            existing.setBranch(updated.getBranch());
            existing.setCreatedBy(updated.getCreatedBy());
            existing.setExpenseDate(updated.getExpenseDate());
            return ResponseEntity.ok(expenseRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!expenseRepository.existsById(id)) return ResponseEntity.notFound().build();
        expenseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public Map<String, BigDecimal> summary() {
        List<Expense> all = expenseRepository.findAll();
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        Arrays.stream(ExpenseCategory.values()).forEach(cat ->
                totals.put(cat.name(), BigDecimal.ZERO));
        all.forEach(e -> totals.merge(e.getCategory().name(), e.getAmount(), BigDecimal::add));
        return totals;
    }
}
