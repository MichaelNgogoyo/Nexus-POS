package com.pos.service.impl;

import com.pos.dto.ProductRequest;
import com.pos.model.Category;
import com.pos.model.Product;
import com.pos.repository.CategoryRepository;
import com.pos.repository.ProductRepository;
import com.pos.service.CategoryService;
import com.pos.service.MinIOService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    @Autowired
    private ProductRepository repository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    MinIOService minIOService;

    @CacheEvict(value = "products", allEntries = true)
    public ResponseEntity<?> createProduct(ProductRequest request, MultipartFile imageFile) throws Exception {

        String objectKey = minIOService.uploadFile(imageFile);

        Category category = resolveCategory(request.category());
        Product product = Product.builder()
            .name(request.name())
            .price(request.price())
            .active(Boolean.TRUE.equals(request.active()))
            .discount(request.discount())
            .imageURL(objectKey)
            .quantity(request.quantity())
            .category(category)
            .build();

        category.setProductCount(category.getProductCount() + 1);
        categoryRepository.save(category);
        return ResponseEntity.ok(repository.save(product));

    }
    //get product


    @Cacheable(value = "product", key = "#id")
    public Product getProductById(long id) {
        return repository.getProductById(id);
    }


    //update product

    @Caching(evict = {
        @CacheEvict(value = "products", allEntries = true),
        @CacheEvict(value = "product", key = "#id")
    })
    public void updateProduct(long id, ProductRequest request) {

        Product product = repository.getProductById(id);
        if (product == null) {
            log.warn("Product not available!");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        Category originalCategory = product.getCategory();
        Category newCategory = resolveCategory(request.category());

        product.setName(request.name());
        product.setPrice(request.price());
        product.setActive(Boolean.TRUE.equals(request.active()));
        product.setDiscount(request.discount());
        product.setQuantity(request.quantity());
        product.setCategory(newCategory);

        adjustCategoryCounts(originalCategory, newCategory);

        repository.save(product);
        log.info("Product updated successfully");
    }

    @Caching(evict = {
        @CacheEvict(value = "products", allEntries = true),
        @CacheEvict(value = "product", key = "#id")
    })
    public ResponseEntity<?> updateProductWithImage(long id, ProductRequest request, MultipartFile imageFile) throws Exception {
        Product product = repository.getProductById(id);
        if (product == null) {
            log.warn("Product not available!");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        String objectKey = product.getImageURL();
        if (imageFile != null && !imageFile.isEmpty()) {
            objectKey = minIOService.uploadFile(imageFile);
        }

        Category originalCategory = product.getCategory();
        Category newCategory = resolveCategory(request.category());

        product.setName(request.name());
        product.setPrice(request.price());
        product.setActive(Boolean.TRUE.equals(request.active()));
        product.setDiscount(request.discount());
        product.setQuantity(request.quantity());
        product.setCategory(newCategory);
        product.setImageURL(objectKey);

        adjustCategoryCounts(originalCategory, newCategory);

        Product saved = repository.save(product);
        log.info("Product updated successfully (with image)");
        return ResponseEntity.ok(saved);
    }
    //delete product

    @Caching(evict = {
        @CacheEvict(value = "products", allEntries = true),
        @CacheEvict(value = "product", key = "#id")
    })
    public void deleteProduct(long id) {
        Product product = repository.getProductById(id);
        if (product == null) {
            log.warn("Product not available");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        Category category = product.getCategory();
        if (category != null) {
            category.setProductCount(Math.max(0, category.getProductCount() - 1));
            categoryRepository.save(category);
        }

        repository.deleteById(id);
        log.warn("Product deleted successfully");
    }

    //return all products

    @Cacheable("products")
    public List<Product> findAllProducts() {
        return repository.findAllWithCategory();
    }

    public byte[] getImageByProductId(int productId) throws Exception {
        // use repository directly to avoid self-call AOP proxy bypass
        Product product = repository.getProductById(productId);
        return minIOService.getFile(product.getImageURL());
    }

    private Category resolveCategory(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return categoryService.getOrCreateUncategorized();
        }
        return categoryRepository.findByNameIgnoreCase(categoryName.trim())
                .orElseGet(() -> categoryRepository.save(Category.builder()
                        .name(categoryName.trim())
                        .productCount(0)
                        .build()));
    }

    private void adjustCategoryCounts(Category originalCategory, Category newCategory) {
        if (originalCategory != null && !originalCategory.getId().equals(newCategory.getId())) {
            originalCategory.setProductCount(Math.max(0, originalCategory.getProductCount() - 1));
            categoryRepository.save(originalCategory);
        }
        if (newCategory != null && (originalCategory == null || !newCategory.getId().equals(originalCategory.getId()))) {
            newCategory.setProductCount(newCategory.getProductCount() + 1);
            categoryRepository.save(newCategory);
        }
    }

}
