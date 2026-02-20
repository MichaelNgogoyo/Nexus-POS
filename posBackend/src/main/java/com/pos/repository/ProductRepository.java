package com.pos.repository;

import com.pos.model.Product;
import com.pos.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Product getProductById(long id);

    List<Product> findByCategory(Category category);
}
