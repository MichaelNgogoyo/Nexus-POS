package com.pos.controller;

import com.pos.dto.SaleRequest;
import com.pos.service.impl.SalesService;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController("/sale")
public class SalesController {

    private SalesService service;


    //create a sale
    @PostMapping()
    public void createSale(@RequestBody SaleRequest request) throws IOException {
        service.createSales(request);
    }

    //view a sale
    @GetMapping
    public void viewSale(@RequestParam int id)  {
        service.viewSale(id);
    }

    //delete a sale
    @PutMapping
    public void deleteSale(@RequestParam int id){
        service.deleteSale(id);
    }

    //confirm a sale


    //generate report
}
