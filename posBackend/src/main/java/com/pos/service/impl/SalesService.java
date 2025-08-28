package com.pos.service.impl;

import com.pos.dto.SaleRequest;
import com.pos.model.Sales;
import com.pos.repository.SalesRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Slf4j
@Service
public class SalesService {

    @Autowired
    private SalesRepository repository;

    public void createSales(SaleRequest request) throws IOException {

        Sales sales = Sales.builder()
                .cashierId(request.cashierId())
                .paymentMethod(request.paymentMethod())
                .totalAmount(request.totalAmount())
                .build();

        repository.save(sales);
    }

    public void viewSale(int id) {
        try {
            repository.getSalesById(id);
        }catch (Error e){
            log.warn(e.getMessage());
        }
    }


    public void deleteSale(int id) {
        try {
            repository.deleteById(id);
        } catch (Error error) {
            log.warn(error.getMessage());
        }
    }
}
