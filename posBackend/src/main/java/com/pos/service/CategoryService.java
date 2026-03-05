package com.pos.service;

import com.pos.model.Category;
import com.pos.model.Product;
import com.pos.repository.CategoryRepository;
import com.pos.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    private static final String UNCATEGORIZED_NAME = "Uncategorized";

    public Category create(String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name is required");
        }
        categoryRepository.findByNameIgnoreCase(name).ifPresent(c -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category already exists");
        });
        Category category = Category.builder().name(name.trim()).build();
        return categoryRepository.save(category);
    }

    public List<Category> list() {
        return categoryRepository.findAll();
    }

    public Category get(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    }

    public Category update(Long id, String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category name is required");
        }
        Category category = get(id);
        // prevent duplicate names
        categoryRepository.findByNameIgnoreCase(name).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Category already exists");
            }
        });
        category.setName(name.trim());
        return categoryRepository.save(category);
    }

    public void delete(Long id) {
        Category category = get(id);
        Category uncategorized = getOrCreateUncategorized();

        if (category.getId().equals(uncategorized.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete the Uncategorized category");
        }

        List<Product> products = productRepository.findByCategory(category);
        for (Product product : products) {
            product.setCategory(uncategorized);
        }
        uncategorized.setProductCount(uncategorized.getProductCount() + products.size());
        productRepository.saveAll(products);
        categoryRepository.save(uncategorized);

        categoryRepository.delete(category);
    }

    public Category getOrCreateUncategorized() {
        return categoryRepository.findByNameIgnoreCase(UNCATEGORIZED_NAME)
                .orElseGet(() -> categoryRepository.save(Category.builder()
                        .name(UNCATEGORIZED_NAME)
                        .productCount(0)
                        .build()));
    }
}