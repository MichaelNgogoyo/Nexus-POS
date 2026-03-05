package com.pos.controller;

import com.pos.dto.DashboardSummaryResponse;
import com.pos.model.Product;
import com.pos.service.impl.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/report")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /**
     * GET /api/report/summary
     * Returns all dashboard KPIs, daily chart data, recent sales, and top products in one call.
     */
    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getDashboardSummary() {
        return ResponseEntity.ok(reportService.getDashboardSummary());
    }

    /**
     * GET /api/report/low-stock
     * Returns active products whose quantity is at or below their low-stock threshold.
     */
    @GetMapping("/low-stock")
    public ResponseEntity<List<Product>> getLowStockProducts() {
        return ResponseEntity.ok(reportService.getLowStockProducts());
    }
}
