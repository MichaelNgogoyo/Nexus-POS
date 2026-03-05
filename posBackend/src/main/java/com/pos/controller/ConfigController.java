package com.pos.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Value("${pos.tax-rate:0}")
    private double taxRate;

    /** Returns the configured tax rate percentage (e.g. 16 for 16% VAT). Public endpoint. */
    @GetMapping("/tax-rate")
    public ResponseEntity<Map<String, Double>> getTaxRate() {
        return ResponseEntity.ok(Map.of("taxRate", taxRate));
    }
}
