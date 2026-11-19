package com.pos.controller;

import com.pos.dto.DashboardSummaryResponse;
import com.pos.dto.AnalyticsResponse;
import com.pos.model.Product;
import com.pos.service.impl.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/report")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
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

    /** Date-bounded aggregates for the management analytics page; limited to one year per request. */
    @GetMapping("/analytics")
    public ResponseEntity<AnalyticsResponse> getAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        if (start.isAfter(end)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date must be on or before end date");
        if (ChronoUnit.DAYS.between(start, end) >= 366) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Analytics date range cannot exceed 366 days");
        }
        return ResponseEntity.ok(reportService.getAnalytics(start, end));
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
