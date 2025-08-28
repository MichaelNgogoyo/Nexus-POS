package com.pos.repository;

import com.pos.model.Sales;
import org.springframework.data.jpa.repository.JpaRepository;


public interface SalesRepository extends JpaRepository<Sales, Integer> {

    Sales getSalesById(int id);
}
